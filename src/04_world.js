// 04_world — map generation (seeded, deterministic), quests, NPCs. Owner: world.
'use strict';

// Wall texture ids: 1 town stone, 2 timber house, 3 mountain rock, 4 dungeon brick,
// 5 crypt stone, 6 vault marble, 7 wood door, 8 sigil door (locked), 9 shopfront timber
// Floor ids: 0 grass, 1 dirt road, 2 cobble, 3 dungeon stone, 4 crypt floor, 5 vault marble, 6 water(solid), 7 sand
const WALL_SOLID = id=>id>0;

// ---------- ASCII town template ----------
const TOWN_ROWS = [
  '#####################################',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,HHHHHH,,HHHHHH,,HHHHHHH,,HHHHHHHH,#',
  '#,HHHHHH,,HHHHHH,,HHHHHHH,,HHHHHHHH,#',
  '#,HHWHHH,,HHAHHH,,HHHMHHH,,HHHVHHHH,#',
  '#,,,s,,,,,,,s,,,,,,,,s,,,,,,,,s,,,,,#',
  ':===================================:',
  ':===================================:',
  ':===================================:',
  '#,,,s,,,,,,,s,,,F,,,,s,,,,,,,,s,,,,,#',
  '#,HHTHHH,,HHRHHH,,HHHBHHH,,HHHCHHHH,#',
  '#,HHHHHH,,HHHHHH,,HHHHHHH,,HHHHHHHH,#',
  '#,HHHHHH,,HHHHHH,,HHHHHHH,,HHHHHHHH,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#####################:###############',
];
const TOWN_X=29, TOWN_Y=30; // offset of template in world map
const SHOP_DOORS={W:'weapon',A:'armor',M:'guild',V:'tavern',T:'temple',R:'train',B:'bank',C:'hall'};

// ---------- dungeon ASCII ----------
// legend letters -> monster ids per level (declared with each map)
const DUN1_ROWS=[ // The Crypt (entered from outdoors)
  '##############################',
  '#....#.....a.#........#..z..1#',
  '#.U..D.......#..k.....D......#',
  '#....#...p...#........#...z..#',
  '#....#.......####D#####......#',
  '###D######...#........########',
  '#........#...#..c.....#......#',
  '#..a.....#.p.#........D...k..#',
  '#....##D##...##########......#',
  '#....#...................k...#',
  '#.p..#...####....#####.......#',
  '#....#...#..#....#...#...#####',
  '#.......c#..#.z..#.c.#...#...#',
  '#....#...####....##D##...D.S.#',
  '#....#...........#...........#',
  '##############################',
];
const DUN2_ROWS=[ // The Catacombs
  '##############################',
  '#.U..#........#....g....#....#',
  '#....D...G....D.........D.c..#',
  '#....#........#..k.k....#....#',
  '#.####....#####.........######',
  '#.#....c..#.......########...#',
  '#.#.......#..g....#......#...#',
  '#.#############...#..z...D...#',
  '#.....G...........#......#.k.#',
  '#.................########...#',
  '####D######D####.........#...#',
  '#......#.......#....G....#...#',
  '#..c...#...g...#.........##D##',
  '#......#.......#..n......#.S.#',
  '#......#.......#.........#...#',
  '##############################',
];
const DUN3_ROWS=[ // The Vault
  '##############################',
  '#.U..........#...............#',
  '#....G...G...X......L........#',
  '#............#...............#',
  '#....G...G...#......2........#',
  '#............#...............#',
  '#............#.......E.......#',
  '##############################',
];

function parseAscii(rows,opts){
  const h=rows.length,w=rows[0].length;
  for(const r of rows) if(r.length!==w) throw new Error('map row length mismatch: '+r);
  const cells=new Uint8Array(w*h), floor=new Uint8Array(w*h);
  const out={w,h,cells,floor,doors:{},shops:[],decor:[],spawns:[],portals:[],chests:[]};
  const wallTex=opts.wallTex, floorId=opts.floorId;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const ch=rows[y][x], i=y*w+x;
    floor[i]=floorId;
    switch(ch){
      case '#': cells[i]=wallTex; break;
      case 'H': cells[i]=2; break;
      case ',': floor[i]=0; break;
      case '.': floor[i]=opts.dotFloor!==undefined?opts.dotFloor:floorId; break;
      case '=': floor[i]=1; break;
      case ':': floor[i]=1; break; // gate opening in town wall
      case 'D': cells[i]=7; out.doors[x+','+y]={open:false}; break;
      case 'X': cells[i]=8; out.doors[x+','+y]={open:false,needs:'q_sigil'}; break;
      case 's': out.decor.push({kind:'sign',x:x+0.95,y:y+0.3}); floor[i]=opts.dotFloor??floorId; break; // flanks the door it serves
      case 'F': out.decor.push({kind:'fountain',x:x+0.5,y:y+0.5,solid:true}); floor[i]=2; break;
      case 'U': out.portals.push({x,y,kind:'up'}); break;
      case 'S': out.portals.push({x,y,kind:'down'}); break;
      case 'E': out.portals.push({x,y,kind:'exitTeleport'}); break;
      case 'c': out.chests.push({x:x+0.5,y:y+0.5,tier:opts.chestTier||1,id:'c'+x+'_'+y}); break;
      case '1': out.chests.push({x:x+0.5,y:y+0.5,tier:2,id:'censer',special:'q_censer'}); break;
      case '2': out.chests.push({x:x+0.5,y:y+0.5,tier:4,id:'crown',special:'q_crown'}); break;
      default:
        if(opts.monsters&&opts.monsters[ch]) out.spawns.push({mid:opts.monsters[ch],x:x+0.5,y:y+0.5});
        break;
    }
    if(ch in SHOP_DOORS){ cells[i]=9; out.shops.push({x,y,shop:SHOP_DOORS[ch]}); }
  }
  return out;
}

// ---------- world builder ----------
const World = {
  maps:{},
  build(){
    this.maps={};
    this.buildOutdoor();
    this.buildDungeons();
    for(const id in this.maps) this.computeLightMap(this.maps[id]);
  },
  computeLightMap(map){ // per-cell glow from fire sources (0..6 shade relief)
    const lm=new Uint8Array(map.w*map.h);
    const SRC={campfire:[5,4.5],brazier:[4,3.8],lamp:[4,3.6]};
    for(const d of map.decor){
      const s=SRC[d.kind]; if(!s) continue;
      const [str,rad]=s;
      for(let y=Math.max(0,d.y-rad|0);y<=Math.min(map.h-1,d.y+rad|0);y++)
        for(let x=Math.max(0,d.x-rad|0);x<=Math.min(map.w-1,d.x+rad|0);x++){
          const dist=Math.hypot(x+0.5-d.x,y+0.5-d.y);
          if(dist>rad) continue;
          const v=lm[y*map.w+x]+Math.round(str*(1-dist/rad));
          lm[y*map.w+x]=v>6?6:v;
        }
    }
    const sm=new Uint8Array(lm.length); // 3x3 smooth — no hard light seams between cells
    for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++){
      let acc=0,n=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy;
        if(xx<0||yy<0||xx>=map.w||yy>=map.h) continue;
        acc+=lm[yy*map.w+xx]; n++;
      }
      sm[y*map.w+x]=Math.round(acc/n);
    }
    map.lightMap=sm;
  },
  buildOutdoor(){
    const w=96,h=96, cells=new Uint8Array(w*h), floor=new Uint8Array(w*h);
    const map={id:'outdoor',name:'Vintavia Coast',w,h,cells,floor,outdoor:true,doors:{},shops:[],decor:[],monsters:[],portals:[],chests:[],npcs:[]};
    const r=RNG.world('outdoor');
    // rim mountains (2 thick) + terrain variety
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x;
      if(x<2||y<2||x>=w-2||y>=h-2) cells[i]=3;
      else if((x<4||y<4||x>=w-4||y>=h-4)&&r.chance(0.5)) cells[i]=3;
      floor[i]= r.chance(0.06)?1:0; // dirt patches
    }
    // pond SE
    for(let y=62;y<72;y++)for(let x=64;x<78;x++){
      const dx=(x-71)/7,dy=(y-67)/5;
      if(dx*dx+dy*dy<1){ floor[y*w+x]=6; }
      else if(dx*dx+dy*dy<1.5&&floor[y*w+x]===0) floor[y*w+x]=7;
    }
    // stamp town template
    const t=parseAscii(TOWN_ROWS,{wallTex:1,floorId:2,dotFloor:2});
    for(let y=0;y<t.h;y++)for(let x=0;x<t.w;x++){
      const wi=(TOWN_Y+y)*w+(TOWN_X+x);
      cells[wi]=t.cells[y*t.w+x]; floor[wi]=t.floor[y*t.w+x];
    }
    for(let y=0;y<t.h;y++)for(let x=0;x<t.w;x++){ // blocks 2 & 4 use the cross-braced facade
      const wi=(TOWN_Y+y)*w+(TOWN_X+x);
      if(cells[wi]===2&&((x>=10&&x<=15)||(x>=27&&x<=34))) cells[wi]=10;
    }
    for(const d of t.decor) map.decor.push({...d,x:d.x+TOWN_X,y:d.y+TOWN_Y});
    for(const s of t.shops) map.shops.push({x:s.x+TOWN_X,y:s.y+TOWN_Y,shop:s.shop});
    for(const k in t.doors){ const [x,y]=k.split(',').map(Number); map.doors[(x+TOWN_X)+','+(y+TOWN_Y)]=t.doors[k]; }
    for(const sdoor of map.shops){ // hang each shop's trade sign
      let bestSign=null,bd=9;
      for(const d of map.decor){ if(d.kind!=='sign') continue;
        const d2=(d.x-sdoor.x-0.5)**2+(d.y-sdoor.y-0.5)**2;
        if(d2<bd){ bd=d2; bestSign=d; } }
      if(bestSign) bestSign.kind='sign_'+sdoor.shop;
    }
    // roads: east gate -> crypt; west gate -> goblin camp; south gate -> shrine
    const gateE={x:TOWN_X+37,y:TOWN_Y+7}, gateW={x:TOWN_X,y:TOWN_Y+7}, gateS={x:TOWN_X+21,y:TOWN_Y+15};
    this.road(map,gateE.x,gateE.y, 82,40); this.road(map,gateW.x,gateW.y, 13,36); this.road(map,gateS.x,gateS.y, 51,70);
    this.road(map,51,70, 40,64);
    // crypt entrance: rock outcrop with door portal
    for(let y=38;y<=42;y++)for(let x=83;x<=88;x++) cells[y*w+x]=3;
    cells[40*w+83]=0; floor[40*w+83]=1;
    map.portals.push({x:84,y:40,kind:'enter',to:'dun1',tx:3.5,ty:2.5}); cells[40*w+84]=0; floor[40*w+84]=3;
    for(let y=39;y<=41;y++){cells[y*w+85]=3;} cells[40*w+85]=3;
    map.decor.push({kind:'cryptgate',x:84.5,y:39.6});
    map.decor.push({kind:'brazier',x:82.5,y:39.5},{kind:'brazier',x:82.5,y:41.5});
    map.decor.push({kind:'sign',x:82.5,y:42.5,label:'The Crypt'});
    // goblin camp W
    map.decor.push({kind:'campfire',x:12.5,y:36.5});
    map.decor.push({kind:'tent',x:10.5,y:34.5,solid:true},{kind:'tent',x:14.5,y:34.5,solid:true});
    // bandit camp NE
    this.road(map,gateE.x,gateE.y,70,17);
    map.decor.push({kind:'campfire',x:70.5,y:16.5});
    map.decor.push({kind:'tent',x:68.5,y:14.5,solid:true},{kind:'tent',x:72.5,y:14.5,solid:true},{kind:'tent',x:70.5,y:12.5,solid:true});
    map.chests.push({x:72.5,y:16.5,tier:2,id:'banditchest'});
    map.decor.push({kind:'sign',x:66.5,y:20.5,label:'Bandit country — turn back!'});
    // shrine S + ranger hut
    map.decor.push({kind:'shrine',x:51.5,y:70.5,solid:true});
    map.chests.push({x:52.5,y:71.5,tier:1,id:'shrinechest'});
    for(let y=63;y<=65;y++)for(let x=39;x<=42;x++) cells[y*w+x]=2;
    cells[64*w+39]=0; floor[64*w+39]=1; map.decor.push({kind:'sign',x:38.5,y:65.5,label:'Ranger hut'});
    // trees + rocks (deterministic scatter, keep clear of town/roads/water)
    for(let i=0;i<1000;i++){
      const x=r.int(4,w-5)+0.5,y=r.int(4,h-5)+0.5, ci=Math.floor(y)*w+Math.floor(x);
      if(cells[ci]||floor[ci]===1||floor[ci]===6||floor[ci]===2) continue;
      if(x>TOWN_X-2&&x<TOWN_X+40&&y>TOWN_Y-2&&y<TOWN_Y+18) continue;
      const denseN = y<28; // north forest is real forest
      if(!denseN&&r.chance(0.3)) continue;
      map.decor.push({kind:r.chance(0.85)?'tree':'rock',x,y,solid:true});
      if(denseN&&r.chance(0.5)){ const x2=x+r.next()*2-1, y2=y+r.next()*2-1;
        const ci2=Math.floor(y2)*w+Math.floor(x2);
        if(!cells[ci2]&&floor[ci2]!==1&&floor[ci2]!==6) map.decor.push({kind:'tree',x:x2,y:y2,solid:true});
      }
    }
    // signposts at gates
    map.decor.push({kind:'sign',x:gateE.x+1.5,y:gateE.y+1.5,label:'East: The Crypt. North-east: bandit camp.'});
    map.decor.push({kind:'sign',x:gateW.x-1.5,y:gateW.y+1.5,label:'West: goblin dens. Travelers beware.'});
    map.decor.push({kind:'sign',x:gateS.x+1.5,y:gateS.y+2.5,label:'South: old shrine, ranger hut.'});
    map.decor.push({kind:'lamp',x:TOWN_X+16.5,y:TOWN_Y+6.5},{kind:'lamp',x:TOWN_X+22.5,y:TOWN_Y+8.5});
    // town folk (talkable decor NPCs)
    map.npcs.push({id:'folk1',x:TOWN_X+18.5,y:TOWN_Y+9.6,kind:'peasant_f',name:'Marta the Baker'});
    map.npcs.push({id:'folk2',x:TOWN_X+8.5,y:TOWN_Y+13.5,kind:'peasant_m',name:'Old Tam'});
    map.npcs.push({id:'folk3',x:TOWN_X+27.5,y:TOWN_Y+13.5,kind:'guard',name:'Guard Willem'});
    map.npcs.push({id:'folk4',x:TOWN_X+1.6,y:TOWN_Y+6.3,kind:'guard',name:'Guard Petra'}); // west gate post, clear of the temple door
    // monsters (seeded): weak goblin singles near town, wolves mid, camps, ridge casters
    const M=map.monsters;
    const near=[[24,28],[22,44],[40,52],[68,36],[52,26],[68,44],[36,22],[60,54]];
    for(const [x,y] of near) M.push(Monsters.make('goblin',x+0.5,y+0.5));
    for(let i=0;i<7;i++){ const x=r.int(14,80),y=r.int(50,86); if(this.openAt(map,x,y)) M.push(Monsters.make('wolf',x+0.5,y+0.5)); }
    // goblin camp: 5 goblins + warrior + shaman, spread so singles can be pulled
    const camp=[[9,38],[13,37],[11,40],[16,35],[8,35]];
    for(const [x,y] of camp){ const m=Monsters.make('goblin',x+0.5,y+0.5); m.group='gobcamp'; M.push(m); }
    const gw=Monsters.make('goblin_war',14.5,39.5); gw.group='gobcamp'; M.push(gw);
    const gs=Monsters.make('goblin_sham',11.5,35.0); gs.group='gobcamp'; M.push(gs);
    // stepping stones on the quest road: singles a fresh party can take
    M.push(Monsters.make('goblin',70.5,33.5),Monsters.make('goblin',70.5,28.5),Monsters.make('wolf',68.5,24.5));
    // bandit camp: pickets close to the fire, captain at its heart (leashed like all camps)
    for(const [mid,x,y] of [['bandit',72.5,18.5],['bandit',68.5,17.5],['bandit',71.5,15.0],
      ['bandit_bow',73.5,14.5],['bandit_bow',67.5,13.5],['bandit_boss',70.5,14.2]]){
      const m=Monsters.make(mid,x,y); m.group='banditcamp'; M.push(m);
    }
    // north forest direwolves
    M.push(Monsters.make('direwolf',30.5,12.5),Monsters.make('direwolf',44.5,10.5),Monsters.make('direwolf',56.5,14.5),Monsters.make('direwolf',38.5,16.5));
    // eastern ridge casters (far from town)
    M.push(Monsters.make('apprentice',86.5,28.5),Monsters.make('apprentice',88.5,52.5),Monsters.make('apprentice',84.5,60.5));
    this.maps.outdoor=map;
  },
  road(map,x0,y0,x1,y1){
    let x=x0,y=y0; const w=map.w;
    const put=(x,y)=>{ for(const [dx,dy] of [[0,0],[1,0],[0,1]]){ const i=(y+dy)*w+(x+dx); if(!map.cells[i]&&map.floor[i]!==6) map.floor[i]=1; } };
    while(x!==x1){ put(x,y); x+=Math.sign(x1-x); }
    while(y!==y1){ put(x,y); y+=Math.sign(y1-y); }
    put(x1,y1);
  },
  openAt(map,x,y){ const i=y*map.w+x; return !map.cells[i]&&map.floor[i]!==6; },
  buildDungeons(){
    const mk=(id,name,rows,opts,links)=>{
      const p=parseAscii(rows,opts);
      const map={id,name,w:p.w,h:p.h,cells:p.cells,floor:p.floor,outdoor:false,doors:p.doors,shops:[],
        decor:p.decor,monsters:p.spawns.map(s=>Monsters.make(s.mid,s.x,s.y)),portals:[],chests:p.chests,npcs:[],dungeonLight:0.28};
      for(const pt of p.portals){
        if(pt.kind==='up') map.portals.push({x:pt.x,y:pt.y,kind:'enter',to:links.up.map,tx:links.up.x,ty:links.up.y,label:'ascend'});
        if(pt.kind==='down') map.portals.push({x:pt.x,y:pt.y,kind:'enter',to:links.down.map,tx:links.down.x,ty:links.down.y,label:'descend'});
        if(pt.kind==='exitTeleport') map.portals.push({x:pt.x,y:pt.y,kind:'enter',to:'outdoor',tx:82.5,ty:40.5,label:'teleport'});
      }
      // braziers to light the way
      for(const c of p.chests) map.decor.push({kind:'brazier',x:c.x>2?c.x-1:c.x+1,y:c.y});
      this.maps[id]=map;
    };
    // landings sit BESIDE the reciprocal stairs — landing on them would bounce the party straight back
    mk('dun1','The Crypt',DUN1_ROWS,{wallTex:5,floorId:4,chestTier:1,monsters:{a:'bat',p:'spider',k:'skeleton',z:'zombie'}},
      {up:{map:'outdoor',x:82.5,y:40.5},down:{map:'dun2',x:2.5,y:2.6}});
    mk('dun2','The Catacombs',DUN2_ROWS,{wallTex:4,floorId:3,chestTier:2,monsters:{k:'skeleton',G:'skel_guard',z:'zombie',g:'ghost',n:'necromancer'}},
      {up:{map:'dun1',x:26.5,y:14.3},down:{map:'dun3',x:2.5,y:2.5}});
    mk('dun3','The Vault of Vintavia',DUN3_ROWS,{wallTex:6,floorId:5,chestTier:3,monsters:{G:'skel_guard',L:'lich'}},
      {up:{map:'dun2',x:27.5,y:14.5},down:{map:'dun2',x:27.5,y:14.5}});
  },
  spawnPoint(){ return {map:'outdoor',x:TOWN_X+4.5,y:TOWN_Y+7.5,ang:-Math.PI/2}; }, // main street, facing weapon smith
  templePoint(){ return {map:'outdoor',x:TOWN_X+4.5,y:TOWN_Y+8.6,ang:0}; }, // wake facing down the plaza, not a wall
};

// ---------- quests ----------
const QUESTS = {
  main1:{name:'The Stolen Ledger', giver:'mayor',   kind:'fetchkill', item:'q_ledger', target:'bandit_boss',
    desc:'Bandits raided the counting house and took the tax ledger. Their camp lies north-east, past the east gate. Pick the sentries off one by one — rush the campfire and they will bury you. Slay their captain and bring the ledger home.',
    done:'The ledger! Vintavia is in your debt. Take this purse — and my thanks.', gold:300, xp:800},
  main2:{name:'Silver for the Temple', giver:'priest', kind:'fetch', item:'q_censer',
    desc:'Grave-robbers dragged our silver censer into the Crypt east of town. Without it I cannot bless the harvest. Bring it back, and the Light will remember you.',
    done:'The censer returns! Bless you, friends. Take this offering.', gold:400, xp:1200, requires:null},
  main3:{name:'The Vault Sigil', giver:'mayor', kind:'fetchkill', item:'q_sigil', target:'necromancer', keepItem:true,
    desc:'You have proven yourselves. Listen: below the Crypt a necromancer digs toward the old Vault where the Crown of Vintavia sleeps. He carries the Vault Sigil. Take it from him.',
    done:'The Sigil! Keep it close — only its bearer can break the Vault’s seal. One task remains, heroes.', gold:800, xp:2500, requires:['main1','main2']},
  main4:{name:'The Crown of Vintavia', giver:'mayor', kind:'fetch', item:'q_crown',
    desc:'The Sigil opens the sealed door on the lowest level. Beyond it waits the Lich that stole our Crown a century ago. Destroy it. Bring the Crown home, and your names outlive us all.',
    done:'The Crown... after a hundred years. Vintavia is whole again. Hail, Heroes of Vintavia!', gold:2000, xp:8000, requires:['main3'], final:true},
  side_wolves:{name:'Wolf Cull', giver:'trainer', kind:'collect', item:'q_fang', count:3,
    desc:'Direwolves out of the north forest have taken two horses this month. Bring me three fangs and I will owe you coin and a favor.',
    done:'Three fangs — good hunting. Here is your coin.', gold:250, xp:700},
  side_goblins:{name:'Quiet Roads', giver:'tavernkeep', kind:'killgroup', group:'gobcamp', count:5,
    desc:'Goblins from the western camp rob every cart that comes down the road. Five heads from that camp — strays elsewhere don’t count, they answer to no one. Do it and the Gilded Griffin never charges your party for a bed again.',
    done:'Five, you say? Ha! The roads breathe easier. Your beds are free, friends — forever.', gold:150, xp:500, perk:'freerest'},
};
const Quests = {
  status(party,qid){ const q=party.quests[qid]; return q?q.state:'none'; },
  offerable(party,qid){
    const q=QUESTS[qid];
    if(Quests.status(party,qid)!=='none') return false;
    if(q.requires) for(const r of q.requires) if(Quests.status(party,r)!=='turned') return false;
    return true;
  },
  active(party){ return Object.keys(party.quests).filter(k=>party.quests[k].state==='active'); },
  progressText(party,qid){
    const q=QUESTS[qid], st=party.quests[qid];
    if(!st) return '';
    if(q.kind==='collect') return (st.n||0)+' / '+q.count+' collected';
    if(q.kind==='killgroup') return (st.n||0)+' / '+q.count+' slain';
    return st.state==='done'?'Return to '+NPCS[q.giver].name:'In progress';
  },
};

// ---------- NPCs & dialog ----------
const NPCS = {
  mayor:   {name:'Mayor Aldous',   portrait:'mayor',   where:'hall',
    hello:'Welcome to Vintavia, travelers. These are hard times — hard times that need bold hands.',
    rumor:'They say the old Vault under the Crypt still holds the Crown of Vintavia.'},
  priest:  {name:'Father Bren',    portrait:'priest',  where:'temple',
    hello:'The Light keep you. The temple offers healing to those who can pay — and purpose to those who cannot.',
    rumor:'The dead in the Crypt do not rest. Something below stirs them.'},
  trainer: {name:'Master Hult',    portrait:'trainer', where:'train',
    hello:'Muscles and wit, friend — one is useless without the other. Come to train when experience weighs on you.',
    rumor:'A traveling knight swore she saw skeletons drilling in formation below the Crypt. Drilling!'},
  tavernkeep:{name:'Ilsa of the Griffin', portrait:'tavernkeep', where:'tavern',
    hello:'Welcome to the Gilded Griffin! A bed, a meal, and every rumor on the coast.',
    rumor:'Old Tam swears the pond south-east glows on Freyday nights. Old Tam also drinks.'},
  smith:   {name:'Smith Garron',   portrait:'smith',   where:'weapon',
    hello:'Steel solves most of what ails this coast. Buying or selling?'},
  armorer: {name:'Armorer Vesk',   portrait:'armorer', where:'armor',
    hello:'A dead customer buys nothing. Armor up.'},
  mage:    {name:'Magistra Ilwen', portrait:'mage',    where:'guild',
    hello:'The Guild of the Nine Schools welcomes coin in all its forms. Spells, scrolls, instruction.'},
  banker:  {name:'Banker Ottis',   portrait:'banker',  where:'bank',
    hello:'Gold in the vault outlives gold in a purse — ask any bandit’s victim.'},
  folk1:{name:'Marta the Baker', portrait:'peasant_f', rumors:[
    'Fresh bread at dawn, if the goblins let the grain carts through.',
    'The mayor pays well for brave work, dear. Ask at the hall.']},
  folk2:{name:'Old Tam', portrait:'peasant_m', rumors:[
    'I seen the pond glow, I tell ye. Freyday nights!',
    'When I was your age I walked into that Crypt on a dare. Ran out faster.']},
  folk3:{name:'Guard Willem', portrait:'guard', rumors:[
    'Keep clear of the north forest unless your blades are sharp. Direwolves.',
    'Casters on the east ridge. Rogue apprentices from some burned tower.']},
  folk4:{name:'Guard Petra', portrait:'guard', rumors:[
    'West road’s crawling with goblins. Ilsa at the Griffin wants it cleared.',
    'Rest in the wild and you gamble your throat. Take a room in town.']},
};

// shop inventories (item ids; guild sells spells)
const SHOP_STOCK = {
  weapon:['dagger','shortsword','handaxe','mace','quarterstaff','shortbow','longsword','battleaxe','longbow','warhammer','bastard','runestaff'],
  armor: ['padded','leatherarm','buckler','cap','boots','studded','helm','kiteshield','chainmail','greaves','platearm'],
  guild: ['potion_mana','potion_heal','potion_cure'], // + spells, handled by UI via Spellcraft
  tavern:['bread','potion_heal'],
};
