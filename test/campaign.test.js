#!/usr/bin/env node
// Campaign chain regression — drives main1..main4 end-to-end through game systems.
// Combat is compressed (teleport-adjacent + attack loops) but every quest/gate/door/chest
// transition goes through the real game paths. Run: node test/campaign.test.js
'use strict';
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0;
function ok(c,msg){ if(c) pass++; else { fail++; console.error('FAIL: '+msg); } }

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const page=await browser.newPage({viewport:{width:932,height:430}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('file://'+path.resolve(__dirname,'..','dist','index.html'));
  await page.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='title',null,{timeout:20000});
  await page.evaluate(()=>__game.newGame({skipChargen:true}));

  const S=()=>page.evaluate(()=>window.__session);
  const heal=()=>page.evaluate(()=>{ for(const pc of Game.party.pcs){ pc.hp=Rules.maxHP(pc); if(pc.cond!=='ok') pc.cond='ok'; pc.sp=Rules.maxSP(pc); } });
  // kill a specific monster on the current map via real attack path
  const slay=async(mid)=>{
    for(let i=0;i<120;i++){
      const alive=await page.evaluate(m=>{
        const t=World.maps[Game.mapId].monsters.find(x=>x.mid===m&&x.hp>0);
        if(!t) return false;
        for(const pc of Game.party.pcs){ pc.hp=Rules.maxHP(pc); if(pc.cond!=='ok') pc.cond='ok'; }
        __game.teleport(t.x-1.1,t.y,0); __game.face(t.x,t.y);
        __game.press('attack'); __game.step(900);
        return World.maps[Game.mapId].monsters.some(x=>x.mid===m&&x.hp>0);
      },mid);
      if(!alive) return true;
    }
    return false;
  };
  const lootMid=async(mid)=>{ // interact loots the NEAREST corpse — sweep until the target one is taken
    for(let i=0;i<6;i++){
      const done=await page.evaluate(m=>{
        const c=Game.corpses.find(c=>c.mid===m&&!c.looted&&c.mapId===Game.mapId);
        if(!c) return true;
        __game.teleport(c.x-0.8,c.y,0); __game.press('interact');
        return !Game.corpses.some(c2=>c2.mid===m&&!c2.looted&&c2.mapId===Game.mapId);
      },mid);
      if(done) return true;
    }
    return false;
  };

  // ---- main1: stolen ledger ----
  await page.evaluate(()=>{ Game.acceptQuest('main1'); Game.acceptQuest('side_goblins'); Game.acceptQuest('side_wolves'); });
  ok(await slay('bandit_boss'),'bandit captain slain');
  ok(await lootMid('bandit_boss'),'captain looted');
  let s=await S();
  ok(s.party.quests.main1.state==='done','main1 done after ledger');
  await page.evaluate(()=>Game.turnInQuest('main1'));
  s=await S();
  ok(s.party.quests.main1.state==='turned','main1 turned');

  // ---- side quests: goblin camp + wolf fangs ----
  for(let i=0;i<8;i++){ // camp goblins + warrior + shaman
    const left=await page.evaluate(()=>World.maps.outdoor.monsters.some(m=>m.group==='gobcamp'&&m.hp>0));
    if(!left) break;
    await page.evaluate(()=>{ const t=World.maps.outdoor.monsters.find(m=>m.group==='gobcamp'&&m.hp>0);
      for(const pc of Game.party.pcs){ pc.hp=Rules.maxHP(pc); if(pc.cond!=='ok') pc.cond='ok'; }
      __game.teleport(t.x-1.1,t.y,0); __game.face(t.x,t.y); });
    for(let j=0;j<40;j++){
      const done=await page.evaluate(()=>{ const t=World.maps.outdoor.monsters.find(m=>m.group==='gobcamp'&&m.hp>0);
        if(!t) return true;
        for(const pc of Game.party.pcs){ pc.hp=Rules.maxHP(pc); if(pc.cond!=='ok') pc.cond='ok'; }
        __game.teleport(t.x-1.1,t.y,0); __game.face(t.x,t.y); __game.press('attack'); __game.step(900);
        return !World.maps.outdoor.monsters.some(m=>m.group==='gobcamp'&&m.hp>0); });
      if(done) break;
    }
  }
  s=await S();
  ok(s.party.quests.side_goblins.state==='done'||s.party.quests.side_goblins.state==='turned','goblin camp quest done ('+JSON.stringify(s.party.quests.side_goblins)+')');
  await page.evaluate(()=>Game.turnInQuest('side_goblins'));
  ok((await S()).party.perks.freerest===true,'free rest perk granted');

  for(let w=0;w<4;w++){ if(!await slay('direwolf')) break; await lootMid('direwolf'); }
  s=await S();
  ok(s.party.quests.side_wolves.state==='done','wolf cull complete: '+JSON.stringify(s.party.quests.side_wolves));
  await page.evaluate(()=>Game.turnInQuest('side_wolves'));

  // ---- main2: censer from the crypt (enter through the REAL door — the softlock scar) ----
  await page.evaluate(()=>Game.acceptQuest('main2'));
  await page.evaluate(()=>{ __game.gotoMap('outdoor',83.4,40.5); __game.face(84.5,40.5); __game.press('interact'); });
  await page.waitForFunction(()=>Game.mapId==='dun1',null,{timeout:8000});
  const landing=await page.evaluate(()=>({x:Game.px,y:Game.py}));
  ok(typeof landing.x==='number'&&!isNaN(landing.x)&&typeof landing.y==='number'&&!isNaN(landing.y),'crypt door lands at real coordinates ('+landing.x+','+landing.y+')');
  await page.evaluate(()=>{ __game.teleport(27.5,2.5,0); });
  await page.evaluate(()=>{ const ch=World.maps.dun1.chests.find(c=>c.special==='q_censer'); __game.teleport(ch.x-1,ch.y+0.2,0); __game.press('interact'); });
  s=await S();
  ok(s.party.pcs.some(p=>p.items.includes('q_censer')),'censer looted from crypt chest');
  ok(s.party.quests.main2.state==='done','main2 done');
  await page.evaluate(()=>Game.turnInQuest('main2'));

  // ---- main3: necromancer's sigil ----
  s=await S();
  await page.evaluate(()=>Game.acceptQuest('main3'));
  ok((await S()).party.quests.main3.state==='active','main3 unlocked after main1+main2');
  await page.evaluate(()=>__game.gotoMap('dun2',15.5,12.5));
  ok(await slay('necromancer'),'necromancer slain');
  ok(await lootMid('necromancer'),'necromancer looted');
  s=await S();
  ok(s.party.quests.main3.state==='done','main3 done with sigil');
  await page.evaluate(()=>Game.turnInQuest('main3'));

  // ---- main4: the vault ----
  await page.evaluate(()=>Game.acceptQuest('main4'));
  await page.evaluate(()=>__game.gotoMap('dun3',11.5,2.5));
  // sigil door at (13,2)
  await page.evaluate(()=>{ __game.teleport(12.5,2.5,0); __game.face(13.5,2.5); __game.press('interact'); });
  let doorOpen=await page.evaluate(()=>{ const d=World.maps.dun3.doors['13,2']; return d&&d.open; });
  ok(doorOpen,'sigil door opens with sigil in pack');
  ok(await slay('lich'),'the Lich falls');
  await page.evaluate(()=>{ const ch=World.maps.dun3.chests.find(c=>c.special==='q_crown'); __game.teleport(ch.x-1,ch.y,0); __game.press('interact'); });
  s=await S();
  ok(s.party.pcs.some(p=>p.items.includes('q_crown')),'crown taken');
  ok(s.party.quests.main4.state==='done','main4 done');
  // exit teleporter back to daylight (face it and Use)
  await page.evaluate(()=>{ __game.teleport(20.5,6.5,0); __game.face(21.5,6.5); __game.press('interact'); });
  await page.waitForFunction(()=>Game.mapId==='outdoor',null,{timeout:5000}).catch(()=>{});
  s=await S();
  ok(s.mapId==='outdoor','vault teleporter returns outdoors (got '+s.mapId+')');
  await page.evaluate(()=>Game.turnInQuest('main4'));
  s=await S();
  ok(s.party.quests.main4.state==='turned','main4 turned in');
  ok(s.screen==='victory','victory screen shows');
  const lvls=s.party.pcs.map(p=>Math.floor(p.xp/1000));
  ok(s.party.pcs.every(p=>p.xp>=Rules_xp(3)),'campaign xp supports level 3+ ('+s.party.pcs[0].xp+' xp)');
  function Rules_xp(lv){ return lv*(lv-1)*500; }

  ok(errors.length===0,'no page errors: '+errors.slice(0,2).join('|'));
  await browser.close();
  console.log('\nCAMPAIGN: '+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
