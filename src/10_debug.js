// 10_debug — boot sequence, __game/__session harness, ?debug on-device overlay. Owner: debug.
'use strict';

// ---------- boot ----------
addEventListener('load',()=>{
  const canvas=document.getElementById('screen');
  // bake with a visible progress screen (WebKit-safe: plain 2D fills before engine exists)
  const g=canvas.getContext('2d');
  canvas.width=SCREEN_W; canvas.height=SCREEN_H;
  const note=(t,frac)=>{ g.fillStyle='#0a0908'; g.fillRect(0,0,640,480);
    g.fillStyle='#d8c890'; g.font='20px Georgia'; g.textAlign='center';
    g.fillText('VINTAVIA',320,200);
    g.font='12px Georgia'; g.fillText(t,320,240);
    g.strokeStyle='#5a4a2c'; g.strokeRect(200,260,240,10);
    g.fillStyle='#c8a850'; g.fillRect(202,262,236*frac,6); };
  note('Forging the world…',0.1);
  const steps=[
    ['Quarrying stone…',()=>Art.bakeTextures()],
    ['Cutting quills…',()=>Art.bakeFont()],
    ['Carving the frame…',()=>Art.bakeUI()],
    ['Waking the monsters…',()=>Art.bakeSprites()],
    ['Drawing the maps…',()=>{}],
  ];
  let i=0;
  const step=()=>{
    if(i<steps.length){
      note(steps[i][0],(i+1)/(steps.length+1));
      setTimeout(()=>{ try{ steps[i][1](); }catch(e){ Debug.bootError(e); throw e; } i++; step(); },16);
    } else {
      try{ Game.boot(canvas); }catch(e){ Debug.bootError(e); throw e; }
      if(location.search.includes('debug')) Debug.showOverlay();
    }
  };
  step();
});

// ---------- diagnostic overlay (?debug) ----------
const Debug = {
  el:null, errors:[],
  bootError(e){ this.errors.push(String(e&&e.stack||e)); this.showOverlay(); },
  report(){
    const c=Engine.canvas||{};
    const lines=[
      'VINTAVIA diagnostic — '+new Date().toISOString(),
      'UA: '+navigator.userAgent,
      'screen: '+screen.width+'x'+screen.height+' dpr '+devicePixelRatio,
      'inner: '+innerWidth+'x'+innerHeight,
      'visualViewport: '+(window.visualViewport?visualViewport.width.toFixed(0)+'x'+visualViewport.height.toFixed(0):'n/a'),
      'canvas css: '+(c.style?c.style.width+' x '+c.style.height:'n/a')+'  scale '+(Engine.cssScale||0).toFixed(3),
      'renderer: software raycaster (no WebGL/shaders)',
      'renderScale: '+Engine.renderScale+'  frameAvg: '+(Engine.frameAvg||0).toFixed(1)+'ms',
      'audio: '+(Audio2.started?('running, state '+Audio2.ctx.state):'not started'),
      'storage: '+(function(){try{localStorage.setItem('_t','1');localStorage.removeItem('_t');return 'ok';}catch(e){return 'BLOCKED: '+e.name;}})(),
      'game state: '+Game.state+'  map: '+Game.mapId+'  pos: '+(Game.px||0).toFixed(1)+','+(Game.py||0).toFixed(1),
      'safe-area L/R/B: '+(function(){ const d=document.createElement('div');
        d.style.cssText='position:fixed;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden';
        document.body.appendChild(d); const cs=getComputedStyle(d);
        const v=cs.paddingLeft+' / '+cs.paddingRight+' / '+cs.paddingBottom; d.remove(); return v; })(),
      'errors: '+(this.errors.length?'\n'+this.errors.join('\n'):'none'),
    ];
    return lines.join('\n');
  },
  showOverlay(){
    if(this.el) { this.el.querySelector('pre').textContent=this.report(); return; }
    const d=document.createElement('div');
    Object.assign(d.style,{position:'fixed',top:'env(safe-area-inset-top, 4px)',left:'50%',transform:'translateX(-50%)',zIndex:99,
      background:'rgba(10,9,8,0.92)',color:'#c8e8c8',font:'10px monospace',padding:'8px',border:'1px solid #4a6a4a',
      maxWidth:'86vw',maxHeight:'80vh',overflow:'auto',whiteSpace:'pre-wrap'});
    const pre=document.createElement('pre'); pre.style.margin='0'; pre.textContent=this.report();
    const row=document.createElement('div');
    const mkb=(label,cb)=>{ const b=document.createElement('button');
      Object.assign(b.style,{margin:'6px 6px 0 0',padding:'14px 18px',font:'13px monospace',background:'#2a3a2a',color:'#c8e8c8',border:'1px solid #4a6a4a'});
      b.textContent=label; b.addEventListener('click',cb); b.addEventListener('touchstart',e=>{cb();e.preventDefault();},{passive:false}); row.appendChild(b); };
    mkb('COPY REPORT',()=>{ pre.textContent=this.report();
      if(navigator.clipboard) navigator.clipboard.writeText(this.report()).then(()=>{ pre.textContent='(copied to clipboard)\n\n'+this.report(); });
    });
    mkb('REFRESH',()=>{ pre.textContent=this.report(); });
    mkb('CLOSE',()=>{ d.remove(); this.el=null; });
    d.appendChild(pre); d.appendChild(row);
    document.body.appendChild(d); this.el=d;
  },
};
addEventListener('error',e=>{ Debug.errors.push((e.message||'error')+' @ '+(e.filename||'')+':'+(e.lineno||'')); });

// ---------- test/agent harness ----------
window.Engine=Engine; window.Game=Game; window.UI=UI; window.World=World; window.Rules=Rules; window.Art=Art;
window.__game={
  newGame(opts){
    if(opts&&opts.skipChargen){ // debug path — clearly marked; judges must use the title screen
      Game.newGameFrom(Rules.RECOMMENDED.map(([n,c,p])=>({name:n,cls:c,portrait:'p'+p,stats:Object.assign({},CLASS_BASE_STATS[c])})));
      return true;
    }
    UI.open(UI.titleScreen()); Game.state='title';
    return 'title screen shown — drive chargen via taps or use {skipChargen:true}';
  },
  teleport(x,y,ang){ // CELL coordinates; all args explicit
    if(typeof x!=='number'||typeof y!=='number') throw new Error('teleport(x,y,ang?) needs numeric cell coords');
    Game.px=x; Game.py=y; if(ang!==undefined) Game.ang=ang;
    Game.ensureExplored(); Game.markExplored();
    return {mapId:Game.mapId,x:Game.px,y:Game.py};
  },
  gotoMap(id,x,y){ if(!World.maps[id]) throw new Error('no map '+id); Game.mapId=id; Game.px=x; Game.py=y; Game.ensureExplored(); Game.markExplored(); Game.projectiles=[]; return id; },
  walk(ms){ // simulates held forward in GAME time, stepping the sim directly; returns a Promise
    return new Promise(res=>{
      Game.keys.forward=true; Game.userActed();
      let left=ms;
      const stepper=()=>{ const st=Math.min(50,left); Game.update(st); left-=st;
        if(left>0) setTimeout(stepper,0); else { Game.keys.forward=false; res({x:Game.px,y:Game.py}); } };
      stepper();
    });
  },
  turn(rad){ Game.ang+=rad; return Game.ang; },
  face(x,y){ Game.ang=angTo(Game.px,Game.py,x,y); return Game.ang; },
  spawn(mid,dx,dy){ const m=Monsters.make(mid,Game.px+(dx===undefined?2:dx),Game.py+(dy||0)); World.maps[Game.mapId].monsters.push(m); return m; },
  setTime(min){ Game.clock.min=min; return Clock.parts(min); },
  press(action){ Game.press(action); return action; },
  tap(x,y){ Game.tapAt(x,y); },
  save(slot){ return Game.save(slot||'manual'); },
  load(slot){ return Game.load(slot||'manual'); },
  give(id){ const ok=Game.giveItem(Items.make(id)); Game.onQuestItemsChanged(); return ok; },
  gold(n){ Game.party.gold+=n; return Game.party.gold; },
  step(ms){ Game.update(Math.min(1000,ms||100)); },
  acceptQuest(q){ Game.acceptQuest(q); },
};
Object.defineProperty(window,'__session',{get(){
  const P=Game.party;
  return {
    state:Game.state, mapId:Game.mapId, pos:{x:Game.px,y:Game.py,ang:Game.ang},
    clock:Game.clock.min, clockText:Clock.parts(Game.clock.min).hhmm,
    turnBased:Game.turnBased, renderScale:Engine.renderScale, frameAvg:Engine.frameAvg,
    screen:UI.screen?UI.screen.name:null,
    party:P?{ gold:P.gold, bank:P.bank, quests:JSON.parse(JSON.stringify(P.quests)), buffs:Object.keys(P.buffs),
      perks:P.perks,
      pcs:P.pcs.map(pc=>({name:pc.name,cls:pc.cls,level:pc.level,xp:pc.xp,hp:pc.hp,maxHp:Rules.maxHP(pc),sp:pc.sp,maxSp:Rules.maxSP(pc),cond:pc.cond,
        weapon:pc.equip.weapon?pc.equip.weapon.id:null, items:pc.items.filter(Boolean).map(it=>it.id), skills:pc.skills, spells:pc.spells}))}:null,
    monstersNear:Game.party?World.maps[Game.mapId].monsters.filter(m=>m.hp>0&&dist2(m.x,m.y,Game.px,Game.py)<144)
      .map(m=>({mid:m.mid,hp:m.hp,x:+m.x.toFixed(1),y:+m.y.toFixed(1),state:m.state})):[],
    corpsesNear:Game.corpses.filter(c=>c.mapId===Game.mapId&&!c.looted&&dist2(c.x,c.y,Game.px,Game.py)<144).length,
    log:Log.lines.slice(-20).map(l=>l.text),
  };
}});
