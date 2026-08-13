// 05_engine — software raycaster + palettised framebuffer. Owner: engine.
// Renders into a 640x480 Uint32 buffer; everything (3D, UI, text) goes through it.
'use strict';

const SCREEN_W=640, SCREEN_H=480;
const VP={x:8,y:8,w:464,h:312}; // 3D viewport inside the stone frame
const FOV=Math.PI/2.9;

const Engine = {
  canvas:null,ctx:null,img:null,buf:null,       // buf: Uint32Array over ImageData
  zbuf:new Float32Array(VP.w),
  renderScale:1, frameAvg:8, lastAuto:0,
  cssScale:1, offX:0, offY:0,                    // canvas placement for input mapping

  init(canvas){
    this.canvas=canvas; this.ctx=canvas.getContext('2d',{alpha:false});
    canvas.width=SCREEN_W; canvas.height=SCREEN_H;
    this.img=this.ctx.createImageData(SCREEN_W,SCREEN_H);
    this.buf=new Uint32Array(this.img.data.buffer);
    this.resize(); addEventListener('resize',()=>this.resize());
    if(screen&&screen.orientation) try{screen.orientation.addEventListener('change',()=>setTimeout(()=>this.resize(),80));}catch(e){}
  },
  resize(){
    const vw=innerWidth, vh=innerHeight;
    const s=Math.min(vw/SCREEN_W, vh/SCREEN_H);
    // prefer crisp integer scale when close
    const is=Math.floor(s); const scale=(is>=1 && s/is<1.35)?is:s;
    const w=SCREEN_W*scale, h=SCREEN_H*scale;
    Object.assign(this.canvas.style,{width:w+'px',height:h+'px'});
    this.cssScale=scale; this.offX=(vw-w)/2; this.offY=(vh-h)/2;
  },
  present(){ this.ctx.putImageData(this.img,0,0); },
  toGame(clientX,clientY){ // css px -> 640x480 coords
    return {x:(clientX-this.offX)/this.cssScale, y:(clientY-this.offY)/this.cssScale};
  },

  // ---------- framebuffer primitives (palette indices) ----------
  clear(idx){ this.buf.fill(PAL32[idx]); },
  px(x,y,idx){ if(x>=0&&y>=0&&x<SCREEN_W&&y<SCREEN_H) this.buf[y*SCREEN_W+x]=PAL32[idx]; },
  fillRect(x,y,w,h,idx){
    x|=0;y|=0;w|=0;h|=0;
    const c=PAL32[idx];
    for(let j=Math.max(0,y);j<Math.min(SCREEN_H,y+h);j++){
      const row=j*SCREEN_W;
      for(let i=Math.max(0,x);i<Math.min(SCREEN_W,x+w);i++) this.buf[row+i]=c;
    }
  },
  frameRect(x,y,w,h,idx){ this.fillRect(x,y,w,1,idx); this.fillRect(x,y+h-1,w,1,idx); this.fillRect(x,y,1,h,idx); this.fillRect(x+w-1,y,1,h,idx); },
  // blit palette-indexed texture (0 = transparent)
  blit(tex,tw,th,dx,dy,opts){
    dx|=0; dy|=0;
    const flip=opts&&opts.flip, shade=opts&&opts.shade||0, scale=opts&&opts.scale||1;
    if(scale===1){
      for(let y=0;y<th;y++){ const sy=dy+y; if(sy<0||sy>=SCREEN_H) continue; const row=sy*SCREEN_W;
        for(let x=0;x<tw;x++){ const sx=dx+x; if(sx<0||sx>=SCREEN_W) continue;
          let p=tex[y*tw+(flip?tw-1-x:x)]; if(!p) continue;
          if(shade){ const s=(p&15)-shade; p=(p&240)|(s<0?0:s); }
          this.buf[row+sx]=PAL32[p];
        }
      }
    } else {
      const w2=(tw*scale)|0,h2=(th*scale)|0;
      for(let y=0;y<h2;y++){ const sy=dy+y; if(sy<0||sy>=SCREEN_H) continue; const row=sy*SCREEN_W; const ty=(y/scale)|0;
        for(let x=0;x<w2;x++){ const sx=dx+x; if(sx<0||sx>=SCREEN_W) continue;
          let p=tex[ty*tw+((flip?(w2-1-x):x)/scale|0)]; if(!p) continue;
          if(shade){ const s=(p&15)-shade; p=(p&240)|(s<0?0:s); }
          this.buf[row+sx]=PAL32[p];
        }
      }
    }
  },

  // ---------- text ----------
  text(str,x,y,opts){ return Art.font.draw(this,str,x,y,opts||{}); },
  textW(str,size){ return Art.font.width(str,size||10); },
  textC(str,cx,y,opts){ const w=this.textW(str,(opts&&opts.size)||10); this.text(str,cx-w/2|0,y,opts); },

  // ---------- 3D view ----------
  render3D(cam){
    const t0=performance.now();
    const sc=this.renderScale;
    const w=(VP.w*sc)|0, h=(VP.h*sc)|0;
    if(!this._fb||this._fb.length!==w*h){ this._fb=new Uint8Array(w*h); this._zb=new Float32Array(w); }
    const fb=this._fb, zb=this._zb;
    const map=cam.map, cells=map.cells, floorIds=map.floor, mw=map.w, mh=map.h;
    const dirX=Math.cos(cam.ang), dirY=Math.sin(cam.ang);
    const planeLen=Math.tan(FOV/2);
    const planeX=-dirY*planeLen, planeY=dirX*planeLen;
    const posX=cam.x, posY=cam.y;
    const horizon=(h/2 + (cam.bob||0)*sc)|0;
    const light=cam.light;               // 0..1 global
    const torch=cam.torch||0;            // extra radius light indoors
    const outdoor=map.outdoor;
    const shadeAt=(d,side)=>{           // returns 0..12 darkening
      let s=(outdoor? d*0.35 : d*(1.7-torch*0.9));
      s+= (1-light)*(outdoor?7:3);
      if(side) s+=1.2;
      return s>12?12:s|0;
    };
    // sky / ceiling
    if(outdoor){
      const sky=Art.sky(cam.timeMin), skw=sky.w;
      const angOff=((cam.ang%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
      for(let y=0;y<horizon;y++){
        const sy=(y/horizon*sky.h)|0;
        for(let x=0;x<w;x++){
          const sx=((angOff/(Math.PI*2)*skw*2)+(x/w*skw*planeLen))%skw|0;
          fb[y*w+x]=sky.tex[sy*skw+sx];
        }
      }
    }
    // floor & ceiling casting
    {
      const flTexs=Art.floors, ceilTex=Art.ceilings[map.id]||Art.ceilings.default;
      const rowStart=outdoor?horizon:0;
      for(let y=rowStart;y<h;y++){
        const isFloor=y>=horizon;
        const p=isFloor? (y-horizon):(horizon-y);
        if(p===0) continue;
        const rowDist=(h*0.5)/p;
        const stepX=rowDist*(2*planeX)/w, stepY=rowDist*(2*planeY)/w;
        let fx=posX+rowDist*(dirX-planeX), fy=posY+rowDist*(dirY-planeY);
        const sh=shadeAt(rowDist,0);
        const row=y*w;
        for(let x=0;x<w;x++){
          const cx=fx|0, cy=fy|0;
          let tex;
          if(cx>=0&&cy>=0&&cx<mw&&cy<mh){
            tex=isFloor? flTexs[floorIds[cy*mw+cx]] : ceilTex; // water frames swapped in Art.tick
          } else tex=isFloor?flTexs[0]:ceilTex;
          const tx=((fx-cx)*64)|0, ty=((fy-cy)*64)|0;
          let pi=tex[ty*64+tx];
          const s=(pi&15)-sh; fb[row+x]=(pi&240)|(s<0?0:s);
          fx+=stepX; fy+=stepY;
        }
      }
      if(!outdoor){} // dungeon ceiling handled above (rowStart 0)
    }
    // walls (DDA per column)
    for(let x=0;x<w;x++){
      const camU=2*x/w-1;
      const rdX=dirX+planeX*camU, rdY=dirY+planeY*camU;
      let mapX=posX|0, mapY=posY|0;
      const ddX=Math.abs(1/(rdX||1e-9)), ddY=Math.abs(1/(rdY||1e-9));
      let stX,stY,sdX,sdY;
      if(rdX<0){stX=-1; sdX=(posX-mapX)*ddX;} else {stX=1; sdX=(mapX+1-posX)*ddX;}
      if(rdY<0){stY=-1; sdY=(posY-mapY)*ddY;} else {stY=1; sdY=(mapY+1-posY)*ddY;}
      let side=0, hit=0, tex=0, doorT=0, dist=0, wallX=0;
      for(let i=0;i<64;i++){
        if(sdX<sdY){ sdX+=ddX; mapX+=stX; side=0; } else { sdY+=ddY; mapY+=stY; side=1; }
        if(mapX<0||mapY<0||mapX>=mw||mapY>=mh){ hit=1; tex=outdoor?3:4; dist=side?sdY-ddY:sdX-ddX; break; }
        const c=cells[mapY*mw+mapX];
        if(c){
          if(c===7||c===8){ // door: mid-cell plane
            const d=(side? sdY-ddY+ddY/2 : sdX-ddX+ddX/2);
            const hx=posX+rdX*d, hy=posY+rdY*d;
            if((side&&(hx|0)===mapX)||(!side&&(hy|0)===mapY)){
              const door=map.doors[mapX+','+mapY];
              const t=door?door.t||0:0;
              let wx=side? hx-(hx|0) : hy-(hy|0);
              if(wx>t){ // door body (slides into wall as t->1)
                hit=1; tex=c; dist=d; wallX=wx-t; doorT=t; break;
              } else continue;
            } else continue;
          }
          hit=1; tex=c; dist=side? sdY-ddY : sdX-ddX; break;
        }
      }
      if(!hit){ zb[x]=1e9; continue; }
      // DDA side-dist form already yields perpendicular distance (door dist too)
      dist=Math.max(0.02,dist);
      zb[x]=dist;
      const lineH=(h/dist)|0;
      let y0=horizon-(lineH>>1), y1=y0+lineH;
      if(wallX===0){ const hx=posX+rdX*dist, hy=posY+rdY*dist; wallX=side? hx-(hx|0): hy-(hy|0); }
      let texX=(wallX*64)|0; if((side===0&&rdX>0)||(side===1&&rdY<0)) texX=63-texX;
      const wt=Art.walls[tex];
      const sh=shadeAt(dist,side);
      const step=64/lineH;
      let tpos=y0<0? -y0*step:0;
      const ys=Math.max(0,y0), ye=Math.min(h,y1);
      for(let y=ys;y<ye;y++){
        const pi=wt[((tpos|0)&63)*64+texX]; tpos+=step;
        const s=(pi&15)-sh;
        fb[y*w+x]=(pi&240)|(s<0?0:s);
      }
    }
    // sprites (far to near)
    const ents=cam.entities;
    ents.sort((a,b)=>(dist2(b.x,b.y,posX,posY))-(dist2(a.x,a.y,posX,posY)));
    const invDet=1/(planeX*dirY-dirX*planeY);
    for(const e of ents){
      const relX=e.x-posX, relY=e.y-posY;
      const trX=invDet*(dirY*relX-dirX*relY);   // screen x
      const trY=invDet*(-planeY*relX+planeX*relY); // depth
      if(trY<=0.1) continue;
      const scr=((w/2)*(1+trX/trY))|0;
      const sprH=Math.abs((h/trY)*(e.scale||1))|0;
      const sprW=(sprH*e.tw/e.th)|0;
      const vOff=((e.vOff||0)*h/trY)|0;
      let y0=horizon-sprH+((h/trY)>>1)+vOff, y1=y0+sprH;
      let x0=scr-(sprW>>1), x1=x0+sprW;
      if(x1<0||x0>=w) continue;
      const tex=e.tex, tw=e.tw, th=e.th;
      const sh=shadeAt(trY,0)+(e.shade||0);
      const ghost=e.ghost;
      for(let sx=Math.max(0,x0);sx<Math.min(w,x1);sx++){
        if(zb[sx]<=trY) continue;
        const texX=((sx-x0)*tw/sprW)|0;
        for(let sy=Math.max(0,y0);sy<Math.min(h,y1);sy++){
          if(ghost&&((sx+sy)&1)) continue; // dithered translucency
          const pi=tex[(((sy-y0)*th/sprH)|0)*tw+texX];
          if(!pi) continue;
          const s=(pi&15)-sh;
          fb[sy*w+sx]=(pi&240)|(s<0?0:s);
        }
      }
      if(e.onScreen) e.onScreen(scr/w, trY);
    }
    // blit fb -> screen buffer at viewport (integer upscale if renderScale<1)
    const buf=this.buf;
    if(sc===1){
      for(let y=0;y<h;y++){ const src=y*w, dst=(VP.y+y)*SCREEN_W+VP.x;
        for(let x=0;x<w;x++) buf[dst+x]=PAL32[fb[src+x]];
      }
    } else {
      const up=1/sc|0;
      for(let y=0;y<VP.h;y++){ const src=((y*sc)|0)*w, dst=(VP.y+y)*SCREEN_W+VP.x;
        for(let x=0;x<VP.w;x++) buf[dst+x]=PAL32[fb[src+((x*sc)|0)]];
      }
    }
    // adaptive render scale
    const dt=performance.now()-t0;
    this.frameAvg=this.frameAvg*0.92+dt*0.08;
    if(performance.now()-this.lastAuto>1500){
      if(this.frameAvg>14&&this.renderScale===1){ this.renderScale=0.5; this.lastAuto=performance.now(); }
      else if(this.frameAvg<5&&this.renderScale<1){ this.renderScale=1; this.lastAuto=performance.now(); }
    }
    // copy zbuffer out for HUD targeting
    for(let x=0;x<VP.w;x++) this.zbuf[x]=zb[(x*sc)|0]||1e9;
  },
};
