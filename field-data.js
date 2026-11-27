import {ENEMIES,GATHERING,LOCATIONS,SHOPS} from './content.js';

export const TILE=16;
export const DIRECTIONS=[[0,-1],[1,0],[0,1],[-1,0]];
export const sameCell=(a,b)=>a.x===b.x&&a.y===b.y;
export const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const key=(x,y,w)=>y*w+x;
const palettes={
  town:['#53694a','#657e51','#425846','#87935d','#ac9470','#8d7459','#53625c','#4e8784','#30626b','#86aaa0','#293e3a','#658266','#75945d','#9db476'],
  wood:['#435e43','#516f45','#364e39','#708050','#8f7c56','#746749','#536458','#48837f','#2a5b60','#7da39a','#243d34','#3e664c','#588858','#84a568'],
  frost:['#a1b6bf','#b6c9c9','#8ba2af','#d7e0d7','#788590','#677381','#a6b5b5','#638d9e','#405d75','#c1d7d8','#384f61','#527581','#658786','#a5bac6'],
  fen:['#465d51','#556a53','#334f49','#758057','#7c7654','#685f48','#5d6960','#4e8276','#355c59','#8b9c79','#273f3b','#44675a','#5e8060','#86a278'],
  march:['#706255','#806d59','#5e514d','#a78a63','#ad906a','#866e58','#797073','#b77764','#784b54','#ebb283','#493d48','#695356','#927269','#bc9275'],
  home:['#3b302d','#5e493a','#2d252a','#725844','#8c6b4d','#73543f','#89735f','#000000','#000000','#000000','#2d2628','#423139','#65484a','#9f7662']
};
const paints={
  forge:['#72544d','#aa7056','#df9d68'],mill:['#67503e','#9a7251','#cfaa72'],
  workshop:['#546656','#74836a','#b0ac75'],kitchen:['#85564d','#b87461','#e3a078'],
  apothecary:['#51587a','#747b9e','#a0a9bb'],general:['#5c6e65','#79968a','#a8b8a0'],
  furnishings:['#70574d','#a18262','#c59e76'],hatchery:['#67576f','#9a7d9a','#c3a6aa'],
  guild:['#5d6152','#8a8764','#b3a478'],home:['#57684e','#84946b','#b1b384']
};
function make(id,w,h,spawn){
  const terrain=Array(w*h).fill(id==='home'?'void':'grass');
  const blocked=new Set(), props=[], spots=[], arenas={};
  function paint(x,y,wide,high,kind){
    for(let j=y;j<y+high;j++)for(let i=x;i<x+wide;i++)if(i>=0&&j>=0&&i<w&&j<h)terrain[key(i,j,w)]=kind;
  }
  function solid(x,y,wide=1,high=1){
    for(let j=y;j<y+high;j++)for(let i=x;i<x+wide;i++)blocked.add(key(i,j,w));
  }
  function spot(id,kind,x,y,name,more={}){
    const data={id,kind,x,y,name,...more};spots.push(data);return data;
  }
  function tree(x,y,size=1){
    if(terrain[key(x,y,w)]!=='grass'||blocked.has(key(x,y,w)))return;
    solid(x,y);props.push({kind:'tree',x,y,size});
  }
  const scene={id,w,h,spawn,colors:palettes[id],terrain,blocked,props,spots,arenas,paint,solid,spot,tree};
  return scene;
}
function scatter(map,n,startSeed,keepClear=()=>false){
  let state=startSeed;
  const draw=max=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return Math.floor(state/4294967296*max);};
  for(let i=0;i<n;i++){
    const x=1+draw(map.w-2),y=1+draw(map.h-2);
    if(keepClear(x,y)||map.spots.some(o=>distance(o,{x,y})<3))continue;
    map.tree(x,y,draw(3));
  }
  for(const x of [1,map.w-2])for(let y=1;y<map.h-1;y+=2)
    if(!map.spots.some(o=>distance(o,{x,y})<3))map.tree(x,y,1);
}
function road(map,x,y,w,h,kind='path'){map.paint(x,y,w,h,kind);}
function water(map,x,y,w,h){
  map.paint(x,y,w,h,'water');
}
function building(map,id,x,y,w=5,h=4){
  map.solid(x,y,w,h);
  map.paint(x-1,y-1,w+2,h+2,'grass');
  map.paint(x,y+h,w,2,'stone');
  const xDoor=x+Math.floor(w/2);
  map.props.push({kind:'building',x,y,w,h,colors:paints[id],door:xDoor,id});
  if(SHOPS[id])map.spot(id,'shop',xDoor,y+h,SHOPS[id].name,{npc:SHOPS[id].keeper});
  else if(id==='home')map.spot(id,'home',xDoor,y+h,'Your house');
  else map.spot(id,'guild',xDoor,y+h,'Rangers’ Guild',{npc:'Bram'});
}
function town(){
  const map=make('town',36,29,{x:17,y:14});
  water(map,31,0,5,29);
  road(map,16,0,3,29);road(map,1,18,31,3);road(map,4,8,31,3);
  road(map,5,13,25,2);road(map,4,25,26,2);
  road(map,10,10,2,16);road(map,24,9,2,17);
  road(map,14,11,8,7,'stone');road(map,30,8,6,3,'bridge');
  building(map,'forge',4,3);
  building(map,'mill',10,3);
  building(map,'guild',19,2,6,5);
  building(map,'workshop',26,3,4,4);
  building(map,'kitchen',4,10);
  building(map,'apothecary',5,20);
  building(map,'general',20,10,4,4);
  building(map,'furnishings',26,14,4,4);
  building(map,'hatchery',13,20,4,4);
  building(map,'home',25,21,5,4);
  map.props.push({kind:'fountain',x:15,y:12});
  map.solid(15,12);
  for(const [id,x,y] of [['wood',17,2],['frost',34,9],['fen',2,19],['march',17,26]])map.spot(id,'gate',x,y,LOCATIONS[id].name);
  map.spot('market','market',22,17,'Market stall',{npc:'Nell'});
  map.spot('mail','mail',19,15,'Postbox');
  map.spot('community','community',23,21,'Neighbourhood board');
  map.spot('discovery','discovery',20,22,'Scouts’ cairn');
  map.spot('guildplot','gather',10,16,GATHERING.guildplot.name,{skill:'farming'});
  map.paint(8,15,3,3,'farm');
  map.spot('bank','bank',14,16,'Town bank',{npc:'Tavin'});
  for(const [x,y] of [[13,12],[20,11],[20,18],[13,19],[30,10],[17,8],[17,24]])map.props.push({kind:'lantern',x,y});
  scatter(map,63,98,(x,y)=>map.props.some(p=>p.kind==='building'&&x>=p.x-1&&x<=p.x+p.w&&y>=p.y-2&&y<=p.y+p.h+2));
  return map;
}
const gatheringSpots={
  wood:[[12,13],[28,12],[24,23],[12,24]],
  frost:[[12,12],[29,12],[24,23],[12,25],[25,15]],
  fen:[[13,13],[28,13],[24,23],[13,25],[23,14]],
  march:[[12,12],[28,11],[24,22],[13,24],[25,15],[15,4],[24,4],[20,21],[19,25],[30,26]]
};
const regionalWater={
  wood:[[22,20,2,9],[23,23,2,2],[21,24,1,4]],
  frost:[[23,19,2,10],[25,22,2,4],[25,20,1,2]],
  fen:[[19,21,6,6],[21,15,2,6],[24,22,3,6],[26,27,4,2]],
  march:[[22,23,2,5],[23,22,4,4],[25,21,3,2],[25,26,2,1]]
};
function wild(id,seed){
  const map=make(id,38,32,{x:19,y:27});
  for(const [x,y,w,h] of regionalWater[id])water(map,x,y,w,h);
  road(map,18,3,3,28);road(map,4,15,30,3);
  for(const [x,y,w,h] of [[7,6,4,19],[28,6,3,19],[7,6,23,2],[8,26,12,2],[25,27,6,2]])road(map,x,y,w,h);
  if(id==='fen')road(map,18,20,5,8,'bridge');
  const clearings=[[8,10],[29,8],[8,22],[30,22]];
  Object.values(ENEMIES).filter(e=>e.region===id).forEach((enemy,index)=>{
    const [x,y]=clearings[index], d=3;
    map.paint(x-d,y-d,2*d+1,2*d+1,enemy.boss?'ruin':'field');
    map.arenas[enemy.id]={left:x-d,right:x+d,top:y-d,bottom:y+d};
    map.spot(enemy.id,'enemy',x,y,enemy.name,{boss:enemy.boss});
    if(enemy.boss){
      for(const corner of [[x-4,y-3],[x+4,y-3],[x-4,y+3],[x+4,y+3]])map.props.push({kind:'pillar',x:corner[0],y:corner[1]});
    }
  });
  Object.values(GATHERING).filter(a=>a.region===id).forEach((act,i)=>{
    const [x,y]=gatheringSpots[id][i];
    if(act.skill==='farming')map.paint(x-1,y-1,3,3,'farm');
    if(act.skill==='fishing')map.paint(x-2,y,3,1,'bridge');
    map.spot(act.id,'gather',x,y,act.name,{skill:act.skill});
  });
  map.spot('town','gate',19,29,LOCATIONS.town.name);
  map.spot('discovery','discovery',17,13,'Trail cairn');
  scatter(map,135,seed,(x,y)=>{
    if(map.props.some(p=>p.x===x&&p.y===y))return true;
    return Object.values(map.arenas).some(a=>x>=a.left-1&&x<=a.right+1&&y>=a.top-1&&y<=a.bottom+1);
  });
  return map;
}
function home(){
  const map=make('home',13,11,{x:6,y:8});
  map.paint(1,1,11,9,'floor');
  map.paint(1,1,11,2,'wall');
  map.paint(1,2,1,8,'wall');
  map.paint(11,2,1,8,'wall');
  map.paint(2,9,9,1,'wall');
  map.paint(5,9,3,1,'floor');
  map.props.push({kind:'hearth',x:6,y:2},{kind:'lantern',x:3,y:2},{kind:'lantern',x:9,y:2});
  map.spot('leave-home','leave',6,9,'Leave house');
  map.spot('decorate','decorate',2,7,'Decorate');
  map.spot('neighbours','neighbors',10,7,'Neighbours');
  return map;
}
export const SCENES={town:town(),wood:wild('wood',614),frost:wild('frost',133),fen:wild('fen',39),march:wild('march',4),home:home()};
export function walkable(scene,x,y,bounds=null){
  if(x<1||y<1||x>=scene.w-1||y>=scene.h-1)return false;
  if(bounds&&(x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom))return false;
  const i=key(x,y,scene.w);
  return !scene.blocked.has(i)&&!['water','wall','void'].includes(scene.terrain[i]);
}
export function route(scene,start,targets,bounds=null){
  const goals=new Set(targets.filter(p=>walkable(scene,p.x,p.y,bounds)).map(p=>key(p.x,p.y,scene.w)));
  const queue=[start], startKey=key(start.x,start.y,scene.w), previous=new Map([[startKey,null]]);
  for(let i=0;i<queue.length;i++){
    const at=queue[i], cell=key(at.x,at.y,scene.w);
    if(goals.has(cell)){
      const path=[];
      let end=at;
      while(previous.get(key(end.x,end.y,scene.w))){
        path.push(end);end=previous.get(key(end.x,end.y,scene.w));
      }
      return path.reverse();
    }
    for(const [dx,dy] of DIRECTIONS){
      const x=at.x+dx,y=at.y+dy,k=key(x,y,scene.w);
      if(previous.has(k)||!walkable(scene,x,y,bounds))continue;
      previous.set(k,at);queue.push({x,y});
    }
  }
  return null;
}
export function interactionCells(spot){
  return [{x:spot.x,y:spot.y},...DIRECTIONS.map(([dx,dy])=>({x:spot.x+dx,y:spot.y+dy}))];
}
export function exitCell(scene,from){
  const gate=scene.spots.find(s=>s.kind==='gate'&&s.id===from);
  if(!gate)return scene.spawn;
  const adjacent=interactionCells(gate).slice(1).find(p=>walkable(scene,p.x,p.y)&&distance(p,scene.spawn)<distance(gate,scene.spawn));
  return adjacent||scene.spawn;
}
