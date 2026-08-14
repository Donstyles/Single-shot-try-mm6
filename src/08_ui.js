// 08_ui — HUD + all screens. GLUE ONLY: every number comes from Rules/Spellcraft/Items.
'use strict';

const UI = {
  screen:null,       // active full-screen {draw,onTap?,onKey?}
  hit:[],            // tap rects rebuilt each draw: {x,y,w,h,cb}
  toast:null, toastT:0,

  open(s){ this.screen=s; this.hit=[]; Audio2.sfx('click'); },
  close(){ this.screen=null; this.hit=[]; },
  btn(x,y,w,h,label,cb,opts){ drawButton(Engine,x,y,w,h,label,opts); this.hit.push({x,y,w,h,cb}); },
  tapRect(x,y,w,h,cb){ this.hit.push({x,y,w,h,cb}); },
  tap(gx,gy){
    for(let i=this.hit.length-1;i>=0;i--){ const r=this.hit[i];
      if(gx>=r.x&&gx<r.x+r.w&&gy>=r.y&&gy<r.y+r.h){ r.cb(gx-r.x,gy-r.y); return true; } }
    // fat-finger pass: nearest target within 7px of its edge (small targets on phone scale)
    let best=null,bd=1e9;
    for(let i=this.hit.length-1;i>=0;i--){ const r=this.hit[i];
      if(r.w>200||r.h>200) continue; // don't magnetize huge zones like the viewport
      const dx=Math.max(r.x-gx,0,gx-(r.x+r.w)), dy=Math.max(r.y-gy,0,gy-(r.y+r.h));
      const d=dx*dx+dy*dy;
      if(dx<=7&&dy<=7&&d<bd){ bd=d; best=r; } }
    if(best){ best.cb(gx-best.x,gy-best.y); return true; }
    return false;
  },
  say(text){ this.toast=text; this.toastT=performance.now(); },
  drawToast(){ // visible on EVERY surface — screens and HUD alike
    if(!this.toast||performance.now()-this.toastT>2600) return;
    const E=Engine, w=E.textW(this.toast,11)+24;
    const x=(SCREEN_W-w)/2|0, y=this.screen?SCREEN_H-46:VP.y+VP.h-40;
    E.fillRect(x,y,w,22,palIdx(0,2)); E.frameRect(x,y,w,22,palIdx(5,8));
    E.textC(this.toast,SCREEN_W/2,y+5,{size:11,ramp:5,bright:true});
  },

  // ---------- HUD (drawn every frame over the 3D view) ----------
  drawHUD(){
    const E=Engine, P=Game.party;
    E.blit(Art.ui.frame,SCREEN_W,SCREEN_H,0,0);
    this.hit=[];
    // ---- right panel ----
    const rx=482, rw=150;
    const map=World.maps[Game.mapId];
    E.textC(map.name,rx+rw/2,16,{size:11,ramp:5,bright:true});
    const cp=Clock.parts(Game.clock.min);
    E.textC(cp.dayName+' '+cp.dom+' '+cp.month,rx+rw/2,32,{size:9,ramp:1});
    E.textC(cp.hhmm,rx+rw/2,44,{size:14,ramp:15});
    // facing
    const dirs=['E','SE','S','SW','W','NW','N','NE'];
    const di=Math.round(((Game.ang%(2*Math.PI))+2*Math.PI)%(2*Math.PI)/(Math.PI/4))%8;
    E.textC('Heading '+dirs[di],rx+rw/2,62,{size:9,ramp:1});
    let by=76; const bh=28, bw=rw-4;
    this.btn(rx,by,bw,bh,'Quests (Q)',()=>UI.open(UI.questScreen())); by+=bh+4;
    this.btn(rx,by,bw,bh,'Spells (B)',()=>UI.open(UI.spellScreen(Game.activePc))); by+=bh+4;
    this.btn(rx,by,bw,bh,'Map (M)',()=>UI.open(UI.mapScreen())); by+=bh+4;
    this.btn(rx,by,bw,bh,'Rest (R)',()=>Game.tryRest()); by+=bh+4;
    this.btn(rx,by,bw,bh,Game.turnBased?'Turn-Based ✓':'Real-Time',()=>Game.toggleTurnBased(),{ramp:Game.turnBased?4:5}); by+=bh+4;
    this.btn(rx,by,bw,bh,'Menu (Esc)',()=>UI.open(UI.menuScreen())); by+=bh+4;
    E.textC('Gold: '+P.gold,rx+rw/2,by+6,{size:11,ramp:5,bright:true});
    if(Game.turnBased) E.textC('— your move —',rx+rw/2,by+22,{size:9,ramp:4});
    // ---- bottom: log + portraits ----
    const ly=330, logW=222;
    const rows=[];
    for(let i=Math.max(0,Log.lines.length-6);i<Log.lines.length;i++){
      const l=Log.lines[i]; let line='';
      for(let wd of l.text.split(' ')){
        while(E.textW(wd,9)>logW){ let cut=wd.length; while(cut>1&&E.textW(wd.slice(0,cut),9)>logW) cut--; rows.push({t:wd.slice(0,cut),c:l.color}); wd=wd.slice(cut); }
        if(line&&E.textW(line+wd,9)>logW){ rows.push({t:line,c:l.color}); line=''; }
        line+=wd+' ';
      }
      rows.push({t:line,c:l.color});
    }
    rows.slice(-8).forEach((r,n)=>E.text(r.t,12,ly+2+n*12,{size:9,ramp:(r.c>>4)&15}));
    // portraits
    const px0=240;
    for(let i=0;i<4;i++){
      const pc=P.pcs[i]; if(!pc) continue;
      const x=px0+i*100, y=336;
      const sel=Game.activePc===i;
      const wince=pc.painT&&performance.now()-pc.painT<700&&Art.portraitsPain[pc.portrait];
      E.blit(wince?Art.portraitsPain[pc.portrait]:Art.portraits[pc.portrait],58,66,x+2,y+2);
      E.blit(Art.ui.slot,62,70,x,y);
      if(sel) E.frameRect(x-1,y-1,64,72,palIdx(5,13));
      // condition tint border
      if(pc.cond!=='ok') E.frameRect(x,y,62,70,Rules.conditionColor(pc.cond));
      // hp/sp bars
      const maxHp=Rules.maxHP(pc), maxSp=Rules.maxSP(pc);
      const hpH=Math.round(66*clamp(pc.hp/maxHp,0,1)), spH=maxSp?Math.round(66*clamp(pc.sp/maxSp,0,1)):0;
      E.fillRect(x+64,y+2,6,66,palIdx(0,3));
      E.fillRect(x+64,y+2+66-hpH,6,hpH,pc.hp<maxHp*0.25?palIdx(14,9):palIdx(2,9));
      E.fillRect(x+72,y+2,6,66,palIdx(0,3));
      if(maxSp) E.fillRect(x+72,y+2+66-spH,6,spH,palIdx(3,9));
      E.textC(pc.name,x+31,y+72,{size:9,ramp:sel?5:0,bright:sel});
      // recovery flash
      if(pc.recovery>0&&pc.cond==='ok'){ E.fillRect(x,y+68,Math.round(62*clamp(pc.recovery/1500,0,1)),2,palIdx(12,8)); }
      // tap selects; tapping the already-selected hero opens their pack (touch path to inventory)
      this.tapRect(x,y,80,82,()=>{ if(Game.activePc===i) UI.open(UI.invScreen(i)); else { Game.activePc=i; Audio2.sfx('click'); } });
    }
    // attack / cast / use / pack buttons (also touch)
    this.btn(12,434,66,36,'Attack (F)',()=>Game.partyAttack());
    this.btn(82,434,60,36,'Cast (C)',()=>Game.quickCast());
    this.btn(146,434,56,36,'Use (Spc)',()=>Game.interact());
    this.btn(206,434,56,36,'Pack (I)',()=>UI.open(UI.invScreen()));
    // target + crosshair
    this.drawToast();
    E.px(VP.x+VP.w/2|0,VP.y+VP.h/2|0,palIdx(5,15));
    const t=Game.currentTarget();
    if(t){ const d=Monsters.def(t.mid);
      E.textC(d.name+'  '+t.hp+'/'+d.hp,VP.x+VP.w/2|0,VP.y+8,{size:11,ramp:t.hp<d.hp*0.35?14:5,bright:true});
    }
    // active buffs
    let bx=VP.x+6;
    for(const b in P.buffs){ if(P.buffs[b]&&P.buffs[b].until>Game.clock.min){ E.text(b,bx,VP.y+VP.h-14,{size:9,ramp:8}); bx+=Engine.textW(b,9)+10; } }
    // viewport tap = context action (attack monster / interact)
    this.tapRect(VP.x,VP.y,VP.w,VP.h,(lx,ly2)=>Game.viewportTap(lx,ly2));
  },

  // ---------- generic screen chrome ----------
  chrome(title){
    const E=Engine;
    E.blit(Art.ui.parchment,SCREEN_W,SCREEN_H,0,0);
    if(Art.ui.crest) E.blit(Art.ui.crest,200,200,(SCREEN_W-200)/2|0,(SCREEN_H-200)/2|0);
    E.textC(title,SCREEN_W/2,20,{size:22,ramp:1,bright:false});
    E.fillRect(80,46,SCREEN_W-160,2,palIdx(1,4));
    this.btn(SCREEN_W-90,14,72,26,'Close',()=>{ UI.close(); });
  },

  // ---------- title ----------
  titleScreen(){
    return { name:'title',
      draw(){
        const E=Engine;
        E.blit(Art.title(),SCREEN_W,SCREEN_H,0,0);
        E.textC('VINTAVIA',SCREEN_W/2+2,92,{size:22,ramp:15,shadow:true});
        E.textC('VINTAVIA',SCREEN_W/2,90,{size:22,ramp:5,bright:true});
        E.textC('A Might and Magic VI — class homage',SCREEN_W/2,126,{size:11,ramp:1,bright:true});
        E.textC('an original fan tribute — not the trademarked game',SCREEN_W/2,142,{size:9,ramp:0});
        UI.btn(SCREEN_W/2-90,300,180,34,'New Game',()=>UI.open(UI.chargenScreen()));
        const newest=Game.newestSlot();
        if(newest){
          const meta=Game.saveMeta(newest);
          UI.btn(SCREEN_W/2-90,342,180,34,'Continue',()=>{ if(!Game.load(newest)) UI.say('That save is from an older build.'); });
          if(meta) E.textC((newest==='auto'?'autosave · ':'manual · ')+meta.text,SCREEN_W/2,380,{size:9,ramp:0});
        }
        UI.btn(SCREEN_W/2-90,398,180,34,Audio2.muted?'Sound: Off':'Sound: On',()=>{ Audio2.setMuted(!Audio2.muted); });
        E.textC('v1.0 — all art, music and code procedural',SCREEN_W/2,452,{size:9,ramp:0});
      }
    };
  },

  // ---------- chargen ----------
  chargenScreen(){
    const drafts=Rules.RECOMMENDED.map(([n,c,p])=>({name:n,cls:c,portrait:'p'+p,stats:Object.assign({},CLASS_BASE_STATS[c]),pool:Rules.POINT_POOL}));
    const NAMES=['Roderic','Aldric','Serena','Mireth','Kara','Bren','Tovan','Lys','Garet','Wren','Edda','Joss'];
    let sel=0;
    const clsList=Object.keys(CLASSES);
    return { name:'chargen', drafts, sel,
      draw(){
        const E=Engine; const self=this;
        UI.chrome('Create Your Party');
        UI.hit.pop(); // replace Close with Back-to-title
        UI.btn(SCREEN_W-90,14,72,26,'Title',()=>UI.open(UI.titleScreen()));
        // 4 member tabs
        for(let i=0;i<4;i++){
          const d=this.drafts[i], x=36+i*150;
          UI.btn(x,54,140,24,d.name+' — '+CLASSES[d.cls].name,()=>{ self.sel=i; },{size:9,down:this.sel===i});
        }
        const d=this.drafts[this.sel];
        // portrait + selector
        E.blit(Art.portraits[d.portrait],58,66,60,100);
        E.frameRect(58,98,62,70,palIdx(1,3));
        UI.btn(36,174,50,22,'◄',()=>{ let n=(+d.portrait.slice(1)+7)%8; d.portrait='p'+n; },{size:11});
        UI.btn(92,174,50,22,'►',()=>{ let n=(+d.portrait.slice(1)+1)%8; d.portrait='p'+n; },{size:11});
        UI.btn(36,202,106,22,'Name: '+d.name,()=>{
          const used=this.drafts.map(x=>x.name);
          let n=NAMES.indexOf(d.name);
          do { n=(n+1)%NAMES.length; } while(used.includes(NAMES[n])&&NAMES[n]!==d.name);
          d.name=NAMES[n];
        },{size:9});
        // class list
        E.text('Class',170,100,{size:11,ramp:1});
        clsList.forEach((c,ci)=>{
          UI.btn(170,118+ci*27,110,24,CLASSES[c].name,()=>{ d.cls=c; d.stats=Object.assign({},CLASS_BASE_STATS[c]); d.pool=Rules.POINT_POOL; },{size:9,down:d.cls===c});
        });
        // stats point buy
        E.text('Attributes    (points left: '+d.pool+')',300,100,{size:11,ramp:1});
        ATTRS.forEach((a,ai)=>{
          const y=120+ai*24;
          E.text(a[0].toUpperCase()+a.slice(1),300,y+4,{size:9,ramp:0});
          E.text(''+d.stats[a],394,y+4,{size:11,ramp:15});
          UI.btn(414,y-1,28,22,'−',()=>{ if(Rules.canLower(d.cls,d,a)){ d.stats[a]--; d.pool+=Rules.pointCost(d.stats[a]); } else UI.say('That is as low as a '+CLASSES[d.cls].name+' goes.'); },{size:11});
          const stepCost=Rules.pointCost(d.stats[a]);
          UI.btn(448,y-1,28,22,stepCost>1?'+2':'+',()=>{ if(d.stats[a]>=Rules.STAT_MAX) UI.say('Mortal limits.');
            else if(d.pool<stepCost) UI.say(stepCost>1?'Raising past 17 costs 2 points.':'No points left.');
            else { d.stats[a]++; d.pool-=stepCost; } },{size:11});
        });
        // class info
        const cl=CLASSES[d.cls];
        E.text('HP/lv: '+cl.hpLv+'   SP/lv: '+cl.spLv,300,300,{size:9,ramp:0});
        E.text('Weapons: '+cl.weapons.join(', '),300,314,{size:9,ramp:0});
        E.text('Magic: '+(cl.schools.length?cl.schools.join(', '):'none'),300,328,{size:9,ramp:0});
        E.text('Starts with: '+cl.startSkills.map(s=>SKILLS[s].name).join(', '),300,342,{size:9,ramp:0});
        // preview derived (rules-computed)
        const tmp=Rules.makePC(d.name,d.cls,d.portrait,d.stats);
        E.text('Hit Points: '+Rules.maxHP(tmp)+'    Spell Points: '+Rules.maxSP(tmp),300,362,{size:9,ramp:13});
        UI.btn(36,420,140,34,'Recommended',()=>{
          Rules.RECOMMENDED.forEach(([n,c,p],i)=>{ self.drafts[i]={name:n,cls:c,portrait:'p'+p,stats:Object.assign({},CLASS_BASE_STATS[c]),pool:Rules.POINT_POOL}; });
          UI.say('A balanced party stands ready.');
        });
        UI.btn(SCREEN_W-180,420,140,34,'Begin! ►',()=>Game.newGameFrom(this.drafts));
      }
    };
  },

  // ---------- inventory ----------
  invScreen(pcIdx){
    let pi=pcIdx===undefined?Game.activePc:pcIdx;
    let selItem=-1;
    return { name:'inventory',
      draw(){
        const E=Engine, P=Game.party, self=this;
        const pc=P.pcs[pi];
        UI.chrome(pc.name+' — '+CLASSES[pc.cls].name+'  L'+pc.level);
        for(let i=0;i<4;i++) UI.btn(60+i*90,52,84,22,P.pcs[i].name,()=>{ pi=i; selItem=-1; },{size:9,down:pi===i});
        // paperdoll + equip
        E.blit(Art.paperdolls.male,92,150,48,92);
        E.frameRect(46,90,96,154,palIdx(1,3));
        // gear worn on the doll itself (helm/armor/boots/weapon/shield)
        const dollAnchors={helm:[82,92,1],armor:[70,132,2],boots:[82,206,1],weapon:[114,142,1.4],shield:[50,142,1.4]};
        for(const slot in dollAnchors){ const it=pc.equip[slot];
          if(it){ const [ax,ay,sc]=dollAnchors[slot]; E.blit(Art.icons[ITEMS[it.id].icon],24,24,ax,ay,{scale:sc}); } }
        const slots=[['weapon','Wpn',150,96],['shield','Off',150,126],['armor','Arm',150,156],['helm','Helm',150,186],['boots','Feet',150,216],['ring1','Ring',48,250],['ring2','Ring',96,250],['amulet','Neck',144,250]];
        for(const [slot,label,sx,sy] of slots){
          E.fillRect(sx,sy,26,26,palIdx(1,5)); E.frameRect(sx,sy,26,26,palIdx(1,3));
          const it=pc.equip[slot];
          if(it) E.blit(Art.icons[ITEMS[it.id].icon],24,24,sx+1,sy+1);
          if(sy===250) E.textC(label,sx+13,sy-11,{size:9,ramp:1});
          else E.text(label,sx+30,sy+9,{size:9,ramp:1});
          UI.tapRect(sx,sy,26,26,()=>{ if(pc.equip[slot]){ Game.unequip(pi,slot); selItem=-1; } });
        }
        E.text('tap worn gear to unequip',46,282,{size:9,ramp:0});
        // stats (all rules-derived)
        const eq=Object.values(pc.equip).map(Items.def);
        E.text('HP '+pc.hp+'/'+Rules.maxHP(pc)+'   SP '+pc.sp+'/'+Rules.maxSP(pc),46,300,{size:11,ramp:2});
        E.text('AC '+Rules.effectiveAC(pc,eq,P.buffs)+'   Cond: '+pc.cond,46,316,{size:11,ramp:pc.cond==='ok'?0:14});
        const w=pc.equip.weapon?ITEMS[pc.equip.weapon.id]:null;
        const dr=Rules.effectiveDamage(pc,w,P.buffs);
        E.text('Attack +'+Rules.effectiveAttack(pc,w,P.buffs)+'   Dmg '+dr.n+'d'+dr.d+'+'+dr.plus,46,332,{size:11,ramp:0});
        E.text('XP '+pc.xp+' / '+Rules.xpForLevel(pc.level+1)+(Rules.canTrain(pc)?'  — TRAIN!':''),46,348,{size:9,ramp:Rules.canTrain(pc)?5:0});
        ATTRS.forEach((a,ai)=>E.text(a.slice(0,3).toUpperCase()+' '+(pc.stats[a]+Items.equipStatBonus(pc,a)),46+(ai%4)*46,366+((ai/4)|0)*14,{size:9,ramp:0}));
        // skills column
        E.text('Skills',210,96,{size:11,ramp:1});
        let sy2=112;
        for(const sk in pc.skills){ E.text(SKILLS[sk].name+' '+pc.skills[sk]+' ('+Rules.skillTier(pc.skills[sk])+')',210,sy2,{size:9,ramp:0}); sy2+=13; if(sy2>380) break; }
        // backpack grid 6x8
        const gx=390,gy=96,cs=28;
        E.text('Backpack        Gold: '+P.gold,gx,80,{size:11,ramp:5});
        for(let i=0;i<48;i++){
          const x=gx+(i%6)*cs, y=gy+((i/6)|0)*cs;
          E.fillRect(x,y,cs-2,cs-2,palIdx(1,selItem===i?8:5)); E.frameRect(x,y,cs-2,cs-2,palIdx(1,3));
          const it=pc.items[i];
          if(it) E.blit(Art.icons[ITEMS[it.id].icon],24,24,x+1,y+1);
          UI.tapRect(x,y,cs-2,cs-2,()=>{ selItem=(selItem===i?-1:i); Audio2.sfx('click'); });
        }
        if(selItem>=0&&pc.items[selItem]){
          const it=pc.items[selItem], d=ITEMS[it.id];
          E.text(Items.displayName(it),gx,gy+8*cs+8,{size:11,ramp:5,bright:true});
          let desc= d.slot==='weapon'? ('Damage '+d.dn+'d'+d.dd+(d.dp?'+'+d.dp:'')+'  ['+SKILLS[d.skill].name+']')
            : d.ac? ('Armor Class +'+d.ac+(d.skill?'  ['+SKILLS[d.skill].name+']':''))
            : d.stat? ('+'+d.statPlus+' '+d.stat)
            : d.use==='heal'? 'Restores health' : d.use==='mana'?'Restores spell points' : d.use==='cure'?'Cures poison and disease' : d.slot==='quest'?'Quest item':'';
          E.text(desc,gx,gy+8*cs+22,{size:9,ramp:0});
          if(d.slot!=='quest'){
            if(d.slot==='use') UI.btn(gx,gy+8*cs+36,70,24,'Use',()=>{ Game.useItem(pi,selItem); selItem=-1; });
            else if(Items.canEquip(pc,it)) UI.btn(gx,gy+8*cs+36,70,24,'Equip',()=>{ Game.equipItem(pi,selItem); selItem=-1; });
            else E.text('(cannot equip — skill untrained)',gx,gy+8*cs+40,{size:9,ramp:14});
            UI.btn(gx+80,gy+8*cs+36,70,24,'Drop',()=>{ pc.items[selItem]=null; selItem=-1; });
          }
        }
      }
    };
  },

  // ---------- spellbook ----------
  spellScreen(pcIdx){
    let pi=pcIdx===undefined?Game.activePc:pcIdx;
    let school=null;
    return { name:'spellbook',
      draw(){
        const E=Engine,P=Game.party,pc=P.pcs[pi],self=this;
        UI.chrome(pc.name+' — Spellbook');
        for(let i=0;i<4;i++) UI.btn(60+i*90,52,84,22,P.pcs[i].name,()=>{ pi=i; school=null; },{size:9,down:pi===i});
        const schools=CLASSES[pc.cls].schools;
        if(!schools.length){
          E.textC(pc.name+' follows the way of steel — no spellbook.',SCREEN_W/2,170,{size:11,ramp:1});
          E.textC('Arms mastered: '+Object.keys(pc.skills).filter(s=>SKILLS[s].type==='weapon'||SKILLS[s].type==='armor').map(s=>SKILLS[s].name+' '+pc.skills[s]).join(',  '),SCREEN_W/2,200,{size:9,ramp:0});
          E.textC('Steel keeps its own counsel. It has never once run out of spell points.',SCREEN_W/2,228,{size:9,ramp:11});
          return;
        }
        if(!school) school=schools[0];
        schools.forEach((s,si)=>UI.btn(46+si*84,88,80,24,SKILLS[s].name.replace(' Magic',''),()=>{ school=s; },{size:9,down:school===s}));
        E.text('SP: '+pc.sp+'/'+Rules.maxSP(pc)+'    '+SKILLS[school].name+' skill: '+(pc.skills[school]||0)+' ('+Rules.skillTier(pc.skills[school]||0)+')',46,124,{size:11,ramp:3});
        let y=148;
        for(const id in SPELLS){
          const s=SPELLS[id]; if(s.school!==school) continue;
          const known=pc.spells.includes(id);
          const can=known&&Spellcraft.canCast(pc,id).ok;
          const gemRamp={fire:4,air:8,water:3,earth:13,spirit:15,mind:10,body:2,light:5,dark:6}[s.school];
          E.fillRect(46,y+4,10,10,palIdx(gemRamp,9)); E.frameRect(46,y+4,10,10,palIdx(gemRamp,4));
          E.text(s.name,62,y+6,{size:11,ramp:known?(can?5:0):11,bright:can});
          E.text(s.sp+' sp — '+(s.req>=7?'Master':s.req>=4?'Expert':'Novice'),210,y+6,{size:9,ramp:0});
          E.text(UI.spellBlurb(s),320,y+6,{size:9,ramp:0});
          if(known) UI.btn(SCREEN_W-120,y,84,24,'Cast',()=>{ if(Game.castFromBook(pi,id)) UI.close(); },{size:9});
          else E.text('not learned',SCREEN_W-120,y+6,{size:9,ramp:11});
          y+=30;
        }
      }
    };
  },
  spellBlurb(s){
    if(s.kind==='damage') return s.n+'d'+s.d+' +skill damage'+(s.aoe?' (area)':'');
    if(s.kind==='heal') return 'heal '+s.n+'d'+s.d+' +skill';
    if(s.kind==='buff') return 'party '+s.buff+' '+s.durMin+'m+';
    if(s.kind==='drain') return s.n+'d'+s.d+' drain';
    return {cureCond:'cures ailments',raise:'raises the dead',restore:'full restore',light:'light',wizardEye:'sense monsters',calm:'pacifies beast'}[s.kind]||'';
  },

  // ---------- quest log ----------
  questScreen(){
    return { name:'quests',
      draw(){
        UI.chrome('Quest Log');
        const E=Engine,P=Game.party;
        let y=70; let any=false;
        E.text('Active',46,y,{size:14,ramp:1}); y+=22;
        for(const qid in P.quests){ const st=P.quests[qid]; if(st.state!=='active'&&st.state!=='done') continue; any=true;
          const q=QUESTS[qid];
          E.text('◆ '+q.name,60,y,{size:11,ramp:5,bright:true}); y+=15;
          E.text(NPCS[q.giver].name+' — '+Quests.progressText(P,qid),74,y,{size:9,ramp:st.state==='done'?2:0}); y+=14;
          const words=q.desc.split(' '); let line='';
          for(const w of words){ if((line+w).length>78){ E.text(line,74,y,{size:9,ramp:0}); y+=12; line=''; } line+=w+' '; }
          E.text(line,74,y,{size:9,ramp:0}); y+=18;
        }
        if(!any){ E.text('No quests yet. Folk in town need help — try the Town Hall.',60,y,{size:9,ramp:0}); y+=20; }
        y+=8; E.text('Completed',46,y,{size:14,ramp:1}); y+=22;
        for(const qid in P.quests){ if(P.quests[qid].state!=='turned') continue;
          E.text('✓ '+QUESTS[qid].name,60,y,{size:9,ramp:2}); y+=14;
        }
      }
    };
  },

  // ---------- automap ----------
  mapScreen(){
    return { name:'map',
      draw(){
        UI.chrome(World.maps[Game.mapId].name+' — Map');
        const E=Engine,m=World.maps[Game.mapId];
        const ex=Game.explored[Game.mapId];
        // zoom to what you have explored (min window so early maps still read)
        let x0=m.w,y0=m.h,x1=0,y1=0;
        for(let yy=0;yy<m.h;yy++)for(let xx=0;xx<m.w;xx++){ if(ex[yy*m.w+xx]){ if(xx<x0)x0=xx; if(xx>x1)x1=xx; if(yy<y0)y0=yy; if(yy>y1)y1=yy; } }
        if(x1<x0){ x0=0;y0=0;x1=m.w-1;y1=m.h-1; }
        const pad=4;
        x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad); x1=Math.min(m.w-1,x1+pad); y1=Math.min(m.h-1,y1+pad);
        if(x1-x0<30){ const c=(x0+x1)/2|0; x0=Math.max(0,c-15); x1=Math.min(m.w-1,c+15); }
        if(y1-y0<24){ const c=(y0+y1)/2|0; y0=Math.max(0,c-12); y1=Math.min(m.h-1,c+12); }
        const vw2=x1-x0+1, vh2=y1-y0+1;
        const cs=Math.max(3,Math.min(((SCREEN_W-120)/vw2)|0,((SCREEN_H-150)/vh2)|0));
        const ox=((SCREEN_W-vw2*cs)/2|0)-x0*cs, oy=76-y0*cs;
        for(let y2=y0;y2<=y1;y2++)for(let x2=x0;x2<=x1;x2++){
          if(!ex[y2*m.w+x2]) continue;
          const c=m.cells[y2*m.w+x2], f=m.floor[y2*m.w+x2];
          let col=c? (c===7||c===9?palIdx(1,6):palIdx(0,4)) : f===6?palIdx(3,6): f===1?palIdx(1,7): f===2?palIdx(0,8): m.outdoor?palIdx(2,6):palIdx(11,6);
          E.fillRect(ox+x2*cs,oy+y2*cs,cs,cs,col);
        }
        const shopLetter={weapon:'W',armor:'A',guild:'G',tavern:'V',temple:'T',train:'R',bank:'B',hall:'H'};
        for(const s of m.shops){ if(ex[s.y*m.w+s.x]){
          E.fillRect(ox+s.x*cs-1,oy+s.y*cs-1,cs+2,cs+2,palIdx(5,10));
          if(cs>=3) E.text(shopLetter[s.shop],ox+s.x*cs+cs+1,oy+s.y*cs-3,{size:9,ramp:5,bright:true});
        }}
        // wizard eye: living creatures glow on the map while the spell holds
        const eye=Game.party.buffs.wizardEye&&Game.party.buffs.wizardEye.until>Game.clock.min;
        if(eye){ for(const mo of m.monsters){ if(mo.hp>0) E.fillRect(ox+mo.x*cs-1|0,oy+mo.y*cs-1|0,3,3,palIdx(6,12)); }
          E.text('wizard eye',SCREEN_W-120,SCREEN_H-24,{size:9,ramp:6}); }
        // player arrow
        const px2=ox+Game.px*cs, py2=oy+Game.py*cs;
        E.fillRect(px2-2|0,py2-2|0,5,5,palIdx(14,10));
        const dx=Math.cos(Game.ang)*6, dy=Math.sin(Game.ang)*6;
        E.fillRect(px2+dx-1|0,py2+dy-1|0,3,3,palIdx(5,14));
        E.text('N ↑',SCREEN_W-70,60,{size:11,ramp:5,bright:true});
        if(m.outdoor) E.textC('W weapons · A armor · G guild · V tavern · T temple · R training · B bank · H hall     red = you',SCREEN_W/2,SCREEN_H-24,{size:9,ramp:0});
        else E.textC('red = you · gold = doors and stairs',SCREEN_W/2,SCREEN_H-24,{size:9,ramp:0});
      }
    };
  },

  // ---------- menu / save / load ----------
  menuScreen(){
    return { name:'menu',
      draw(){
        UI.chrome('Menu');
        const cx=SCREEN_W/2-90; let y=90;
        UI.btn(cx,y,180,32,'Save Game',()=>{ Game.save('manual'); UI.say('Saved to the chronicle.'); },{}); y+=40;
        UI.btn(cx,y,180,32,'Load Game',()=>UI.open(UI.loadScreen())); y+=40;
        UI.btn(cx,y,180,32,Audio2.muted?'Sound: Off':'Sound: On',()=>Audio2.setMuted(!Audio2.muted)); y+=40;
        UI.btn(cx,y,180,32,'Controls Help',()=>UI.open(UI.helpScreen())); y+=40;
        UI.btn(cx,y,180,32,'Quit to Title',()=>{ UI.open(UI.titleScreen()); Game.state='title'; }); y+=40;
        Engine.textC('Manual and autosave are separate slots — dying never touches your manual save.',SCREEN_W/2,y+16,{size:9,ramp:0});
      }
    };
  },
  loadScreen(){
    return { name:'load',
      draw(){
        UI.chrome('Load Game');
        let y=100;
        for(const slot of ['manual','auto']){
          const meta=Game.saveMeta(slot);
          const label=slot==='manual'?'Manual save':'Autosave';
          if(meta){
            UI.btn(SCREEN_W/2-160,y,320,40,label+' — '+meta.text,()=>{ if(Game.load(slot)){ UI.close(); } },{size:9});
          } else Engine.textC(label+' — empty',SCREEN_W/2,y+14,{size:9,ramp:11});
          y+=52;
        }
      }
    };
  },
  helpScreen(){
    return { name:'help',
      draw(){
        UI.chrome('Controls');
        const L=['W/S or ↑/↓ — walk    A/D — sidestep    ←/→ — turn','Drag the view (mouse or finger) to look around',
          'F — attack with every ready hero      C — quick-cast','Space / tap — talk, open, loot, use what you face',
          'T — turn-based mode    R — rest    I — inventory','B — spellbook    Q — quests    M — map    Esc — menu',
          'On the phone: left stick walks, right buttons act.','Enter buildings by walking to their door and tapping Use.'];
        L.forEach((l,i)=>Engine.text(l,70,86+i*26,{size:11,ramp:0}));
      }
    };
  },

  // ---------- dialog (NPC talk) ----------
  dialogScreen(npcId,opts){
    const npc=NPCS[npcId];
    return { name:'dialog', npcId,
      draw(){
        const E=Engine,P=Game.party;
        UI.chrome(npc.name);
        E.blit(Art.portraits[npc.portrait],58,66,24,84,{scale:2});
        E.frameRect(22,82,120,136,palIdx(5,8));
        E.textC(npc.name,82,224,{size:9,ramp:1});
        const text=this.text||npc.hello||(npc.rumors?npc.rumors[0]:'...');
        const endY=UI.wrapText(text,150,90,420,11);
        let y=Math.max(170,endY+18);
        // quest interactions
        for(const qid in QUESTS){ const q=QUESTS[qid];
          if(q.giver!==npcId) continue;
          const st=Quests.status(P,qid);
          if(st==='none'&&Quests.offerable(P,qid)) UI.btn(150,y,340,28,'“'+q.name+'” — hear them out',()=>{ this.text=q.desc; this.offer=qid; },{size:9}), y+=34;
          if(this.offer===qid) UI.btn(150,y,340,28,'Accept the task',()=>{ Game.acceptQuest(qid); this.text='Good. The town will not forget this.'; this.offer=null; },{size:9,ramp:2}), y+=34;
          if(st==='done'||(st==='active'&&Game.questReadyToTurn(qid))) UI.btn(150,y,340,28,'Complete: '+q.name,()=>{ Game.turnInQuest(qid); this.text=q.done; },{size:9,ramp:5}), y+=34;
        }
        if(npc.rumors) UI.btn(150,y,340,28,'Any news?',()=>{ this.text=npc.rumors[RNG.get('rumor').int(0,npc.rumors.length-1)]; },{size:9}), y+=34;
        else if(npc.rumor) UI.btn(150,y,340,28,'Any news?',()=>{ this.text=npc.rumor; },{size:9}), y+=34;
        UI.btn(150,y,340,28,'Farewell',()=>UI.close(),{size:9});
      }
    };
  },
  wrapText(text,x,y,w,size){
    const E=Engine, words=text.split(' '); let line='',yy=y;
    for(const wd of words){
      if(E.textW(line+wd,size)>w){ E.text(line,x,yy,{size,ramp:0}); yy+=size+5; line=''; }
      line+=wd+' ';
    }
    E.text(line,x,yy,{size,ramp:0});
    return yy+size+5;
  },

  // ---------- shops ----------
  shopScreen(kind){
    const keeperIds={weapon:'smith',armor:'armorer',guild:'mage',tavern:'tavernkeep',temple:'priest',train:'trainer',bank:'banker',hall:'mayor'};
    const npcId=keeperIds[kind];
    if(kind==='hall') return UI.dialogScreen('mayor');
    const titles={weapon:'Garron’s Steel',armor:'The Iron Shell',guild:'Guild of the Nine Schools',tavern:'The Gilded Griffin',temple:'Temple of the Light',train:'Training Hall',bank:'Bank of Vintavia'};
    let mode='hello', sel=-1, selPc=0;
    return { name:'shop_'+kind,
      draw(){
        const E=Engine,P=Game.party,npc=NPCS[npcId],self=this;
        UI.chrome(titles[kind]);
        UI.hit.pop(); UI.btn(SCREEN_W-90,14,72,26,'Leave',()=>UI.close());
        E.blit(Art.portraits[npc.portrait],58,66,24,84,{scale:2});
        E.frameRect(22,82,120,136,palIdx(5,8));
        E.textC(npc.name,82,224,{size:9,ramp:1});
        E.text('Party gold: '+P.gold+(kind==='bank'?'   Bank: '+P.bank:''),150,170,{size:11,ramp:5,bright:true});
        // quests live in dialog — every keeper can be spoken to (campaign-critical)
        const hasWork=Object.keys(QUESTS).some(qid=>QUESTS[qid].giver===npcId&&(Quests.offerable(P,qid)||['active','done'].includes(Quests.status(P,qid))));
        UI.btn(24,242,118,26,hasWork?'Talk — work!':'Talk',()=>UI.open(UI.dialogScreen(npcId)),{size:9,ramp:hasWork?5:0});
        // merchant skill: best in party (rules-derived prices)
        const merch=Math.max(...P.pcs.map(pc=>pc.skills.merchant||0));
        // pc selector: services use selPc; buy/sell grids follow the ACTIVE hero's pack
        if(['temple','train','guild'].includes(kind)){
          for(let i=0;i<4;i++) UI.btn(150+i*90,52,84,22,P.pcs[i].name,()=>{ selPc=i; },{size:9,down:selPc===i});
        } else if(kind==='weapon'||kind==='armor'||kind==='tavern'){
          for(let i=0;i<4;i++) UI.btn(150+i*90,52,84,22,P.pcs[i].name,()=>{ Game.activePc=i; },{size:9,down:Game.activePc===i});
        }
        if(mode==='hello'){ UI.wrapText(npc.hello,150,90,400,11); }
        const my=190;
        switch(kind){
          case 'weapon': case 'armor': this.buySell(SHOP_STOCK[kind],merch,my); break;
          case 'tavern': {
            UI.btn(150,my,200,28,'Rest the night — '+(P.perks.freerest?'free!':Rules.tavernRestCost(P.pcs.reduce((s,p)=>s+p.level,0))+' gold'),()=>Game.tavernRest(),{size:9});
            UI.btn(150,my+34,200,28,'Hear the gossip',()=>{ mode='talk'; },{size:9});
            if(mode==='talk') UI.wrapText(NPCS.tavernkeep.rumor,150,my+76,400,11);
            this.buySell(SHOP_STOCK.tavern,merch,my+128,6);
            break;
          }
          case 'temple': {
            const pc=P.pcs[selPc];
            const cost=Rules.templeHealCost(pc);
            const needs=pc.cond!=='ok'||pc.hp<Rules.maxHP(pc)||pc.sp<Rules.maxSP(pc);
            E.text(pc.name+': '+pc.cond+', '+pc.hp+'/'+Rules.maxHP(pc)+' hp',150,my,{size:11,ramp:pc.cond==='ok'?0:14});
            if(needs) UI.btn(150,my+20,260,28,'Heal & bless — '+cost+' gold',()=>Game.templeHeal(selPc),{size:9});
            else E.text('The Light finds nothing to mend.',150,my+26,{size:9,ramp:0});
            UI.btn(150,my+58,260,28,'Donate 25 gold (blessing)',()=>Game.templeDonate(),{size:9});
            break;
          }
          case 'train': {
            const pc=P.pcs[selPc];
            const need=Rules.xpForLevel(pc.level+1);
            E.text(pc.name+' — level '+pc.level+'   XP '+pc.xp+(Rules.canTrain(pc)?'  (ready to train!)':' / '+need),150,my,{size:11,ramp:Rules.canTrain(pc)?5:0});
            if(Rules.canTrain(pc)) UI.btn(150,my+20,280,28,'Train to level '+(pc.level+1)+' — '+Rules.trainCost(pc.level)+' gold',()=>Game.trainPc(selPc),{size:9});
            else E.text('Come back with more experience — the yard teaches nothing to the unbloodied.',150,my+26,{size:9,ramp:0});
            // skill training
            const canRaise=pc.skillPoints>0;
            E.text(canRaise?('Skill instruction — '+pc.skillPoints+' point'+(pc.skillPoints===1?'':'s')+':'):'No skill points — train a level.',150,my+60,{size:9,ramp:canRaise?1:11});
            let yy=my+78; let n=0;
            for(const sk in pc.skills){ if(n++>7) break;
              const tierNext=Rules.skillTier(pc.skills[sk]+1);
              if(canRaise) UI.btn(150,yy,250,22,SKILLS[sk].name+' '+pc.skills[sk]+' → '+(pc.skills[sk]+1)+(tierNext!==Rules.skillTier(pc.skills[sk])?'  ('+tierNext+'!)':''),()=>Game.raiseSkill(selPc,sk),{size:9});
              else E.text(SKILLS[sk].name+' '+pc.skills[sk]+' ('+Rules.skillTier(pc.skills[sk])+')',160,yy+5,{size:9,ramp:11}),UI.tapRect(150,yy,250,22,()=>{});
              yy+=26;
            }
            // learn new class-legal skills
            const learnable=Object.keys(SKILLS).filter(sk=>!pc.skills[sk]&&Rules.canLearnSkill(pc.cls,sk)).slice(0,4);
            if(learnable.length){
              E.text('New instruction — '+Rules.SKILL_LEARN_COST+'g each:',430,my+60,{size:9,ramp:1});
              let ly=my+78;
              for(const sk of learnable){ UI.btn(430,ly,170,22,'Learn '+SKILLS[sk].name,()=>Game.learnSkill(selPc,sk),{size:9,ramp:P.gold>=Rules.SKILL_LEARN_COST?5:11}); ly+=26; }
            }
            break;
          }
          case 'bank': {
            UI.btn(150,my,160,28,'Deposit 100',()=>Game.bank(100),{size:9});
            UI.btn(320,my,160,28,'Deposit all',()=>Game.bank(P.gold),{size:9});
            UI.btn(150,my+34,160,28,'Withdraw 100',()=>Game.bank(-100),{size:9});
            UI.btn(320,my+34,160,28,'Withdraw all',()=>Game.bank(-P.bank),{size:9});
            E.text('Gold in the vault is safe even from your own misadventures.',150,my+80,{size:9,ramp:0});
            break;
          }
          case 'guild': {
            const pc=P.pcs[selPc];
            E.text(pc.name+'  SP '+pc.sp+'/'+Rules.maxSP(pc),150,my-6,{size:9,ramp:3});
            let yy=my+12, n=0, more=0;
            for(const id in SPELLS){ const s=SPELLS[id];
              if(!CLASSES[pc.cls].schools.includes(s.school)) continue;
              if(pc.spells.includes(id)) continue;
              if(n>=4){ more++; continue; }
              n++;
              const price=Rules.buyPrice(Spellcraft.guildPrice(id),merch);
              const afford=P.gold>=price;
              const skNow=pc.skills[s.school]||0;
              const castable=skNow>=s.req;
              const tier=s.req>=7?'Mastery':s.req>=4?'Expert':'Novice';
              UI.btn(150,yy,330,24,s.name+' ('+SKILLS[s.school].name.replace(' Magic','')+' '+tier+') — '+price+'g'+(castable?'':' — beyond skill'),()=>{
                if(!castable&&self.confirmSpell!==id){ self.confirmSpell=id; UI.say(pc.name+' cannot cast this yet ('+SKILLS[s.school].name+' '+tier+' needed) — tap again to buy anyway.'); return; }
                self.confirmSpell=null; Game.buySpell(selPc,id);
              },{size:9,ramp:!afford?11:castable?5:12});
              yy+=28;
            }
            if(!n) E.text('No further mysteries for this pupil.',150,yy+4,{size:9,ramp:0}),yy+=20;
            if(more) E.text('…'+more+' more once these are learned.',150,yy+2,{size:9,ramp:0}),yy+=16;
            this.buySell(SHOP_STOCK.guild,merch,Math.max(yy+6,300),6);
            break;
          }
        }
      },
      buySell(stock,merch,y0,maxSell){
        const E=Engine,P=Game.party,self=this;
        E.text('Wares — tap to inspect, tap again to buy',150,y0,{size:9,ramp:1});
        stock.forEach((id,i)=>{
          const x=150+(i%6)*56, y=y0+14+((i/6)|0)*56;
          const d=ITEMS[id], price=Rules.buyPrice(d.price,merch);
          const sel=self.selWare===id;
          E.fillRect(x,y,52,40,palIdx(1,sel?9:6)); E.frameRect(x,y,52,40,palIdx(sel?5:1,sel?9:3));
          E.blit(Art.icons[d.icon],24,24,x+14,y+2);
          E.textC(price+'g',x+26,y+28,{size:9,ramp:P.gold>=price?5:14});
          UI.tapRect(x,y,52,40,()=>{ if(self.selWare===id){ Game.buyItem(id); self.selWare=null; } else { self.selWare=id; Audio2.sfx('click'); } });
        });
        // inspect line for selected ware
        const infoY=y0+14+Math.ceil(stock.length/6)*56+2;
        if(this.selWare&&ITEMS[this.selWare]){
          const d=ITEMS[this.selWare];
          let inf=d.name;
          if(d.slot==='weapon') inf+='  —  '+d.dn+'d'+d.dd+(d.dp?'+'+d.dp:'')+' ['+SKILLS[d.skill].name+']';
          else if(d.ac) inf+='  —  AC +'+d.ac+(d.skill?' ['+SKILLS[d.skill].name+']':'');
          else if(d.stat) inf+='  —  +'+d.statPlus+' '+d.stat;
          else if(d.use) inf+='  —  '+(d.use==='heal'?'restores health':d.use==='mana'?'restores spell points':'cures ailments');
          E.text(inf+'   (tap again to buy)',150,infoY,{size:9,ramp:5,bright:true});
        }
        const sellY=infoY+14;
        E.text('Your goods (tap to sell) — '+P.pcs[Game.activePc].name+'’s pack',150,sellY,{size:9,ramp:1});
        let n=0; const cap=maxSell||12;
        const pc=P.pcs[Game.activePc];
        pc.items.forEach((it,ii)=>{
          if(!it||n>=cap) return; const d=ITEMS[it.id];
          if(d.slot==='quest') return;
          const x=150+(n%6)*56, y=sellY+14+((n/6)|0)*56;
          const price=Rules.sellPrice(Items.basePrice(it),merch);
          E.fillRect(x,y,52,40,palIdx(9,4)); E.frameRect(x,y,52,40,palIdx(1,3));
          E.blit(Art.icons[d.icon],24,24,x+14,y+2);
          E.textC('+'+price+'g',x+26,y+28,{size:9,ramp:2});
          UI.tapRect(x,y,52,40,()=>Game.sellItem(Game.activePc,ii));
          n++;
        });
        if(!n) E.text('(nothing to sell — the active hero’s pack is empty)',150,sellY+18,{size:9,ramp:11});
      }
    };
  },

  // ---------- rest ----------
  restScreen(){
    return { name:'rest',
      draw(){
        UI.chrome('Make Camp');
        const E=Engine, out=World.maps[Game.mapId].outdoor;
        E.textC(out?'The road is no inn — beasts prowl at night.':'You settle between cold stones.',SCREEN_W/2,110,{size:11,ramp:0});
        UI.btn(SCREEN_W/2-120,160,240,32,'Rest 8 hours (heal & recover)',()=>Game.doRest(),{size:11});
        UI.btn(SCREEN_W/2-120,200,240,32,'Wait 1 hour',()=>{ Game.advanceMinutes(60); UI.close(); },{size:11});
        E.textC('Poison and disease do not sleep. The temple cures what rest cannot.',SCREEN_W/2,260,{size:9,ramp:0});
      }
    };
  },

  // ---------- victory ----------
  victoryScreen(){
    return { name:'victory',
      draw(){
        const E=Engine;
        E.blit(Art.ui.parchment,SCREEN_W,SCREEN_H,0,0);
        E.blit(Art.icons.crown,24,24,SCREEN_W/2-36,20,{scale:3});
        E.textC('THE CROWN RETURNS',SCREEN_W/2,96,{size:22,ramp:5,bright:true});
        const cp=Clock.parts(Game.clock.min);
        const lines=[
          'The Lich is dust. The Vault stands open, and the Crown of',
          'Vintavia rests once more above the mayor’s hearth.',
          '','Bards will argue the details. The fangs, the ledger, the silver',
          'censer — all of it true, and all of it yours.',
          '','Heroes of Vintavia:',
          ...Game.party.pcs.map(pc=>'   '+pc.name+' the '+CLASSES[pc.cls].name+', level '+pc.level),
          '','Completed on '+cp.dayName+', '+cp.month+' '+cp.dom+' at '+cp.hhmm,
          'Monsters slain: '+Game.stats.kills+'    Gold earned: '+Game.stats.goldEarned,
        ];
        lines.forEach((l,i)=>E.textC(l,SCREEN_W/2,130+i*20,{size:11,ramp:1}));
        UI.btn(SCREEN_W/2-90,SCREEN_H-60,180,32,'Play on',()=>UI.close());
      }
    };
  },
};
