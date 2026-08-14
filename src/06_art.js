// 06_art — procedural textures, sky, bitmap font, carved-stone UI frame. Owner: art.
// Everything bakes to palette-indexed Uint8Arrays (0 = transparent, 240 = black).
'use strict';

const Art = {
  walls:{}, floors:{}, ceilings:{}, sprites:{}, icons:{}, portraits:{}, portraitsPain:{}, paperdolls:{}, ui:{}, font:null,
  _skyCache:{}, _water:[null,null], _waterFlip:0,
};

function bakeFromCanvas(w,h,painter,ditherAmt){
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});
  painter(g,w,h);
  const d=g.getImageData(0,0,w,h).data;
  const out=new Uint8Array(w*h);
  const amt=ditherAmt===undefined?12:ditherAmt;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4;
    if(d[i+3]<110){ out[y*w+x]=0; continue; }
    let p=palDither(d[i],d[i+1],d[i+2],x,y,amt);
    out[y*w+x]=p===0?240:p;
  }
  return out;
}
// direct palette painter (per-pixel, for tileable noise textures).
// NOTE: returns are used verbatim — 0 stays 0 (transparent in blit paths);
// painters wanting true black must return 240 explicitly.
function bakePix(w,h,fn){
  const out=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){ out[y*w+x]=fn(x,y); }
  return out;
}
// value noise (tileable over period)
function makeNoise(seedKey,period){
  const r=RNG.world('art:'+seedKey), grid=[];
  for(let i=0;i<period*period;i++) grid.push(r.next());
  return (x,y)=>{
    const xi=Math.floor(x)%period,yi=Math.floor(y)%period;
    const xf=x-Math.floor(x),yf=y-Math.floor(y);
    const g=(a,b)=>grid[((b+period)%period)*period+((a+period)%period)];
    const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
    return lerp(lerp(g(xi,yi),g(xi+1,yi),u),lerp(g(xi,yi+1),g(xi+1,yi+1),u),v);
  };
}

// ---------- wall / floor textures (64x64, palette space) ----------
Art.bakeTextures=function(){
  const N=makeNoise('n1',16), N2=makeNoise('n2',8), N3=makeNoise('n3',32);
  const brickPat=(x,y,bw,bh,mortar)=>{ // returns 0 edge .. 1 center of brick
    const row=Math.floor(y/bh), off=(row%2)*(bw/2);
    const bx=(x+off)%bw, by=y%bh;
    const ex=Math.min(bx,bw-bx)/mortar, ey=Math.min(by,bh-by)/mortar;
    return Math.min(1,Math.min(ex,ey));
  };
  // 1: town stone — big ashlar blocks, weathered: grime streaks + moss at the base
  Art.walls[1]=bakePix(64,64,(x,y)=>{
    const b=brickPat(x,y,32,16,2.4), n=N(x/6,y/6);
    const streak=N2(x/1.8,7.3)>0.78&&y>10? 2:0; // vertical water stains
    const chip=N2(x/2.2,y/2.2)>0.9?2:0;
    if(y>46&&N2(x/3.5,y/3)>0.7&&b>0.4) return palIdx(13,3+(n*3|0)); // moss creep
    const s=3+b*5+n*3.4-streak-chip;
    return palIdx(0,clamp(s|0,1,11));
  });
  // 2: timber house — cream plaster + dark beams + window glow
  Art.walls[2]=bakePix(64,64,(x,y)=>{
    const beam=(x<5||x>=59||(y>28&&y<34)||(x>29&&x<35&&y<30));
    const nm=N(x/5,y/5);
    if(beam) return palIdx(1,3+(N2(x/2,y/2)*2|0));
    if(x>=12&&x<26&&y>=38&&y<54){ // shuttered window
      if(x<14||x>=24||y<40||y>=52) return palIdx(1,4);
      return palIdx(5,6+((x+y)%3));
    }
    return palIdx(1,10+(nm*4|0));
  });
  // 10: timber house B — stone footing, cross-braced plaster, different window
  Art.walls[10]=bakePix(64,64,(x,y)=>{
    if(y>=48){ const b2=brickPat(x,y,16,8,1.6); return palIdx(0,3+b2*4+(N(x/4,y/4)*2|0)); } // stone footing
    const diag=Math.abs(((x+y)%32)-16)<2||Math.abs(((x-y+64)%32)-16)<2;
    if(x<5||x>=59||(y>22&&y<27)||diag) return palIdx(1,3+(N2(x/2,y/2)*1.5|0));
    if(x>=38&&x<54&&y>=6&&y<20){ // upper window, shifted
      if(x<40||x>=52||y<8||y>=18) return palIdx(1,4);
      return palIdx(3,5+((x+y)%3));
    }
    return palIdx(1,9+(N(x/5,y/5)*4|0));
  });
  // 3: mountain rock
  Art.walls[3]=bakePix(64,64,(x,y)=>{
    const n=N3(x/9,y/7)*0.6+N(x/3,y/3)*0.4;
    const crack=N2(x/2.2,y/2.2)>0.82;
    return palIdx(11,crack?2:3+(n*8|0));
  });
  // 4: dungeon brick (catacombs) — rough, high-frequency grain
  Art.walls[4]=bakePix(64,64,(x,y)=>{
    const b=brickPat(x,y,16,8,1.6), n=N(x/4,y/4), g=N2(x/1.3,y/1.3)*1.6-0.8;
    return palIdx(11,clamp(1+b*(4+n*5)+g,0,10)|0);
  });
  // 5: crypt stone — pale ashlar, subtle bone inlay, chiseled grain
  Art.walls[5]=bakePix(64,64,(x,y)=>{
    const b=brickPat(x,y,32,13,2), n=N(x/5,y/5), g=N2(x/1.4,y/1.4)*1.6-0.8;
    const bone=(y%13>4&&y%13<8)&&N2(x/3,17)>0.8;
    if(bone&&b>0.6) return palIdx(0,9+(x%2));
    return palIdx(0,clamp(2+b*(3+n*5)+g,0,11)|0);
  });
  // 6: vault marble — dark green-black, sparse connected gold veining
  Art.walls[6]=bakePix(64,64,(x,y)=>{
    const v=Math.abs(N3(x/22,y/9)-0.5)<0.014;
    const b=brickPat(x,y,64,21,2);
    if(v&&b>0.3) return palIdx(5,7+((x>>1)+(y>>1))%3);
    return palIdx(13,1+(b*2.5+N2(x/4,y/4)*1.6|0));
  });
  // 7: wood door — planks + iron bands + ring
  Art.walls[7]=bakePix(64,64,(x,y)=>{
    const plank=(x%13)<1.2, grain=N(x/2.5,y/9);
    if(y<4||y>=60||(y>28&&y<33)) { // iron bands
      const riv=((x+3)%10<2)&&(y%64<4||y>=60||(y>29&&y<32));
      return palIdx(11,riv?7:4+(N2(x/2,y/2)*2|0));
    }
    const cx=x-32,cy=y-44; if(cx*cx+cy*cy<25&&cx*cx+cy*cy>9) return palIdx(11,6); // ring
    if(plank) return palIdx(1,2);
    return palIdx(1,4+(grain*4|0));
  });
  // 8: sigil door — dark door + glowing teal sigil
  Art.walls[8]=bakePix(64,64,(x,y)=>{
    const cx=(x-32)/20,cy=(y-32)/20, r=Math.hypot(cx,cy);
    const ring=Math.abs(r-0.8)<0.09, cross=(Math.abs(cx)<0.07||Math.abs(cy)<0.07)&&r<0.8;
    if(ring||cross) return palIdx(8,10+((x+y)%4));
    const plank=(x%16)<1.4;
    return palIdx(11,plank?1:2+(N(x/3,y/7)*2.5|0));
  });
  // 9: shopfront — timber + sign board area
  Art.walls[9]=bakePix(64,64,(x,y)=>{
    if(y>=6&&y<20&&x>=8&&x<56){ // painted sign board
      if(y<8||y>=18||x<10||x>=54) return palIdx(5,5);
      return palIdx(14,4+(N(x/4,y/3)*2|0));
    }
    const beam=(x<4||x>=60||y<3||(y>=52));
    if(beam) return palIdx(1,3);
    if(y>=22&&y<50&&x>=14&&x<50){ // door arch
      const plank=(x%9)<1;
      return palIdx(1,plank?2:5+(N(x/3,y/8)*3|0));
    }
    return palIdx(1,9+(N(x/5,y/5)*3|0));
  });
  // floors
  Art.floors[0]=bakePix(64,64,(x,y)=>{ // grass: blade speckle over tonal patches
    const n=N(x/5,y/5), b=N2(x/1.7,y/1.7), fine=N2(x/1.1,y/1.1);
    let s=6+n*4+(b>0.8?3:0)+(fine>0.72?1.5:fine<0.25?-1.5:0);
    return palIdx(b>0.9?9:2,clamp(s,3,13)|0);
  });
  Art.floors[1]=bakePix(64,64,(x,y)=>{ // dirt road: ruts, pebbles, grain
    const n=N(x/6,y/6), stone=N2(x/2.5,y/2.5)>0.86, fine=N2(x/1.2,y/1.2);
    if(stone) return palIdx(0,8);
    const rut=Math.abs(((y+x*0.15)%21)-10)<1.4?-1.2:0;
    return palIdx(1,clamp(5+n*4+rut+(fine-0.5)*2.2,2,11)|0);
  });
  Art.floors[2]=bakePix(64,64,(x,y)=>{ // cobble
    const cx=x%16-8, cy=y%16-8, d=Math.hypot(cx,cy)/8;
    const alt=((x/16|0)+(y/16|0))%2;
    const n=N(x/4,y/4);
    return palIdx(0,clamp(9-d*4+n*3+(alt?0:1),2,12)|0);
  });
  Art.floors[3]=bakePix(64,64,(x,y)=>{ // dungeon slabs
    const b=brickPat(x,y,32,32,2), n=N(x/5,y/5);
    return palIdx(11,1+b*(3+n*4)|0);
  });
  Art.floors[4]=bakePix(64,64,(x,y)=>{ // crypt tiles, cracked
    const b=brickPat(x,y,21,21,1.6), crack=N2(x/2,y/2)>0.87;
    return palIdx(0,crack?1:2+b*(3+N(x/6,y/6)*4)|0);
  });
  Art.floors[5]=bakePix(64,64,(x,y)=>{ // vault marble floor: pale slabs, gold trim
    if(x%32<2||y%32<2) return palIdx(5,7+((x+y)%2)); // gold seams
    const v=Math.abs(N(x/9,y/16)-0.5)<0.025;
    const b=brickPat(x,y,32,32,1.5);
    if(v&&b>0.3) return palIdx(8,8);
    return palIdx(0,4+(b*4+N2(x/6,y/6)*2|0));
  });
  // water (2 frames, swapped by Art.tick)
  const wat=(ph,f1,f2)=>bakePix(64,64,(x,y)=>{
    const w1=Math.sin((x+ph*7)/f1+Math.sin((y+ph*5)/9)*2)*0.5+0.5;
    const w2=Math.sin((y-ph*6)/f2+x/11)*0.5+0.5;
    const v=(w1*0.6+w2*0.4);
    return palIdx(3,4+(v*6|0));
  });
  Art._water[0]=wat(0,6,5); Art._water[1]=wat(2.3,7,4.4);
  Art.floors[6]=Art._water[0];
  Art.floors[7]=bakePix(64,64,(x,y)=>palIdx(5,9+(N(x/4,y/4)*3|0))); // sand
  // ceilings — one identity per dungeon level
  Art.ceilings.default=bakePix(64,64,(x,y)=>palIdx(11,2+(N(x/6,y/6)*3|0)));
  Art.ceilings.dun1=bakePix(64,64,(x,y)=>{ // crypt: pale vaulted ribs
    const rib=(x%32<3)||(y%32<3);
    return palIdx(0,(rib?4:2)+(N(x/6,y/6)*2|0));
  });
  Art.ceilings.dun2=bakePix(64,64,(x,y)=>{ // catacombs: rough dark brick
    const b=brickPat(x,y,16,8,1.4);
    return palIdx(11,(b*3+N(x/4,y/4)*2|0));
  });
  Art.ceilings.dun3=bakePix(64,64,(x,y)=>{ // coffered dark squares with gold studs
    const inCoffer=(x%21>3&&x%21<18&&y%21>3&&y%21<18);
    if((x%21===10||x%21===11)&&(y%21===10||y%21===11)) return palIdx(5,6); // stud
    return palIdx(13,(inCoffer?0:2)+(N2(x/5,y/5)*1.5|0));
  });
};
Art.tick=function(ms){
  const f=(ms/420|0)%2;
  if(f!==Art._waterFlip){ Art._waterFlip=f; Art.floors[6]=Art._water[f]; }
};

// ---------- sky (baked per time bucket) ----------
Art.sky=function(timeMin){
  const h=(timeMin%1440)/60;
  const bucket=h<5?'night':h<7?'dawn':h<11?'morning':h<16?'noon':h<19?'late':h<21?'dusk':'night';
  if(Art._skyCache[bucket]) return Art._skyCache[bucket];
  const w=1024,hh=200;
  const grads={ night:[[8,10,26],[16,18,40]], dawn:[[60,40,80],[240,150,90]], morning:[[70,120,200],[170,200,235]],
    noon:[[80,140,220],[190,215,240]], late:[[70,120,200],[210,190,150]], dusk:[[40,30,70],[240,120,60]] };
  const [top,bot]=grads[bucket];
  const r=RNG.world('sky:'+bucket);
  const stars=[]; if(bucket==='night') for(let i=0;i<130;i++) stars.push([r.int(0,w-1),r.int(0,hh*0.85|0),r.chance(0.2)?2:1]);
  const sunX=w*0.62, sunY=bucket==='dawn'?hh*0.75:bucket==='dusk'?hh*0.8:hh*0.3;
  const clouds=[]; const nC=bucket==='night'?4:9;
  for(let i=0;i<nC;i++){
    let cx0,cy0,tries=0;
    do { cx0=r.int(0,w-1); cy0=r.int(10,hh*0.55|0); tries++; }
    while(tries<8&&Math.abs(cx0-sunX)<90&&Math.abs(cy0-sunY)<40); // never fuse with the sun
    clouds.push([cx0,cy0,r.int(30,90),r.int(8,18),r.next()*0.5+0.3]);
  }
  const tex=bakePix(w,hh,(x,y)=>{
    const t=y/hh;
    let R=lerp(top[0],bot[0],t),G=lerp(top[1],bot[1],t),B=lerp(top[2],bot[2],t);
    // sun / moon
    const isNight=bucket==='night';
    const sx=isNight?w*0.3:sunX, sy=isNight?hh*0.25:sunY;
    let dx=Math.min(Math.abs(x-sx),w-Math.abs(x-sx)), dy=y-sy;
    const d=Math.hypot(dx,dy);
    if(isNight){ if(d<9&&!(Math.hypot(dx-4,dy-2)<7)) {R=230;G=230;B=215;} }
    else if(d<11){R=255;G=245;B=200;} else if(d<26){R=lerp(R,255,(26-d)/17*0.5);G=lerp(G,240,(26-d)/17*0.4);}
    const warm=bucket==='dawn'||bucket==='dusk';
    for(const [cx,cy,cw,ch,op] of clouds){
      let ddx=Math.min(Math.abs(x-cx),w-Math.abs(x-cx))/cw, ddy=(y-cy)/ch;
      const cd=ddx*ddx+ddy*ddy;
      if(cd<1){ const nk=0.7+(((x*131+y*57)%13)/13)*0.6; // ragged edges, no airbrush blobs
        const k=Math.min(1,(1-cd)*op*nk);
        const cr=isNight?55:warm?250:245, cg=isNight?58:warm?185:243, cb=isNight?72:warm?135:250;
        R=lerp(R,cr,k);G=lerp(G,cg,k);B=lerp(B,cb,k*0.9); }
    }
    for(const [px,py,s] of stars){ if(Math.abs(x-px)<s&&Math.abs(y-py)<s){R=240;G=240;B=220;} }
    return palDither(R,G,B,x,y,10);
  });
  const o={tex,w,h:hh}; Art._skyCache[bucket]=o; return o;
};

// ---------- font (Georgia glyphs quantized to levels) ----------
Art.bakeFont=function(){
  const sizes=[9,11,14,22];
  const font={sizes:{},draw:null,width:null};
  const cnv=document.createElement('canvas'); cnv.width=48; cnv.height=48;
  const g=cnv.getContext('2d',{willReadFrequently:true});
  const EXTRA='’‘“”—–◆✓►◄−×…é↑↓←→·';
  for(const sz of sizes){
    const glyphs={};
    g.font='bold '+sz+'px Georgia, "Times New Roman", serif';
    const chars=[]; for(let c=32;c<127;c++) chars.push(String.fromCharCode(c)); for(const ch of EXTRA) chars.push(ch);
    for(const ch of chars){
      const met=g.measureText(ch);
      const gw=Math.max(1,Math.ceil(met.width)), gh=sz+4;
      g.clearRect(0,0,48,48);
      g.font='bold '+sz+'px Georgia, "Times New Roman", serif';
      g.fillStyle='#fff'; g.textBaseline='top';
      g.fillText(ch,1,1);
      const d=g.getImageData(0,0,Math.min(48,gw+2),gh).data;
      const w2=Math.min(48,gw+2);
      const data=new Uint8Array(w2*gh);
      for(let i=0;i<w2*gh;i++){ const a=d[i*4+3]; data[i]=a>170?3:a>96?2:a>52?1:0; } // balanced: solid bowls, no AA skirt
      glyphs[ch]={w:w2,h:gh,adv:gw+1,data};
    }
    font.sizes[sz]=glyphs;
  }
  font.width=(str,size)=>{ const gs=font.sizes[size]||font.sizes[11]; let w=0; for(const ch of str){ if(ch===':'||ch==='.'||ch===','){w+=5;continue;} if(ch==='←'||ch==='→'){w+=10;continue;} const gl=gs[ch]||gs['?']; w+=gl.adv; } return w; };
  const FALLBACK={'’':"'",'‘':"'",'“':'"','”':'"','—':'-','–':'-','−':'-','…':'...'};
  font.draw=(eng,str,x,y,opts)=>{
    const size=opts.size||11, ramp=opts.ramp===undefined?5:opts.ramp, gs=font.sizes[size]||font.sizes[11];
    const shades=opts.bright? [0,9,12,15]:[0,7,10,13];
    let cx=x|0;
    for(const ch of str){
      if(ch==='.'||ch===','){ // hand-placed: Georgia's AA skirt makes periods read as commas
        const by=(y|0)+Math.round(size*0.82), c=palIdx(ramp,shades[3]);
        if(opts.shadow!==false){ eng.px(cx+2,by+1,240); eng.px(cx+3,by+1,240); }
        eng.px(cx+1,by,c); eng.px(cx+2,by,c); eng.px(cx+1,by+1,c); eng.px(cx+2,by+1,c);
        if(ch===','){ eng.px(cx+1,by+2,c); eng.px(cx,by+3,c); }
        cx+=5; continue;
      }
      if(ch==='←'||ch==='→'){ // pixel arrows beat baked smudges
        const ay=(y|0)+Math.round(size*0.55), c=palIdx(ramp,shades[3]), dir=ch==='→'?1:-1;
        for(let i=0;i<7;i++) eng.px(cx+1+i,ay,c);
        for(let i=1;i<=3;i++){ eng.px(cx+(dir>0?7-i:1+i),ay-i,c); eng.px(cx+(dir>0?7-i:1+i),ay+i,c); }
        cx+=10; continue;
      }
      if(ch===':'){ // hand-placed: quantization eats the top dot at small sizes
        const dotY1=(y|0)+Math.round(size*0.38), dotY2=(y|0)+Math.round(size*0.82), c=palIdx(ramp,shades[3]);
        for(const dy of [dotY1,dotY2]){ if(opts.shadow!==false){eng.px(cx+2,dy+1,240);eng.px(cx+3,dy+1,240);}
          eng.px(cx+1,dy,c); eng.px(cx+2,dy,c); eng.px(cx+1,dy+1,c); eng.px(cx+2,dy+1,c); }
        cx+=5; continue;
      }
      const gl=gs[ch]||gs[FALLBACK[ch]]||gs['?']; if(!gl){cx+=4;continue;}
      for(let gy=0;gy<gl.h;gy++)for(let gx=0;gx<gl.w;gx++){
        const lv=gl.data[gy*gl.w+gx]; if(!lv) continue;
        const sx=cx+gx, sy=(y|0)+gy;
        if(opts.shadow!==false) eng.px(sx+1,sy+1,240);
        eng.px(sx,sy,palIdx(ramp,shades[lv]));
      }
      cx+=gl.adv;
    }
    return cx-x;
  };
  Art.font=font;
};

// ---------- carved stone UI ----------
// helper: carved stone fill with beveled edges into an arbitrary painter
function stonePix(x,y,N){ return 5+(N(x/7,y/7)*3|0)+(N(x/2.3,y/2.3)>0.85?-2:0); }
Art.bakeUI=function(){
  const N=makeNoise('ui1',32), N2=makeNoise('ui2',16);
  // full-screen frame: stone everywhere except viewport hole, with carved ornament
  const medallion=(x,y,cx,cy,r)=>{ // carved rosette relief: -2..+3 shade delta, 0 outside
    const d=Math.hypot(x-cx,y-cy);
    if(d>r) return 0;
    const a=Math.atan2(y-cy,x-cx);
    const petal=Math.cos(a*8)*0.5+0.5;
    if(d>r*0.85) return -2;                       // recessed ring
    if(d>r*0.35) return petal>0.55?2:-1;          // eight petals
    if(d>r*0.15) return 3;                        // boss
    return 1;
  };
  Art.ui.frame=bakePix(SCREEN_W,SCREEN_H,(x,y)=>{
    const inVP=x>=VP.x&&x<VP.x+VP.w&&y>=VP.y&&y<VP.y+VP.h;
    if(inVP) return 0;
    // beveled viewport rim
    const rim=(x>=VP.x-3&&x<VP.x+VP.w+3&&y>=VP.y-3&&y<VP.y+VP.h+3);
    let s=stonePix(x,y,N);
    if(rim){ const d=Math.min(x-(VP.x-3),(VP.x+VP.w+2)-x,y-(VP.y-3),(VP.y+VP.h+2)-y); s=d===0?9:d===1?2:5; }
    // outer screen border highlight
    if(x<2||y<2) s+=3; if(x>=SCREEN_W-2||y>=SCREEN_H-2) s-=2;
    // carved block seams
    const seam=((x%80<1&&y>VP.y+VP.h)||(y%60<1&&(x<VP.x||x>=VP.x+VP.w)&&y<VP.y+VP.h));
    if(seam) s-=3;
    // corner rosettes + right-panel fluting (MM6 loved its masonry ornament)
    s+=medallion(x,y,556,462,14)+medallion(x,y,232,462,12);
    if(x>632&&x<640&&y>8&&y<470&&((x-632)%4<2)) s-=1; // edge fluting
    if(y>320&&y<328&&x>480&&x<632&&((x-480)%8<4)) s+=(x%8<2?-1:1); // dentil strip under panel
    return palIdx(0,clamp(s,1,13));
  });
  // parchment full-screen for menu screens
  Art.ui.parchment=bakePix(SCREEN_W,SCREEN_H,(x,y)=>{
    const border=x<10||y<10||x>=SCREEN_W-10||y>=SCREEN_H-10;
    if(border) return palIdx(0,stonePix(x,y,N));
    const n=N(x/9,y/9), stain=N2(x/16,y/16);
    let s=11+n*2-(stain>0.75?2:0);
    if(x<14||y<14||x>=SCREEN_W-14||y>=SCREEN_H-14) s-=3;
    return palIdx(1,clamp(s,4,13));
  });
  // portrait slot 62x70 (frame for 58x66 portrait)
  Art.ui.slot=bakePix(62,70,(x,y)=>{
    const d=Math.min(x,61-x,y,69-y);
    if(d<2) return palIdx(5,d===0?4:8);
    return 0;
  });
  Art.ui.barTex=bakePix(8,8,(x,y)=>palIdx(0,4+(N(x/3,y/3)*3|0)));
  // faint carved crest — fills the dead parchment on menu screens
  Art.ui.crest=bakePix(200,200,(x,y)=>{
    const cx=(x-100)/88, cy=(y-100)/88, r=Math.hypot(cx,cy);
    if(r>1) return 0;
    let d=0;
    if(Math.abs(r-0.94)<0.05) d=-1;                      // outer ring
    if(Math.abs(r-0.8)<0.03) d=1;
    // crown silhouette
    const inCrown=(Math.abs(cx)<0.52&&cy>-0.1&&cy<0.34)||
      (cy<=-0.1&&cy>-0.45&&(Math.abs(cx+0.4)<0.09||Math.abs(cx)<0.09||Math.abs(cx-0.4)<0.09));
    if(inCrown) d=1;
    if(Math.abs(cy-0.34)<0.045&&Math.abs(cx)<0.55) d=2;  // crown base band
    if(d===0&&r<0.94) return 0;
    return palIdx(1,clamp(9+d,6,12));
  });
};

// ---------- title vista (lazy-baked painted scene) ----------
Art.title=function(){
  if(this._title) return this._title;
  const W=SCREEN_W,H=SCREEN_H;
  const N=makeNoise('title',32);
  const sky=Art.sky(20*60); // dusk
  const ridge=x=>300+Math.sin(x*0.008+1)*22+Math.sin(x*0.031)*9+N(x/40,3)*14;
  // keep silhouette: towers with battlements + lit windows
  const towers=[[150,258,26],[205,215,34],[320,180,44],[430,222,30],[492,262,22]];
  const inTower=(x,y)=>{
    for(const [tx,ty,tw] of towers){
      if(x>=tx-tw&&x<tx+tw&&y>=ty){
        const bat=y<ty+8&&(((x-tx+tw)/9|0)%2===0);
        if(y<ty+8&&!bat) continue;
        return {ty,tx,tw};
      }
    }
    if(y>340&&x>90&&x<560&&y>340+N(x/30,7)*12) return {ty:340,tx:x,tw:600}; // curtain wall
    return null;
  };
  const winlit=(x,y)=>{
    for(const [tx,ty,tw] of towers){
      const wx=(x-tx+tw), wy=y-ty;
      if(wx>4&&wx<tw*2-4&&wy>18&&((wx%14>5&&wx%14<9)&&(wy%26>8&&wy%26<15))) return ((tx*7+((wx/14)|0)*13+((wy/26)|0)*31)%10)<4;
    }
    return false;
  };
  this._title=bakePix(W,H,(x,y)=>{
    const r=ridge(x);
    const t=inTower(x,y);
    if(t){
      if(winlit(x,y)) return palIdx(5,10+((x+y)%3));
      const sh=2+N(x/9,y/9)*2.2+(y-t.ty<3?1.5:0);
      return palIdx(11,clamp(sh,1,5)|0);
    }
    if(y<r){ // sky
      const sy=clamp(y/r*sky.h|0,0,sky.h-1);
      return sky.tex[sy*sky.w+((x*1.6)|0)%sky.w];
    }
    if(y<r+40){ // far ridge
      return palIdx(6,2+((y-r)/14|0)+(N(x/16,y/16)>0.6?1:0));
    }
    // foreground meadow + road
    const road=Math.abs(x-320)<(y-r-40)*0.55+8;
    if(road&&y>360) return palIdx(1,4+(N(x/6,y/6)*3|0));
    return palIdx(13,1+clamp((y-r-40)/60,0,3)+(N(x/7,y/7)*2.5|0));
  });
  return this._title;
};

// carved stone button drawn directly to engine (dynamic labels)
function drawButton(eng,x,y,w,h,label,opts){
  const down=opts&&opts.down, size=(opts&&opts.size)||11, ramp=opts&&opts.ramp!==undefined?opts.ramp:5;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const d=Math.min(i,w-1-i,j,h-1-j);
    let s=6+((i*7+j*13)%5>2?1:0);
    if(d===0) s=down?9:2; else if(d===1) s=down? (i<w-2&&j<h-2?3:8):(i>1&&j>1?8:3);
    else if(down) s-=1;
    eng.px(x+i,y+j,palIdx(0,clamp(s,1,13)));
  }
  eng.textC(label,x+w/2|0,y+(h-size)/2|0,{size,ramp,bright:!down});
}
