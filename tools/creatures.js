// Creature model library for the sprite foundry. Low-poly primitives + flat
// shading + hard key light = the 1998 pre-rendered look, because it IS the
// 1998 method. Each entry: CREATURES[id](frame) -> THREE.Group posed for
// 'idle' | 'walk' | 'attack' | 'corpse'. Sizes in meters-ish; ground at y=0.
'use strict';

function M(color,opts){ // period material: flat-shaded, slightly rough
  const o=opts||{};
  return new THREE.MeshStandardMaterial({color,flatShading:true,roughness:o.rough??0.72,metalness:o.metal??0.05,emissive:o.emissive||0x000000,emissiveIntensity:o.emissiveI??1});
}
function sphere(r,mat,seg){ return new THREE.Mesh(new THREE.SphereGeometry(r,seg||10,seg?Math.ceil(seg*0.75):8),mat); }
function capsule(r,len,mat,seg){ return new THREE.Mesh(new THREE.CapsuleGeometry(r,len,4,seg||8),mat); }
function cone(r,h,mat,seg){ return new THREE.Mesh(new THREE.ConeGeometry(r,h,seg||8),mat); }
function cyl(r1,r2,h,mat,seg){ return new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg||8),mat); }
function box(x,y,z,mat){ return new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat); }
// limb between two points
function limb(a,b,r,mat,seg){
  const dir=new THREE.Vector3().subVectors(b,a);
  const len=dir.length();
  const m=capsule(r,Math.max(0.01,len-r*2),mat,seg);
  m.position.copy(a).addScaledVector(dir,0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
  return m;
}
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

const CREATURE_SPECS={
  goblin:{w:72,h:104},
};

const CREATURES={
  goblin(frame){
    const g=new THREE.Group();
    const skin=M(0x74a848), skinD=M(0x5d8a38);
    const cloth=M(0x8a6c40,{rough:0.9}), leather=M(0x5f4828,{rough:0.95});
    const bone=M(0xd8ceb0,{rough:0.6});
    const corpse=frame==='corpse';
    const walk=frame==='walk', atk=frame==='attack';

    if(corpse){ // crumpled on the ground
      const t=sphere(0.30,cloth); t.scale.set(1.5,0.55,1.0); t.position.set(0,0.18,0); g.add(t);
      const h=sphere(0.20,skin); h.scale.set(1,0.8,1.1); h.position.set(0.48,0.14,0.08); g.add(h);
      for(const e of [-1,1]){ const ear=cone(0.055,0.22,skinD,6); ear.position.set(0.48,0.16,0.08+e*0.2); ear.rotation.x=e*1.4; g.add(ear); }
      g.add(limb(V(-0.25,0.16,0.12),V(-0.62,0.05,0.3),0.06,skin));
      g.add(limb(V(-0.2,0.14,-0.1),V(-0.55,0.05,-0.32),0.06,skinD));
      const club=cyl(0.035,0.05,0.5,leather,7); club.position.set(-0.75,0.06,0.34); club.rotation.z=1.45; g.add(club);
      const pool=cyl(0.42,0.46,0.015,M(0x5a1414,{rough:0.35}),12); pool.position.y=0.008; g.add(pool);
      return g;
    }

    // legs (short, bowed)
    const hipY=0.42, lean=walk?0.10:0;
    g.add(limb(V(-0.12,hipY,0),V(-0.16-lean,0.02,0.06+ (walk?0.12:0)),0.075,skinD));
    g.add(limb(V(0.12,hipY,0),V(0.17+lean,0.02,-0.02-(walk?0.12:0)),0.075,skinD));
    for(const s of [-1,1]){ const foot=sphere(0.075,skinD,7); foot.scale.set(1.5,0.55,1.1);
      foot.position.set(s*0.155+(walk?(s<0?-lean:lean):0),0.04,s<0?0.08+(walk?0.12:0):-0.04-(walk?0.12:0)); g.add(foot); }
    // torso: pot belly
    const belly=sphere(0.26,skin); belly.scale.set(1,1.12,0.9); belly.position.y=0.68; g.add(belly);
    const chest=sphere(0.21,skin); chest.scale.set(1.05,0.8,0.85); chest.position.y=0.92; g.add(chest);
    // loincloth
    const loin=cyl(0.27,0.20,0.18,cloth,9); loin.position.y=0.47; g.add(loin);
    // shoulder hunch
    const hunchL=sphere(0.11,skin,8); hunchL.position.set(-0.22,1.0,0); g.add(hunchL);
    const hunchR=sphere(0.11,skin,8); hunchR.position.set(0.22,1.0,0); g.add(hunchR);
    // arms: right holds club (raised on attack), left dangles
    const shR=V(0.24,0.98,0), shL=V(-0.24,0.98,0);
    const handR=atk? V(0.34,1.42,0.14) : V(0.4,0.52,0.16);
    const elbowR=atk? V(0.42,1.16,0.05) : V(0.4,0.74,0.02);
    g.add(limb(shR,elbowR,0.065,skin)); g.add(limb(elbowR,handR,0.06,skin));
    const handL=V(-0.4,0.5,walk?0.14:0.04), elbowL=V(-0.38,0.74,walk?0.06:0);
    g.add(limb(shL,elbowL,0.065,skin)); g.add(limb(elbowL,handL,0.06,skin));
    for(const [p,s] of [[handR,1],[handL,1]]){ const fist=sphere(0.075,skinD,7); fist.position.copy(p); g.add(fist); }
    // club in right hand
    const club=new THREE.Group();
    const shaft=cyl(0.035,0.05,0.46,leather,7); shaft.position.y=0.20;
    const head=sphere(0.09,leather,7); head.scale.set(1,1.25,1); head.position.y=0.44;
    for(let i=0;i<5;i++){ const spike=cone(0.02,0.07,bone,5); const a=i/5*Math.PI*2;
      spike.position.set(Math.cos(a)*0.085,0.44+Math.sin(a*2)*0.04,Math.sin(a)*0.085);
      spike.rotation.z=-Math.cos(a)*1.2; spike.rotation.x=Math.sin(a)*1.2; club.add(spike); }
    club.add(shaft); club.add(head);
    club.position.copy(handR);
    club.rotation.z=atk? 0.5 : -0.25; club.rotation.x=atk? -0.4 : 0.15;
    g.add(club);
    // head: wide skull, jutting jaw, huge ears, snout nose
    const headY=1.22+(atk?0.02:0);
    const skull=sphere(0.185,skin); skull.scale.set(1.15,1,1.05); skull.position.y=headY; g.add(skull);
    const jaw=sphere(0.13,skinD,8); jaw.scale.set(1.15,0.55,1); jaw.position.set(0,headY-0.11,0.09); g.add(jaw);
    const nose=cone(0.045,0.13,skinD,6); nose.position.set(0,headY+0.01,0.2); nose.rotation.x=Math.PI/2; g.add(nose);
    for(const e of [-1,1]){
      const ear=cone(0.07,0.30,skin,5); ear.position.set(e*0.26,headY+0.06,-0.02);
      ear.rotation.z=e*-1.35; ear.rotation.y=e*0.25; g.add(ear);
    }
    // eyes: yellow, catching light
    for(const e of [-1,1]){ const eye=sphere(0.035,M(0xe8c020,{emissive:0x805808,rough:0.3}),7);
      eye.position.set(e*0.075,headY+0.035,0.155); g.add(eye); }
    // brow ridge
    const brow=box(0.24,0.045,0.06,skinD); brow.position.set(0,headY+0.085,0.14); brow.rotation.x=0.25; g.add(brow);
    // teeth on attack
    if(atk){ for(const e of [-1,1]){ const tooth=cone(0.018,0.05,bone,5);
      tooth.position.set(e*0.06,headY-0.135,0.16); tooth.rotation.x=Math.PI; g.add(tooth); } }
    return g;
  },
};
