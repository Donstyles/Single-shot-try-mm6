#!/usr/bin/env node
// E2E gameplay test — drives the REAL build through HUMAN paths (title → chargen → play).
// Asserts observable state through __session dumps. Run: node test/e2e.test.js
'use strict';
const {chromium}=require('playwright');
const path=require('path');

let pass=0,fail=0; const failures=[];
function ok(c,msg){ if(c) pass++; else { fail++; failures.push(msg); console.error('FAIL: '+msg); } }

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const page=await browser.newPage({viewport:{width:932,height:430},deviceScaleFactor:2});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
  await page.goto('file://'+path.resolve(__dirname,'..','dist','index.html'));
  await page.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='title',null,{timeout:20000});
  ok(true,'boot reaches title');

  const S=()=>page.evaluate(()=>window.__session);
  const tap=(x,y)=>page.evaluate(([x,y])=>__game.tap(x,y),[x,y]);

  // ---------- HUMAN PATH: title -> chargen -> begin ----------
  await tap(320,317); // New Game
  await page.waitForFunction(()=>typeof UI!=='undefined'&&UI.screen&&UI.screen.name==='chargen');
  ok(true,'chargen opens from title tap');
  // fiddle: raise knight might via + button then begin
  await tap(457,130); // + on first attr row
  await tap(530,437); // Begin!
  await page.waitForFunction(()=>Game.state==='play');
  let s=await S();
  ok(s.party.pcs.length===4,'party of 4 created');
  ok(s.party.pcs.every(p=>p.hp>0&&p.hp===p.maxHp),'all pcs at full hp (chargen path)');
  ok(s.party.pcs[0].hp>30,'knight hp sane: '+s.party.pcs[0].hp);
  ok(s.party.pcs[3].maxSp>0,'sorcerer has sp');
  ok(s.party.gold===200,'starting gold 200');
  ok(s.mapId==='outdoor','spawn on outdoor map');

  // ---------- movement + collision ----------
  const p0=await page.evaluate(()=>({x:Game.px,y:Game.py}));
  await page.evaluate(()=>__game.walk(700));
  let p1=await page.evaluate(()=>({x:Game.px,y:Game.py}));
  ok(Math.hypot(p1.x-p0.x,p1.y-p0.y)>1,'walking moves the party');
  // collision battery: ram walls from 4 directions at town wall corner
  for(const [ang,name] of [[0,'east'],[Math.PI/2,'south'],[Math.PI,'west'],[-Math.PI/2,'north']]){
    await page.evaluate(a=>{ __game.teleport(31.5,31.5,a); },ang);
    await page.evaluate(()=>__game.walk(2500));
    const p=await page.evaluate(()=>({x:Game.px,y:Game.py,cell:World.maps.outdoor.cells[(Game.py|0)*96+(Game.px|0)]}));
    ok(p.cell===0,'no wall clip ramming '+name+' (cell='+p.cell+')');
  }
  // monster-block: spawn wall of goblins, ram them
  await page.evaluate(()=>{ __game.teleport(40.5,50.5,0); for(let i=-1;i<=1;i++) __game.spawn('goblin',1.2,i*0.7); });
  await page.evaluate(()=>__game.walk(1200));
  s=await S();
  ok(s.monstersNear.every(m=>Math.hypot(m.x-s.pos.x,m.y-s.pos.y)>0.4),'monsters block, no overlap');

  // ---------- combat through the human attack path ----------
  await page.evaluate(()=>{ World.maps.outdoor.monsters=World.maps.outdoor.monsters.filter(m=>Math.hypot(m.x-Game.px,m.y-Game.py)>6); });
  await page.evaluate(()=>{ __game.teleport(40.5,52.5,0); __game.spawn('goblin',1.3,0); __game.face(Game.px+1.3,Game.py); });
  const xp0=(await S()).party.pcs[0].xp;
  for(let i=0;i<25;i++){
    await page.evaluate(()=>{ __game.press('attack'); __game.step(900); });
    const st=await S();
    if(!st.monstersNear.some(m=>m.mid==='goblin')) break;
  }
  s=await S();
  ok(!s.monstersNear.some(m=>m.mid==='goblin'),'goblin dies to F-key attacks');
  ok(s.party.pcs[0].xp>xp0,'xp awarded on kill: '+s.party.pcs[0].xp);
  ok(s.corpsesNear>0,'corpse remains to loot');
  const gold0=s.party.gold, corpses0=s.corpsesNear;
  await page.evaluate(()=>__game.press('interact'));
  s=await S();
  ok(s.party.gold>gold0,'looting corpse yields gold');
  ok(s.corpsesNear===corpses0-1,'corpse consumed after loot');
  for(let i=0;i<8&&s.corpsesNear>0;i++){ // sweep leftovers from chase-in kills
    await page.evaluate(()=>{ const c=Game.corpses.find(c=>c.mapId===Game.mapId&&!c.looted); if(c){ __game.teleport(c.x-0.8,c.y); __game.press('interact'); } });
    s=await S();
  }

  // ---------- spellcasting ----------
  await page.evaluate(()=>{ Game.activePc=3; __game.spawn('goblin',2.0,0); __game.face(Game.px+2,Game.py); });
  const sp0=(await S()).party.pcs[3].sp;
  await page.evaluate(()=>{ __game.press('cast'); __game.step(800); });
  s=await S();
  ok(s.party.pcs[3].sp===sp0-2,'fire bolt costs exactly 2 sp (was '+sp0+', now '+s.party.pcs[3].sp+')');

  // ---------- panels open AND close ----------
  for(const [action,name] of [['inventory','inventory'],['spellbook','spellbook'],['quests','quests'],['map','map']]){
    await page.evaluate(a=>__game.press(a),action);
    s=await S(); ok(s.screen===name,name+' opens');
    await page.evaluate(a=>__game.press(a),action);
    s=await S(); ok(s.screen===null,name+' closes');
  }

  // ---------- shop: buy and sell round-trip with honest gold ----------
  await page.evaluate(()=>{ __game.teleport(33.5,35.5,-Math.PI/2); __game.press('interact'); }); // weapon shop door
  s=await S();
  ok(s.screen==='shop_weapon','weapon shop opens at door');
  const g1=s.party.gold;
  const bought=await page.evaluate(()=>{ // buy first stock item via the same path a tap uses
    const before=Game.party.gold;
    Game.buyItem('dagger',Rules.buyPrice(ITEMS.dagger.price,Math.max(...Game.party.pcs.map(pc=>pc.skills.merchant||0))));
    return before-Game.party.gold;
  });
  s=await S();
  ok(bought>0&&s.party.gold===g1-bought,'buying moves exact gold ('+bought+'g)');
  ok(s.party.pcs.some(p=>p.items.includes('dagger')),'bought dagger in a pack');
  await page.evaluate(()=>UI.close());

  // ---------- quest flow: accept via dialog, complete, turn in ----------
  await page.evaluate(()=>{ __game.teleport(59.5,37.5,Math.PI/2); __game.press('interact'); }); // town hall door (C at x=30+29=59,y=40? adjust below if fails)
  s=await S();
  const hallOpen=s.screen==='dialog'||s.screen==='shop_hall';
  if(!hallOpen){ // locate hall door programmatically and retry (door coords vary)
    await page.evaluate(()=>{ const sh=World.maps.outdoor.shops.find(s=>s.shop==='hall'); __game.teleport(sh.x+0.5,sh.y+1.5,-Math.PI/2); __game.press('interact'); });
    s=await S();
  }
  ok(s.screen==='dialog','mayor dialog opens: '+s.screen);
  await page.evaluate(()=>{ Game.acceptQuest('main1'); UI.close(); });
  s=await S();
  ok(s.party.quests.main1&&s.party.quests.main1.state==='active','main1 active');
  // kill the bandit captain via combat loop (clear his gang first — this tests quest flow, not survival)
  await page.evaluate(()=>{ World.maps.outdoor.monsters=World.maps.outdoor.monsters.filter(m=>!(m.mid==='bandit'||m.mid==='bandit_bow'));
    __game.teleport(70.5,18.5,0); const b=World.maps.outdoor.monsters.find(m=>m.mid==='bandit_boss'); __game.face(b.x,b.y); });
  for(let i=0;i<80;i++){
    await page.evaluate(()=>{ // keep party standing: this asserts quest flow, not attrition
      for(const pc of Game.party.pcs){ pc.hp=Rules.maxHP(pc); if(pc.cond==='unconscious') pc.cond='ok'; }
      const b=World.maps.outdoor.monsters.find(m=>m.mid==='bandit_boss'&&m.hp>0);
      if(b){ __game.teleport(b.x-1.2,b.y,0); __game.face(b.x,b.y); __game.press('attack'); } __game.step(900); });
    if(!(await page.evaluate(()=>World.maps.outdoor.monsters.some(m=>m.mid==='bandit_boss'&&m.hp>0)))) break;
  }
  ok(await page.evaluate(()=>!World.maps.outdoor.monsters.some(m=>m.mid==='bandit_boss'&&m.hp>0)),'bandit captain slain');
  await page.evaluate(()=>{ const c=Game.corpses.find(c=>c.mid==='bandit_boss'); __game.teleport(c.x-1,c.y,0); __game.press('interact'); });
  s=await S();
  ok(s.party.quests.main1.state==='done','ledger loot completes main1');
  await page.evaluate(()=>{ Game.turnInQuest('main1'); });
  s=await S();
  ok(s.party.quests.main1.state==='turned','main1 turns in');
  ok(s.party.gold>=g1-bought+300,'quest gold paid');

  // ---------- save / load round-trip (manual vs autosave separation) ----------
  await page.evaluate(()=>{ __game.teleport(48.5,37.5,0); __game.save('manual'); });
  const goldAtSave=(await S()).party.gold;
  await page.evaluate(()=>{ __game.gold(1234); Game.clock.min+=999; __game.save('auto'); });
  await page.evaluate(()=>__game.load('manual'));
  s=await S();
  ok(s.party.gold===goldAtSave,'manual load restores gold exactly');
  ok(s.party.quests.main1.state==='turned','quests survive save/load');
  // autosave must not have been touched by manual ops
  const autoGold=await page.evaluate(()=>JSON.parse(localStorage.getItem('vintavia_auto')).party.gold);
  ok(autoGold===goldAtSave+1234,'autosave slot independent of manual');

  // ---------- every input binding reaches its consumer ----------
  const bindingResults=await page.evaluate(()=>{
    const results={};
    const orig=Game.press.bind(Game);
    let last=null;
    Game.press=(a)=>{ last=a; orig(a); };
    for(const action in BINDINGS){
      for(const code of BINDINGS[action]){
        last=null;
        dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));
        results[action+':'+code]=(last===action);
        dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));
        if(UI.screen&&['inventory','spellbook','quests','map','menu'].includes(UI.screen.name)) UI.close();
      }
    }
    Game.press=orig;
    Game.turnBased=false; Game.tbBudget=0; // the sweep toggled modes — normalize
    return results;
  });
  for(const k in bindingResults) ok(bindingResults[k],'binding fires consumer: '+k);

  // ---------- rest ----------
  await page.evaluate(()=>{ Game.party.pcs[0].hp=5; __game.press('rest'); });
  s=await S();
  ok(s.screen==='rest','rest menu opens');
  await page.evaluate(()=>{ RNG.get('rest').state=12345; Game.doRest(); }); // deterministic; may ambush or heal
  s=await S();
  ok(s.party.pcs[0].hp>5||s.monstersNear.some(m=>m.state==='chase'),'rest heals or ambushes');

  // ---------- dungeon transition ----------
  await page.evaluate(()=>{ __game.teleport(83.5,40.5,0); __game.face(84.5,40.5); __game.press('interact'); });
  await page.waitForFunction(()=>Game.mapId==='dun1',null,{timeout:5000}).catch(()=>{});
  s=await S();
  ok(s.mapId==='dun1','crypt entrance leads to dun1');

  // ---------- turn-based mode freezes monsters ----------
  await page.evaluate(()=>{ __game.press('turnBased'); __game.spawn('skeleton',3,0); });
  const mpos0=await page.evaluate(()=>{ const m=World.maps.dun1.monsters.filter(m=>m.hp>0).map(m=>[m.x,m.y]); return JSON.stringify(m); });
  await new Promise(r=>setTimeout(r,700)); // real time passes, sim must not
  const mpos1=await page.evaluate(()=>{ const m=World.maps.dun1.monsters.filter(m=>m.hp>0).map(m=>[m.x,m.y]); return JSON.stringify(m); });
  ok(mpos0===mpos1,'turn-based freezes monsters');
  await page.evaluate(()=>__game.press('turnBased'));

  // ---------- performance ----------
  await page.evaluate(()=>{ __game.gotoMap('outdoor',48.5,38.5); });
  await new Promise(r=>setTimeout(r,1200));
  const perf=await page.evaluate(()=>({avg:Engine.frameAvg,scale:Engine.renderScale}));
  ok(perf.avg<16,'render under 16ms avg (got '+perf.avg.toFixed(1)+'ms at scale '+perf.scale+')');

  ok(errors.length===0,'no page errors: '+errors.slice(0,3).join(' | '));

  await page.screenshot({path:'test/shots/e2e_final.png'});
  await browser.close();
  console.log('\nE2E: '+pass+' passed, '+fail+' failed');
  if(failures.length) console.log(failures.map(f=>'  - '+f).join('\n'));
  process.exit(fail?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
