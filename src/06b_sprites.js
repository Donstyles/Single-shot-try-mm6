// 06b_sprites — creature sprites, NPCs, decor, item icons, portraits, paperdolls.
// Pre-rendered 1998 look: painted with gradients at 2x, downsampled, palette-dithered.
'use strict';

// ---------- painting helpers ----------
function vol(g,x,y,rx,ry,color,opts){ // shaded ellipse, light from top-left
  const o=opts||{};
  const grad=g.createRadialGradient(x-rx*0.35,y-ry*0.4,Math.min(rx,ry)*0.1,x,y,Math.max(rx,ry)*1.15);
  grad.addColorStop(0,o.hi||lighten(color,50));
  grad.addColorStop(0.55,color);
  grad.addColorStop(1,o.lo||darken(color,60));
  g.fillStyle=grad;
  g.beginPath(); g.ellipse(x,y,rx,ry,o.rot||0,0,7); g.fill();
  if(!o.noline){ g.strokeStyle='rgba(10,8,6,0.55)'; g.lineWidth=1; g.stroke(); }
}
function limb(g,x1,y1,x2,y2,wd,color){
  g.strokeStyle=color; g.lineWidth=wd; g.lineCap='round';
  g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke();
  g.strokeStyle='rgba(10,8,6,0.35)'; g.lineWidth=1;
  g.beginPath(); g.moveTo(x1+wd*0.4,y1); g.lineTo(x2+wd*0.4,y2); g.stroke();
}
function hex2(c){ // '#rgb' or '#rrggbb' -> [r,g,b]
  if(c.length===4) return [parseInt(c[1],16)*17,parseInt(c[2],16)*17,parseInt(c[3],16)*17];
  return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
}
function rgbs(r,g,b){ return 'rgb('+clamp(r|0,0,255)+','+clamp(g|0,0,255)+','+clamp(b|0,0,255)+')'; }
function lighten(c,k){ const[r,g,b]=hex2(c); return rgbs(r+k,g+k,b+k*0.8); }
function darken(c,k){ const[r,g,b]=hex2(c); return rgbs(r-k,g-k,b-k); }
function shadowBlob(g,x,y,rx,ry){ g.fillStyle='rgba(0,0,0,0.42)'; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,7); g.fill(); }
function bloodPool(g,x,y,rx,ry){ g.fillStyle='rgba(96,18,20,0.85)'; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,7); g.fill(); }

// weapons drawn in-hand
function drawWeapon(g,type,x,y,ang,len){
  g.save(); g.translate(x,y); g.rotate(ang);
  switch(type){
    case 'club': limb(g,0,0,0,-len,5,'#7a5a30'); vol(g,0,-len,4,6,'#7a5a30',{noline:1}); break;
    case 'sword': limb(g,0,0,0,-len,3,'#c8ccd4'); limb(g,-5,-6,5,-6,3,'#9a7c34'); vol(g,0,2,2.5,3,'#6a5020',{noline:1}); break;
    case 'axe': limb(g,0,0,0,-len,3,'#7a5a30'); g.fillStyle='#b8bcc4'; g.beginPath(); g.moveTo(0,-len); g.quadraticCurveTo(12,-len+2,10,-len+12); g.lineTo(0,-len+8); g.fill(); break;
    case 'staff': limb(g,0,6,0,-len,3,'#5a4020'); vol(g,0,-len,4,4,'#40c0c8',{noline:1}); break;
    case 'bow': g.strokeStyle='#7a5a30'; g.lineWidth=3; g.beginPath(); g.arc(0,-len*0.4,len*0.55,-1.3,1.3); g.stroke();
      g.strokeStyle='#d8d4c0'; g.lineWidth=1; g.beginPath(); g.moveTo(len*0.55*Math.cos(-1.3),-len*0.4+len*0.55*Math.sin(-1.3)); g.lineTo(len*0.55*Math.cos(1.3),-len*0.4+len*0.55*Math.sin(1.3)); g.stroke(); break;
    case 'dagger': limb(g,0,0,0,-len*0.6,2.5,'#c8ccd4'); limb(g,-3,-4,3,-4,2,'#9a7c34'); break;
  }
  g.restore();
}

// ---------- humanoid rig (64x96) ----------
function drawHumanoid(g,W,H,frame,p){
  const cx=W/2, groundY=H-6;
  const s=(p.size||1)*1.18;                 // bulked rig: monsters must own the frame
  const hipY=groundY-34*s, chestY=hipY-18*s, headY=chestY-16*s, headR=9*s*(p.headR||1);
  if(frame==='corpse'){
    bloodPool(g,cx,groundY-2,20*s,5*s);
    vol(g,cx,groundY-7,17*s,6*s,p.cloth); // torso lying
    vol(g,cx+15*s,groundY-6,5.5*s,5*s,p.skin); // head
    limb(g,cx-8*s,groundY-6,cx-20*s,groundY-2,4*s,p.skin); // arm out
    limb(g,cx-12*s,groundY-4,cx-24*s,groundY-8,4*s,p.cloth2||p.cloth); // leg
    if(p.weapon) drawWeapon(g,p.weapon,cx+8*s,groundY-2,1.35,16*s);
    return;
  }
  shadowBlob(g,cx,groundY,15*s,4);
  const walk=frame==='walk'?5*s:0;
  // legs
  limb(g,cx-4.5*s,hipY,cx-6*s-walk*0.6,groundY,6.5*s,p.legs||p.cloth2||'#4a3620');
  limb(g,cx+4.5*s,hipY,cx+6*s+walk*0.6,groundY,6.5*s,darken(p.legs||p.cloth2||'#4a3620',20));
  // torso (broad shoulders taper to hip)
  vol(g,cx,chestY+9*s,12*s*(p.bulk||1),16*s,p.cloth);
  vol(g,cx,chestY+2*s,12.5*s*(p.bulk||1),7*s,lighten(p.cloth,8),{noline:1}); // shoulder mass
  if(p.tabard){ g.fillStyle=p.tabard; g.fillRect(cx-5*s,chestY-2*s,10*s,24*s); }
  if(p.belt){ g.fillStyle='#3a2a14'; g.fillRect(cx-10*s,hipY-4*s,20*s,3.5*s); }
  // off arm / shield
  if(p.shield){ limb(g,cx-11*s,chestY+4*s,cx-16*s,chestY+13*s,5*s,p.skin); vol(g,cx-17*s,chestY+13*s,8.5*s,11*s,p.shieldCol||'#7a5a30'); }
  else limb(g,cx-11*s,chestY+4*s,cx-15*s,chestY+18*s,5*s,p.sleeves||p.skin);
  // weapon arm
  const atk=frame==='attack';
  const ax=cx+11*s, ay=chestY+4*s;
  const hx=atk?cx+16*s:cx+14*s, hy=atk?chestY-12*s:chestY+17*s;
  limb(g,ax,ay,hx,hy,5*s,p.sleeves||p.skin);
  if(p.weapon) drawWeapon(g,p.weapon,hx,hy,atk?0.5:0.15,(p.weapon==='staff'?28:p.weapon==='club'?15:20)*s);
  // head
  vol(g,cx,headY,headR,headR*1.12,p.skin);
  // face hint
  g.fillStyle='#181008';
  g.fillRect(cx-headR*0.45,headY-1,2,2); g.fillRect(cx+headR*0.2,headY-1,2,2);
  if(p.eyesGlow){ g.fillStyle=p.eyesGlow; g.fillRect(cx-headR*0.5,headY-1,2.6,2.6); g.fillRect(cx+headR*0.2,headY-1,2.6,2.6); }
  // headgear
  if(p.hood){ g.fillStyle=p.hood; g.beginPath(); g.arc(cx,headY-headR*0.15,headR*1.25,Math.PI*0.95,Math.PI*2.05); g.lineTo(cx+headR*1.1,headY+headR*0.9); g.lineTo(cx-headR*1.1,headY+headR*0.9); g.fill(); }
  if(p.helmet){ vol(g,cx,headY-headR*0.45,headR*1.05,headR*0.7,p.helmet,{noline:1}); if(p.plume){ g.strokeStyle=p.plume; g.lineWidth=3; g.beginPath(); g.moveTo(cx,headY-headR*1.1); g.quadraticCurveTo(cx+6,headY-headR*2.1,cx+11,headY-headR*1.4); g.stroke(); } }
  if(p.hair&&!p.helmet&&!p.hood){ g.fillStyle=p.hair; g.beginPath(); g.arc(cx,headY-headR*0.35,headR*0.95,Math.PI*0.9,Math.PI*2.1); g.fill(); }
  if(p.mask){ g.fillStyle='#e8e4d0'; g.fillRect(cx-headR*0.8,headY-headR*0.5,headR*1.6,headR*0.9); g.fillStyle='#181008'; g.fillRect(cx-headR*0.45,headY-2,2,3); g.fillRect(cx+headR*0.25,headY-2,2,3); }
  if(p.crown){ g.fillStyle='#e8c860'; g.beginPath(); const cy=headY-headR*0.9;
    g.moveTo(cx-headR,cy+3); g.lineTo(cx-headR,cy-3); g.lineTo(cx-headR*0.5,cy); g.lineTo(cx,cy-5); g.lineTo(cx+headR*0.5,cy); g.lineTo(cx+headR,cy-3); g.lineTo(cx+headR,cy+3); g.fill(); }
}

// ---------- specific monster painters ----------
function drawWolf(g,W,H,frame,p){
  const cx=W/2, gy=H-5, s=p.size||1;
  if(frame==='corpse'){ bloodPool(g,cx,gy-2,22*s,5*s); vol(g,cx,gy-8*s,20*s,7*s,p.fur); vol(g,cx-16*s,gy-9*s,7*s,5*s,p.fur); return; }
  shadowBlob(g,cx,gy,16*s,4);
  const lift=frame==='attack'?6*s:0, walk=frame==='walk'?3*s:0;
  // hind body then chest then head (front 3/4)
  vol(g,cx+6*s,gy-14*s,13*s,10*s,darken(p.fur,15));
  limb(g,cx+10*s,gy-10*s,cx+12*s+walk,gy,4*s,darken(p.fur,30));
  limb(g,cx-2*s,gy-10*s,cx-4*s-walk,gy-lift*0.4,4*s,darken(p.fur,25));
  vol(g,cx-4*s,gy-18*s-lift*0.4,11*s,9*s,p.fur);
  limb(g,cx-8*s,gy-12*s,cx-10*s+walk,gy-lift,4*s,p.fur);
  // head
  const hx=cx-10*s, hy=gy-26*s-lift;
  vol(g,hx,hy,8*s,7*s,p.fur);
  vol(g,hx-6*s,hy+3*s,5*s,3.5*s,darken(p.fur,10)); // snout
  if(frame==='attack'){ g.fillStyle='#a02428'; g.beginPath(); g.ellipse(hx-8*s,hy+4.5*s,3.5*s,2.2*s,0.3,0,7); g.fill();
    g.fillStyle='#e8e4d0'; g.fillRect(hx-10*s,hy+2.5*s,1.5,2); g.fillRect(hx-6*s,hy+2.5*s,1.5,2); }
  g.fillStyle='#181008'; g.beginPath(); g.ellipse(hx-9.5*s,hy+3*s,1.2*s,1.2*s,0,0,7); g.fill();
  g.fillStyle=p.eyes||'#d8b820'; g.fillRect(hx-2*s,hy-2*s,2.4,2); g.fillRect(hx+3*s,hy-2.5*s,2.4,2);
  // ears
  g.fillStyle=darken(p.fur,20);
  g.beginPath(); g.moveTo(hx-2*s,hy-6*s); g.lineTo(hx+1*s,hy-11*s); g.lineTo(hx+4*s,hy-6*s); g.fill();
  g.beginPath(); g.moveTo(hx+4*s,hy-5.5*s); g.lineTo(hx+7*s,hy-10*s); g.lineTo(hx+9*s,hy-5*s); g.fill();
  // tail
  g.strokeStyle=p.fur; g.lineWidth=3*s; g.beginPath(); g.moveTo(cx+17*s,gy-16*s); g.quadraticCurveTo(cx+24*s,gy-20*s,cx+22*s,gy-26*s); g.stroke();
}
function drawSkeleton(g,W,H,frame,p){
  const cx=W/2, gy=H-6, s=p.size||1, bone='#ddd6c0';
  if(frame==='corpse'){ // scattered bones
    g.strokeStyle=bone; g.lineWidth=3;
    for(const [a,b,c,d] of [[-16,-4,-6,-7],[2,-8,12,-4],[-8,-3,4,-5],[8,-9,18,-7]]) { g.beginPath(); g.moveTo(cx+a*s,gy+b*s); g.lineTo(cx+c*s,gy+d*s); g.stroke(); }
    vol(g,cx-2*s,gy-6*s,6*s,5*s,bone); g.fillStyle='#181008'; g.fillRect(cx-4*s,gy-7*s,2,2); g.fillRect(cx+1*s,gy-7*s,2,2);
    return;
  }
  shadowBlob(g,cx,gy,12*s,3.5);
  const walk=frame==='walk'?5*s:0, atk=frame==='attack';
  const hipY=gy-28*s, chestY=hipY-16*s, headY=chestY-13*s;
  // legs
  limb(g,cx-3*s,hipY,cx-5*s-walk*0.5,gy,3*s,bone); limb(g,cx+3*s,hipY,cx+5*s+walk*0.5,gy,3*s,bone);
  vol(g,cx,hipY,6*s,4*s,bone,{noline:1}); // pelvis
  // spine + ribs
  limb(g,cx,hipY,cx,chestY,2.5*s,bone);
  g.strokeStyle=bone; g.lineWidth=2;
  for(let i=0;i<4;i++){ const ry=chestY+3*s+i*3.4*s; g.beginPath(); g.arc(cx,ry,7*s-i*0.7*s,0.15*Math.PI,0.85*Math.PI); g.stroke(); g.beginPath(); g.arc(cx,ry,7*s-i*0.7*s,1.15*Math.PI,1.85*Math.PI); g.stroke(); }
  // arms
  limb(g,cx-7*s,chestY+3*s,cx-11*s,chestY+14*s,2.5*s,bone);
  const hx=atk?cx+12*s:cx+10*s, hy=atk?chestY-8*s:chestY+14*s;
  limb(g,cx+7*s,chestY+3*s,hx,hy,2.5*s,bone);
  if(p.weapon) drawWeapon(g,p.weapon,hx,hy,atk?0.5:0.2,16*s);
  if(p.shield){ vol(g,cx-13*s,chestY+13*s,6.5*s,8.5*s,'#5a6a78'); }
  // skull
  vol(g,cx,headY,7*s,7.5*s,bone);
  g.fillStyle='#100c08'; g.beginPath(); g.ellipse(cx-2.8*s,headY-1,2*s,2.4*s,0,0,7); g.fill();
  g.beginPath(); g.ellipse(cx+2.8*s,headY-1,2*s,2.4*s,0,0,7); g.fill();
  g.fillRect(cx-0.8*s,headY+2*s,1.6*s,2*s);
  g.strokeStyle='#8a8474'; g.lineWidth=1; g.beginPath(); g.moveTo(cx-4*s,headY+5.5*s); g.lineTo(cx+4*s,headY+5.5*s); g.stroke();
  if(p.helmet) vol(g,cx,headY-3*s,7.5*s,5*s,p.helmet,{noline:1});
  if(p.crown){ g.fillStyle='#e8c860'; const cy=headY-6*s; g.beginPath(); g.moveTo(cx-6*s,cy+3); g.lineTo(cx-6*s,cy-2); g.lineTo(cx-3*s,cy); g.lineTo(cx,cy-4); g.lineTo(cx+3*s,cy); g.lineTo(cx+6*s,cy-2); g.lineTo(cx+6*s,cy+3); g.fill(); }
  if(p.robe){ g.globalAlpha=0.85; vol(g,cx,chestY+14*s,11*s,18*s,p.robe,{noline:1}); g.globalAlpha=1; }
  if(p.eyesGlow){ g.fillStyle=p.eyesGlow; g.fillRect(cx-3.6*s,headY-1.5,2.6,2.6); g.fillRect(cx+1.8*s,headY-1.5,2.6,2.6); }
}
function drawGhost(g,W,H,frame){
  const cx=W/2, gy=H-4;
  const sway=frame==='walk'?3:0, atk=frame==='attack';
  if(frame==='corpse'){ g.globalAlpha=0.5; vol(g,cx,gy-6,14,4,'#9adbd8',{noline:1}); g.globalAlpha=1; return; }
  const grad=g.createLinearGradient(0,10,0,H);
  grad.addColorStop(0,'#e8fffb'); grad.addColorStop(0.5,'#7ab8b4'); grad.addColorStop(1,'rgba(60,90,90,0)');
  g.fillStyle=grad;
  g.beginPath();
  g.moveTo(cx-14,gy);
  g.quadraticCurveTo(cx-18+sway,H*0.45,cx-10,14);
  g.quadraticCurveTo(cx,4,cx+10,14);
  g.quadraticCurveTo(cx+18-sway,H*0.45,cx+14,gy);
  for(let i=0;i<4;i++) g.quadraticCurveTo(cx+10-i*7,gy-6,cx+7-i*7,gy);
  g.fill();
  g.fillStyle='#0c1a1a';
  g.beginPath(); g.ellipse(cx,20,7,8,0,0,7); g.fill();
  g.fillStyle=atk?'#ff5040':'#b0fff0';
  g.fillRect(cx-4,17,3,3); g.fillRect(cx+2,17,3,3);
  if(atk){ g.strokeStyle='#d0fff8'; g.lineWidth=2; g.beginPath(); g.moveTo(cx-14,34); g.lineTo(cx-22,28); g.stroke(); g.beginPath(); g.moveTo(cx+14,34); g.lineTo(cx+22,28); g.stroke(); }
}
function drawSpider(g,W,H,frame,p){
  const cx=W/2, gy=H-4, s=p.size||1;
  if(frame==='corpse'){ vol(g,cx,gy-5,12*s,5*s,'#3a3028'); g.strokeStyle='#3a3028'; g.lineWidth=2; for(let i=0;i<4;i++){ g.beginPath(); g.moveTo(cx-8*s+i*5*s,gy-6); g.lineTo(cx-14*s+i*7*s,gy-1); g.stroke(); } return; }
  shadowBlob(g,cx,gy,14*s,3.5);
  const lift=frame==='attack'?4:0, wob=frame==='walk'?2:0;
  g.strokeStyle='#2c241c'; g.lineWidth=2.5;
  for(let i=0;i<4;i++){
    const a=0.5+i*0.5, L=15*s;
    g.beginPath(); g.moveTo(cx-4*s,gy-12*s); g.quadraticCurveTo(cx-L*Math.cos(a)*0.8,gy-14*s-6*Math.sin(a)-wob,cx-L*Math.cos(a)-2,gy); g.stroke();
    g.beginPath(); g.moveTo(cx+4*s,gy-12*s); g.quadraticCurveTo(cx+L*Math.cos(a)*0.8,gy-14*s-6*Math.sin(a)+wob,cx+L*Math.cos(a)+2,gy); g.stroke();
  }
  vol(g,cx,gy-19*s-lift,9*s,7*s,'#463a2c'); // abdomen
  vol(g,cx,gy-11*s-lift*0.5,7*s,5.5*s,'#382e22'); // cephalothorax
  g.fillStyle='#c03028';
  for(let i=0;i<3;i++){ g.fillRect(cx-4*s+i*3*s,gy-13*s-lift*0.5,2,2); }
  if(frame==='attack'){ g.strokeStyle='#d8d4c0'; g.lineWidth=2; g.beginPath(); g.moveTo(cx-2*s,gy-8*s); g.lineTo(cx-3*s,gy-4*s); g.stroke(); g.beginPath(); g.moveTo(cx+2*s,gy-8*s); g.lineTo(cx+3*s,gy-4*s); g.stroke(); }
}
function drawBat(g,W,H,frame){
  const cx=W/2, cy=H*0.45;
  if(frame==='corpse'){ vol(g,cx,H-6,8,3,'#38302a'); return; }
  const up=frame!=='walk'; // wings flap between idle/walk frames
  g.fillStyle='#3a3028';
  const wy=up?-10:6;
  for(const dir of [-1,1]){
    g.beginPath(); g.moveTo(cx,cy);
    g.quadraticCurveTo(cx+dir*10,cy+wy*0.6,cx+dir*20,cy+wy);
    g.lineTo(cx+dir*16,cy+4); g.lineTo(cx+dir*10,cy+2); g.fill();
  }
  vol(g,cx,cy,5,6,'#4a3e32');
  g.fillStyle='#c03028'; g.fillRect(cx-2.5,cy-2,2,2); g.fillRect(cx+1,cy-2,2,2);
  g.fillStyle='#38302a'; g.beginPath(); g.moveTo(cx-3,cy-5); g.lineTo(cx-2,cy-9); g.lineTo(cx,cy-5); g.fill();
  g.beginPath(); g.moveTo(cx,cy-5); g.lineTo(cx+2,cy-9); g.lineTo(cx+3,cy-5); g.fill();
}

// ---------- monster registry (name→id shared with MONSTERS — asserted at bake) ----------
const SPRITE_PAINTERS={
  goblin:     (g,W,H,f)=>drawHumanoid(g,W,H,f,{skin:'#5a8a3a',cloth:'#6a5230',cloth2:'#4a3820',weapon:'club',size:0.8}),
  goblin_war: (g,W,H,f)=>drawHumanoid(g,W,H,f,{skin:'#548036',cloth:'#5a4a5a',weapon:'sword',shield:1,helmet:'#7a8290',size:0.88,bulk:1.1}),
  goblin_sham:(g,W,H,f)=>drawHumanoid(g,W,H,f,{skin:'#5a8a3a',cloth:'#7a3a6a',weapon:'staff',mask:1,size:0.85}),
  wolf:       (g,W,H,f)=>drawWolf(g,W,H,f,{fur:'#7a6a52',size:0.9}),
  direwolf:   (g,W,H,f)=>drawWolf(g,W,H,f,{fur:'#4a4440',size:1.15,eyes:'#e04030'}),
  bandit:     (g,W,H,f)=>drawHumanoid(g,W,H,f,{skin:'#c89468',cloth:'#5a4a34',cloth2:'#3c3226',weapon:'sword',hood:'#4a3a2a'}),
  bandit_bow: (g,W,H,f)=>drawHumanoid(g,W,H,f,{skin:'#b8845c',cloth:'#4a4434',weapon:'bow',hood:'#3c362a'}),
  bandit_boss:(g,W,H,f)=>drawHumanoid(g,W,H,f,{skin:'#c89468',cloth:'#6a2a2a',weapon:'sword',shield:1,helmet:'#8a92a0',plume:'#c03028',size:1.08,bulk:1.15,belt:1}),
  apprentice: (g,W,H,f)=>drawHumanoid(g,W,H,f,{skin:'#d8a878',cloth:'#3a4a8a',weapon:'staff',hood:'#2c3a6a'}),
  bat:        (g,W,H,f)=>drawBat(g,W,H,f),
  spider:     (g,W,H,f)=>drawSpider(g,W,H,f,{size:1}),
  skeleton:   (g,W,H,f)=>drawSkeleton(g,W,H,f,{weapon:'sword'}),
  skel_guard: (g,W,H,f)=>drawSkeleton(g,W,H,f,{weapon:'axe',shield:1,helmet:'#5a6270',size:1.06}),
  zombie:     (g,W,H,f)=>drawHumanoid(g,W,H,f,{skin:'#7a9a6a',cloth:'#4a4438',cloth2:'#3a362c',size:1.0,bulk:1.05}),
  ghost:      (g,W,H,f)=>drawGhost(g,W,H,f),
  necromancer:(g,W,H,f)=>drawHumanoid(g,W,H,f,{skin:'#b09a88',cloth:'#33254a',weapon:'staff',hood:'#241a38',eyesGlow:'#70e070',size:1.02}),
  lich:       (g,W,H,f)=>drawSkeleton(g,W,H,f,{weapon:'staff',robe:'#4a1a30',crown:1,eyesGlow:'#60e8c8',size:1.14}),
};
const SPRITE_DIMS={ wolf:[84,64],direwolf:[92,72],bat:[48,44],spider:[64,52],default:[64,96] };

// NPC + decor painters
const NPC_PAINTERS={
  peasant_m:(g,W,H,f)=>drawHumanoid(g,W,H,f,{skin:'#d0a070',cloth:'#7a6a4a',hair:'#5a4428'}),
  peasant_f:(g,W,H,f)=>{ drawHumanoid(g,W,H,f,{skin:'#d8ac7c',cloth:'#6a4a5a',hood:'#8a6a4a'}); const cx=W/2; g.fillStyle='#c8b89a'; g.fillRect(cx-8,H-40,16,22); },
  guard:    (g,W,H,f)=>drawHumanoid(g,W,H,f,{skin:'#c89468',cloth:'#5a6270',helmet:'#7a8290',tabard:'#3a5a8a',weapon:'staff',bulk:1.08}),
};
function drawTree(g,W,H,variant){
  const cx=W/2, gy=H-4;
  shadowBlob(g,cx,gy,20,5);
  limb(g,cx,gy,cx+(variant?3:-2),gy-30,8,'#5a4428');
  limb(g,cx,gy-22,cx-9,gy-38,4,'#4a3820'); limb(g,cx,gy-26,cx+10,gy-42,4,'#4a3820');
  const leaf=variant?'#4a7a34':'#3e6e40';
  // canopy: flat-shaded blob cluster (no radial rims — they read as rings)
  const blob=(x,y,rx,ry,c)=>{ g.fillStyle=c; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,7); g.fill(); };
  blob(cx,gy-52,26,22,darken(leaf,28));
  blob(cx-12,gy-44,15,12,leaf); blob(cx+11,gy-48,16,13,leaf);
  blob(cx+2,gy-60,17,13,leaf); blob(cx-6,gy-54,12,10,lighten(leaf,14));
  blob(cx+7,gy-56,9,8,lighten(leaf,26)); blob(cx-14,gy-50,7,6,lighten(leaf,20));
  // leaf speckle for texture
  for(let i=0;i<46;i++){ const a=i*2.4, r=(i*7919%23); const x=cx+Math.cos(a)*r, y=gy-52+Math.sin(a)*r*0.8;
    g.fillStyle=(i%3)?darken(leaf,14):lighten(leaf,30); g.fillRect(x,y,2,2); }
}
const DECOR_PAINTERS={
  tree:  (g,W,H)=>drawTree(g,W,H,0),
  tree2: (g,W,H)=>drawTree(g,W,H,1),
  rock:  (g,W,H)=>{ shadowBlob(g,W/2,H-4,14,4); vol(g,W/2,H-14,13,10,'#7a7684'); vol(g,W/2-6,H-10,7,5,'#8a8694',{noline:1}); },
  sign:  (g,W,H)=>{ const cx=W/2; limb(g,cx,H-2,cx,H-30,4,'#5a4428'); g.fillStyle='#8a6a40'; g.fillRect(cx-14,H-42,28,14); g.strokeStyle='#3a2a14'; g.strokeRect(cx-14,H-42,28,14); g.fillStyle='#3a2a14'; g.fillRect(cx-10,H-38,20,2); g.fillRect(cx-10,H-34,14,2); },
  fountain:(g,W,H)=>{ const cx=W/2; vol(g,cx,H-8,22,7,'#8a8694'); g.fillStyle='#4a7ab8'; g.beginPath(); g.ellipse(cx,H-9,17,4.5,0,0,7); g.fill(); limb(g,cx,H-9,cx,H-30,5,'#7a7684'); vol(g,cx,H-32,6,4,'#8a8694'); g.strokeStyle='#9ac8e8'; g.lineWidth=1.5; g.beginPath(); g.moveTo(cx-3,H-30); g.quadraticCurveTo(cx-9,H-22,cx-11,H-12); g.stroke(); g.beginPath(); g.moveTo(cx+3,H-30); g.quadraticCurveTo(cx+9,H-22,cx+11,H-12); g.stroke(); },
  lamp:  (g,W,H)=>{ const cx=W/2; limb(g,cx,H-2,cx,H-44,3.5,'#2c2c34'); g.fillStyle='#2c2c34'; g.fillRect(cx-8,H-46,16,3); vol(g,cx,H-52,6,7,'#e8c860',{noline:1}); g.fillStyle='#2c2c34'; g.fillRect(cx-5,H-60,10,3); },
  campfire:(g,W,H)=>{ const cx=W/2; g.fillStyle='#5a4428'; g.fillRect(cx-14,H-8,28,4); g.fillRect(cx-10,H-11,20,3); vol(g,cx,H-20,7,11,'#e87820',{noline:1,hi:'#ffe890'}); vol(g,cx,H-26,3.5,6,'#ffd850',{noline:1}); },
  campfire_b:(g,W,H)=>{ const cx=W/2; g.fillStyle='#5a4428'; g.fillRect(cx-14,H-8,28,4); g.fillRect(cx-10,H-11,20,3); vol(g,cx-1,H-19,6,9,'#e05810',{noline:1,hi:'#ffd870'}); vol(g,cx+1,H-27,3,7,'#ffe060',{noline:1}); },
  tent:  (g,W,H)=>{ const cx=W/2; g.fillStyle='#8a7450'; g.beginPath(); g.moveTo(cx-22,H-4); g.lineTo(cx,H-34); g.lineTo(cx+22,H-4); g.fill(); g.fillStyle='#5a4a30'; g.beginPath(); g.moveTo(cx-6,H-4); g.lineTo(cx,H-16); g.lineTo(cx+6,H-4); g.fill(); g.strokeStyle='#3a2e1c'; g.lineWidth=1.5; g.beginPath(); g.moveTo(cx-22,H-4); g.lineTo(cx,H-34); g.lineTo(cx+22,H-4); g.stroke(); },
  shrine:(g,W,H)=>{ const cx=W/2; shadowBlob(g,cx,H-4,14,4); vol(g,cx,H-10,14,5,'#8a8694'); g.fillStyle='#9a96a4'; g.fillRect(cx-8,H-38,16,28); g.fillStyle='#7a7684'; g.fillRect(cx-10,H-42,20,6); g.fillStyle='#e8c860'; g.beginPath(); g.arc(cx,H-28,4,0,7); g.fill(); },
  brazier:(g,W,H)=>{ const cx=W/2; limb(g,cx,H-2,cx,H-14,4,'#2c2c34'); vol(g,cx,H-17,8,4,'#3c3c44'); vol(g,cx,H-25,5,7,'#e87820',{noline:1,hi:'#ffe890'}); },
  brazier_b:(g,W,H)=>{ const cx=W/2; limb(g,cx,H-2,cx,H-14,4,'#2c2c34'); vol(g,cx,H-17,8,4,'#3c3c44'); vol(g,cx+1,H-27,4,8,'#ffb840',{noline:1}); },
  chest: (g,W,H)=>{ const cx=W/2; shadowBlob(g,cx,H-3,14,3.5); g.fillStyle='#7a5a30'; g.fillRect(cx-13,H-18,26,14); vol(g,cx,H-18,13,6,'#8a6a40',{noline:1}); g.fillStyle='#3a2a14'; g.fillRect(cx-13,H-12,26,2); g.fillStyle='#c8a850'; g.fillRect(cx-2,H-14,4,6); g.strokeStyle='#3a2a14'; g.strokeRect(cx-13,H-18,26,14); },
  chest_open:(g,W,H)=>{ const cx=W/2; shadowBlob(g,cx,H-3,14,3.5); g.fillStyle='#6a4c28'; g.fillRect(cx-13,H-14,26,10); g.fillStyle='#241a10'; g.fillRect(cx-11,H-13,22,5); g.fillStyle='#8a6a40'; g.fillRect(cx-13,H-26,26,6); g.strokeStyle='#3a2a14'; g.strokeRect(cx-13,H-26,26,6); g.fillStyle='#e8c860'; g.fillRect(cx-8,H-12,3,2); g.fillRect(cx+2,H-13,4,2); },
  cryptgate:(g,W,H)=>{ const cx=W/2; g.fillStyle='#8a8694'; g.fillRect(cx-20,H-8,40,6); g.fillRect(cx-20,H-46,6,40); g.fillRect(cx+14,H-46,6,40); g.fillRect(cx-24,H-52,48,8); g.fillStyle='#5a5664'; g.fillRect(cx-13,H-44,26,3); },
};

// ---------- portraits (58x66, painted at 2x) ----------
function paintFace(big,W2,H2,p){
  const g=big, cx=W2/2;
  // background
  const bg=g.createLinearGradient(0,0,0,H2); bg.addColorStop(0,p.bgTop||'#2a3444'); bg.addColorStop(1,p.bgBot||'#141a26');
  g.fillStyle=bg; g.fillRect(0,0,W2,H2);
  const skin=p.skin||'#d8a878';
  // shoulders / garment
  vol(g,cx,H2+10,W2*0.62,H2*0.42,p.garb||'#5a4a34',{noline:1});
  if(p.collar){ g.fillStyle=p.collar; g.fillRect(cx-W2*0.4,H2*0.82,W2*0.8,H2*0.08); }
  // neck
  vol(g,cx,H2*0.78,W2*0.14,H2*0.12,darken(skin,15),{noline:1});
  // head
  const hy=H2*0.44, hr=W2*0.30;
  vol(g,cx,hy,hr,hr*1.22,skin,{noline:1,hi:lighten(skin,40),lo:darken(skin,45)});
  // jaw shade
  g.fillStyle='rgba(60,30,16,0.18)'; g.beginPath(); g.ellipse(cx,hy+hr*0.75,hr*0.72,hr*0.4,0,0,7); g.fill();
  // hood/scarf frame the face — draw BEFORE features, with an inner face window
  if(p.head==='hood'||p.head==='scarf'){
    g.fillStyle=p.hoodC||(p.head==='hood'?'#2c3a6a':'#8a5a4a');
    g.beginPath(); g.arc(cx,hy-hr*0.1,hr*1.32,Math.PI*0.9,Math.PI*2.1);
    g.lineTo(cx+hr*1.2,H2); g.lineTo(cx-hr*1.2,H2); g.fill();
    vol(g,cx,hy+hr*0.06,hr*0.8,hr*0.98,skin,{noline:1,hi:lighten(skin,35),lo:darken(skin,40)});
    g.fillStyle='rgba(10,8,16,0.35)'; g.beginPath(); g.ellipse(cx,hy-hr*0.55,hr*0.7,hr*0.32,0,0,7); g.fill();
  }
  // eyes
  const ey=hy-hr*0.1, ex=hr*0.42;
  for(const d of [-1,1]){
    if(p.pain){ // squeezed shut
      g.strokeStyle='rgba(40,20,10,0.85)'; g.lineWidth=2.5;
      g.beginPath(); g.moveTo(cx+d*ex-hr*0.18,ey); g.quadraticCurveTo(cx+d*ex,ey+hr*0.08,cx+d*ex+hr*0.18,ey); g.stroke();
    } else {
      g.fillStyle='#e8e0d4'; g.beginPath(); g.ellipse(cx+d*ex,ey,hr*0.2,hr*0.12,0,0,7); g.fill();
      g.fillStyle=p.eyes||'#4a6a8a'; g.beginPath(); g.ellipse(cx+d*ex,ey,hr*0.09,hr*0.1,0,0,7); g.fill();
      g.fillStyle='#100c08'; g.beginPath(); g.ellipse(cx+d*ex,ey,hr*0.045,hr*0.05,0,0,7); g.fill();
      g.strokeStyle='rgba(40,20,10,0.7)'; g.lineWidth=2; g.beginPath(); g.moveTo(cx+d*ex-hr*0.2,ey-hr*0.1); g.quadraticCurveTo(cx+d*ex,ey-hr*0.2,cx+d*ex+hr*0.2,ey-hr*0.08); g.stroke();
    }
    // brow (pain = knotted upward)
    g.strokeStyle=p.hairC||'#4a3828'; g.lineWidth=p.thickBrow?5:3;
    const knot=p.pain?0.38:(p.angry?0.36:0.28);
    g.beginPath(); g.moveTo(cx+d*ex-hr*0.22,ey-hr*(p.pain?0.18:0.25)); g.quadraticCurveTo(cx+d*ex,ey-hr*(0.34+(p.angry||p.pain?0.02:0.08)),cx+d*ex+hr*0.2,ey-hr*knot); g.stroke();
  }
  // nose
  g.strokeStyle='rgba(70,35,18,0.5)'; g.lineWidth=2.5;
  g.beginPath(); g.moveTo(cx-hr*0.06,ey); g.quadraticCurveTo(cx-hr*0.12,hy+hr*0.32,cx-hr*0.02,hy+hr*0.4); g.stroke();
  g.fillStyle='rgba(70,35,18,0.45)';
  g.beginPath(); g.ellipse(cx-hr*0.1,hy+hr*0.42,2.5,2,0,0,7); g.fill();
  g.beginPath(); g.ellipse(cx+hr*0.1,hy+hr*0.42,2.5,2,0,0,7); g.fill();
  // mouth
  const my=hy+hr*0.68;
  if(p.pain){ // open cry
    g.fillStyle='rgba(60,18,16,0.9)'; g.beginPath(); g.ellipse(cx,my+hr*0.02,hr*0.16,hr*0.13,0,0,7); g.fill();
    g.strokeStyle='rgba(40,15,12,0.8)'; g.lineWidth=1.5; g.stroke();
  } else {
    g.strokeStyle='rgba(90,30,25,0.85)'; g.lineWidth=2.5;
    g.beginPath(); g.moveTo(cx-hr*0.26,my); g.quadraticCurveTo(cx,my+(p.smile?hr*0.1:p.stern?-hr*0.02:hr*0.04),cx+hr*0.26,my); g.stroke();
    g.fillStyle='rgba(190,110,95,0.5)'; g.beginPath(); g.ellipse(cx,my+hr*0.09,hr*0.16,hr*0.05,0,0,7); g.fill();
  }
  // age lines
  if(p.old){ g.strokeStyle='rgba(70,35,18,0.35)'; g.lineWidth=2;
    for(const d of [-1,1]){ g.beginPath(); g.moveTo(cx+d*hr*0.5,hy+hr*0.35); g.quadraticCurveTo(cx+d*hr*0.42,hy+hr*0.6,cx+d*hr*0.3,my+4); g.stroke(); }
    g.beginPath(); g.moveTo(cx-hr*0.3,hy-hr*0.55); g.quadraticCurveTo(cx,hy-hr*0.62,cx+hr*0.3,hy-hr*0.55); g.stroke(); }
  if(p.scar){ g.strokeStyle='rgba(150,60,50,0.8)'; g.lineWidth=2.5; g.beginPath(); g.moveTo(cx-hr*0.5,hy-hr*0.4); g.lineTo(cx-hr*0.2,hy+hr*0.25); g.stroke(); }
  // facial hair
  const hairC=p.hairC||'#4a3828';
  if(p.beard){ g.fillStyle=hairC; g.beginPath(); g.moveTo(cx-hr*0.6,hy+hr*0.3); g.quadraticCurveTo(cx,hy+hr*(1.1+p.beard*0.25),cx+hr*0.6,hy+hr*0.3); g.quadraticCurveTo(cx,hy+hr*0.75,cx-hr*0.6,hy+hr*0.3); g.fill(); }
  if(p.mustache){ g.strokeStyle=hairC; g.lineWidth=5; g.beginPath(); g.moveTo(cx-hr*0.25,my-3); g.quadraticCurveTo(cx,my-8,cx+hr*0.25,my-3); g.stroke(); }
  // hair (skip under hood/scarf — they framed the face already)
  if(p.head!=='hood'&&p.head!=='scarf'){
    if(p.hair===1){ g.fillStyle=hairC; g.beginPath(); g.arc(cx,hy-hr*0.32,hr*0.95,Math.PI*0.95,Math.PI*2.05); g.fill(); }
    if(p.hair===2){ g.fillStyle=hairC; g.beginPath(); g.arc(cx,hy-hr*0.25,hr*1.0,Math.PI*0.85,Math.PI*2.15); g.fill();
      g.fillRect(cx-hr*1.0,hy-hr*0.3,hr*0.32,hr*1.5); g.fillRect(cx+hr*0.68,hy-hr*0.3,hr*0.32,hr*1.5); }
    if(p.hair===3){ g.fillStyle=hairC; g.beginPath(); g.arc(cx,hy-hr*0.3,hr*0.9,Math.PI,Math.PI*2); g.fill(); } // receding
  }
  if(p.head==='helm'){ vol(g,cx,hy-hr*0.62,hr*1.05,hr*0.62,'#7a8290',{noline:1}); g.fillStyle='#5a6270'; g.fillRect(cx-hr*1.02,hy-hr*0.45,hr*0.2,hr*0.9); g.fillRect(cx+hr*0.82,hy-hr*0.45,hr*0.2,hr*0.9); }
  if(p.head==='circlet'){ g.strokeStyle='#e8c860'; g.lineWidth=4; g.beginPath(); g.arc(cx,hy-hr*0.45,hr*0.85,Math.PI*1.05,Math.PI*1.95); g.stroke(); g.fillStyle='#e04030'; g.beginPath(); g.arc(cx,hy-hr*0.88,4,0,7); g.fill(); }
  // vignette
  const vg=g.createRadialGradient(cx,H2*0.45,H2*0.3,cx,H2*0.5,H2*0.75);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.45)');
  g.fillStyle=vg; g.fillRect(0,0,W2,H2);
}
function bakePortrait(id,p){
  const W=58,H=66;
  const paint=(extra)=>bakeFromCanvas(W,H,(g)=>{
    const big=document.createElement('canvas'); big.width=W*2; big.height=H*2;
    paintFace(big.getContext('2d'),W*2,H*2,Object.assign({},p,extra));
    g.drawImage(big,0,0,W,H);
  },8);
  Art.portraits[id]=paint();
  if(id[0]==='p') Art.portraitsPain[id]=paint({pain:1}); // party members wince when hit
}
const PORTRAIT_DEFS={
  p0:{skin:'#d8a878',hair:1,hairC:'#4a3828',eyes:'#4a6a8a',garb:'#6a5a44',thickBrow:1},                    // Roderic - knight
  p1:{skin:'#c89468',hair:3,hairC:'#2c2420',eyes:'#3a5a3a',garb:'#5a6270',collar:'#8a92a0',beard:1},       // Aldric - paladin
  p2:{skin:'#e0b48c',hair:2,hairC:'#8a5a2c',eyes:'#4a6a8a',garb:'#e8e0d0',collar:'#c8a850',smile:1},       // Serena - cleric
  p3:{skin:'#d0a48a',hair:2,hairC:'#181818',eyes:'#6a4a8a',garb:'#3a4a8a',head:'hood',hoodC:'#2c3a6a'},    // Mireth - sorcerer
  p4:{skin:'#b8845c',hair:1,hairC:'#0c0c0c',eyes:'#3a2c1c',garb:'#5a4a34',scar:1,stern:1},                 // extra knight-ish
  p5:{skin:'#e8c098',hair:2,hairC:'#d8c060',eyes:'#3a6a5a',garb:'#4a6a4a',smile:1},                        // extra druid-ish
  p6:{skin:'#c89c74',hair:3,hairC:'#5a5a5a',eyes:'#4a4a6a',garb:'#6a3a3a',mustache:1,old:1},               // extra
  p7:{skin:'#d8ac7c',hair:1,hairC:'#7a3018',eyes:'#4a6a3a',garb:'#7a6a4a',thickBrow:1,angry:1},            // extra archer-ish
  mayor:{skin:'#d0a888',hair:3,hairC:'#b8b4a8',eyes:'#4a4a5a',garb:'#6a2a2a',collar:'#e8c860',head:'circlet',beard:1.4,old:1,stern:1},
  priest:{skin:'#e0bc94',hair:0,hairC:'#c8c4b8',eyes:'#5a6a8a',garb:'#e8e0d0',collar:'#c8a850',old:1,smile:1},
  trainer:{skin:'#c08c5c',hair:0,hairC:'#3a3430',eyes:'#3a2c1c',garb:'#7a5a34',mustache:1,scar:1,thickBrow:1,stern:1},
  tavernkeep:{skin:'#e0b088',hair:2,hairC:'#6a3018',eyes:'#4a6a3a',garb:'#6a4a5a',head:'scarf',hoodC:'#8a5a4a',smile:1},
  smith:{skin:'#b8845c',hair:1,hairC:'#241f1a',eyes:'#3a2c1c',garb:'#4a4440',beard:1.2,thickBrow:1},
  armorer:{skin:'#c89c74',hair:1,hairC:'#4a3828',eyes:'#4a4a6a',garb:'#5a6270',collar:'#8a92a0',mustache:1},
  mage:{skin:'#d8b090',hair:0,hairC:'#8a8a94',eyes:'#6a4a8a',garb:'#3a4a8a',head:'hood',hoodC:'#2c3a6a',beard:1.8,old:1},
  banker:{skin:'#d8ac84',hair:3,hairC:'#6a6258',eyes:'#3a3a4a',garb:'#3a3a44',collar:'#c8a850',old:1,stern:1},
  peasant_m:{skin:'#d0a070',hair:1,hairC:'#5a4428',eyes:'#4a3a2a',garb:'#7a6a4a',smile:1},
  peasant_f:{skin:'#d8ac7c',hair:2,hairC:'#4a3020',eyes:'#3a5a3a',garb:'#6a4a5a',head:'scarf',smile:1},
  guard:{skin:'#c89468',hair:1,hairC:'#3a3430',eyes:'#3a3a4a',garb:'#5a6270',head:'helm',stern:1},
};

// ---------- item icons (24x24) ----------
function bakeIcon(key,painter){ Art.icons[key]=bakeFromCanvas(24,24,painter,8); }
function iconBlade(g,len,wid,col,guard){
  g.save(); g.translate(12,12); g.rotate(-Math.PI/4);
  const gr=g.createLinearGradient(-wid,0,wid,0); gr.addColorStop(0,lighten(col,60)); gr.addColorStop(0.5,col); gr.addColorStop(1,darken(col,50));
  g.fillStyle=gr; g.beginPath(); g.moveTo(-wid,len/2); g.lineTo(-wid,-len/2+3); g.lineTo(0,-len/2); g.lineTo(wid,-len/2+3); g.lineTo(wid,len/2); g.fill();
  if(guard){ g.fillStyle='#9a7c34'; g.fillRect(-4.5,len/2,9,2); g.fillStyle='#6a5020'; g.fillRect(-1.2,len/2+2,2.4,5); g.fillStyle='#c8a850'; g.beginPath(); g.arc(0,len/2+8,2,0,7); g.fill(); }
  g.restore();
}
function bakeAllIcons(){
  bakeIcon('club',g=>{ g.save(); g.translate(12,12); g.rotate(-Math.PI/4); g.fillStyle='#7a5a30'; g.fillRect(-1.5,-2,3,12); vol(g,0,-6,3.5,5.5,'#8a6a40',{noline:1}); g.restore(); });
  bakeIcon('dagger',g=>iconBlade(g,12,1.6,'#c8ccd4',1));
  bakeIcon('shortsword',g=>iconBlade(g,15,2,'#c8ccd4',1));
  bakeIcon('longsword',g=>iconBlade(g,19,2,'#d0d4dc',1));
  bakeIcon('bastard',g=>iconBlade(g,20,2.6,'#d8dce4',1));
  bakeIcon('handaxe',g=>{ g.save(); g.translate(11,12); g.rotate(-0.5); g.fillStyle='#7a5a30'; g.fillRect(-1.5,-8,3,18); g.fillStyle='#b8bcc4'; g.beginPath(); g.moveTo(0,-8); g.quadraticCurveTo(10,-7,8,2); g.lineTo(0,-2); g.fill(); g.restore(); });
  bakeIcon('battleaxe',g=>{ g.save(); g.translate(12,12); g.rotate(-0.4); g.fillStyle='#6a4c28'; g.fillRect(-1.5,-9,3,20); for(const d of [-1,1]){ g.fillStyle='#c0c4cc'; g.beginPath(); g.moveTo(0,-8); g.quadraticCurveTo(d*10,-7,d*8,2); g.lineTo(0,-2); g.fill(); } g.restore(); });
  bakeIcon('mace',g=>{ g.save(); g.translate(12,13); g.rotate(-0.6); g.fillStyle='#6a4c28'; g.fillRect(-1.5,-4,3,14); vol(g,0,-7,4.5,4.5,'#9aa0ac',{noline:1}); g.fillStyle='#5a6068'; for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; g.fillRect(-1+5*Math.cos(a),-8+5*Math.sin(a),2,2);} g.restore(); });
  bakeIcon('warhammer',g=>{ g.save(); g.translate(12,13); g.rotate(-0.6); g.fillStyle='#6a4c28'; g.fillRect(-1.5,-5,3,16); g.fillStyle='#a8aeb8'; g.fillRect(-6,-11,12,7); g.fillStyle='#7a8088'; g.fillRect(-6,-6,12,2); g.restore(); });
  bakeIcon('shortbow',g=>{ g.strokeStyle='#7a5a30'; g.lineWidth=2.5; g.beginPath(); g.arc(9,12,9,-1.2,1.2); g.stroke(); g.strokeStyle='#d8d4c0'; g.lineWidth=1; g.beginPath(); g.moveTo(9+9*Math.cos(-1.2),12+9*Math.sin(-1.2)); g.lineTo(9+9*Math.cos(1.2),12+9*Math.sin(1.2)); g.stroke(); });
  bakeIcon('longbow',g=>{ g.strokeStyle='#5a4020'; g.lineWidth=2.5; g.beginPath(); g.arc(8,12,11,-1.25,1.25); g.stroke(); g.strokeStyle='#d8d4c0'; g.lineWidth=1; g.beginPath(); g.moveTo(8+11*Math.cos(-1.25),12+11*Math.sin(-1.25)); g.lineTo(8+11*Math.cos(1.25),12+11*Math.sin(1.25)); g.stroke(); });
  bakeIcon('quarterstaff',g=>{ g.save(); g.translate(12,12); g.rotate(-Math.PI/4); g.fillStyle='#8a6a40'; g.fillRect(-1.5,-11,3,22); g.fillStyle='#5a4020'; g.fillRect(-1.5,-11,3,3); g.fillRect(-1.5,8,3,3); g.restore(); });
  bakeIcon('runestaff',g=>{ g.save(); g.translate(12,13); g.rotate(-Math.PI/4); g.fillStyle='#5a4020'; g.fillRect(-1.5,-8,3,20); vol(g,0,-10,4,4,'#40c0c8',{noline:1}); g.restore(); });
  const torso=(g,col,pattern)=>{ g.fillStyle=col; g.beginPath(); g.moveTo(5,6); g.lineTo(9,3); g.lineTo(15,3); g.lineTo(19,6); g.lineTo(18,12); g.lineTo(16,13); g.lineTo(16,21); g.lineTo(8,21); g.lineTo(8,13); g.lineTo(6,12); g.fill(); g.strokeStyle='rgba(20,12,8,0.6)'; g.stroke(); if(pattern==='rings'){ g.strokeStyle='rgba(220,224,232,0.5)'; for(let y=6;y<20;y+=3){ g.beginPath(); g.moveTo(8,y); g.quadraticCurveTo(12,y+2,16,y); g.stroke(); } } if(pattern==='studs'){ g.fillStyle='#9aa0ac'; for(let y=7;y<19;y+=4)for(let x=9;x<16;x+=3) g.fillRect(x,y,1.6,1.6); } if(pattern==='plate'){ g.strokeStyle='rgba(240,244,252,0.6)'; g.beginPath(); g.moveTo(12,4); g.lineTo(12,20); g.stroke(); g.beginPath(); g.moveTo(7,10); g.lineTo(17,10); g.stroke(); } };
  bakeIcon('padded',g=>torso(g,'#b8a880'));
  bakeIcon('leatherarm',g=>torso(g,'#8a6a40'));
  bakeIcon('studded',g=>torso(g,'#7a5a34','studs'));
  bakeIcon('chainmail',g=>torso(g,'#8a92a0','rings'));
  bakeIcon('platearm',g=>torso(g,'#b8bec8','plate'));
  bakeIcon('buckler',g=>{ vol(g,12,12,8,8,'#8a6a40'); g.fillStyle='#9aa0ac'; g.beginPath(); g.arc(12,12,3,0,7); g.fill(); });
  bakeIcon('kiteshield',g=>{ g.fillStyle='#5a6a9a'; g.beginPath(); g.moveTo(12,2); g.lineTo(19,6); g.lineTo(17,15); g.lineTo(12,22); g.lineTo(7,15); g.lineTo(5,6); g.fill(); g.strokeStyle='#2a3040'; g.stroke(); g.strokeStyle='#c8ccd4'; g.beginPath(); g.moveTo(12,4); g.lineTo(12,20); g.stroke(); });
  bakeIcon('cap',g=>{ vol(g,12,13,8,6,'#8a6a40',{noline:1}); g.fillStyle='#6a4c28'; g.fillRect(4,15,16,3); });
  bakeIcon('helm',g=>{ vol(g,12,11,8,7,'#9aa0ac',{noline:1}); g.fillStyle='#6a7078'; g.fillRect(4,14,16,3); g.fillStyle='#2c2c34'; g.fillRect(9,10,2.5,5); g.fillRect(13,10,2.5,5); });
  bakeIcon('boots',g=>{ g.fillStyle='#6a4c28'; g.fillRect(6,4,5,13); g.fillRect(6,15,9,4); g.fillStyle='#5a4020'; g.fillRect(13,8,5,7); g.fillRect(13,13,9,6); g.strokeStyle='#3a2a14'; g.strokeRect(6,4,5,13); });
  bakeIcon('greaves',g=>{ g.fillStyle='#a8aeb8'; g.fillRect(6,3,5,14); g.fillRect(6,15,9,4); g.fillStyle='#8a9098'; g.fillRect(13,7,5,8); g.fillRect(13,13,9,6); });
  bakeIcon('ring',g=>{ g.strokeStyle='#e8c860'; g.lineWidth=3; g.beginPath(); g.arc(12,14,6,0,7); g.stroke(); g.fillStyle='#e04030'; g.beginPath(); g.arc(12,6,3,0,7); g.fill(); });
  bakeIcon('amulet',g=>{ g.strokeStyle='#c8a850'; g.lineWidth=1.5; g.beginPath(); g.arc(12,8,7,Math.PI*0.15,Math.PI*0.85,true); g.stroke(); g.fillStyle='#40c0c8'; g.beginPath(); g.moveTo(12,12); g.lineTo(16,17); g.lineTo(12,22); g.lineTo(8,17); g.fill(); });
  const potion=(g,col)=>{ g.fillStyle='#b8c4c8'; g.fillRect(10,3,4,4); g.fillStyle=col; g.beginPath(); g.moveTo(10,7); g.lineTo(14,7); g.lineTo(17,14); g.lineTo(17,19); g.lineTo(7,19); g.lineTo(7,14); g.fill(); g.strokeStyle='rgba(230,240,245,0.6)'; g.strokeRect(10,3,4,4); g.beginPath(); g.moveTo(9,9); g.lineTo(9,17); g.stroke(); };
  bakeIcon('potion_r',g=>potion(g,'#c03028')); bakeIcon('potion_b',g=>potion(g,'#3858c0')); bakeIcon('potion_g',g=>potion(g,'#38a048'));
  bakeIcon('bread',g=>{ vol(g,12,13,9,5.5,'#c89858',{noline:1}); g.strokeStyle='#8a6030'; g.lineWidth=1.5; for(let i=0;i<3;i++){ g.beginPath(); g.moveTo(7+i*4,10); g.lineTo(9+i*4,15); g.stroke(); } });
  bakeIcon('scroll',g=>{ g.fillStyle='#d8c8a0'; g.fillRect(6,4,12,16); g.fillStyle='#b8a070'; g.fillRect(6,4,12,3); g.fillRect(6,17,12,3); g.fillStyle='#5a4a2c'; for(let y=9;y<16;y+=2.6) g.fillRect(8,y,8,1); });
  bakeIcon('fang',g=>{ g.fillStyle='#e8e4d0'; g.beginPath(); g.moveTo(9,4); g.quadraticCurveTo(16,8,14,20); g.quadraticCurveTo(10,14,9,4); g.fill(); g.strokeStyle='#8a8474'; g.stroke(); });
  bakeIcon('censer',g=>{ g.strokeStyle='#c8ccd4'; g.lineWidth=1.5; g.beginPath(); g.moveTo(12,2); g.lineTo(12,8); g.stroke(); vol(g,12,14,7,6,'#c8ccd4',{noline:1}); g.fillStyle='#8a92a0'; g.fillRect(5,12,14,2); g.fillStyle='#e8c860'; g.fillRect(10,19,4,3); });
  bakeIcon('sigil',g=>{ g.fillStyle='#38484a'; g.beginPath(); g.arc(12,12,9,0,7); g.fill(); g.strokeStyle='#40e0c8'; g.lineWidth=2; g.beginPath(); g.arc(12,12,6,0,7); g.stroke(); g.beginPath(); g.moveTo(12,6); g.lineTo(12,18); g.moveTo(6,12); g.lineTo(18,12); g.stroke(); });
  bakeIcon('crown',g=>{ g.fillStyle='#e8c860'; g.beginPath(); g.moveTo(4,18); g.lineTo(4,9); g.lineTo(8,13); g.lineTo(12,5); g.lineTo(16,13); g.lineTo(20,9); g.lineTo(20,18); g.fill(); g.fillStyle='#e04030'; g.beginPath(); g.arc(12,15,2,0,7); g.fill(); g.fillStyle='#3858c0'; g.beginPath(); g.arc(7,15,1.5,0,7); g.fill(); g.beginPath(); g.arc(17,15,1.5,0,7); g.fill(); });
}

// ---------- paperdolls (92x150 base + overlays drawn by UI) ----------
function bakePaperdolls(){
  const W=92,H=150;
  const base=(skin)=>bakeFromCanvas(W,H,g=>{
    const cx=W/2;
    // MM6-style: body against dark leather backdrop
    vol(g,cx,H-70,26,60,'#241c14',{noline:1});
    const hipY=H-52, chestY=hipY-30, headY=chestY-24, hr=11;
    limb(g,cx-6,hipY,cx-8,H-8,9,skin); limb(g,cx+6,hipY,cx+8,H-8,9,darken(skin,12));
    g.fillStyle='#5a4a34'; g.fillRect(cx-13,hipY-8,26,14); // breeches
    vol(g,cx,chestY+12,15,22,skin,{noline:1});
    limb(g,cx-13,chestY+4,cx-17,chestY+34,7,skin); limb(g,cx+13,chestY+4,cx+17,chestY+34,7,darken(skin,12));
    vol(g,cx,headY,hr,hr*1.2,skin,{noline:1});
    g.fillStyle='#181008'; g.fillRect(cx-5,headY-2,2.5,2.5); g.fillRect(cx+2,headY-2,2.5,2.5);
    g.strokeStyle='rgba(90,30,25,0.8)'; g.lineWidth=2; g.beginPath(); g.moveTo(cx-3,headY+8); g.lineTo(cx+3,headY+8); g.stroke();
    return;
  },10);
  Art.paperdolls.male=base('#d0a070');
  Art.paperdolls.female=base('#d8ac7c');
}

// ---------- bake driver ----------
// 1px dark outline around the opaque silhouette — the pre-rendered-sprite edge
function addOutline(tex,w,h){
  const out=tex.slice();
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(tex[y*w+x]) continue;
    if((x>0&&tex[y*w+x-1])||(x<w-1&&tex[y*w+x+1])||(y>0&&tex[(y-1)*w+x])||(y<h-1&&tex[(y+1)*w+x])) out[y*w+x]=240;
  }
  return out;
}
Art.bakeSprites=function(){
  // creatures: assert 1:1 with MONSTERS (the name→id scar)
  for(const mid in MONSTERS){
    const painter=SPRITE_PAINTERS[mid];
    if(!painter) throw new Error('no sprite painter for monster '+mid);
    const [w,h]=SPRITE_DIMS[mid]||SPRITE_DIMS.default;
    const frames={};
    for(const f of ['idle','walk','attack','corpse']){
      let t=bakeFromCanvas(w,h,(g,W,H)=>painter(g,W,H,f),10);
      if(mid!=='ghost') t=addOutline(t,w,h);
      frames[f]=t;
    }
    Art.sprites[mid]={tw:w,th:h,frames};
  }
  for(const k in SPRITE_PAINTERS) if(!MONSTERS[k]) throw new Error('sprite painter without monster stats: '+k);
  for(const k in NPC_PAINTERS){
    const frames={};
    for(const f of ['idle','walk']) frames[f]=addOutline(bakeFromCanvas(64,96,(g,W,H)=>NPC_PAINTERS[k](g,W,H,f),10),64,96);
    Art.sprites['npc_'+k]={tw:64,th:96,frames};
  }
  for(const k in DECOR_PAINTERS){
    const isTall=k.startsWith('tree'), w=isTall?72:56, h=isTall?96:64;
    Art.sprites['decor_'+k]={tw:w,th:h,frames:{idle:bakeFromCanvas(w,h,(g,W,H)=>DECOR_PAINTERS[k](g,W,H),10)}};
  }
  // projectiles: small glowing bolts
  const PROJ={fire:'#ff9030',ice:'#a0d8ff',spark:'#ffe860',stone:'#a08868',dark:'#9040c0',mind:'#ff90b0',light:'#fff8c0',arrow:null};
  for(const k in PROJ){
    Art.sprites['proj_'+k]={tw:20,th:20,frames:{idle:bakeFromCanvas(20,20,g=>{
      if(k==='arrow'){ g.strokeStyle='#8a6a40'; g.lineWidth=2; g.beginPath(); g.moveTo(3,12); g.lineTo(16,8); g.stroke();
        g.fillStyle='#c8ccd4'; g.beginPath(); g.moveTo(16,8); g.lineTo(12,5); g.lineTo(13,10); g.fill(); return; }
      const c=PROJ[k];
      const gr=g.createRadialGradient(10,10,1,10,10,9);
      gr.addColorStop(0,'#ffffff'); gr.addColorStop(0.4,c); gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr; g.fillRect(0,0,20,20);
    },6)}};
  }
  for(const id in PORTRAIT_DEFS) bakePortrait(id,PORTRAIT_DEFS[id]);
  bakeAllIcons();
  // icon coverage: every ITEMS icon key must exist (the other half of the scar)
  for(const id in ITEMS){ if(!Art.icons[ITEMS[id].icon]) throw new Error('missing icon: '+ITEMS[id].icon+' for '+id); }
  bakePaperdolls();
};
Art.bakeAll=function(){ Art.bakeTextures(); Art.bakeFont(); Art.bakeUI(); Art.bakeSprites(); };
