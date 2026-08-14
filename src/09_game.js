// 09_game — game state, main loop, input, combat, movement, save/load. Owner: game.
// All math via Rules/Spellcraft/Items/Loot — this file moves data, never re-derives formulas.
'use strict';

const SAVE_VERSION=3;
const BINDINGS={ // every action here MUST have a consumer (asserted by tests)
  forward:['KeyW','ArrowUp'], back:['KeyS','ArrowDown'],
  strafeL:['KeyA'], strafeR:['KeyD'], turnL:['ArrowLeft'], turnR:['ArrowRight'],
  attack:['KeyF'], cast:['KeyC'], interact:['Space','KeyE'],
  turnBased:['KeyT'], inventory:['KeyI'], spellbook:['KeyB'], quests:['KeyQ'],
  map:['KeyM'], rest:['KeyR'], menu:['Escape'], nextPc:['Tab'],
};

const Game = {
  state:'boot', party:null, clock:{min:Clock.START},
  mapId:'outdoor', px:0, py:0, ang:0, bob:0, bobPh:0,
  activePc:0, turnBased:false, tbBudget:0,
  keys:{}, projectiles:[], corpses:[], fade:null,
  explored:{}, flags:{chests:{},doors:{}}, stats:{kills:0,goldEarned:0},
  graceUntilInput:true, lastAutoNote:0, victoryShown:false,
  moveJoy:{x:0,y:0}, lookVel:0,

  // ---------- boot / new game ----------
  boot(canvas){
    Engine.init(canvas);
    World.build();
    this.state='title';
    UI.open(UI.titleScreen());
    this.initInput();
    this.loop(performance.now());
  },
  newGameFrom(drafts){
    RNG.reset();
    World.build(); // fresh monsters
    const pcs=drafts.map(d=>{
      const pc=Rules.makePC(d.name,d.cls,d.portrait,d.stats);
      pc.spells=Spellcraft.starting(d.cls).slice();
      pc.hp=Rules.maxHP(pc); pc.sp=Rules.maxSP(pc);
      pc.recovery=0;
      return pc;
    });
    // starter gear (equipped through the same path the player would use)
    const starter={knight:['shortsword','padded'],paladin:['mace','padded'],archer:['shortbow','padded'],
      cleric:['club','padded'],sorcerer:['quarterstaff','padded'],druid:['dagger','padded']};
    pcs.forEach(pc=>{
      for(const id of starter[pc.cls]||[]){ const it=Items.make(id);
        const d=ITEMS[id];
        if(Items.canEquip(pc,it)) pc.equip[d.slot==='weapon'?'weapon':d.slot]=it;
        else this.giveItemTo(pc,it); // never silently vanish a starter item
      }
      pc.items[0]=pc.items[0]||Items.make('bread'); pc.items[1]=pc.items[1]||Items.make('potion_heal');
    });
    this.party={pcs,gold:200,bank:0,quests:{},buffs:{},perks:{}};
    this.clock={min:Clock.START};
    const sp=World.spawnPoint();
    this.mapId=sp.map; this.px=sp.x; this.py=sp.y; this.ang=sp.ang;
    this.projectiles=[]; this.corpses=[]; this.explored={}; this.flags={chests:{},doors:{}};
    this.stats={kills:0,goldEarned:0}; this.activePc=0; this.turnBased=false;
    this.graceUntilInput=true; this.victoryShown=false;
    this.ensureExplored(); this.markExplored();
    this.exploreRect(29,30,37,16); // home town is known ground from day one
    this.state='play'; UI.close();
    Log.lines.length=0;
    Log.add('Vintavia, at last. The mayor is said to pay for bold hands.');
    Log.add('ontouchstart' in window? 'The weapon smith is just ahead — walk up and tap Use to talk.'
      : 'The weapon smith is just ahead — talk to folk with Space.');
    Audio2.setTrack('town');
  },

  // ---------- input ----------
  initInput(){
    const act=(code)=>{ for(const a in BINDINGS) if(BINDINGS[a].includes(code)) return a; return null; };
    addEventListener('keydown',e=>{
      if(e.repeat) return;
      Audio2.unlock();
      const a=act(e.code); if(!a) return;
      e.preventDefault();
      this.keys[a]=true; this.press(a);
    });
    addEventListener('keyup',e=>{ const a=act(e.code); if(a) this.keys[a]=false; });
    // pointer: tap = UI hit or viewport action; drag on viewport = look
    const cv=Engine.canvas; let drag=null;
    const pt=e=>{ const t=e.touches?e.touches[0]:e; return Engine.toGame(t.clientX,t.clientY); };
    const down=e=>{ Audio2.unlock(); const p=pt(e); drag={x:p.x,y:p.y,moved:0,t:performance.now()}; e.preventDefault(); };
    const move=e=>{ if(!drag) return; const p=pt(e);
      const inVP=drag.x>=VP.x&&drag.x<VP.x+VP.w&&drag.y>=VP.y&&drag.y<VP.y+VP.h;
      if(inVP&&this.state==='play'&&!UI.screen){ const dx=p.x-drag.x; this.ang+=dx*0.0055; this.userActed(); }
      drag.moved+=Math.abs(p.x-drag.x)+Math.abs(p.y-drag.y); drag.x=p.x; drag.y=p.y; e.preventDefault(); };
    const up=e=>{ if(!drag) return;
      if(drag.moved<10&&performance.now()-drag.t<600){ this.tapAt(drag.x,drag.y); }
      drag=null; e.preventDefault(); };
    cv.addEventListener('mousedown',down); addEventListener('mousemove',move); addEventListener('mouseup',up);
    cv.addEventListener('touchstart',down,{passive:false}); cv.addEventListener('touchmove',move,{passive:false}); addEventListener('touchend',up,{passive:false});
    this.initTouchPads();
  },
  _pads:[],
  padVisibility(on){ for(const p of this._pads) p.style.display=on?'':'none'; },
  initTouchPads(){
    if(!('ontouchstart' in window)) return;
    const mk=(css)=>{ const d=document.createElement('div'); Object.assign(d.style,{position:'fixed',zIndex:10,userSelect:'none',webkitUserSelect:'none',touchAction:'none',
      fontFamily:'Georgia,serif',color:'#d8c890',textAlign:'center',
      background:'radial-gradient(circle at 35% 30%, #5a564e, #37342e 70%)',border:'2px solid #201e1a',boxShadow:'inset 0 1px 0 #7a766c, 0 2px 6px #000a',...css});
      document.body.appendChild(d); return d; };
    // left: joystick (safe-area aware, clear of home indicator)
    const joy=mk({left:'calc(env(safe-area-inset-left, 0px) + 14px)',bottom:'calc(env(safe-area-inset-bottom, 0px) + 18px)',width:'118px',height:'118px',borderRadius:'50%',opacity:0.85});
    const nub=mk({left:'0',top:'0',width:'52px',height:'52px',borderRadius:'50%',opacity:0.95,position:'absolute',background:'radial-gradient(circle at 35% 30%, #8a8478, #4a463e 70%)'});
    joy.appendChild(nub); nub.style.left='33px'; nub.style.top='33px';
    const setJoy=(dx,dy)=>{ const m=Math.hypot(dx,dy)||1, c=Math.min(m,42);
      nub.style.left=(33+dx/m*c)+'px'; nub.style.top=(33+dy/m*c)+'px';
      this.moveJoy={x:dx/42,y:dy/42}; };
    joy.addEventListener('touchstart',e=>{ Audio2.unlock(); e.preventDefault(); },{passive:false});
    joy.addEventListener('touchmove',e=>{ const t=e.touches[0], r=joy.getBoundingClientRect();
      setJoy(t.clientX-(r.left+61),t.clientY-(r.top+61)); e.preventDefault(); },{passive:false});
    joy.addEventListener('touchend',e=>{ setJoy(0,0); this.moveJoy={x:0,y:0}; e.preventDefault(); },{passive:false});
    // right: action buttons ≥ 44pt, above the home indicator
    const mkBtn=(label,off,cb)=>{ const b=mk({right:'calc(env(safe-area-inset-right, 0px) + 14px)',bottom:'calc(env(safe-area-inset-bottom, 0px) + '+off+'px)',width:'86px',height:'48px',borderRadius:'10px',lineHeight:'48px',fontSize:'15px'});
      b.textContent=label;
      b.addEventListener('touchstart',e=>{ Audio2.unlock(); b.style.filter='brightness(1.3)'; cb(); e.preventDefault(); },{passive:false});
      b.addEventListener('touchend',e=>{ b.style.filter=''; e.preventDefault(); },{passive:false});
      return b; };
    this._pads=[joy,
      mkBtn('Attack',18,()=>this.press('attack')),
      mkBtn('Use',76,()=>this.press('interact')),
      mkBtn('Cast',134,()=>this.press('cast')),
      mkBtn('Pack',192,()=>this.press('inventory'))];
    this.padVisibility(false); // shown only in play, outside screens
    // portrait-orientation hint
    const hint=document.createElement('div');
    Object.assign(hint.style,{position:'fixed',inset:'0',zIndex:20,display:'none',alignItems:'center',justifyContent:'center',
      background:'rgba(10,9,8,0.88)',color:'#d8c890',font:'20px Georgia',textAlign:'center'});
    hint.innerHTML='<div style="text-align:center">Turn your phone sideways ⟳<br><span style="font-size:13px;color:#8a8478">Vintavia is played in landscape</span></div>';
    document.body.appendChild(hint);
    const orient=()=>{ hint.style.display=(innerHeight>innerWidth)?'flex':'none'; };
    addEventListener('resize',orient); orient();
  },
  userActed(){ if(this.graceUntilInput){ this.graceUntilInput=false; } },
  press(action){ // single consumer per action — also the test/touch entry point
    if(this.state==='title'||this.state==='boot') return;
    switch(action){
      case 'attack': if(!UI.screen) this.partyAttack(); this.userActed(); break;
      case 'cast': if(!UI.screen) this.quickCast(); this.userActed(); break;
      case 'interact': if(!UI.screen) this.interact(); this.userActed(); break;
      case 'turnBased': this.toggleTurnBased(); break;
      case 'inventory': UI.screen&&UI.screen.name==='inventory'?UI.close():UI.open(UI.invScreen()); break;
      case 'spellbook': UI.screen&&UI.screen.name==='spellbook'?UI.close():UI.open(UI.spellScreen(this.activePc)); break;
      case 'quests': UI.screen&&UI.screen.name==='quests'?UI.close():UI.open(UI.questScreen()); break;
      case 'map': UI.screen&&UI.screen.name==='map'?UI.close():UI.open(UI.mapScreen()); break;
      case 'rest': if(!UI.screen) this.tryRest(); break;
      case 'menu': if(UI.screen&&UI.screen.name==='victory') break; UI.screen?UI.close():UI.open(UI.menuScreen()); break;
      case 'nextPc': this.activePc=(this.activePc+1)%4; break;
      case 'forward': case 'back': case 'strafeL': case 'strafeR': case 'turnL': case 'turnR':
        this.userActed(); if(this.turnBased) this.tbBudget=Math.max(this.tbBudget,260); break;
    }
  },
  tapAt(gx,gy){ UI.tap(gx,gy); },
  viewportTap(lx,ly){
    // tap in 3D view: fight if anything is in reach or sighted, else interact
    const t=this.currentTarget();
    const near=World.maps[this.mapId].monsters.some(m=>m.hp>0&&dist2(m.x,m.y,this.px,this.py)<2.4*2.4);
    if(near||(t&&Math.abs(lx-VP.w/2)<VP.w*0.35)) this.partyAttack();
    else this.interact();
  },

  // ---------- main loop ----------
  loop(now){
    requestAnimationFrame(t=>this.loop(t));
    const dt=Math.min(50,now-(this._last||now)); this._last=now;
    Art.tick(now);
    const padsOn=this.state==='play'&&!UI.screen;
    if(padsOn!==this._padsOn){ this._padsOn=padsOn; this.padVisibility(padsOn); }
    if(this.state==='play'&&!UI.screen){
      const simDt=this.turnBased? Math.min(dt,this.tbBudget):dt;
      if(simDt>0){ this.update(simDt); if(this.turnBased) this.tbBudget-=simDt; }
      else this.updatePlayerOnly(dt); // turn-based: player may still turn camera
    }
    this.draw(now);
  },
  updatePlayerOnly(dt){
    const turn=(this.keys.turnL?-1:0)+(this.keys.turnR?1:0);
    this.ang+=turn*2.6*dt/1000;
  },
  update(dt){
    const s=dt/1000;
    // clock: 1 real second = 1 game minute
    this._minAcc=(this._minAcc||0)+s;
    while(this._minAcc>=1){ this._minAcc-=1; this.advanceMinutes(1,true); }
    // movement
    const spd=3.2, turn=(this.keys.turnL?-1:0)+(this.keys.turnR?1:0);
    this.ang+=turn*2.6*s;
    let mx=0,my=0;
    const f=(this.keys.forward?1:0)-(this.keys.back?1:0);
    const st=(this.keys.strafeR?1:0)-(this.keys.strafeL?1:0);
    mx+=Math.cos(this.ang)*f+Math.cos(this.ang+Math.PI/2)*st;
    my+=Math.sin(this.ang)*f+Math.sin(this.ang+Math.PI/2)*st;
    // touch joystick: y = forward, x = strafe
    if(this.moveJoy.x||this.moveJoy.y){
      mx+=Math.cos(this.ang)*(-this.moveJoy.y)+Math.cos(this.ang+Math.PI/2)*this.moveJoy.x;
      my+=Math.sin(this.ang)*(-this.moveJoy.y)+Math.sin(this.ang+Math.PI/2)*this.moveJoy.x;
    }
    const mlen=Math.hypot(mx,my);
    if(mlen>0.01){
      this.userActed();
      const k=Math.min(1,mlen)/mlen*spd*s;
      this.tryMove(mx*k,my*k);
      this.bobPh+=s*9; this.bob=Math.sin(this.bobPh)*2.2;
      this.markExplored();
      this.checkPortal();
    } else this.bob*=0.85;
    // doors animate
    const map=World.maps[this.mapId];
    for(const k in map.doors){ const d=map.doors[k];
      d.t=clamp((d.t||0)+(d.open?1:-1)*s*2.2,0,1);
    }
    // recovery timers
    for(const pc of this.party.pcs) if(pc.recovery>0) pc.recovery-=dt;
    // monsters
    this.updateMonsters(dt);
    this.updateProjectiles(dt);
    // townsfolk stroll near their posts
    const nr=RNG.get('npc');
    for(const n of map.npcs){
      if(n.hx===undefined){ n.hx=n.x; n.hy=n.y; }
      n.wt=(n.wt||nr.int(500,3000))-dt;
      if(n.wt<=0){ n.wt=nr.int(2600,7000); n.tx=n.hx+(nr.next()*2-1)*1.4; n.ty=n.hy+(nr.next()*2-1)*1.4; }
      if(n.tx!==undefined){
        const d=Math.hypot(n.tx-n.x,n.ty-n.y);
        n.moving=d>0.08;
        if(n.moving){
          const k=Math.min(1,0.55*s/d), nx=n.x+(n.tx-n.x)*k, ny=n.y+(n.ty-n.y)*k;
          const c=map.cells[(ny|0)*map.w+(nx|0)];
          if(!c&&map.floor[(ny|0)*map.w+(nx|0)]!==6&&dist2(nx,ny,this.px,this.py)>1) { n.x=nx; n.y=ny; }
          else n.tx=undefined;
        }
      }
    }
    // music by context
    if(this.state==='play'){
      const near=this.monstersNear(9).some(m=>m.state==='chase');
      const track= near?'combat': map.outdoor? (this.inTown()?'town':'wild'):'dungeon';
      Audio2.setTrack(this.victoryShown&&track==='town'?'town':track);
    }
    // defeat check
    if(this.party.pcs.every(pc=>pc.cond==='dead'||pc.cond==='unconscious'||pc.hp<=0)) this.defeat();
  },
  inTown(){ return this.px>29&&this.px<67&&this.py>30&&this.py<46; },
  tryMove(dx,dy){
    const map=World.maps[this.mapId], R=0.30;
    const solidAt=(x,y)=>{
      if(x<R||y<R||x>=map.w-R||y>=map.h-R) return true;
      const c=map.cells[(y|0)*map.w+(x|0)];
      if(c===7||c===8){ const d=map.doors[(x|0)+','+(y|0)]; return !(d&&d.t>0.85); }
      if(c) return true;
      if(map.floor[(y|0)*map.w+(x|0)]===6) return true; // water
      return false;
    };
    const blocked=(x,y)=>{
      for(const ox of [-R,0,R]) for(const oy of [-R,0,R]) if(solidAt(x+ox,y+oy)) return true;
      // solid decor + monsters
      for(const d of map.decor) if(d.solid&&dist2(d.x,d.y,x,y)<0.55*0.55) return true;
      for(const m of map.monsters) if(m.hp>0&&dist2(m.x,m.y,x,y)<0.5*0.5) return true;
      return false;
    };
    if(!blocked(this.px+dx,this.py)) this.px+=dx;
    if(!blocked(this.px,this.py+dy)) this.py+=dy;
  },
  checkPortal(){
    const map=World.maps[this.mapId];
    for(const p of map.portals){
      if((this.px|0)===p.x&&(this.py|0)===p.y&&p.to){
        // mid-combat, stairs wait for a deliberate Use — no accidental level flees
        if(this.monstersNear(7).some(m=>m.state==='chase')){
          if(this._stairNote===undefined||performance.now()-this._stairNote>3000){ this._stairNote=performance.now(); UI.say('Press Use to take the stairs — the fight rages on!'); }
          return;
        }
        this.transition(p.to,p.tx,p.ty);
        return;
      }
    }
  },
  transition(to,tx,ty){
    if(this._fading) return; this._fading=true;
    // a portal without a destination must never strand the party in the void
    if(typeof tx!=='number'||typeof ty!=='number'){
      const m=World.maps[to];
      outer: for(let y=1;y<m.h-1;y++) for(let x=1;x<m.w-1;x++){
        if(!m.cells[y*m.w+x]&&m.floor[y*m.w+x]!==6&&!m.portals.some(p=>p.x===x&&p.y===y)){ tx=x+0.5; ty=y+0.5; break outer; }
      }
      if(typeof Debug!=='undefined') Debug.errors.push('portal to '+to+' missing tx/ty — landed at fallback '+tx+','+ty);
    }
    Audio2.sfx('stairs');
    this.fade={t:0,dir:1,cb:()=>{
      this.mapId=to; this.px=tx; this.py=ty;
      const m=World.maps[to];
      Log.add('— '+m.name+' —',palIdx(5,12));
      this.ensureExplored(); this.markExplored();
      this.autosave();
      this.fade={t:1,dir:-1,cb:()=>{ this._fading=false; }};
    }};
  },
  ensureExplored(){ if(!this.explored[this.mapId]){ const m=World.maps[this.mapId]; this.explored[this.mapId]=new Uint8Array(m.w*m.h); } },
  exploreRect(x0,y0,w,h){ const m=World.maps[this.mapId], ex=this.explored[this.mapId];
    for(let y=Math.max(0,y0);y<Math.min(m.h,y0+h);y++) for(let x=Math.max(0,x0);x<Math.min(m.w,x0+w);x++) ex[y*m.w+x]=1; },
  markExplored(){
    const m=World.maps[this.mapId], ex=this.explored[this.mapId];
    const cx=this.px|0, cy=this.py|0;
    for(let y=Math.max(0,cy-3);y<=Math.min(m.h-1,cy+3);y++)
      for(let x=Math.max(0,cx-3);x<=Math.min(m.w-1,cx+3);x++) ex[y*m.w+x]=1;
  },

  // ---------- monsters ----------
  canAct(pc){ return (pc.cond==='ok'||pc.cond==='poisoned'||pc.cond==='diseased')&&pc.hp>0; },
  monstersNear(r){ const map=World.maps[this.mapId], out=[]; const r2=r*r;
    for(const m of map.monsters) if(m.hp>0&&dist2(m.x,m.y,this.px,this.py)<r2) out.push(m);
    return out; },
  lineOfSight(x0,y0,x1,y1){
    const map=World.maps[this.mapId];
    const steps=Math.ceil(Math.hypot(x1-x0,y1-y0)*3);
    for(let i=1;i<steps;i++){
      const x=x0+(x1-x0)*i/steps, y=y0+(y1-y0)*i/steps;
      const c=map.cells[(y|0)*map.w+(x|0)];
      if(c&&c!==7&&c!==8) return false;
      if(c===7||c===8){ const d=map.doors[(x|0)+','+(y|0)]; if(!(d&&d.t>0.85)) return false; }
    }
    return true;
  },
  updateMonsters(dt){
    const map=World.maps[this.mapId], s=dt/1000, r=RNG.get('combat');
    for(const m of map.monsters){
      if(m.hp<=0) continue;
      const d=Monsters.def(m.mid);
      m.cool=(m.cool||0)-dt;
      m.animT=(m.animT||0)+dt;
      const distP=Math.hypot(m.x-this.px,m.y-this.py);
      const calm=m.calmUntil>this.clock.min;
      if(m.state!=='chase'){
        const aggroR=m.group? d.aggro*0.45 : d.aggro; // camps: singles pull, not the whole warband
        if(!this.graceUntilInput&&!calm&&distP<aggroR&&this.lineOfSight(m.x,m.y,this.px,this.py)){
          m.state='chase';
          if(distP<7) Audio2.sfx('ambush');
        }
        else { // idle wander near home
          if(!m.wt||m.wt<0){ m.wt=r.int(1200,4200); m.wa=r.next()*Math.PI*2; }
          m.wt-=dt;
          if(m.wt<1600){ this.moveMonster(m,Math.cos(m.wa)*d.spd*0.3*s,Math.sin(m.wa)*d.spd*0.3*s);
            if(dist2(m.x,m.y,m.homeX,m.homeY)>16){ m.wa=angTo(m.x,m.y,m.homeX,m.homeY); } }
          continue;
        }
      }
      if(calm){ m.state='idle'; continue; }
      // wounded beasts break and run (bosses and the dead don't fear)
      if(m.hp<d.hp*0.22&&!d.boss&&!d.und&&!m.rallied){
        if(!m.fleeing&&r.chance(0.7)) m.fleeing=true; else if(!m.fleeing) m.rallied=true;
        if(m.fleeing){
          const away=angTo(this.px,this.py,m.x,m.y);
          this.moveMonster(m,Math.cos(away)*d.spd*1.15*s,Math.sin(away)*d.spd*1.15*s);
          if(distP>d.aggro*1.6){ m.state='idle'; m.fleeing=false; }
          continue;
        }
      }
      // chase behavior
      const ang=angTo(m.x,m.y,this.px,this.py);
      const wantRange=d.ai==='melee'?1.0:5.0;
      if(d.ai==='melee'||distP<wantRange-0.5){
        if(distP>1.15) this.moveMonster(m,Math.cos(ang)*d.spd*s,Math.sin(ang)*d.spd*s);
      } else if(distP>wantRange+1.5){
        this.moveMonster(m,Math.cos(ang)*d.spd*s,Math.sin(ang)*d.spd*s);
      }
      if(distP>d.aggro*2.2){ m.state='idle'; continue; }
      // attack — everyone fights when cornered; casters are not free kills in melee
      if(d.ai!=='melee'&&distP<1.35&&m.cool<=0&&this.lineOfSight(m.x,m.y,this.px,this.py)){
        m.cool=2100-d.spd*180; m.attackT=performance.now(); this.monsterHitsParty(m,d,r);
      } else if(d.ai==='melee'){
        if(distP<1.35&&m.cool<=0&&this.lineOfSight(m.x,m.y,this.px,this.py)){ m.cool=1900-d.spd*180; m.attackT=performance.now(); this.monsterHitsParty(m,d,r); }
      } else if(m.cool<=0&&distP<d.aggro&&this.lineOfSight(m.x,m.y,this.px,this.py)){
        m.cool=d.spell.cd; m.attackT=performance.now();
        const pa=angTo(m.x,m.y,this.px,this.py);
        this.projectiles.push({x:m.x,y:m.y,vx:Math.cos(pa)*7,vy:Math.sin(pa)*7,proj:d.spell.proj,
          dmg:r.roll(d.spell.n,d.spell.d,0),from:'mon',atk:d.atk,ttl:3000});
        Audio2.sfx(d.spell.proj==='arrow'?'bow':'spell_'+(d.spell.proj==='spark'?'spark':d.spell.proj==='dark'?'dark':'fire'));
      }
    }
  },
  moveMonster(m,dx,dy){
    const map=World.maps[this.mapId], R=0.32;
    const ok=(x,y)=>{
      if(x<R||y<R||x>=map.w-R||y>=map.h-R) return false;
      const c=map.cells[(y|0)*map.w+(x|0)];
      if(c===7){ const d=map.doors[(x|0)+','+(y|0)]; if(!(d&&d.t>0.85)) return false; }
      else if(c) return false;
      if(map.floor[(y|0)*map.w+(x|0)]===6) return false;
      if(dist2(x,y,this.px,this.py)<0.55*0.55) return false;
      for(const o of map.monsters) if(o!==m&&o.hp>0&&dist2(o.x,o.y,x,y)<0.42*0.42) return false;
      for(const dd of map.decor) if(dd.solid&&dist2(dd.x,dd.y,x,y)<0.5*0.5) return false;
      return true;
    };
    if(ok(m.x+dx,m.y)) m.x+=dx;
    if(ok(m.x,m.y+dy)) m.y+=dy;
  },
  monsterHitsParty(m,d,r){
    const targets=this.party.pcs.filter(pc=>this.canAct(pc));
    if(!targets.length) return;
    const pc=targets[r.int(0,targets.length-1)];
    const eq=Object.values(pc.equip).map(Items.def);
    const ac=Rules.effectiveAC(pc,eq,this.party.buffs);
    if(Rules.monsterHit(r,d.atk,ac)){
      const dmg=Rules.damageRoll(r,{n:d.dn,d:d.dd,plus:d.dp});
      this.damagePc(pc,dmg,d.name);
      if(d.poison&&r.chance(d.poison)&&pc.cond==='ok'){ pc.cond='poisoned'; Log.add(pc.name+' is poisoned! (it saps but cannot kill — cure at the temple or with antidote)',palIdx(13,10)); }
      if(d.disease&&r.chance(d.disease)&&pc.cond==='ok'){ pc.cond='diseased'; Log.add(pc.name+' catches grave-rot! (rest heals half until cured)',palIdx(9,9)); }
    } else Audio2.sfx('miss');
  },
  damagePc(pc,dmg,srcName){
    pc.hp-=dmg;
    pc.painT=performance.now();
    Audio2.sfx('hurt');
    Log.add(srcName+' hits '+pc.name+' for '+dmg+'.',palIdx(14,10));
    this.hurtFlash=performance.now();
    if(pc.hp<=0){
      pc.hp=0;
      // sickness is not cured by a club to the head — only the healthy become 'unconscious'
      if(pc.cond==='ok'){ pc.cond='unconscious'; }
      if(pc.cond!=='dead'){ Log.add(pc.name+' falls!',palIdx(14,12)); Audio2.sfx('die'); }
    }
  },

  // ---------- projectiles ----------
  updateProjectiles(dt){
    const s=dt/1000, map=World.maps[this.mapId], r=RNG.get('combat');
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i];
      p.ttl-=dt; p.x+=p.vx*s; p.y+=p.vy*s;
      let dead=p.ttl<=0;
      const c=map.cells[(p.y|0)*map.w+(p.x|0)];
      if(c&&!((c===7||c===8)&&map.doors[(p.x|0)+','+(p.y|0)]?.t>0.85)) dead=true;
      else if(p.from==='mon'){
        if(dist2(p.x,p.y,this.px,this.py)<0.45*0.45){
          dead=true;
          const targets=this.party.pcs.filter(pc=>Game.canAct(pc));
          if(targets.length){ const pc=targets[r.int(0,targets.length-1)];
            const eq=Object.values(pc.equip).map(Items.def);
            if(Rules.monsterHit(r,p.atk||5,Rules.effectiveAC(pc,eq,this.party.buffs))) this.damagePc(pc,p.dmg,'A bolt');
            else { Log.add(pc.name+' dodges a bolt.'); }
          }
        }
      } else { // player spell/arrow
        for(const m of map.monsters){
          if(m.hp<=0) continue;
          if(dist2(p.x,p.y,m.x,m.y)<0.5*0.5){
            dead=true;
            this.hitMonster(m,p.dmg,p.vsUndeadMult);
            if(p.aoe){ for(const m2 of map.monsters){ if(m2!==m&&m2.hp>0&&dist2(m2.x,m2.y,m.x,m.y)<p.aoe*p.aoe) this.hitMonster(m2,Math.ceil(p.dmg/2),p.vsUndeadMult); } }
            break;
          }
        }
      }
      if(dead) this.projectiles.splice(i,1);
    }
  },
  hitMonster(m,dmg,vsUndead){
    if(m.hp<=0) return; // already down — no double kills, no duplicate drops
    const d=Monsters.def(m.mid);
    if(vsUndead&&d.und) dmg=Math.round(dmg*vsUndead);
    m.hp-=dmg; m.hurtT=performance.now();
    Audio2.sfx('hit');
    // the Lich calls its guards from the walls at half strength — once
    if(m.mid==='lich'&&!m.summoned&&m.hp>0&&m.hp<d.hp/2){
      m.summoned=true;
      const map=World.maps[this.mapId];
      for(const [dx,dy] of [[-1.5,-1.2],[1.5,1.2]]){
        const sx=m.x+dx, sy=m.y+dy;
        if(!map.cells[(sy|0)*map.w+(sx|0)]){ const sk=Monsters.make('skel_guard',sx,sy); sk.state='chase'; map.monsters.push(sk); }
      }
      Log.add('“RISE!” — bone claws through the marble!',palIdx(6,13));
      Audio2.sfx('spell_dark');
    }
    if(m.hp<=0) this.killMonster(m);
    else if(m.state!=='chase') m.state='chase';
  },
  killMonster(m){
    if(m.state==='dead') return;
    const d=Monsters.def(m.mid);
    m.hp=0; m.state='dead';
    Audio2.sfx('mdie');
    const r=RNG.get('loot');
    const loot=Loot.roll(r,d.tier);
    // quest drops (always, when relevant)
    const extra=[];
    if(m.mid==='bandit_boss') extra.push(Items.make('q_ledger'));
    if(m.mid==='necromancer') extra.push(Items.make('q_sigil'));
    if(m.mid==='direwolf') extra.push(Items.make('q_fang')); // trophies exist whether or not anyone asked
    this.corpses.push({mapId:this.mapId,mid:m.mid,x:m.x,y:m.y,gold:loot.gold,items:loot.item?[loot.item,...extra]:extra,looted:false});
    // xp share
    const alive=this.party.pcs.filter(pc=>pc.cond!=='dead');
    const share=Rules.xpShare(d.xp,alive.length);
    for(const pc of alive) pc.xp+=share;
    this.stats.kills++;
    Log.add(d.name+' dies. (+'+share+' xp each)',palIdx(2,11));
    // kill-group quests
    for(const qid in this.party.quests){ const st=this.party.quests[qid], q=QUESTS[qid];
      if(st.state==='active'&&q.kind==='killgroup'&&m.group===q.group){
        st.n=(st.n||0)+1;
        Log.add(q.name+': '+st.n+'/'+q.count,palIdx(5,11));
        if(st.n>=q.count){ st.state='done'; Log.add('Quest complete — return to '+NPCS[q.giver].name+'!',palIdx(5,13)); Audio2.sfx('quest'); }
      }
      if(st.state==='active'&&q.kind==='fetchkill'&&q.target===m.mid){
        Log.add(q.name+': the deed is done — take the proof!',palIdx(5,13));
      }
    }
    const trainable=this.party.pcs.some(pc=>Rules.canTrain(pc));
    if(trainable&&performance.now()-(this._trainNote||0)>60000){ this._trainNote=performance.now(); Log.add('Someone is ready to train (Training Hall).',palIdx(8,11)); }
  },

  // ---------- party actions ----------
  currentTarget(){
    // nearest living monster within 60° cone ahead, up to 9 cells, LOS
    const map=World.maps[this.mapId];
    let best=null,bd=81;
    for(const m of map.monsters){
      if(m.hp<=0) continue;
      const d2=dist2(m.x,m.y,this.px,this.py); if(d2>bd) continue;
      const da=Math.abs(angDiff(this.ang,angTo(this.px,this.py,m.x,m.y)));
      if(da>0.62) continue;
      if(!this.lineOfSight(this.px,this.py,m.x,m.y)) continue;
      best=m; bd=d2;
    }
    return best;
  },
  partyAttack(){
    if(this.state!=='play') return;
    let t=this.currentTarget();
    if(!t){ // facing assist: an adjacent foe is a valid target — turn and fight
      let bd=2.4*2.4;
      for(const m of World.maps[this.mapId].monsters){
        if(m.hp<=0) continue;
        const d2=dist2(m.x,m.y,this.px,this.py);
        if(d2<bd){ bd=d2; t=m; }
      }
      if(t) this.ang=angTo(this.px,this.py,t.x,t.y);
    }
    const r=RNG.get('combat');
    let acted=false;
    for(const pc of this.party.pcs){
      if(!this.canAct(pc)) continue;
      if(pc.recovery>0) continue;
      const w=pc.equip.weapon?ITEMS[pc.equip.weapon.id]:null;
      pc.recovery=Rules.effectiveRecovery(pc,w,this.party.buffs);
      acted=true;
      if(!t||t.hp<=0){ continue; }
      const dist=Math.hypot(t.x-this.px,t.y-this.py);
      const ranged=w&&w.ranged;
      if(!ranged&&dist>1.6){ Log.add(pc.name+' cannot reach!'); continue; }
      Audio2.sfx(ranged?'bow':'swing');
      const atk=Rules.effectiveAttack(pc,w,this.party.buffs);
      const md=Monsters.def(t.mid);
      if(Rules.attackRoll(r,atk,md.ac)){
        const dmg=Rules.damageRoll(r,Rules.effectiveDamage(pc,w,this.party.buffs));
        if(ranged){
          const pa=angTo(this.px,this.py,t.x,t.y);
          this.projectiles.push({x:this.px+Math.cos(pa)*0.5,y:this.py+Math.sin(pa)*0.5,vx:Math.cos(pa)*11,vy:Math.sin(pa)*11,proj:'arrow',dmg,from:'pc',ttl:2000});
        } else this.hitMonster(t,dmg);
        if(!ranged) Log.add(pc.name+' hits the '+md.name+' for '+dmg+'.');
      } else { Audio2.sfx('miss'); Log.add(pc.name+' misses.'); }
    }
    if(this.turnBased){ // one order = one full round: run until the slowest blade is ready again
      const maxRec=Math.max(620,...this.party.pcs.filter(pc=>this.canAct(pc)).map(pc=>pc.recovery||0));
      this.tbBudget=Math.max(this.tbBudget,Math.min(2200,maxRec+80));
    }
    if(!t&&acted) UI.say('No foe in reach — face your enemy.');
  },
  quickCast(){
    // active PC casts their first castable damaging spell at target, else first heal on worst-hurt ally
    const pc=this.party.pcs[this.activePc];
    for(const id of pc.spells){
      const s=SPELLS[id];
      if(s.target==='enemy'&&Spellcraft.canCast(pc,id).ok){ if(this.castFromBook(this.activePc,id)) return; }
    }
    for(const id of pc.spells){
      const s=SPELLS[id];
      if(s.kind==='heal'&&Spellcraft.canCast(pc,id).ok){ if(this.castFromBook(this.activePc,id)) return; }
    }
    UI.say(pc.name+' has no spell ready (check the spellbook).');
  },
  castFromBook(pi,id){
    const pc=this.party.pcs[pi], s=SPELLS[id];
    const can=Spellcraft.canCast(pc,id);
    if(!can.ok){ UI.say(can.why); Audio2.sfx('error'); return false; }
    let target=null;
    if(s.target==='enemy'){ target=this.currentTarget(); if(!target){ UI.say('No target in sight.'); return false; } }
    let tpc=null;
    if(s.target==='pc'){ // pick most-wounded eligible ally
      const list=this.party.pcs.filter(p2=>s.kind==='raise'? p2.cond==='dead' : s.kind==='cureCond'? s.cures.includes(p2.cond) : p2.cond!=='dead');
      if(!list.length){ UI.say('No one needs that.'); return false; }
      tpc=list.sort((a,b)=>(a.hp/Rules.maxHP(a))-(b.hp/Rules.maxHP(b)))[0];
    }
    const eff=Spellcraft.resolve(pc,id,RNG.get('combat'));
    pc.sp-=eff.spCost;
    Audio2.sfx('spell_'+(eff.proj||'light').replace('arrow','fire'));
    if(eff.kind==='damage'||eff.kind==='drain'){
      const pa=angTo(this.px,this.py,target.x,target.y);
      this.projectiles.push({x:this.px+Math.cos(pa)*0.5,y:this.py+Math.sin(pa)*0.5,vx:Math.cos(pa)*10,vy:Math.sin(pa)*10,
        proj:eff.proj,dmg:eff.damage,from:'pc',aoe:eff.aoe,vsUndeadMult:eff.vsUndeadMult,ttl:2500});
      if(eff.selfHeal){ pc.hp=Math.min(Rules.maxHP(pc),pc.hp+eff.selfHeal); }
      Log.add(pc.name+' casts '+eff.name+'!',palIdx(6,12));
    }
    if(eff.kind==='heal'){ tpc.hp=Math.min(Rules.maxHP(tpc),tpc.hp+eff.heal); if(tpc.cond==='unconscious'){tpc.cond='ok';} Audio2.sfx('heal'); Log.add(pc.name+' heals '+tpc.name+' for '+eff.heal+'.',palIdx(2,12)); }
    if(eff.kind==='buff'){ this.party.buffs[eff.buff]={until:this.clock.min+eff.durMin,hitBonus:eff.hitBonus,dmgBonus:eff.dmgBonus,acBonus:eff.acBonus}; Audio2.sfx('buff'); Log.add(eff.name+' settles over the party.',palIdx(8,12)); }
    if(eff.kind==='cureCond'){ tpc.cond='ok'; Audio2.sfx('heal'); Log.add(tpc.name+' is cured.',palIdx(2,12)); }
    if(eff.kind==='raise'){ tpc.cond='ok'; tpc.hp=1; Audio2.sfx('heal'); Log.add(tpc.name+' returns to life!',palIdx(5,13)); }
    if(eff.kind==='restore'){ tpc.cond='ok'; tpc.hp=Rules.maxHP(tpc); tpc.sp=Rules.maxSP(tpc); Audio2.sfx('heal'); Log.add(tpc.name+' is made whole.',palIdx(5,13)); }
    if(eff.lightDurMin){ this.party.buffs.torch={until:this.clock.min+eff.lightDurMin}; Log.add('Light blooms overhead.',palIdx(5,12)); }
    if(eff.wizardEyeDurMin){ this.party.buffs.wizardEye={until:this.clock.min+eff.wizardEyeDurMin}; Log.add('You sense living things.',palIdx(8,12)); }
    if(eff.calmMin&&target){ target.calmUntil=this.clock.min+eff.calmMin; target.state='idle'; Log.add('The beast is soothed.',palIdx(8,12)); }
    if(this.turnBased) this.tbBudget=Math.max(this.tbBudget,620);
    return true;
  },
  interact(){
    if(this.state!=='play') return;
    const map=World.maps[this.mapId];
    const fx=this.px+Math.cos(this.ang)*1.0, fy=this.py+Math.sin(this.ang)*1.0;
    const fc={x:fx|0,y:fy|0};
    // the cell you FACE always wins: doors and shopfronts beat nearby chatter
    for(const s of map.shops){ if(fc.x===s.x&&fc.y===s.y){ Audio2.sfx('door'); UI.open(UI.shopScreen(s.shop)); return; } }
    if(map.doors[fc.x+','+fc.y]){
      const d=map.doors[fc.x+','+fc.y];
      if(d.needs&&!this.partyHasItem(d.needs)){ UI.say('A sigil-shaped hollow glows. Something is missing.'); Audio2.sfx('error'); return; }
      if(d.needs&&!d.open) Log.add('The Vault Sigil flares — the seal breaks!',palIdx(8,13));
      d.open=!d.open; Audio2.sfx('door'); return;
    }
    for(const p of map.portals){ if(fc.x===p.x&&fc.y===p.y&&p.to){ this.transition(p.to,p.tx,p.ty); return; } }
    // standing ON a portal cell (walk-on was deferred mid-combat): Use takes the stairs
    for(const p of map.portals){ if((this.px|0)===p.x&&(this.py|0)===p.y&&p.to){ this.transition(p.to,p.tx,p.ty); return; } }
    // nearest wins among corpses / chests / npcs — no category may shadow another
    let best=null,bd=Infinity;
    for(const c of this.corpses){ if(c.mapId!==this.mapId||c.looted) continue;
      const d2=dist2(c.x,c.y,this.px,this.py); if(d2<1.8*1.8&&d2<bd){ bd=d2; best={kind:'corpse',c}; } }
    for(const ch of map.chests){ const d2=dist2(ch.x,ch.y,this.px,this.py);
      if(d2<2.1*2.1&&d2<bd){ bd=d2; best={kind:'chest',ch}; } }
    for(const n of map.npcs){ const d2=dist2(n.x,n.y,this.px,this.py);
      if(d2<2.2*2.2&&d2<bd){ bd=d2; best={kind:'npc',n}; } }
    if(best&&best.kind==='corpse'){ this.lootCorpse(best.c); return; }
    if(best&&best.kind==='npc'){ UI.open(UI.dialogScreen(best.n.id)); return; }
    if(best&&best.kind==='chest'){ const ch=best.ch; {
        const key=this.mapId+':'+ch.id;
        if(this.flags.chests[key]){ UI.say('Empty.'); return; }
        if(ch.special){ // unique relics are never destroyed — demand room first
          const free=this.party.pcs.reduce((n,pc)=>n+pc.items.filter(x=>!x).length,0);
          if(free<2){ UI.say('Your packs are stuffed — make room before opening this.'); Audio2.sfx('error'); return; }
        }
        this.flags.chests[key]=1;
        const r=RNG.get('loot');
        // trapped? (seeded per chest, disarmed by the party's best hand)
        const trapRand=RNG.world('trap:'+key);
        if(trapRand.chance(Rules.trapChance(ch.tier))){
          const best=Math.max(...this.party.pcs.map(pc=>pc.skills.disarm||0));
          if(Rules.disarmed(r,best,ch.tier)){
            Log.add(best>0?'A needle trap — picked clean and disarmed.':'A trap clicks... and jams. Luck favors fools.',palIdx(8,12));
          } else {
            const victims=this.party.pcs.filter(pc=>pc.cond==='ok');
            if(victims.length){
              const pc=victims[r.int(0,victims.length-1)];
              const dmg=Rules.trapDamage(r,ch.tier);
              Audio2.sfx('spell_fire');
              this.damagePc(pc,dmg,'A chest trap');
            }
          }
        }
        const loot=Loot.roll(r,ch.tier);
        let msg='You find '+loot.gold+' gold';
        this.party.gold+=loot.gold; this.stats.goldEarned+=loot.gold;
        const items=[];
        if(loot.item) items.push(loot.item);
        if(ch.special) items.push(Items.make(ch.special));
        for(const it of items){ if(this.giveItem(it)) msg+=', '+Items.displayName(it); }
        Audio2.sfx('chest');
        Log.add(msg+'.',palIdx(5,12));
        this.onQuestItemsChanged();
        return;
      }
    }
    // shop door by adjacency (walked up beside it)
    for(const s of map.shops){
      if(Math.abs(s.x+0.5-this.px)<1.6&&Math.abs(s.y+0.5-this.py)<1.6){
        Audio2.sfx('door'); UI.open(UI.shopScreen(s.shop)); return;
      }
    }
    UI.say('Nothing here answers.');
  },
  lootCorpse(c){
    const questItems=c.items.filter(it=>ITEMS[it.id].slot==='quest');
    if(questItems.length){
      const free=this.party.pcs.reduce((n,pc)=>n+pc.items.filter(x=>!x).length,0);
      if(free<questItems.length){ UI.say('You cannot carry everything here — make room first.'); Audio2.sfx('error'); return; }
    }
    c.looted=true;
    this.party.gold+=c.gold; this.stats.goldEarned+=c.gold;
    let msg='Searched the '+Monsters.def(c.mid).name.toLowerCase()+': '+c.gold+' gold';
    for(const it of c.items){ if(this.giveItem(it)) msg+=', '+Items.displayName(it); else msg+=' (pack full: '+Items.displayName(it)+' left)'; }
    Audio2.sfx('coin');
    Log.add(msg+'.',palIdx(5,11));
    this.onQuestItemsChanged();
  },
  giveItemTo(pc,it){ const idx=pc.items.findIndex(x=>!x); if(idx>=0){ pc.items[idx]=it; return true; } return false; },
  giveItem(it){ // active hero's pack first — the shop tab you selected is who buys
    const order=[this.party.pcs[this.activePc],...this.party.pcs.filter((_,i)=>i!==this.activePc)];
    for(const pc of order){
      const idx=pc.items.findIndex(x=>!x);
      if(idx>=0){ pc.items[idx]=it; return true; }
    }
    return false;
  },
  partyHasItem(id){ return this.party.pcs.some(pc=>pc.items.some(it=>it&&it.id===id)); },
  removePartyItem(id,count){
    let left=count||1;
    for(const pc of this.party.pcs) for(let i=0;i<pc.items.length&&left>0;i++){
      if(pc.items[i]&&pc.items[i].id===id){ pc.items[i]=null; left--; }
    }
    return left===0;
  },
  countPartyItem(id){ let n=0; for(const pc of this.party.pcs) for(const it of pc.items) if(it&&it.id===id) n++; return n; },
  onQuestItemsChanged(){
    for(const qid in this.party.quests){
      const st=this.party.quests[qid], q=QUESTS[qid];
      if(st.state!=='active') continue;
      if(q.kind==='fetch'||q.kind==='fetchkill'){ if(this.partyHasItem(q.item)){ st.state='done'; Log.add(q.name+' — return to '+NPCS[q.giver].name+'!',palIdx(5,13)); Audio2.sfx('quest'); } }
      if(q.kind==='collect'){ st.n=this.countPartyItem(q.item); if(st.n>=q.count){ st.state='done'; Log.add(q.name+' — you have enough!',palIdx(5,13)); Audio2.sfx('quest'); } }
    }
  },
  acceptQuest(qid){ this.party.quests[qid]={state:'active',n:0}; Log.add('Quest accepted: '+QUESTS[qid].name,palIdx(5,12)); Audio2.sfx('quest'); this.onQuestItemsChanged(); },
  questReadyToTurn(qid){ const st=this.party.quests[qid]; return st&&st.state==='done'; },
  turnInQuest(qid){
    const q=QUESTS[qid], st=this.party.quests[qid];
    if(!st||st.state!=='done') return;
    if(q.item&&!q.keepItem) this.removePartyItem(q.item,q.kind==='collect'?q.count:1);
    st.state='turned';
    this.party.gold+=q.gold; this.stats.goldEarned+=q.gold;
    const alive=this.party.pcs.filter(pc=>pc.cond!=='dead');
    const share=Rules.xpShare(q.xp,alive.length);
    for(const pc of alive) pc.xp+=share;
    if(q.perk) this.party.perks[q.perk]=true;
    Log.add('Quest complete: '+q.name+' (+'+q.gold+'g, +'+share+' xp each)',palIdx(5,13));
    Audio2.sfx('levelup');
    this.autosave();
    if(q.final&&!this.victoryShown){ this.victoryShown=true; Audio2.setTrack('victory'); UI.open(UI.victoryScreen()); }
  },

  // ---------- items / economy (all prices via Rules) ----------
  equipItem(pi,idx){
    const pc=this.party.pcs[pi], it=pc.items[idx];
    if(!it||!Items.canEquip(pc,it)) return;
    const d=ITEMS[it.id];
    let slot=d.slot;
    if(slot==='ring') slot=pc.equip.ring1?'ring2':'ring1';
    const old=pc.equip[slot];
    pc.equip[slot]=it; pc.items[idx]=old||null;
    Audio2.sfx('pickup');
  },
  unequip(pi,slot){
    const pc=this.party.pcs[pi], it=pc.equip[slot];
    if(!it) return;
    const idx=pc.items.findIndex(x=>!x);
    if(idx<0){ UI.say('Backpack is full.'); return; }
    pc.items[idx]=it; pc.equip[slot]=null;
    Audio2.sfx('click');
  },
  useItem(pi,idx){
    const pc=this.party.pcs[pi], it=pc.items[idx]; if(!it) return;
    const d=ITEMS[it.id]; if(d.slot!=='use') return;
    const r=RNG.get('loot');
    if(d.use==='heal'){ if(pc.cond==='dead'){ UI.say('The dead cannot drink.'); return; } const n=r.roll(d.n,d.d,d.plus); pc.hp=Math.min(Rules.maxHP(pc),pc.hp+n); if(pc.cond==='unconscious')pc.cond='ok'; Log.add(pc.name+' recovers '+n+' hp.',palIdx(2,12)); Audio2.sfx('heal'); }
    if(d.use==='mana'){ const n=r.roll(d.n,d.d,d.plus); pc.sp=Math.min(Rules.maxSP(pc),pc.sp+n); Log.add(pc.name+' recovers '+n+' sp.',palIdx(3,12)); Audio2.sfx('heal'); }
    if(d.use==='cure'){ if(d.cures.includes(pc.cond)) pc.cond='ok'; Log.add(pc.name+' is purged of ills.',palIdx(2,12)); Audio2.sfx('heal'); }
    pc.items[idx]=null;
  },
  bestMerchant(){ return Math.max(...this.party.pcs.map(pc=>pc.skills.merchant||0)); },
  buyItem(id){ // price ALWAYS recomputed from Rules — UI-passed prices are display-only
    const P=this.party;
    const price=Rules.buyPrice(ITEMS[id].price,this.bestMerchant());
    if(P.gold<price){ UI.say('Not enough gold.'); Audio2.sfx('error'); return; }
    const it=Items.make(id);
    if(!this.giveItem(it)){ UI.say('All packs are full.'); Audio2.sfx('error'); return; }
    P.gold-=price; Audio2.sfx('coin');
    Log.add('Bought '+ITEMS[id].name+' for '+price+'g.');
    this.onQuestItemsChanged();
  },
  sellItem(pi,idx){
    const pc=this.party.pcs[pi]; const it=pc.items[idx]; if(!it) return;
    const price=Rules.sellPrice(Items.basePrice(it),this.bestMerchant());
    pc.items[idx]=null; this.party.gold+=price; this.stats.goldEarned+=price;
    Audio2.sfx('coin'); Log.add('Sold '+Items.displayName(it)+' for '+price+'g.');
  },
  buySpell(pi,id){
    const P=this.party, pc=P.pcs[pi];
    const price=Rules.buyPrice(Spellcraft.guildPrice(id),this.bestMerchant());
    if(P.gold<price){ UI.say('Not enough gold.'); Audio2.sfx('error'); return; }
    P.gold-=price; pc.spells.push(id);
    Audio2.sfx('levelup'); Log.add(pc.name+' learns '+SPELLS[id].name+'!',palIdx(6,13));
  },
  templeHeal(pi){
    const P=this.party, pc=P.pcs[pi];
    const cost=Rules.templeHealCost(pc);
    if(P.gold<cost){ UI.say('The Light asks '+cost+' gold.'); Audio2.sfx('error'); return; }
    P.gold-=cost;
    pc.cond='ok'; pc.hp=Rules.maxHP(pc); pc.sp=Rules.maxSP(pc);
    Audio2.sfx('heal'); Log.add(pc.name+' is restored by the Light.',palIdx(5,12));
  },
  templeDonate(){
    const P=this.party;
    if(P.gold<25){ UI.say('Not enough gold.'); return; }
    P.gold-=25;
    P.buffs.bless={until:this.clock.min+240,hitBonus:3};
    Audio2.sfx('buff'); Log.add('A blessing settles on the party (4 hours).',palIdx(5,12));
  },
  trainPc(pi){
    const P=this.party, pc=P.pcs[pi];
    if(!Rules.canTrain(pc)){ UI.say('Not enough experience.'); return; }
    const cost=Rules.trainCost(pc.level);
    if(P.gold<cost){ UI.say('Training costs '+cost+' gold.'); Audio2.sfx('error'); return; }
    P.gold-=cost;
    pc.level++; pc.skillPoints+=5;
    pc.hp=Rules.maxHP(pc); pc.sp=Rules.maxSP(pc);
    Audio2.sfx('levelup');
    Log.add(pc.name+' reaches level '+pc.level+'! (+5 skill points)',palIdx(5,13));
  },
  learnSkill(pi,sk){
    const P=this.party, pc=P.pcs[pi];
    if(!Rules.canLearnSkill(pc.cls,sk)||pc.skills[sk]){ return; }
    if(P.gold<Rules.SKILL_LEARN_COST){ UI.say('Instruction costs '+Rules.SKILL_LEARN_COST+' gold.'); Audio2.sfx('error'); return; }
    P.gold-=Rules.SKILL_LEARN_COST; pc.skills[sk]=1;
    Audio2.sfx('levelup'); Log.add(pc.name+' learns the basics of '+SKILLS[sk].name+'.',palIdx(8,12));
  },
  raiseSkill(pi,sk){
    const pc=this.party.pcs[pi];
    if(pc.skillPoints<1){ UI.say('No skill points — train a level first.'); Audio2.sfx('error'); return; }
    if((pc.skills[sk]||0)>=10){ UI.say('Mastered already.'); return; }
    pc.skillPoints--; pc.skills[sk]=(pc.skills[sk]||0)+1;
    Audio2.sfx('buff'); Log.add(pc.name+': '+SKILLS[sk].name+' → '+pc.skills[sk]+' ('+Rules.skillTier(pc.skills[sk])+')');
  },
  bank(amount){
    const P=this.party;
    if(amount>0){ const a=Math.min(amount,P.gold); P.gold-=a; P.bank+=a; }
    else { const a=Math.min(-amount,P.bank); P.bank-=a; P.gold+=a; }
    Audio2.sfx('coin');
  },

  // ---------- time / rest ----------
  advanceMinutes(n,tick){
    const before=Math.floor(this.clock.min/60);
    this.clock.min+=n;
    const hours=Math.floor(this.clock.min/60)-before;
    if(hours>0){
      for(const pc of this.party.pcs){
        if(pc.cond==='poisoned'||pc.cond==='diseased'){
          // sickness grinds hp to the floor but never converts to unconscious —
          // converting would let rest launder poison into a free full cure
          const was=pc.hp;
          pc.hp=Math.max(0,pc.hp-Rules.poisonTick(pc)*hours);
          if(pc.hp===0&&was>0) Log.add(pc.name+' is fading — find a healer!',palIdx(14,12));
        }
      }
      // buff expiry
      for(const b in this.party.buffs){ if(this.party.buffs[b]&&this.party.buffs[b].until<=this.clock.min) delete this.party.buffs[b]; }
    }
  },
  tryRest(){
    if(this.monstersNear(8).some(m=>m.state==='chase')){ UI.say('Enemies are upon you — no rest now!'); Audio2.sfx('error'); return; }
    UI.open(UI.restScreen());
  },
  doRest(){
    UI.close();
    const out=World.maps[this.mapId].outdoor;
    const r=RNG.get('rest');
    if(out&&!this.inTown()&&r.chance(Rules.outdoorAmbushChance)){
      // night ambush: wolves at the camp
      this.advanceMinutes(240);
      Audio2.sfx('ambush');
      Log.add('You wake to snarls in the dark — ambush!',palIdx(14,12));
      const map=World.maps[this.mapId];
      for(let i=0;i<2;i++){
        const a=r.next()*Math.PI*2;
        const m=Monsters.make('wolf',this.px+Math.cos(a)*2.5,this.py+Math.sin(a)*2.5);
        m.state='chase'; map.monsters.push(m);
      }
      return;
    }
    if(!out&&r.chance(0.3)){ // something heard you settle in
      this.advanceMinutes(180);
      Audio2.sfx('ambush');
      Log.add('Bone scrapes stone — they found your camp!',palIdx(14,12));
      const map2=World.maps[this.mapId];
      const pool={dun1:['skeleton','spider'],dun2:['skeleton','ghost'],dun3:['skel_guard']}[this.mapId]||['skeleton'];
      for(let i=0;i<2;i++){
        const a=r.next()*Math.PI*2;
        const sx=this.px+Math.cos(a)*2.5, sy=this.py+Math.sin(a)*2.5;
        if(!map2.cells[(sy|0)*map2.w+(sx|0)]){ const m=Monsters.make(r.pick(pool),sx,sy); m.state='chase'; map2.monsters.push(m); }
      }
      return;
    }
    this.advanceMinutes(Rules.REST_MINUTES);
    for(const pc of this.party.pcs){
      const res=Rules.restResult(pc);
      if(pc.cond!=='dead'){ pc.hp=Math.max(pc.hp,res.hp); pc.sp=Math.max(pc.sp,res.sp); pc.cond=res.cond==='ok'&&pc.cond==='unconscious'?'ok':res.cond; }
    }
    Audio2.sfx('rest');
    Log.add('You rest until '+Clock.parts(this.clock.min).hhmm+'.',palIdx(3,12));
    this.autosave();
  },
  tavernRest(){
    const P=this.party;
    const cost=P.perks.freerest?0:Rules.tavernRestCost(P.pcs.reduce((s,p)=>s+p.level,0));
    if(P.gold<cost){ UI.say('A bed costs '+cost+' gold.'); Audio2.sfx('error'); return; }
    P.gold-=cost;
    this.advanceMinutes(Rules.REST_MINUTES);
    for(const pc of this.party.pcs){
      const res=Rules.restResult(pc);
      if(pc.cond!=='dead'){ pc.hp=res.hp; pc.sp=res.sp; pc.cond=res.cond==='poisoned'||res.cond==='diseased'?res.cond:'ok'; }
    }
    Audio2.sfx('rest');
    Log.add('Clean sheets and a warm meal. ('+Clock.parts(this.clock.min).hhmm+')',palIdx(2,12));
    UI.close(); this.autosave();
  },
  toggleTurnBased(){
    this.turnBased=!this.turnBased; this.tbBudget=0;
    Audio2.sfx('turnmode');
    Log.add(this.turnBased?'Time waits for your command.':'Time flows once more.',palIdx(8,12));
  },
  defeat(){
    if(this._defeated) return; this._defeated=true;
    this.fade={t:0,dir:1,cb:()=>{
      const tp=World.templePoint();
      this.mapId=tp.map; this.px=tp.x; this.py=tp.y; this.ang=tp.ang;
      const allDead=this.party.pcs.every(pc=>pc.cond==='dead');
      for(const pc of this.party.pcs){
        if(pc.cond==='unconscious'||allDead){ pc.cond='ok'; pc.hp=1; }
        else if(pc.hp<=0&&pc.cond!=='dead') pc.hp=1; // sick and battered — alive, still sick
      }
      const tithe=Math.floor(this.party.gold*0.1);
      this.party.gold-=tithe;
      Log.add('You wake at the temple, weak but alive. The Light kept a tithe of '+tithe+' gold.',palIdx(14,11));
      Log.add('(Autosaved. Your manual save is untouched.)',palIdx(0,10));
      this.autosave(); // NEVER the manual slot
      this._defeated=false;
      this.fade={t:1,dir:-1,cb:()=>{}};
    }};
  },

  // ---------- save / load ----------
  serialize(){
    const mapsState={};
    for(const id in World.maps){ const m=World.maps[id];
      mapsState[id]={monsters:m.monsters.map(mo=>({mid:mo.mid,x:+mo.x.toFixed(2),y:+mo.y.toFixed(2),hp:mo.hp,homeX:mo.homeX,homeY:mo.homeY,group:mo.group,calmUntil:mo.calmUntil||0}))};
    }
    const explored={};
    for(const id in this.explored){ // pack bits
      const a=this.explored[id]; let s='';
      for(let i=0;i<a.length;i+=6){ let v=0; for(let j=0;j<6;j++) v|=(a[i+j]?1:0)<<j; s+=String.fromCharCode(48+v); }
      explored[id]=s;
    }
    const doorsState={};
    for(const id in World.maps){ const m=World.maps[id]; const dd={};
      for(const k in m.doors) if(m.doors[k].open) dd[k]=1;
      if(Object.keys(dd).length) doorsState[id]=dd; }
    return { v:SAVE_VERSION, ts:Date.now(), doorsState, seed:RNG.worldSeed, clock:this.clock.min,
      party:this.party, mapId:this.mapId, px:this.px, py:this.py, ang:this.ang,
      rng:RNG.serialize(), maps:mapsState, flags:this.flags,
      corpses:this.corpses.filter(c=>!c.looted).map(c=>({mapId:c.mapId,mid:c.mid,x:+c.x.toFixed(2),y:+c.y.toFixed(2),gold:c.gold,items:c.items})),
      explored, stats:this.stats, victoryShown:this.victoryShown,
      meta:{level:Math.max(...this.party.pcs.map(p=>p.level)), when:Clock.parts(this.clock.min), name:this.party.pcs[0].name} };
  },
  save(slot){
    try{ localStorage.setItem('vintavia_'+slot,JSON.stringify(this.serialize())); }
    catch(e){ UI.say('Could not save (storage blocked).'); return false; }
    if(slot==='manual') Audio2.sfx('quest');
    return true;
  },
  autosave(){ if(this.state==='play') this.save('auto'); },
  hasSave(slot){ try{ return !!localStorage.getItem('vintavia_'+slot); }catch(e){ return false; } },
  newestSlot(){ // Continue must never time-travel backwards
    let best=null,bt=-1;
    for(const slot of ['manual','auto']){
      try{ const d=JSON.parse(localStorage.getItem('vintavia_'+slot)); if(d&&(d.ts||0)>bt){ bt=d.ts||0; best=slot; } }catch(e){}
    }
    return best;
  },
  saveMeta(slot){
    try{
      const d=JSON.parse(localStorage.getItem('vintavia_'+slot)); if(!d) return null;
      return {text:d.meta.name+'’s company, L'+d.meta.level+' — Day '+d.meta.when.day+', '+d.meta.when.hhmm};
    }catch(e){ return null; }
  },
  load(slot){
    let d;
    try{ d=JSON.parse(localStorage.getItem('vintavia_'+slot)); }catch(e){ return false; }
    if(!d||d.v!==SAVE_VERSION){ if(d) UI.say('Save from an older build — starting fresh is safest.'); return false; }
    // schema sniff BEFORE touching live state — hand-tampered saves must not crash-loop
    if(!d.party||!Array.isArray(d.party.pcs)||d.party.pcs.length!==4||
       typeof d.px!=='number'||typeof d.py!=='number'||typeof d.clock!=='number'||
       !['outdoor','dun1','dun2','dun3'].includes(d.mapId)||typeof d.seed!=='string'){
      UI.say('That save is damaged and cannot be read.'); return false;
    }
    try{ return this._loadValidated(d); }
    catch(e){
      if(typeof Debug!=='undefined') Debug.errors.push('load failed: '+e);
      RNG.reset(); RNG.worldSeed='vintavia-1'; World.build();
      this.party=null; this.state='title'; UI.open(UI.titleScreen());
      UI.say('That save could not be restored.');
      return false;
    }
  },
  _loadValidated(d){
    RNG.reset(); RNG.worldSeed=d.seed;
    World.build();
    RNG.restore(d.rng);
    this.party=d.party;
    this.clock={min:d.clock};
    this.mapId=d.mapId; this.px=d.px; this.py=d.py; this.ang=d.ang;
    this.flags=d.flags; this.stats=d.stats||{kills:0,goldEarned:0};
    this.victoryShown=!!d.victoryShown;
    for(const id in d.maps){ const m=World.maps[id]; if(!m) continue;
      m.monsters=d.maps[id].monsters.map(mo=>Object.assign(Monsters.make(mo.mid,mo.x,mo.y),mo));
    }
    if(d.doorsState) for(const id in d.doorsState){ const m=World.maps[id]; if(!m) continue;
      for(const k in d.doorsState[id]) if(m.doors[k]){ m.doors[k].open=true; m.doors[k].t=1; } }
    this.corpses=(d.corpses||[]).map(c=>({...c,looted:false}));
    this.explored={};
    for(const id in d.explored){ const m=World.maps[id]; if(!m) continue;
      const a=new Uint8Array(m.w*m.h), s=d.explored[id];
      for(let i=0;i<s.length;i++){ const v=s.charCodeAt(i)-48; for(let j=0;j<6;j++){ const idx=i*6+j; if(idx<a.length) a[idx]=(v>>j)&1; } }
      this.explored[id]=a;
    }
    this.projectiles=[]; this.activePc=0; this.turnBased=false;
    this.graceUntilInput=true; this._defeated=false; this._fading=false; this.fade=null;
    this.state='play'; UI.close();
    Log.add('The chronicle resumes — '+World.maps[this.mapId].name+'.',palIdx(5,12));
    return true;
  },

  // ---------- draw ----------
  draw(now){
    const E=Engine;
    if(this.state==='title'||this.state==='boot'){ if(UI.screen){ UI.hit=[]; UI.screen.draw(); UI.drawToast(); } E.present(); return; }
    if(UI.screen){ UI.hit=[]; UI.screen.draw(); UI.drawToast(); E.present(); return; }
    // 3D view
    const map=World.maps[this.mapId];
    const light= map.outdoor? Clock.lightLevel(this.clock.min) : (map.dungeonLight||0.3);
    const torch= this.party.buffs.torch&&this.party.buffs.torch.until>this.clock.min ? 0.65:0.25;
    E.render3D({ map, x:this.px, y:this.py, ang:this.ang, bob:this.bob,
      light, torch, timeMin:this.clock.min, entities:this.buildEntities(now) });
    UI.drawHUD();
    // hurt flash
    if(this.hurtFlash&&now-this.hurtFlash<180){
      for(let y=VP.y;y<VP.y+VP.h;y+=2) for(let x=VP.x+(y&2?0:2);x<VP.x+VP.w;x+=4) E.buf[y*SCREEN_W+x]=PAL32[palIdx(14,8)];
    }
    if(this.fade){
      this.fade.t+=(this.fade.dir>0?0.08:-0.08);
      const t=clamp(this.fade.t,0,1);
      for(let y=0;y<SCREEN_H;y++)for(let x=0;x<SCREEN_W;x++){
        if(BAYER4[(y&3)*4+(x&3)]/16<t) E.buf[y*SCREEN_W+x]=PAL32[240];
      }
      if(this.fade.dir>0&&this.fade.t>=1){ const cb=this.fade.cb; this.fade=null; cb(); }
      else if(this.fade.dir<0&&this.fade.t<=0){ const cb=this.fade.cb; this.fade=null; cb&&cb(); }
    }
    E.present();
  },
  buildEntities(now){
    const map=World.maps[this.mapId], ents=[];
    const wob=(m)=>((m.animT||0)/280|0)%2;
    for(const m of map.monsters){
      if(m.hp<=0) continue;
      const sp=Art.sprites[m.mid], d=Monsters.def(m.mid);
      let frame='idle';
      if(m.attackT&&now-m.attackT<420) frame='attack';
      else if(m.state==='chase') frame=wob(m)?'walk':'idle';
      const breathe=Math.sin(now/620+(m.homeX*7+m.homeY*3))*0.006; // idle life
      ents.push({x:m.x,y:m.y,tex:sp.frames[frame],tw:sp.tw,th:sp.th,scale:d.scale+breathe,ghost:m.mid==='ghost',noShadow:m.mid==='ghost',
        vOff:m.mid==='ghost'?Math.sin(now/480+m.homeX)*0.03-0.05:0,
        shade:(m.hurtT&&now-m.hurtT<140?-3:0)+(m.mid==='ghost'?-4:0)});
    }
    for(const c of this.corpses){
      if(c.mapId!==this.mapId||c.looted) continue;
      const sp=Art.sprites[c.mid];
      ents.push({x:c.x,y:c.y,tex:sp.frames.corpse,tw:sp.tw,th:sp.th,scale:Monsters.def(c.mid).scale*0.9});
    }
    for(const n of map.npcs){
      const sp=Art.sprites['npc_'+n.kind];
      ents.push({x:n.x,y:n.y,tex:sp.frames[n.moving&&((now/300|0)%2)?'walk':'idle'],tw:sp.tw,th:sp.th,scale:1});
    }
    const flick=(now/240|0)%2;
    for(const dc of map.decor){
      let key='decor_'+dc.kind;
      if(dc.kind==='campfire'&&flick) key='decor_campfire_b';
      if(dc.kind==='brazier'&&flick) key='decor_brazier_b';
      if(dc.kind==='tree'&&((dc.x*7+dc.y*13)|0)%2) key='decor_tree2';
      const sp=Art.sprites[key]; if(!sp) continue;
      const th=((dc.x*13+dc.y*7)|0)%10; const dscale=dc.kind.startsWith('tree')?(1.5+th*0.09):dc.kind==='cryptgate'?1.15:0.9;
      ents.push({x:dc.x,y:dc.y,tex:sp.frames.idle,tw:sp.tw,th:sp.th,scale:dscale});
    }
    for(const ch of map.chests){
      const opened=this.flags.chests[this.mapId+':'+ch.id];
      const sp=Art.sprites[opened?'decor_chest_open':'decor_chest'];
      ents.push({x:ch.x,y:ch.y,tex:sp.frames.idle,tw:sp.tw,th:sp.th,scale:0.8});
    }
    for(const p of this.projectiles){
      const sp=Art.sprites['proj_'+p.proj]||Art.sprites.proj_fire;
      ents.push({x:p.x,y:p.y,tex:sp.frames.idle,tw:sp.tw,th:sp.th,scale:0.3,vOff:-0.15,noShadow:true});
    }
    return ents;
  },
};
