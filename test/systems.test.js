#!/usr/bin/env node
// Systems test harness — pure rules + world validation, no DOM.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const SRC=path.join(__dirname,'..','src');
const PURE=['00_core.js','01_rules.js','02_spells.js','03_items.js','04_world.js'];
const ctx={console,performance:{now:()=>0}};
vm.createContext(ctx);
for(const f of PURE) vm.runInContext(fs.readFileSync(path.join(SRC,f),'utf8'),ctx,{filename:f});
const S=vm.runInContext('({Rand,RNG,PAL,PAL32,palNearest,palDither,palIdx,Clock,clamp,Rules,CLASSES,CLASS_BASE_STATS,SKILLS,SPELLS,Spellcraft,ITEMS,Items,MONSTERS,Monsters,Loot,LOOT_TIERS,World,QUESTS,Quests,NPCS,SHOP_STOCK})',ctx);

let pass=0,fail=0;
function ok(cond,msg){ if(cond){pass++;} else {fail++; console.error('FAIL: '+msg);} }
function eq(a,b,msg){ ok(a===b,msg+' (got '+a+', want '+b+')'); }

// ---------- RNG ----------
{
  const a=new S.Rand('x'),b=new S.Rand('x');
  ok(a.next()===b.next()&&a.next()===b.next(),'RNG deterministic per seed');
  const c=new S.Rand('y'); ok(new S.Rand('x').next()!==c.next(),'RNG differs across seeds');
  const r=new S.Rand(7); for(let i=0;i<2000;i++){ const v=r.int(1,6); ok(v>=1&&v<=6,'int in range'); if(v<1||v>6) break; }
  const st=S.RNG.get('t1'); st.next(); const ser=S.RNG.serialize();
  const v1=S.RNG.get('t1').next(); S.RNG.reset(); S.RNG.restore(ser);
  eq(S.RNG.get('t1').next(),v1,'RNG stream save/restore resumes identically');
  S.RNG.reset();
}
// ---------- palette ----------
{
  ok(S.PAL.length===768,'palette 256 colors');
  ok(S.palNearest(255,255,255)===S.palIdx(15,15),'white maps to ramp15 top');
  ok(S.palIdx(2,20)===S.palIdx(2,15),'palIdx clamps shade');
}
// ---------- clock ----------
{
  const p=S.Clock.parts(S.Clock.START); eq(p.hour,8,'start hour 8'); eq(p.day,1,'start day 1');
  ok(S.Clock.lightLevel(12*60)===1,'noon full light'); ok(S.Clock.lightLevel(2*60)<0.2,'night dark');
  eq(S.Clock.parts(1440+61).hhmm,'01:01','hhmm format');
}
// ---------- stats & classes ----------
{
  eq(S.Rules.statMod(9),0,'statMod 9->0'); eq(S.Rules.statMod(25),7,'statMod 25->7'); eq(S.Rules.statMod(3),-3,'statMod 3');
  for(const cls in S.CLASSES){
    const pc=S.Rules.makePC('T',cls,0);
    ok(S.Rules.maxHP(pc)>0,cls+' maxHP>0 at L1');
    pc.level=10; ok(S.Rules.maxHP(pc)>S.CLASSES[cls].hpBase,cls+' hp grows');
    if(cls==='knight') eq(S.Rules.maxSP(pc),0,'knight has no SP');
    else ok(S.Rules.maxSP(pc)>0,cls+' has SP');
    for(const s of S.CLASSES[cls].startSkills) ok(S.Rules.canLearnSkill(cls,s),cls+' can learn own start skill '+s);
  }
  ok(!S.Rules.canLearnSkill('sorcerer','plate'),'sorcerer cannot learn plate');
  ok(!S.Rules.canLearnSkill('knight','fire'),'knight cannot learn fire magic');
}
// ---------- combat math ----------
{
  const r=new S.Rand(1);
  for(let b=-5;b<30;b+=3) for(let ac=0;ac<40;ac+=5){
    const h=S.Rules.hitChance(b,ac); ok(h>=0.05&&h<=0.95,'hitChance bounded');
  }
  ok(S.Rules.hitChance(10,5)>S.Rules.hitChance(0,5),'more bonus = more hits');
  ok(S.Rules.hitChance(5,20)<S.Rules.hitChance(5,5),'more AC = fewer hits');
  const dmg=S.Rules.damageRoll(r,{n:2,d:6,plus:3}); ok(dmg>=5&&dmg<=15,'damage roll in dice range');
  const pc=S.Rules.makePC('T','knight',0);
  const sword=S.ITEMS.longsword;
  ok(S.Rules.recoveryMs(pc,sword)>=600&&S.Rules.recoveryMs(pc,sword)<=3000,'recovery clamped');
  const rng2=S.Rules.damageRange(pc,sword); ok(rng2.n===1&&rng2.d===8,'weapon dice pass through');
}
// ---------- xp/economy ----------
{
  eq(S.Rules.xpForLevel(1),0,'level1 needs 0'); eq(S.Rules.xpForLevel(2),1000,'level2 needs 1000');
  ok(S.Rules.xpForLevel(3)>S.Rules.xpForLevel(2),'xp curve grows');
  const pc=S.Rules.makePC('T','knight',0); pc.xp=999; ok(!S.Rules.canTrain(pc),'999xp cannot train');
  pc.xp=1000; ok(S.Rules.canTrain(pc),'1000xp can train');
  for(let m=0;m<=8;m+=4) ok(S.Rules.buyPrice(100,m)>S.Rules.sellPrice(100,m),'buy>sell at merchant '+m);
  ok(S.Rules.buyPrice(100,7)<S.Rules.buyPrice(100,0),'merchant skill lowers buy price');
  ok(S.Rules.sellPrice(100,7)>S.Rules.sellPrice(100,0),'merchant skill raises sell price');
  eq(S.Rules.buyPrice(100,7),100,'master merchant buys at base');
  const dead=S.Rules.makePC('T','cleric',0); dead.cond='dead';
  ok(S.Rules.templeHealCost(dead)>S.Rules.templeHealCost(S.Rules.makePC('T','cleric',0)),'raising dead costs more');
}
// ---------- resting/conditions ----------
{
  const pc=S.Rules.makePC('T','cleric',0);
  const r1=S.Rules.restResult(pc); eq(r1.hp,S.Rules.maxHP(pc),'rest restores full hp'); eq(r1.cond,'ok','rest keeps ok');
  pc.cond='poisoned'; const r2=S.Rules.restResult(pc); eq(r2.cond,'poisoned','rest does NOT cure poison'); ok(r2.hp<S.Rules.maxHP(pc),'poisoned rest partial');
  pc.cond='dead'; eq(S.Rules.restResult(pc).cond,'dead','rest does not raise dead');
}
// ---------- spells ----------
{
  const r=new S.Rand(2);
  let n=0;
  for(const id in S.SPELLS){
    n++;
    const s=S.SPELLS[id];
    ok(s.sp>0,'spell '+id+' costs SP');
    ok(['fire','air','water','earth','spirit','mind','body','light','dark'].includes(s.school),id+' valid school');
    const pc=S.Rules.makePC('T','sorcerer',0);
    pc.spells=[id]; pc.skills[s.school]=7; pc.sp=99; pc.hp=10;
    const can=S.Spellcraft.canCast(pc,id); ok(can.ok,id+' castable at master: '+(can.why||''));
    const eff=S.Spellcraft.resolve(pc,id,r);
    eq(eff.spCost,s.sp,id+' echoes sp cost');
    if(s.kind==='damage') ok(eff.damage>0,id+' deals damage');
    if(s.kind==='heal') ok(eff.heal>0,id+' heals');
  }
  ok(n>=27,'at least 27 spells ('+n+')');
  const schools={}; for(const id in S.SPELLS) schools[S.SPELLS[id].school]=1;
  eq(Object.keys(schools).length,9,'all 9 schools populated');
  // gating
  const pc=S.Rules.makePC('T','sorcerer',0); pc.spells=['fire_ball']; pc.skills.fire=1; pc.sp=99; pc.hp=10;
  ok(!S.Spellcraft.canCast(pc,'fire_ball').ok,'expert spell blocked at novice');
  pc.skills.fire=4; ok(S.Spellcraft.canCast(pc,'fire_ball').ok,'expert spell allowed at expert');
  pc.sp=1; ok(!S.Spellcraft.canCast(pc,'fire_ball').ok,'blocked without SP');
  // guaranteed 2 SP fire bolt never costs anything else (the classic scar)
  eq(S.SPELLS.fire_bolt.sp,2,'fire bolt costs exactly its listed SP');
  for(const cls in S.CLASSES) for(const sid of S.Spellcraft.starting(cls)) ok(S.SPELLS[sid],cls+' starting spell exists: '+sid);
}
// ---------- items/monsters ----------
{
  for(const id in S.ITEMS){ const d=S.ITEMS[id];
    ok(typeof d.name==='string'&&d.name.length>1,id+' named');
    ok(d.slot,id+' has slot'); ok(d.price>=0,id+' priced'); ok(d.icon,id+' has icon key');
    if(d.slot==='weapon') ok(d.dn>=1&&d.dd>=2&&d.rec>0,id+' weapon dice sane');
  }
  for(const id in S.MONSTERS){ const d=S.MONSTERS[id];
    ok(d.hp>0&&d.xp>0&&d.spd>0,id+' vitals sane');
    ok(d.tier<S.LOOT_TIERS.length,id+' loot tier exists');
    ok(['melee','ranged','caster'].includes(d.ai),id+' valid ai');
    if(d.ai!=='melee') ok(d.spell&&d.spell.proj,id+' non-melee has projectile spell');
  }
  const r=new S.Rand(3);
  for(let t=0;t<5;t++){ const l=S.Loot.roll(r,t); ok(l.gold>0,'loot tier '+t+' gold'); if(l.item) ok(S.ITEMS[l.item.id],'loot item valid'); }
  const pc=S.Rules.makePC('T','knight',0);
  ok(S.Items.canEquip(pc,S.Items.make('longsword')),'knight equips sword (has skill)');
  ok(!S.Items.canEquip(pc,S.Items.make('runestaff')),'knight blocks staff without skill');
  ok(!S.Items.canEquip(pc,S.Items.make('bread')),'cannot equip bread');
}
// ---------- world ----------
{
  S.RNG.worldSeed='vintavia-1'; S.World.build();
  const O=S.World.maps.outdoor;
  ok(O&&O.w===96&&O.h===96,'outdoor built 96x96');
  // determinism: rebuild → identical
  const snap=JSON.stringify({c:Array.from(O.cells.slice(0,500)),m:O.monsters.map(m=>[m.mid,m.x,m.y])});
  S.World.build();
  const snap2=JSON.stringify({c:Array.from(S.World.maps.outdoor.cells.slice(0,500)),m:S.World.maps.outdoor.monsters.map(m=>[m.mid,m.x,m.y])});
  eq(snap,snap2,'world layout deterministic across rebuilds');
  const maps=S.World.maps;
  for(const id of ['outdoor','dun1','dun2','dun3']) ok(maps[id],'map exists: '+id);
  // spawn point open + inside town
  const sp=S.World.spawnPoint(); const O2=maps.outdoor;
  ok(!O2.cells[Math.floor(sp.y)*O2.w+Math.floor(sp.x)],'spawn cell walkable');
  // all 8 services present
  const shops=O2.shops.map(s=>s.shop).sort().join(',');
  eq(shops,'armor,bank,guild,hall,tavern,temple,train,weapon','all 8 town services');
  // portals link sanely
  const p1=maps.outdoor.portals.find(p=>p.to==='dun1'); ok(p1,'outdoor->dun1 portal');
  ok(maps.dun1.portals.some(p=>p.to==='outdoor'),'dun1->outdoor');
  ok(maps.dun1.portals.some(p=>p.to==='dun2'),'dun1->dun2');
  ok(maps.dun2.portals.some(p=>p.to==='dun1'),'dun2->dun1');
  ok(maps.dun2.portals.some(p=>p.to==='dun3'),'dun2->dun3');
  ok(maps.dun3.portals.some(p=>p.to==='outdoor'),'dun3 exit teleporter');
  for(const id in maps){ const m=maps[id];
    for(const p of m.portals){ if(p.to){ const t=maps[p.to];
      ok(t,'portal target map exists '+id+'->'+p.to);
      ok(typeof p.tx==='number'&&typeof p.ty==='number','portal has landing coords '+id+'->'+p.to+' (the softlock scar)');
      ok(!t.cells[Math.floor(p.ty)*t.w+Math.floor(p.tx)],'portal lands on open cell '+id+'->'+p.to);
      ok(!t.portals.some(q=>q.x===Math.floor(p.tx)&&q.y===Math.floor(p.ty)),'portal landing is not another portal '+id+'->'+p.to);
    }}
    for(const mo of m.monsters){ ok(S.MONSTERS[mo.mid],'spawned monster has stats: '+mo.mid);
      ok(!m.cells[Math.floor(mo.y)*m.w+Math.floor(mo.x)],'monster not in wall: '+mo.mid+'@'+id+' '+mo.x+','+mo.y); }
    for(const c of m.chests) ok(!m.cells[Math.floor(c.y)*m.w+Math.floor(c.x)],'chest not in wall @'+id);
    const ids=m.chests.map(c=>c.id); eq(new Set(ids).size,ids.length,'chest ids unique @'+id);
  }
  // quest sanity
  ok(maps.dun2.monsters.some(m=>m.mid==='necromancer'),'necromancer spawns in dun2');
  ok(maps.dun3.monsters.some(m=>m.mid==='lich'),'lich spawns in dun3');
  ok(maps.outdoor.monsters.some(m=>m.mid==='bandit_boss'),'bandit captain spawns outdoor');
  ok(maps.outdoor.monsters.filter(m=>m.group==='gobcamp').length>=6,'goblin camp populated');
  ok(maps.outdoor.monsters.filter(m=>m.mid==='direwolf').length>=3,'enough direwolves for fang quest');
  ok(maps.dun1.chests.some(c=>c.special==='q_censer'),'censer chest in crypt');
  ok(maps.dun3.chests.some(c=>c.special==='q_crown'),'crown chest in vault');
  // sigil door exists on dun3 path
  ok(Object.values(maps.dun3.doors).some(d=>d.needs==='q_sigil'),'vault sigil door present');
  // goblins near town are within 20 cells of town center; casters far
  const tc={x:29+18,y:30+8};
  const goblinsNear=maps.outdoor.monsters.filter(m=>m.mid==='goblin'&&!m.group);
  ok(goblinsNear.length>=6,'weak goblins ring the town');
  for(const g of goblinsNear) ok(Math.hypot(g.x-tc.x,g.y-tc.y)<26,'goblin near town: '+g.x+','+g.y);
  for(const a of maps.outdoor.monsters.filter(m=>m.mid==='apprentice')) ok(Math.hypot(a.x-tc.x,a.y-tc.y)>30,'casters far from town');
}
// ---------- quests ----------
{
  for(const qid in S.QUESTS){ const q=S.QUESTS[qid];
    ok(S.NPCS[q.giver],qid+' giver exists');
    if(q.item) ok(S.ITEMS[q.item],qid+' quest item exists');
    if(q.target) ok(S.MONSTERS[q.target],qid+' target monster exists');
    ok(q.gold>0&&q.xp>0,qid+' has rewards');
    ok(q.desc.length>40,qid+' has real description');
  }
  const party={quests:{}};
  ok(S.Quests.offerable(party,'main1'),'main1 offerable fresh');
  ok(!S.Quests.offerable(party,'main3'),'main3 gated');
  party.quests.main1={state:'turned'}; party.quests.main2={state:'turned'};
  ok(S.Quests.offerable(party,'main3'),'main3 opens after 1+2');
  party.quests.main3={state:'active'};
  ok(!S.Quests.offerable(party,'main4'),'main4 gated until main3 turned');
  party.quests.main3={state:'turned'};
  ok(S.Quests.offerable(party,'main4'),'main4 opens');
}
// ---------- traps ----------
{
  const r=new S.Rand(9);
  for(let t=0;t<5;t++){ const c=S.Rules.trapChance(t); ok(c>=0&&c<=0.7,'trap chance bounded tier '+t); }
  ok(S.Rules.trapChance(4)>S.Rules.trapChance(0),'deeper chests trap more');
  ok(S.Rules.trapDamage(r,4)>0,'trap damage positive');
  let hits0=0,hits7=0;
  for(let i=0;i<400;i++){ if(S.Rules.disarmed(new S.Rand(i),0,2)) hits0++; if(S.Rules.disarmed(new S.Rand(i),7,2)) hits7++; }
  ok(hits7>hits0,'disarm skill improves odds ('+hits0+' vs '+hits7+')');
}
// ---------- shops ----------
{
  for(const shop in S.SHOP_STOCK) for(const id of S.SHOP_STOCK[shop]) ok(S.ITEMS[id],'shop '+shop+' stock valid: '+id);
}

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
