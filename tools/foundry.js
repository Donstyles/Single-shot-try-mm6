#!/usr/bin/env node
// Sprite foundry — renders low-poly 3D creature models into palette-quantized
// sprite frames, the authentic 1998 pre-rendered pipeline. Runs Three.js in
// headless Chromium; outputs PNG sheets + a JSON manifest to assets/.
// Usage: node tools/foundry.js [creatureId ...]   (default: all in tools/creatures.js)
'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');

const ROOT=path.resolve(__dirname,'..');
// modern three ships no UMD build — shim the CJS build onto window.THREE
const THREE_SRC='(function(){const module={exports:{}};const exports=module.exports;\n'
  +fs.readFileSync(path.join(ROOT,'node_modules/three/build/three.cjs'),'utf8')
  +'\nwindow.THREE=module.exports;})();';
const CREATURES_SRC=fs.readFileSync(path.join(__dirname,'creatures.js'),'utf8');
// palette must match the game exactly — extract from 00_core.js
const CORE_SRC=fs.readFileSync(path.join(ROOT,'src/00_core.js'),'utf8');

const PAGE=`<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222">
<canvas id="c" width="512" height="512"></canvas>
<script>${THREE_SRC}<\/script>
<script>
${CORE_SRC.replace(/'use strict';/,'')}
${CREATURES_SRC}
// ---------- render rig ----------
const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setClearColor(0x000000,0);
const scene=new THREE.Scene();
// 1998 render-farm lighting: hard warm key upper-left, cool fill, white rim
const key=new THREE.DirectionalLight(0xfff0d8,3.4); key.position.set(-2.2,3.2,2.6); scene.add(key);
const fill=new THREE.DirectionalLight(0x8090b8,1.1); fill.position.set(2.5,0.8,1.5); scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,1.2); rim.position.set(0.6,1.8,-2.8); scene.add(rim);
scene.add(new THREE.AmbientLight(0x585860,1.25));
const cam=new THREE.PerspectiveCamera(32,1,0.1,100);
window.renderCreature=function(id,frame,facing){
  while(scene.children.length>4) scene.remove(scene.children[4]);
  const build=CREATURES[id]; if(!build) throw new Error('no creature '+id);
  const group=build(frame);          // model authors pose by frame name
  group.rotation.y=facing||0;        // facing angle around Y
  scene.add(group);
  // frame the model: bounding box fit
  const box=new THREE.Box3().setFromObject(group);
  const size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
  const maxDim=Math.max(size.x,size.y,size.z);
  cam.position.set(center.x,center.y+maxDim*0.16,center.z+maxDim*1.95); // slight high angle, MM6 style
  cam.lookAt(center.x,center.y-size.y*0.02,center.z);
  renderer.render(scene,cam);
  return {w:canvas.width,h:canvas.height,ymin:box.min.y,ysize:size.y};
};
// quantize the render to the game palette with outline, return {w,h,data:[palette bytes]}
window.grabQuantized=function(outW,outH){
  const g2=document.createElement('canvas'); g2.width=outW; g2.height=outH;
  const ctx=g2.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.drawImage(canvas,0,0,outW,outH);
  const d=ctx.getImageData(0,0,outW,outH).data;
  const out=new Uint8Array(outW*outH);
  for(let y=0;y<outH;y++)for(let x=0;x<outW;x++){
    const i=(y*outW+x)*4;
    if(d[i+3]<100){ out[y*outW+x]=0; continue; }
    let p=palDither(d[i],d[i+1],d[i+2],x,y,8);
    out[y*outW+x]=p===0?240:p;
  }
  // 1px dark outline
  const o2=out.slice();
  for(let y=0;y<outH;y++)for(let x=0;x<outW;x++){
    if(out[y*outW+x]) continue;
    if((x>0&&out[y*outW+x-1])||(x<outW-1&&out[y*outW+x+1])||(y>0&&out[(y-1)*outW+x])||(y<outH-1&&out[(y+1)*outW+x])) o2[y*outW+x]=240;
  }
  return Array.from(o2);
};
// palette RGB for PNG writing on the node side
window.palRGB=function(){ return Array.from(PAL); };
<\/script></body>`;

(async()=>{
  const wanted=process.argv.slice(2);
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:560,height:560}});
  page.on('pageerror',e=>{ console.error('PAGEERROR',String(e)); });
  await page.setContent(PAGE,{waitUntil:'load'});
  await page.waitForFunction(()=>typeof renderCreature==='function'&&typeof CREATURES==='object');
  const ids=await page.evaluate(w=>w.length?w:Object.keys(CREATURES),wanted);
  const outDir=path.join(ROOT,'assets'); fs.mkdirSync(outDir,{recursive:true});
  const pal=await page.evaluate(()=>palRGB());
  const manifest=JSON.parse(fs.existsSync(path.join(outDir,'manifest.json'))?fs.readFileSync(path.join(outDir,'manifest.json'),'utf8'):'{}');
  const FRAMES=['idle','walk','attack','corpse'];
  const FACINGS=[0,Math.PI/4,Math.PI/2,Math.PI*3/4,Math.PI]; // 5 facings; mirror for the rest
  for(const id of ids){
    const spec=await page.evaluate(id=>CREATURE_SPECS[id]||{w:72,h:104},id);
    const frames={};
    for(const f of FRAMES){
      const facings=[];
      const useFacings=f==='corpse'?[0]:FACINGS;
      for(const ang of useFacings){
        await page.evaluate(([id,f,ang])=>renderCreature(id,f,ang),[id,f,ang]);
        const data=await page.evaluate(([w,h])=>grabQuantized(w,h),[spec.w,spec.h]);
        facings.push(data);
      }
      frames[f]=facings;
    }
    manifest[id]={w:spec.w,h:spec.h,frames};
    console.log('rendered',id);
  }
  fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify(manifest));
  // also write a quick contact-sheet PNG per creature for human/vision review
  const {createCanvas}=await (async()=>{ try{ return require('canvas'); }catch(e){ return {}; } })();
  await browser.close();
  console.log('foundry complete:',ids.join(', '));
})().catch(e=>{ console.error(e); process.exit(1); });
