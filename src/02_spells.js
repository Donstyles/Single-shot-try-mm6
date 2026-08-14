// 02_spells — PURE spell definitions and resolvers. Owner: spells.
// castSpell() computes an effect description; the game layer applies it.
'use strict';

// target: 'enemy' (needs monster target), 'party', 'pc' (needs party member), 'self', 'world'
const SPELLS = {
  // FIRE
  fire_bolt:   {school:'fire', name:'Fire Bolt',    sp:2,  req:1, target:'enemy', kind:'damage', n:1,d:4, perSkill:1, proj:'fire'},
  fire_ball:   {school:'fire', name:'Fireball',     sp:8,  req:4, target:'enemy', kind:'damage', n:3,d:6, perSkill:2, proj:'fire', aoe:2.2},
  fire_haste:  {school:'fire', name:'Haste',        sp:5,  req:2, target:'party', kind:'buff', buff:'haste', durMin:30, perSkillDur:10},
  // AIR
  air_spark:   {school:'air',  name:'Static Charge',sp:2,  req:1, target:'enemy', kind:'damage', n:1,d:5, perSkill:1, proj:'spark'},
  air_shield:  {school:'air',  name:'Wizard Eye',   sp:3,  req:1, target:'world', kind:'wizardEye', durMin:60},
  air_bolt:    {school:'air',  name:'Lightning Bolt',sp:9, req:4, target:'enemy', kind:'damage', n:4,d:5, perSkill:2, proj:'spark'},
  // WATER
  water_splash:{school:'water',name:'Ice Shard',    sp:3,  req:1, target:'enemy', kind:'damage', n:1,d:6, perSkill:1, proj:'ice'},
  water_walk:  {school:'water',name:'Cold Ward',    sp:4,  req:2, target:'party', kind:'buff', buff:'ward', durMin:40, perSkillDur:10},
  water_blast: {school:'water',name:'Frost Nova',   sp:10, req:4, target:'enemy', kind:'damage', n:3,d:7, perSkill:2, proj:'ice', aoe:2.0},
  // EARTH
  earth_stone: {school:'earth',name:'Stone Dart',   sp:2,  req:1, target:'enemy', kind:'damage', n:1,d:5, perSkill:1, proj:'stone'},
  earth_skin:  {school:'earth',name:'Stoneskin',    sp:4,  req:2, target:'party', kind:'buff', buff:'stoneskin', durMin:40, perSkillDur:10, acBonus:5},
  earth_quake: {school:'earth',name:'Rock Blast',   sp:9,  req:4, target:'enemy', kind:'damage', n:3,d:6, perSkill:2, proj:'stone', aoe:1.8},
  // SPIRIT
  spirit_bless:{school:'spirit',name:'Bless',       sp:3,  req:1, target:'party', kind:'buff', buff:'bless', durMin:30, perSkillDur:10, hitBonus:3},
  spirit_heroism:{school:'spirit',name:'Heroism',   sp:5,  req:2, target:'party', kind:'buff', buff:'heroism', durMin:30, perSkillDur:10, dmgBonus:3},
  spirit_raise:{school:'spirit',name:'Raise Dead',  sp:20, req:7, target:'pc', kind:'raise'},
  // MIND
  mind_calm:   {school:'mind', name:'Calm Beast',   sp:4,  req:1, target:'enemy', kind:'calm', durMin:2},
  mind_awaken: {school:'mind', name:'Clear Mind',   sp:3,  req:1, target:'pc', kind:'cureCond', cures:['unconscious']},
  mind_psy:    {school:'mind', name:'Psychic Lance',sp:8,  req:4, target:'enemy', kind:'damage', n:3,d:5, perSkill:2, proj:'mind'},
  // BODY
  body_heal:   {school:'body', name:'Heal Wounds',  sp:3,  req:1, target:'pc', kind:'heal', n:2,d:4, perSkill:2},
  body_cure:   {school:'body', name:'Cure Poison',  sp:5,  req:2, target:'pc', kind:'cureCond', cures:['poisoned','diseased']},
  body_regen:  {school:'body', name:'Greater Heal', sp:10, req:4, target:'pc', kind:'heal', n:5,d:6, perSkill:3},
  // LIGHT
  light_torch: {school:'light',name:'Torch Light',  sp:1,  req:1, target:'world', kind:'light', durMin:120},
  light_smite: {school:'light',name:'Sun Ray',      sp:12, req:4, target:'enemy', kind:'damage', n:5,d:6, perSkill:2, proj:'light', vsUndead:2},
  light_restore:{school:'light',name:'Restoration', sp:16, req:7, target:'pc', kind:'restore'},
  // DARK
  dark_drain:  {school:'dark', name:'Life Drain',   sp:6,  req:1, target:'enemy', kind:'drain', n:2,d:4, perSkill:1, proj:'dark'},
  dark_pain:   {school:'dark', name:'Shrapnel',     sp:10, req:4, target:'enemy', kind:'damage', n:4,d:6, perSkill:2, proj:'dark'},
  dark_reaper: {school:'dark', name:'Dark Grasp',   sp:18, req:7, target:'enemy', kind:'damage', n:8,d:6, perSkill:3, proj:'dark'},
};

const Spellcraft = {
  known(pc){ return pc.spells.map(id=>SPELLS[id]).filter(Boolean); },
  canCast(pc,id){
    const s=SPELLS[id]; if(!s) return {ok:false,why:'Unknown spell'};
    if(!pc.spells.includes(id)) return {ok:false,why:'Spell not learned'};
    const sk=pc.skills[s.school]||0;
    if(sk<s.req) return {ok:false,why:'Requires '+SKILLS[s.school].name+' '+(s.req>=7?'Master':s.req>=4?'Expert':'Novice')};
    if(pc.sp<s.sp) return {ok:false,why:'Not enough spell points'};
    if(pc.cond==='dead'||pc.cond==='unconscious') return {ok:false,why:pc.name+' cannot act'};
    return {ok:true};
  },
  // PURE: returns effect record. Caller deducts SP (amount echoed) and applies.
  resolve(pc,id,rand){
    const s=SPELLS[id]; const sk=pc.skills[s.school]||0;
    const eff={spell:id,name:s.name,school:s.school,spCost:s.sp,kind:s.kind,target:s.target,proj:s.proj||null,aoe:s.aoe||0};
    if(s.kind==='damage'||s.kind==='drain'){
      eff.damage=Math.max(1,rand.roll(s.n,s.d,(s.perSkill||0)*sk));
      if(s.vsUndead) eff.vsUndeadMult=s.vsUndead;
      if(s.kind==='drain') eff.selfHeal=Math.ceil(eff.damage/2);
    }
    if(s.kind==='heal') eff.heal=Math.max(1,rand.roll(s.n,s.d,(s.perSkill||0)*sk));
    if(s.kind==='buff'){ eff.buff=s.buff; eff.durMin=s.durMin+(s.perSkillDur||0)*sk; eff.acBonus=s.acBonus||0; eff.hitBonus=s.hitBonus||0; eff.dmgBonus=s.dmgBonus||0; }
    if(s.kind==='cureCond') eff.cures=s.cures;
    if(s.kind==='raise') eff.raise=true;
    if(s.kind==='restore') eff.restore=true;
    if(s.kind==='light') eff.lightDurMin=s.durMin;
    if(s.kind==='wizardEye') eff.wizardEyeDurMin=s.durMin;
    if(s.kind==='calm') eff.calmMin=s.durMin;
    return eff;
  },
  guildPrice(id){ const s=SPELLS[id]; return s.req>=7?2000:s.req>=4?400:60; },
  starting(cls){ // spells known at chargen
    return {paladin:['spirit_bless'],archer:['air_spark'],cleric:['body_heal','spirit_bless'],
      sorcerer:['fire_bolt','air_spark'],druid:['earth_stone','body_heal'],knight:[]}[cls]||[];
  }
};
