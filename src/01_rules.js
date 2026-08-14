// 01_rules — PURE rules engine. No DOM, no rendering, no game-state reads.
// Every formula in the game lives here. Glue calls these; it never re-derives.
'use strict';

const ATTRS=['might','intellect','personality','endurance','accuracy','speed','luck'];

const Rules = {};

// MM6-style attribute modifier breakpoints
Rules.statMod = function(v){
  if(v>=100) return 15; if(v>=75) return 13; if(v>=50) return 11; if(v>=40) return 10;
  if(v>=35) return 9; if(v>=30) return 8; if(v>=25) return 7; if(v>=21) return 6;
  if(v>=19) return 5; if(v>=17) return 4; if(v>=15) return 3; if(v>=13) return 2;
  if(v>=11) return 1; if(v>=9) return 0; if(v>=7) return -1; if(v>=5) return -2;
  if(v>=3) return -3; return -4;
};

// ---------- classes ----------
const CLASSES = {
  knight:  { name:'Knight',   hpBase:40, hpLv:7, spLv:0, spStat:null,          weapons:['sword','axe','mace','dagger','bow','staff'], armor:['leather','chain','plate','shield'], schools:[], startSkills:['sword','bodybuilding','shield','leather'] },
  paladin: { name:'Paladin',  hpBase:34, hpLv:6, spLv:2, spStat:'personality', weapons:['sword','mace','dagger','bow'], armor:['leather','chain','plate','shield'], schools:['spirit','mind','body'], startSkills:['mace','spirit','shield','leather'] },
  archer:  { name:'Archer',   hpBase:30, hpLv:5, spLv:2, spStat:'intellect',   weapons:['bow','sword','dagger','axe'], armor:['leather','chain'], schools:['fire','air','water','earth'], startSkills:['bow','air','sword','leather'] },
  cleric:  { name:'Cleric',   hpBase:26, hpLv:4, spLv:3, spStat:'personality', weapons:['mace','staff'], armor:['leather','chain','shield'], schools:['spirit','mind','body','light','dark'], startSkills:['mace','body','spirit','leather'] },
  sorcerer:{ name:'Sorcerer', hpBase:20, hpLv:3, spLv:4, spStat:'intellect',   weapons:['dagger','staff','bow'], armor:['leather'], schools:['fire','air','water','earth','light','dark'], startSkills:['fire','staff','air','leather'] },
  druid:   { name:'Druid',    hpBase:24, hpLv:4, spLv:3, spStat:'both',        weapons:['dagger','mace','staff'], armor:['leather'], schools:['fire','air','water','earth','spirit','mind','body'], startSkills:['earth','body','dagger','leather'] },
};
const CLASS_BASE_STATS = { // point-buy baseline per class
  knight:  {might:14,intellect: 7,personality: 9,endurance:14,accuracy:11,speed:11,luck: 9},
  paladin: {might:12,intellect: 7,personality:12,endurance:12,accuracy:10,speed:10,luck: 9},
  archer:  {might:11,intellect:11,personality: 7,endurance:10,accuracy:13,speed:12,luck: 9},
  cleric:  {might: 9,intellect: 9,personality:14,endurance:11,accuracy: 9,speed:10,luck: 9},
  sorcerer:{might: 7,intellect:14,personality: 9,endurance: 9,accuracy:11,speed:11,luck:10},
  druid:   {might: 9,intellect:12,personality:12,endurance:10,accuracy: 9,speed:10,luck: 9},
};
Rules.POINT_POOL=12; Rules.STAT_MIN=5; Rules.STAT_MAX=25;
Rules.pointCost=function(from,to){ // cost to raise a stat 1 step at value `from`
  return from>=17?2:1; };
Rules.canRaise=(pc,attr,pool)=>pc.stats[attr]<Rules.STAT_MAX&&pool>=Rules.pointCost(pc.stats[attr]);
Rules.canLower=(cls,pc,attr)=>pc.stats[attr]>Rules.STAT_MIN&&pc.stats[attr]>CLASS_BASE_STATS[cls][attr]-4;

// ---------- skills ----------
// rank: 0 none, then points 1..; tier: novice(>=1) expert(>=4) master(>=7)
const SKILLS = {
  sword:{name:'Sword',type:'weapon'}, axe:{name:'Axe',type:'weapon'}, mace:{name:'Mace',type:'weapon'},
  dagger:{name:'Dagger',type:'weapon'}, bow:{name:'Bow',type:'weapon'}, staff:{name:'Staff',type:'weapon'},
  leather:{name:'Leather',type:'armor'}, chain:{name:'Chain',type:'armor'}, plate:{name:'Plate',type:'armor'}, shield:{name:'Shield',type:'armor'},
  bodybuilding:{name:'Bodybuilding',type:'misc'}, meditation:{name:'Meditation',type:'misc'},
  merchant:{name:'Merchant',type:'misc'}, perception:{name:'Perception',type:'misc'}, disarm:{name:'Disarm Traps',type:'misc'}, learning:{name:'Learning',type:'misc'},
  fire:{name:'Fire Magic',type:'magic'}, air:{name:'Air Magic',type:'magic'}, water:{name:'Water Magic',type:'magic'}, earth:{name:'Earth Magic',type:'magic'},
  spirit:{name:'Spirit Magic',type:'magic'}, mind:{name:'Mind Magic',type:'magic'}, body:{name:'Body Magic',type:'magic'},
  light:{name:'Light Magic',type:'magic'}, dark:{name:'Dark Magic',type:'magic'},
};
Rules.skillTier=function(pts){ return pts>=7?'master':pts>=4?'expert':pts>=1?'novice':'none'; };
Rules.skillTierMult=function(pts){ return pts>=7?3:pts>=4?2:pts>=1?1:0; };
Rules.skillUpCost=function(curPts){ return (curPts+1)*60; }; // gold at guild
Rules.SKILL_LEARN_COST=100; // gold to learn a new class-legal skill at the trainer
Rules.canLearnSkill=function(cls,skill){
  const c=CLASSES[cls], s=SKILLS[skill];
  if(!s) return false;
  if(s.type==='weapon') return c.weapons.includes(skill);
  if(s.type==='armor') return c.armor.includes(skill);
  if(s.type==='magic') return c.schools.includes(skill);
  return true;
};

// ---------- derived stats ----------
Rules.maxHP=function(pc){
  const c=CLASSES[pc.cls];
  const bb=(pc.skills.bodybuilding||0);
  return Math.max(1, c.hpBase + (pc.level-1)*c.hpLv + Rules.statMod(pc.stats.endurance)*pc.level + bb*Rules.skillTierMult(bb)*2);
};
Rules.maxSP=function(pc){
  const c=CLASSES[pc.cls];
  if(!c.spLv) return 0;
  let stat;
  if(c.spStat==='both') stat=Math.round((pc.stats.intellect+pc.stats.personality)/2);
  else stat=pc.stats[c.spStat];
  const med=(pc.skills.meditation||0);
  return Math.max(0, 4 + pc.level*c.spLv + Rules.statMod(stat)*pc.level + med*Rules.skillTierMult(med)*2);
};
Rules.armorClass=function(pc,items){ // items: resolved equip item defs (ITEMS[id])
  let ac=Rules.statMod(pc.stats.speed);
  for(const it of items){ if(!it||!it.ac) continue;
    const sk=(pc.skills[it.skill]||0);
    ac+=it.ac + (it.skill?sk:0);
  }
  return Math.max(0,ac);
};
Rules.attackBonus=function(pc,weapon){ // weapon: item def or null (fists); accuracy governs all to-hit
  const sk=weapon?(pc.skills[weapon.skill]||0):0;
  return Rules.statMod(pc.stats.accuracy)+sk+(weapon&&weapon.bonusHit||0);
};
Rules.damageRange=function(pc,weapon){
  const m=Rules.statMod(weapon&&weapon.skill==='bow'?pc.stats.accuracy:pc.stats.might);
  const sk=weapon?(pc.skills[weapon.skill]||0):0;
  const tier=Rules.skillTierMult(sk);
  if(!weapon) return {n:1,d:2,plus:Math.max(0,m)};
  return {n:weapon.dn,d:weapon.dd,plus:(weapon.dp||0)+Math.max(0,m)+ (tier>=2?sk:0)};
};
Rules.recoveryMs=function(pc,weapon){ // ms between attacks in real-time
  const base=weapon?weapon.rec:1800;
  const sp=Rules.statMod(pc.stats.speed);
  return clamp(base-sp*60,600,3000);
};

// ---------- combat math ----------
// hit chance vs AC (MM6-flavored): 2d + bonus vs AC
Rules.hitChance=function(bonus,ac){ return clamp((20+2*bonus-ac)/(30+2*bonus),0.05,0.95); };
Rules.attackRoll=function(rand,attacker_bonus,defender_ac){ return rand.next()<Rules.hitChance(attacker_bonus,defender_ac); };
Rules.damageRoll=function(rand,range){ return Math.max(1,rand.roll(range.n,range.d,range.plus)); };
Rules.monsterHit=function(rand,mAtk,pcAC){ return rand.next()<Rules.hitChance(mAtk,pcAC); };

// ---------- XP / leveling ----------
Rules.xpForLevel=function(lv){ return lv*(lv-1)*500; }; // total xp needed to BE level lv
Rules.canTrain=function(pc){ return pc.xp>=Rules.xpForLevel(pc.level+1); };
Rules.trainCost=function(level){ return level*25; }; // cost to train TO level+1 given current level
Rules.levelUpGains=function(pc){ // returns {hp, sp} gained — applied by caller via maxHP/maxSP recompute
  return {level:pc.level+1};
};
Rules.xpShare=function(total,partySize){ return Math.ceil(total/Math.max(1,partySize)); };

// ---------- economy ----------
Rules.buyPrice=function(base,merchantPts){ const t=Rules.skillTierMult(merchantPts||0); const mult=[1.5,1.25,1.1,1.0][Math.min(3,t)]; return Math.max(1,Math.round(base*mult)); };
Rules.sellPrice=function(base,merchantPts){ const t=Rules.skillTierMult(merchantPts||0); const mult=[0.4,0.55,0.7,0.85][Math.min(3,t)]; return Math.max(1,Math.round(base*mult)); };
Rules.templeHealCost=function(pc){ // heal all hp + cure conditions
  let c=10+pc.level*5;
  if(pc.cond==='dead') c+=100+pc.level*20;
  else if(pc.cond==='poisoned'||pc.cond==='diseased') c+=25;
  return c;
};
Rules.tavernRestCost=function(partyLevelSum){ return 10+partyLevelSum*2; };
// bank is safe storage only — no interest, no fees

// ---------- resting ----------
Rules.REST_MINUTES=8*60;
Rules.restResult=function(pc){ // full hp/sp unless dead/diseased; returns new cond
  if(pc.cond==='dead') return {hp:0,sp:0,cond:'dead'};
  if(pc.cond==='diseased') return {hp:Math.ceil(Rules.maxHP(pc)*0.5),sp:Math.ceil(Rules.maxSP(pc)*0.5),cond:'diseased'};
  const cond=(pc.cond==='poisoned')?'poisoned':'ok';
  const f=cond==='poisoned'?0.6:1;
  return {hp:Math.ceil(Rules.maxHP(pc)*f),sp:Math.ceil(Rules.maxSP(pc)*f),cond};
};
Rules.outdoorAmbushChance=0.25;

// ---------- chest traps (Disarm Traps skill finally earns its keep) ----------
Rules.trapChance=function(tier){ return clamp(0.15+tier*0.15,0,0.7); };
Rules.trapDamage=function(rand,tier){ return rand.roll(2,4,tier*3); };
Rules.disarmed=function(rand,bestDisarm,tier){ // roll best party skill vs chest tier
  return rand.next() < clamp(0.25+bestDisarm*0.12-tier*0.08,0.05,0.97);
};

// ---------- conditions (poison ticks etc) ----------
Rules.poisonTick=function(pc){ return Math.max(1,Math.round(pc.level/2)); }; // hp lost per game hour
Rules.conditionColor=function(cond){ return cond==='ok'?palIdx(2,13):cond==='poisoned'?palIdx(13,10):cond==='diseased'?palIdx(9,9):cond==='unconscious'?palIdx(5,10):palIdx(14,8); };

// ---------- buff-aware effective stats (single source; glue passes party.buffs) ----------
Rules.effectiveAttack=function(pc,weapon,buffs){
  let b=Rules.attackBonus(pc,weapon);
  if(buffs&&buffs.bless) b+=buffs.bless.hitBonus||3;
  return b;
};
Rules.effectiveDamage=function(pc,weapon,buffs){
  const r=Rules.damageRange(pc,weapon);
  if(buffs&&buffs.heroism) r.plus+=buffs.heroism.dmgBonus||3;
  return r;
};
Rules.effectiveAC=function(pc,equipDefs,buffs){
  let ac=Rules.armorClass(pc,equipDefs);
  if(buffs&&buffs.stoneskin) ac+=buffs.stoneskin.acBonus||5;
  return ac;
};
Rules.effectiveRecovery=function(pc,weapon,buffs){
  let ms=Rules.recoveryMs(pc,weapon);
  if(buffs&&buffs.haste) ms=Math.round(ms*0.7);
  return ms;
};

// ---------- party creation ----------
Rules.makePC=function(name,cls,portrait,stats){
  const pc={ name, cls, portrait, level:1, xp:0,
    stats:Object.assign({},stats||CLASS_BASE_STATS[cls]),
    skills:{}, spells:[], cond:'ok',
    equip:{weapon:null,shield:null,armor:null,helm:null,boots:null,ring1:null,ring2:null,amulet:null},
    items:new Array(48).fill(null), skillPoints:0 };
  for(const s of CLASSES[cls].startSkills) pc.skills[s]=1;
  pc.hp=0; pc.sp=0; // caller sets to max via recompute
  return pc;
};
Rules.RECOMMENDED=[
  ['Roderic','knight',0],['Aldric','paladin',1],['Serena','cleric',2],['Mireth','sorcerer',3],
];
