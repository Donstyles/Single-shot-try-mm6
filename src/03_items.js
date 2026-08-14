// 03_items — PURE item + monster tables, loot generation. Owner: items.
// Art bakes FROM these ids — a sprite without a stats row is a build error.
'use strict';

// slot: weapon|shield|armor|helm|boots|ring|amulet|use|quest
const ITEMS = {
  // weapons — dn/dd/dp dice, rec = recovery ms, skill
  club:        {name:'Club',           slot:'weapon', skill:'mace',  dn:1,dd:3,dp:0, rec:1700, price:8,   icon:'club'},
  dagger:      {name:'Dagger',         slot:'weapon', skill:'dagger',dn:1,dd:4,dp:0, rec:1200, price:15,  icon:'dagger'},
  shortsword:  {name:'Short Sword',    slot:'weapon', skill:'sword', dn:1,dd:6,dp:0, rec:1500, price:30,  icon:'shortsword'},
  longsword:   {name:'Long Sword',     slot:'weapon', skill:'sword', dn:1,dd:8,dp:1, rec:1600, price:90,  icon:'longsword'},
  bastard:     {name:'Bastard Sword',  slot:'weapon', skill:'sword', dn:2,dd:6,dp:1, rec:1750, price:240, icon:'bastard'},
  handaxe:     {name:'Hand Axe',       slot:'weapon', skill:'axe',   dn:1,dd:7,dp:0, rec:1650, price:40,  icon:'handaxe'},
  battleaxe:   {name:'Battle Axe',     slot:'weapon', skill:'axe',   dn:2,dd:5,dp:1, rec:1800, price:150, icon:'battleaxe'},
  mace:        {name:'Mace',           slot:'weapon', skill:'mace',  dn:1,dd:6,dp:1, rec:1600, price:50,  icon:'mace'},
  warhammer:   {name:'War Hammer',     slot:'weapon', skill:'mace',  dn:2,dd:5,dp:2, rec:1850, price:200, icon:'warhammer'},
  shortbow:    {name:'Short Bow',      slot:'weapon', skill:'bow',   dn:1,dd:6,dp:0, rec:1400, price:60,  icon:'shortbow',  ranged:true},
  longbow:     {name:'Long Bow',       slot:'weapon', skill:'bow',   dn:2,dd:5,dp:1, rec:1500, price:180, icon:'longbow',   ranged:true},
  quarterstaff:{name:'Quarterstaff',   slot:'weapon', skill:'staff', dn:1,dd:8,dp:0, rec:1700, price:25,  icon:'quarterstaff'},
  runestaff:   {name:'Rune Staff',     slot:'weapon', skill:'staff', dn:2,dd:6,dp:2, rec:1750, price:300, icon:'runestaff'},
  // armor
  padded:      {name:'Padded Armor',   slot:'armor', skill:'leather', ac:3,  price:20,  icon:'padded'},
  leatherarm:  {name:'Leather Armor',  slot:'armor', skill:'leather', ac:5,  price:60,  icon:'leatherarm'},
  studded:     {name:'Studded Leather',slot:'armor', skill:'leather', ac:7,  price:140, icon:'studded'},
  chainmail:   {name:'Chain Mail',     slot:'armor', skill:'chain',   ac:9,  price:250, icon:'chainmail'},
  platearm:    {name:'Plate Armor',    slot:'armor', skill:'plate',   ac:13, price:900, icon:'platearm'},
  buckler:     {name:'Buckler',        slot:'shield',skill:'shield',  ac:2,  price:30,  icon:'buckler'},
  kiteshield:  {name:'Kite Shield',    slot:'shield',skill:'shield',  ac:4,  price:120, icon:'kiteshield'},
  cap:         {name:'Leather Cap',    slot:'helm',  skill:null,      ac:1,  price:15,  icon:'cap'},
  helm:        {name:'Iron Helm',      slot:'helm',  skill:null,      ac:3,  price:110, icon:'helm'},
  boots:       {name:'Boots',          slot:'boots', skill:null,      ac:1,  price:12,  icon:'boots'},
  greaves:     {name:'Steel Greaves',  slot:'boots', skill:null,      ac:3,  price:130, icon:'greaves'},
  // jewelry
  ringmight:   {name:'Ring of Might',  slot:'ring', stat:'might', statPlus:4,    price:400, icon:'ring'},
  ringspeed:   {name:'Ring of Haste',  slot:'ring', stat:'speed', statPlus:4,    price:400, icon:'ring'},
  amuletend:   {name:'Amulet of Vigor',slot:'amulet', stat:'endurance', statPlus:5, price:600, icon:'amulet'},
  // consumables
  potion_heal: {name:'Healing Potion', slot:'use', use:'heal', n:3,d:6,plus:5, price:40, icon:'potion_r'},
  potion_mana: {name:'Mana Potion',    slot:'use', use:'mana', n:3,d:6,plus:5, price:60, icon:'potion_b'},
  potion_cure: {name:'Antidote',       slot:'use', use:'cure', cures:['poisoned','diseased'], price:50, icon:'potion_g'},
  bread:       {name:'Traveler Bread', slot:'use', use:'heal', n:1,d:4,plus:1, price:5, icon:'bread'},
  // quest items
  q_ledger:    {name:'Stolen Ledger',    slot:'quest', price:0, icon:'scroll'},
  q_fang:      {name:'Direwolf Fang',    slot:'quest', price:0, icon:'fang'},
  q_censer:    {name:'Silver Censer',    slot:'quest', price:0, icon:'censer'},
  q_sigil:     {name:'Vault Sigil',      slot:'quest', price:0, icon:'sigil'},
  q_crown:     {name:'Crown of Vintavia',slot:'quest', price:0, icon:'crown'},
};

const Items = {
  make(id,ench){ if(!ITEMS[id]) throw new Error('unknown item '+id); return {id,ench:ench||null}; },
  def(inst){ return inst?ITEMS[inst.id]:null; },
  displayName(inst){ const d=ITEMS[inst.id]; return inst.ench?d.name+' '+inst.ench.name:d.name; },
  basePrice(inst){ const d=ITEMS[inst.id]; return d.price+(inst.ench?inst.ench.plus*120:0); },
  canEquip(pc,inst){
    const d=ITEMS[inst.id];
    if(!['weapon','shield','armor','helm','boots','ring','amulet'].includes(d.slot)) return false;
    if(d.skill && !(pc.skills[d.skill]>=1)) return false;
    return true;
  },
  equipStatBonus(pc,attr){
    let b=0;
    for(const k in pc.equip){ const it=pc.equip[k]; if(!it) continue; const d=ITEMS[it.id];
      if(d.stat===attr) b+=d.statPlus;
      if(it.ench&&it.ench.stat===attr) b+=it.ench.plus; }
    return b;
  },
};

// loot tiers by area level
const LOOT_TIERS=[
  ['club','dagger','padded','cap','boots','bread','potion_heal'],
  ['shortsword','handaxe','mace','quarterstaff','buckler','leatherarm','potion_heal','potion_cure','shortbow'],
  ['longsword','battleaxe','studded','helm','potion_mana','kiteshield','longbow'],
  ['bastard','warhammer','chainmail','greaves','runestaff','ringmight','ringspeed'],
  ['platearm','amuletend','runestaff','bastard'],
];
const Loot = {
  roll(rand,tier){ // returns {gold, item?}
    const t=clamp(tier,0,LOOT_TIERS.length-1);
    const gold=rand.roll(2,6,t*8);
    let item=null;
    if(rand.chance(0.30+t*0.05)) item=Items.make(rand.pick(LOOT_TIERS[t]));
    return {gold,item};
  }
};

// ---------- monsters ----------
// ai: melee | ranged | caster ; und: undead flag ; tier drives loot
const MONSTERS = {
  goblin:      {name:'Goblin',        hp:12,  ac:5,  atk:2,  dn:1,dd:4,dp:0, spd:1.6, xp:75,  tier:0, ai:'melee',  aggro:6,  scale:0.95},
  goblin_war:  {name:'Goblin Warrior',hp:22,  ac:8,  atk:4,  dn:1,dd:6,dp:1, spd:1.8, xp:150,  tier:1, ai:'melee',  aggro:7,  scale:1.05},
  goblin_sham: {name:'Goblin Shaman', hp:18,  ac:6,  atk:3,  dn:1,dd:4,dp:0, spd:1.5, xp:200,  tier:1, ai:'caster', aggro:9,  scale:1.0, spell:{proj:'fire',n:2,d:4,cd:2600}},
  wolf:        {name:'Wolf',          hp:16,  ac:7,  atk:3,  dn:1,dd:5,dp:1, spd:2.6, xp:110,  tier:0, ai:'melee',  aggro:8,  scale:0.95},
  direwolf:    {name:'Direwolf',      hp:34,  ac:10, atk:6,  dn:2,dd:5,dp:1, spd:2.8, xp:320, tier:2, ai:'melee',  aggro:9,  scale:1.18},
  bandit:      {name:'Bandit',        hp:23,  ac:9,  atk:5,  dn:1,dd:6,dp:1, spd:1.9, xp:220,  tier:1, ai:'melee',  aggro:8,  scale:1.15},
  bandit_bow:  {name:'Bandit Archer', hp:20,  ac:8,  atk:5,  dn:1,dd:6,dp:0, spd:1.7, xp:230,  tier:1, ai:'ranged', aggro:11, scale:1.15, spell:{proj:'arrow',n:1,d:6,cd:2200}},
  apprentice:  {name:'Rogue Apprentice',hp:24,ac:8,  atk:4,  dn:1,dd:4,dp:0, spd:1.6, xp:300, tier:2, ai:'caster', aggro:11, scale:1.15, spell:{proj:'spark',n:2,d:5,cd:2400}},
  bat:         {name:'Cave Bat',      hp:8,   ac:9,  atk:2,  dn:1,dd:3,dp:0, spd:3.0, xp:60,  tier:0, ai:'melee',  aggro:7,  scale:0.55},
  spider:      {name:'Crypt Spider',  hp:20,  ac:9,  atk:4,  dn:1,dd:4,dp:1, spd:2.2, xp:210,  tier:1, ai:'melee',  aggro:7,  scale:0.85, poison:0.35},
  skeleton:    {name:'Skeleton',      hp:20,  ac:9,  atk:5,  dn:1,dd:6,dp:1, spd:1.7, xp:250, tier:1, ai:'melee',  aggro:7,  scale:1.15, und:true},
  skel_guard:  {name:'Skeleton Guard',hp:40,  ac:13, atk:7,  dn:2,dd:5,dp:2, spd:1.7, xp:450, tier:2, ai:'melee',  aggro:7,  scale:1.2, und:true},
  zombie:      {name:'Zombie',        hp:36,  ac:6,  atk:4,  dn:1,dd:8,dp:1, spd:1.0, xp:270, tier:1, ai:'melee',  aggro:6,  scale:1.18, und:true, disease:0.3},
  ghost:       {name:'Restless Shade',hp:30,  ac:14, atk:6,  dn:2,dd:4,dp:0, spd:2.0, xp:500, tier:2, ai:'melee',  aggro:8,  scale:1.15, und:true},
  bandit_boss: {name:'Bandit Captain',hp:55,  ac:12, atk:7,  dn:2,dd:6,dp:2, spd:2.0, xp:750, tier:2, ai:'melee',  aggro:9,  scale:1.25, boss:true},
  necromancer: {name:'Necromancer',   hp:48,  ac:12, atk:6,  dn:1,dd:6,dp:0, spd:1.6, xp:900, tier:3, ai:'caster', aggro:12, scale:1.18, und:false, boss:true, spell:{proj:'dark',n:3,d:5,cd:2800}},
  lich:        {name:'Lich of the Vault',hp:160,ac:16,atk:10, dn:2,dd:8,dp:3, spd:1.8, xp:3500,tier:4, ai:'caster', aggro:14, scale:1.3, und:true, boss:true, spell:{proj:'dark',n:4,d:6,cd:2200}},
};
const Monsters = {
  def(mid){ const d=MONSTERS[mid]; if(!d) throw new Error('unknown monster '+mid); return d; },
  make(mid,x,y){ const d=Monsters.def(mid); return {mid,x,y,hp:d.hp,state:'idle',homeX:x,homeY:y,cool:0,calmUntil:0}; },
};
