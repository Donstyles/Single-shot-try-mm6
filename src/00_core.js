// 00_core — RNG registry, palette, clock, shared helpers. Owner: core.
'use strict';

// ---------- seeded RNG (no Math.random anywhere in this project) ----------
function hashStr(s){ let h=1779033703^s.length; for(let i=0;i<s.length;i++){ h=Math.imul(h^s.charCodeAt(i),3432918353); h=(h<<13)|(h>>>19);} return (h>>>0); }
function mulberry32(a){ return function(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }

class Rand {
  constructor(seed){ this.state = (typeof seed==='string'? hashStr(seed): seed)>>>0; }
  next(){ this.state=(this.state+0x6D2B79F5)|0; let t=Math.imul(this.state^(this.state>>>15),1|this.state); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }
  int(a,b){ return a+Math.floor(this.next()*(b-a+1)); }        // inclusive
  pick(arr){ return arr[Math.floor(this.next()*arr.length)]; }
  chance(p){ return this.next()<p; }
  roll(n,d,plus=0){ let s=plus; for(let i=0;i<n;i++) s+=this.int(1,d); return s; }
}

// Persistent named streams. Streams live for the session; states are saved &
// restored so reload can't be used to reroll outcomes (rest ambushes etc).
const RNG = {
  streams:{},
  worldSeed:'vintavia-1',
  get(name){ if(!this.streams[name]) this.streams[name]=new Rand(this.worldSeed+':'+name); return this.streams[name]; },
  world(name){ return new Rand(this.worldSeed+':world:'+name); }, // derivation-only: layout must be identical every run
  serialize(){ const o={}; for(const k in this.streams) o[k]=this.streams[k].state; return o; },
  restore(o){ for(const k in o){ this.get(k).state=o[k]>>>0; } },
  reset(){ this.streams={}; }
};

// ---------- palette: 256 colors, 16 ramps x 16 shades ----------
// Ramp hues tuned for 1998 MM6 earth-and-stone look.
const PAL = new Uint8Array(256*3);
(function buildPalette(){
  const ramps = [
    [ 20, 18, 22, 235,230,224], // 0 gray/stone
    [ 24, 14,  8, 214,168,110], // 1 brown/wood
    [ 10, 20,  8, 150,210,120], // 2 green/grass
    [  8, 12, 30, 130,170,235], // 3 blue/sky-water
    [ 28,  6,  4, 240,120, 80], // 4 red/fire
    [ 30, 22,  4, 250,214, 96], // 5 gold
    [ 16,  6, 24, 200,140,230], // 6 purple/magic
    [ 26, 16, 10, 250,205,170], // 7 skin
    [  6, 16, 18, 120,220,210], // 8 teal
    [ 18, 20,  6, 200,210,110], // 9 olive
    [ 30, 12, 16, 250,150,170], //10 rose
    [  8,  8, 12, 150,150,180], //11 slate
    [ 22, 10,  2, 235,140, 40], //12 orange
    [  4, 18,  6,  80,180, 70], //13 deep green
    [ 12,  4,  4, 190, 60, 50], //14 blood
    [  2,  2,  4, 255,255,255], //15 black->white
  ];
  for(let r=0;r<16;r++){
    const [r0,g0,b0,r1,g1,b1]=ramps[r];
    for(let s=0;s<16;s++){
      const t=s/15, u=Math.pow(t,0.85);
      const i=(r*16+s)*3;
      PAL[i  ]=Math.round(r0+(r1-r0)*u);
      PAL[i+1]=Math.round(g0+(g1-g0)*u);
      PAL[i+2]=Math.round(b0+(b1-b0)*u);
    }
  }
})();
const PAL32 = new Uint32Array(256);
(function(){ for(let i=0;i<256;i++){ PAL32[i]=(255<<24)|(PAL[i*3+2]<<16)|(PAL[i*3+1]<<8)|PAL[i*3]; } })();

const _nearCache = new Map();
function palNearest(r,g,b){
  const key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);
  let v=_nearCache.get(key); if(v!==undefined) return v;
  let best=0,bd=1e9;
  for(let i=0;i<256;i++){ const dr=PAL[i*3]-r,dg=PAL[i*3+1]-g,db=PAL[i*3+2]-b; const d=dr*dr*2+dg*dg*3+db*db; if(d<bd){bd=d;best=i;} }
  _nearCache.set(key,best); return best;
}
// ordered 4x4 Bayer dither: returns palette index for (r,g,b) at pixel (x,y)
const BAYER4=[0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5];
function palDither(r,g,b,x,y,amt=14){
  const t=(BAYER4[(y&3)*4+(x&3)]/16-0.5)*amt;
  return palNearest(Math.max(0,Math.min(255,r+t)),Math.max(0,Math.min(255,g+t)),Math.max(0,Math.min(255,b+t)));
}
// ramp shade: ramp 0..15, shade 0..15
function palIdx(ramp,shade){ return (ramp<<4)|Math.max(0,Math.min(15,shade|0)); }

// ---------- clock (canonical: total game minutes) ----------
const Clock = {
  START: 8*60, // Day 1, 08:00
  MONTHS:['Newleaf','Suncrest','Harvestide','Embermoon'],
  DAYS:['Moonday','Tirsday','Wodesday','Thorsday','Freyday','Sterday','Sunday'],
  parts(min){
    const day=Math.floor(min/1440), h=Math.floor((min%1440)/60), m=min%60;
    return { day:day+1, hour:h, min:m,
      dayName:this.DAYS[day%7], month:this.MONTHS[Math.floor(day/28)%4], dom:(day%28)+1,
      hhmm:(h<10?'0':'')+h+':'+(m<10?'0':'')+m,
      isNight: h<5||h>=21, isDusk: h>=19&&h<21, isDawn: h>=5&&h<7 };
  },
  lightLevel(min){ // 0..1 ambient daylight (gentle dawn/dusk ramps)
    const h=(min%1440)/60;
    if(h>=7&&h<18) return 1;
    if(h>=5&&h<7) return 0.12+(h-5)/2*0.88;
    if(h>=18&&h<21) return 1-(h-18)/3*0.88;
    return 0.12;
  }
};

// ---------- helpers ----------
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function dist2(ax,ay,bx,by){ const dx=ax-bx,dy=ay-by; return dx*dx+dy*dy; }
function angTo(ax,ay,bx,by){ return Math.atan2(by-ay,bx-ax); }
function angDiff(a,b){ let d=(b-a)%(Math.PI*2); if(d>Math.PI)d-=Math.PI*2; if(d<-Math.PI)d+=Math.PI*2; return d; }

// tiny event bus for UI <-> game decoupling
const Bus = {
  h:{},
  on(ev,fn){ (this.h[ev]=this.h[ev]||[]).push(fn); },
  emit(ev,...a){ const l=this.h[ev]; if(l) for(const f of l) f(...a); }
};

// message log (single writer; UI reads)
const Log = {
  lines:[],
  add(text,color){ this.lines.push({text,color:color||palIdx(0,13),t:performance.now()}); if(this.lines.length>60) this.lines.shift(); Bus.emit('log',text); },
};
