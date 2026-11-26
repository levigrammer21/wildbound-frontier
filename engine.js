import { ACTIVITIES, ENEMIES, GEAR, ITEMS, LOCATIONS, PRODUCTION_TOOLS, QUESTS, SKILLS, SUPPLIES, TOOLS, eventAt } from './content.js';

export const BAG_MAX = 48;
export const BANK_MAX = 96;
export const OFFLINE_SECONDS = 12 * 3600;
export const MAX_ACTIONS = 4800;
export const clone = value => structuredClone(value);
export const uid = () => crypto.randomUUID().replaceAll('-','');
export const sum = inventory => Object.values(inventory).reduce((a,b)=>a+b,0);
export const totalXP = p => sum(p.xp);
export const thresholds = Array.from({length:100},(_,n)=>Math.floor((n-1)**2*6+Math.max(0,n-1)**3*1.15));
export function level(xp=0) {
  let low=1, high=99;
  while(low<high){
    const mid=Math.ceil((low+high)/2);
    if(xp>=thresholds[mid]) low=mid;
    else high=mid-1;
  }
  return low;
}
export function random(seed){
  let state=(seed>>>0)||331323;
  return ()=> {
    state ^= state<<13; state ^= state>>>17; state ^= state<<5;
    return (state>>>0)/4294967296;
  };
}
export function hash(s){
  let n=2166136261;
  for(const c of s)n=Math.imul(n^c.codePointAt(0),16777619);
  return n>>>0;
}
export function count(p,id){return p.bag[id]||0;}
export function has(p,items={}){return Object.entries(items).every(([id,n])=>count(p,id)>=n);}
export function change(inv,id,n){
  const next=(inv[id]||0)+n;
  if(!Number.isSafeInteger(next)||next<0||next>100000000)throw Error('The item quantity is unavailable or exceeds storage limits.');
  if(next)inv[id]=next;
  else delete inv[id];
}
export function materials(p,items={},sign=1){for(const [id,n] of Object.entries(items))change(p.bag,id,n*sign);}
export function addXp(p,skill,xp){p.xp[skill]=Math.min(1000000000,p.xp[skill]+xp);}
function trackSkill(p,skill,actions,rare=0){
  p.stats.skills??={};
  const record=p.stats.skills[skill]??={actions:0,rare:0};
  record.actions+=actions;
  record.rare+=rare;
}
export function addGold(p,delta){
  if(!Number.isSafeInteger(delta)||p.gold+delta<0||p.gold+delta>100000000)throw Error('You need more gold or have reached the gold limit.');
  p.gold+=delta;
  p.stats[delta>=0?'goldEarned':'goldSpent']+=Math.abs(delta);
}
export function makeGear(base,id,rng=null){
  const item=GEAR[base];
  if(!item)throw Error('Unknown base item.');
  const roll=rng?rng():0;
  const grade=roll>.975?3:roll>.85?2:roll>.55?1:0;
  let mods={};
  if(grade){
    const table=item.slot==='weapon'?['attack','crit','leech']:item.slot==='armor'?['defence','hp','healing']:
      item.slot==='charm'?['crit','hp','luck']:['yield','haste','luck'];
    const order=[...table];
    for(let i=0;i<grade;i++){
      const type=order.splice(Math.floor(rng()*order.length),1)[0];
      const strength=1+Math.floor(rng()*grade);
      const multiplier={attack:2,crit:3,leech:2,defence:2,hp:5,healing:3,luck:3,yield:5,haste:5}[type];
      mods[type]=strength*multiplier;
    }
  }
  return {id,base,grade,mods};
}
export function starter(name,appearance={skin:1,hair:0,coat:0}){
  const bases=['sword','tunic',...Object.values(TOOLS).map(tool=>'plain'+tool)];
  const gear=Object.fromEntries(bases.map((base,index)=>['s'+index,makeGear(base,'s'+index)]));
  return { name, appearance, xp:Object.fromEntries(Object.keys(SKILLS).map(x=>[x,0])),
    bag:{...SUPPLIES}, bank:{}, gear, vault:{}, eggs:{}, gold:85, karma:0,
    equipped:Object.fromEntries(Object.values(gear).map(g=>[GEAR[g.base].slot,g.id])),
    pet:null, house:{}, quests:{}, kills:{}, activity:null, ticket:null, discovery:null,
    eventDone:-1, rev:1, region:'town', report:null, last:'',
    stats:{gathered:0,made:0,kills:0,bosses:0,eggs:0,hatches:0,released:0,rare:0,time:0,
      goldEarned:0,goldSpent:0,revenue:0,fees:0,visits:0,trades:0,quests:0,contracts:0,discoveries:0,skills:{}} };
}
export function gearBonuses(p){
  const total={};
  for(const id of Object.values(p.equipped)){
    const item=p.gear[id]; if(!item)continue;
    for(const [key,value] of Object.entries(item.mods))total[key]=(total[key]||0)+value;
  }
  return total;
}
export function passive(pet,key,skill){
  return pet?.buffs.reduce((n,b)=>n+(b.kind===key&&(!b.skill||b.skill===skill)?b.value:0),0)||0;
}
export function combatStats(p,pet){
  const weapon=p.gear[p.equipped.weapon];
  const bone=p.gear[p.equipped.armor];
  const charm=p.gear[p.equipped.charm];
  const w=GEAR[weapon?.base||'sword'].stats;
  const a=GEAR[bone?.base]?.stats||{};
  const c=GEAR[charm?.base]?.stats||{};
  const aff=gearBonuses(p);
  const rank=level(p.xp.combat);
  const dmg=w.attack + (aff.attack||0)+Math.floor(rank*.67);
  return {
    max:65+rank*3+(a.hp||0)+(c.hp||0)+(aff.hp||0),
    attack:Math.round(dmg*(1+passive(pet,'damage','combat')/100)),
    defence:(a.defence||0)+(c.defence||0)+(aff.defence||0)+Math.floor(rank*.25)+passive(pet,'defence','combat'),
    crit:Math.min(60,5+(w.crit||0)+(c.crit||0)+(aff.crit||0)),
    healing:(c.healing||0)+(aff.healing||0)+passive(pet,'healing','combat'),
    leech:aff.leech||0,
    luck:Math.min(35,(aff.luck||0)+passive(pet,'luck','combat')),
    xp:passive(pet,'xp','combat'), egg:passive(pet,'egg','combat'), gold:passive(pet,'gold','combat'),
    speed:w.speed,reach:w.reach,type:w.type,special:w.special
  };
}
export function regionUnlocked(p,id){
  const lv=LOCATIONS[id].unlock;
  return !lv||Object.values(p.xp).some(x=>level(x)>=lv);
}
export function requirement(p,act){
  if(act.region&&!regionUnlocked(p,act.region))return 'Reach level '+LOCATIONS[act.region].unlock+' in any skill.';
  if(level(p.xp[act.skill])<act.level)return 'Requires '+SKILLS[act.skill][0]+' '+act.level+'.';
  if(act.tool){
    const current=p.gear[p.equipped[TOOLS[act.skill]||PRODUCTION_TOOLS[act.skill]]];
    if((GEAR[current?.base]?.stats.tool||0)<act.tool)return 'Requires a tier '+act.tool+' tool.';
  }
  return '';
}
export function activityTerms(p,act,pet){
  const tool=p.gear[p.equipped[TOOLS[act.skill]||PRODUCTION_TOOLS[act.skill]]];
  const toolPower=GEAR[tool?.base]?.stats.tool||1;
  const mods=tool?.mods||{};
  const routine=act.kind==='combat'?combatStats(p,pet):null;
  return { combat:routine, tool:toolPower,
    speed:Math.min(38,(toolPower-1)*6+(mods.haste||0)+passive(pet,'speed',act.skill)),
    yield:Math.min(45,(toolPower-1)*5+(mods.yield||0)+passive(pet,'yield',act.skill)),
    xp:passive(pet,'xp',act.skill), egg:passive(pet,'egg',act.skill),
    luck:Math.min(35,(mods.luck||0)+passive(pet,'luck',act.skill)),
    conserve:Math.min(28,(GEAR[tool?.base]?.stats.conserve||0)+passive(pet,'conserve',act.skill)) };
}
export function interval(act,terms){return Math.max(4,Math.ceil(act.seconds*(100-terms.speed)/100));}
export function newActivity(act,p,pet,now,quote={fee:0,owner:'',shop:''},nonce=uid()){
  const blocked=requirement(p,act);
  if(blocked)throw Error(blocked);
  if(!has(p,act.requires))throw Error('Gather the required materials first.');
  if(p.gold<quote.fee)throw Error('You need '+quote.fee+' gold for the first action.');
  const terms=activityTerms(p,act,pet);
  return {id:nonce,kind:act.kind,key:act.id,seed:hash(nonce),cursor:now,step:0,
    seconds:interval(act,terms), terms, quote, hp:terms.combat?.max||0};
}
export function addEgg(p,id,n=1){
  change(p.eggs,id,n);
  p.stats.eggs+=n;
}
function storeFind(p,item,report){
  if(Object.keys(p.gear).length<BAG_MAX)p.gear[item.id]=item;
  else if(Object.keys(p.vault).length<BANK_MAX)p.vault[item.id]=item;
  else{
    change(p.bag,'bronze',2);
    change(report.items,'bronze',2);
    report.salvaged=(report.salvaged||0)+1;
    return;
  }
  if(report.gear.length<12)report.gear.push(item);
  report.gearCount++;
}
export function damage(base,defence){
  return Math.max(1,Math.round(base*100/(100+8*Math.max(0,defence))));
}
export function consumables(p){
  return Object.values(ITEMS).filter(x=>(x.heal||x.boost)&&count(p,x.id)>0);
}
export function idleFight(p,enemy,stats,hp,rng){
  let foe=enemy.hp;
  let timer=0;
  let ownAt=stats.speed;
  let foeAt=enemy.speed+0.7;
  let meals=0;
  const healing=consumables(p).filter(i=>i.heal).sort((a,b)=>a.heal-b.heal);
  while(foe>0&&hp>0&&timer<110){
    if(hp<Math.min(stats.max*.53,enemy.attack*2.5)){
      const meal=healing.find(i=>count(p,i.id)>0);
      if(meal){
        change(p.bag,meal.id,-1);
        hp=Math.min(stats.max,hp+Math.round(meal.heal*(1+stats.healing/100))); meals++;
      }
    }
    if(ownAt<=foeAt){
      timer=ownAt; ownAt+=stats.speed;
      const hit=damage(stats.attack*(rng()<stats.crit/100?1.6:1),enemy.defence);
      foe-=hit;
      hp=Math.min(stats.max,hp+Math.floor(hit*stats.leech/100));
    }else{
      timer=foeAt; foeAt+=enemy.speed;
      hp-=damage(enemy.attack*(rng()<.22?1.42:1),stats.defence);
    }
  }
  return {win:foe<=0&&hp>0,hp:Math.max(0,hp),meals,seconds:timer};
}
export function winFight(p,enemy,terms,rng,report,id){
  const gold=Math.max(1,Math.round(enemy.gold*(1+terms.gold/100)));
  addGold(p,gold); report.gold+=gold;
  const first=!p.kills[enemy.id];
  p.kills[enemy.id]=(p.kills[enemy.id]||0)+1;
  p.stats.kills++;
  if(enemy.boss)p.stats.bosses++;
  for(const [key,value] of Object.entries(enemy.drops)){
    if(ITEMS[key].decor&&!first&&rng()>.14)continue;
    change(p.bag,key,value); change(report.items,key,value);
  }
  if(first&&enemy.boss||rng()<(enemy.boss?.52:.095)*(1+terms.luck/100)){
    const item=makeGear(enemy.gear,id,rng);
    storeFind(p,item,report);
  }
}
export function emptyReport(act,now){
  return {name:act.name,kind:act.kind,at:now,seconds:0,actions:0,xp:0,levels:0,items:{},
    gear:[],gearCount:0,eggs:{},gold:0,fees:0,meals:0,rare:0,stop:''};
}
function grantEgg(p,report,kind,source=''){
  addEgg(p,kind);
  if(source){
    p.eggSources??={};
    const tags=p.eggSources[kind]??[];
    if(tags.length<64)p.eggSources[kind]=[...tags,source];
  }
  report.eggs[kind]=(report.eggs[kind]||0)+1;
}
function sourceChance(act,terms,active){return (act.boss?.24:active?.061:act.kind==='make'?.012:.008)*(1+terms.egg/100);}
export function reconcile(p,now){
  if(!p.activity)return null;
  const session=p.activity;
  const act=ACTIVITIES[session.kind]?.[session.key];
  if(!act){p.activity=null;return null;}
  const elapsed=Math.min(OFFLINE_SECONDS,Math.max(0,(now-session.cursor)/1000));
  const possible=Math.min(MAX_ACTIONS,Math.floor(elapsed/session.seconds));
  const forward=Math.max(0,now-session.cursor);
  if(!possible)return null;
  const result=emptyReport(act,now);
  const before=level(p.xp[act.skill]);
  const t=session.terms;
  const consumedFood={};
  let ticks=0;
  for(let n=0;n<possible;n++){
    const step=session.step+n;
    const rng=random(hash(session.seed+'|'+step));
    const actionTime=session.cursor+(n+1)*session.seconds*1000;
    const localEvent=eventAt(actionTime);
    if(act.kind==='make'){
      if(!has(p,act.requires)){result.stop='Materials ran out.';break;}
      if(p.gold<session.quote.fee){result.stop='Gold ran out.';break;}
      if(rng()*100>=t.conserve)materials(p,act.requires,-1);
      addGold(p,-session.quote.fee);
      p.stats.fees+=session.quote.fee;
      result.fees+=session.quote.fee;
      p.stats.made++;
      if(act.gear)storeFind(p,makeGear(act.gear,session.id+'-'+step,rng),result);
    }else if(act.kind==='combat'){
      const beforeFood=Object.fromEntries(consumables(p).filter(x=>x.heal).map(x=>[x.id,count(p,x.id)]));
      const battle=idleFight(p,act,t.combat,session.hp,rng);
      for(const [id,value] of Object.entries(beforeFood)) {
        const used=value-count(p,id);
        if(used)consumedFood[id]=(consumedFood[id]||0)+used;
      }
      result.meals+=battle.meals;
      session.hp=battle.hp;
      if(!battle.win){ticks++;result.stop='Retreated after running out of health or time.';break;}
      winFight(p,act,t.combat,rng,result,session.id+'-'+step);
      session.hp=Math.min(t.combat.max,session.hp+Math.floor(t.combat.max*.16));
    }
    for(const [id,quantity] of Object.entries(act.gives||{})){
      const n=quantity+(act.kind==='gather'&&rng()*100<t.yield?1:0);
      change(p.bag,id,n); change(result.items,id,n);
      if(act.kind==='gather')p.stats.gathered+=n;
    }
    if(act.rare&&rng()<act.rare[1]*(1+t.luck/100)){
      change(p.bag,act.rare[0],1); change(result.items,act.rare[0],1); result.rare++; p.stats.rare++;
    }
    if(rng()<sourceChance(act,t,false))grantEgg(p,result,act.egg,act.name);
    if(act.kind==='gather'&&!p.discovery&&rng()<.045){
      p.discovery={kind:act.egg,act:act.id,nonce:session.id+'-'+step};
    }
    const xp=Math.round(act.xp*(100+t.xp+(localEvent.bonus===act.skill?12:0))/100);
    addXp(p,act.skill,xp); result.xp+=xp;
    result.actions++; ticks++;
  }
  trackSkill(p,act.skill,result.actions,result.rare+sum(result.eggs));
  result.consumedFood=consumedFood;
  result.levels=level(p.xp[act.skill])-before;
  result.seconds=ticks*session.seconds;
  p.stats.time+=result.seconds;
  session.step+=ticks;
  session.cursor=forward>OFFLINE_SECONDS*1000||possible===MAX_ACTIONS?now:session.cursor+result.seconds*1000;
  if(act.kind==='make'&&!result.stop){
    if(!has(p,act.requires))result.stop='Materials ran out.';
    else if(p.gold<session.quote.fee)result.stop='Gold ran out.';
  }
  if(result.stop)p.activity=null;
  p.report=result;
  return result;
}
export function activeRewards(p,enemy,ticket,outcome,now){
  const stats=ticket.stats;
  const report=emptyReport(enemy,now);
  for(const [id,n] of Object.entries(outcome.used)){
    if(!ITEMS[id]||!ITEMS[id].heal&&!ITEMS[id].boost)throw Error('Unknown combat item.');
    change(p.bag,id,-n);
  }
  const rng=random(ticket.seed);
  report.seconds=Math.min(180,Math.round(outcome.time));
  p.stats.time+=report.seconds;
  if(!outcome.win)report.stop='You retreated.';
  else{
    const before=level(p.xp.combat);
    report.actions=1;
    winFight(p,enemy,stats,rng,report,ticket.id+'-0');
    report.xp=Math.round(enemy.xp*(105+stats.xp)/100);
    addXp(p,'combat',report.xp);
    report.levels=level(p.xp.combat)-before;
    if(p.kills[enemy.id]===1&&enemy.boss||rng()<sourceChance(enemy,stats,true))
      grantEgg(p,report,enemy.egg,enemy.name);
    trackSkill(p,'combat',1,report.gearCount+sum(report.eggs));
  }
  p.ticket=null;
  p.report=report;
  return report;
}
export function solveDiscovery(p,option){
  const d=p.discovery;
  if(!d)throw Error('No discovery is waiting.');
  const site=ACTIVITIES.gather[d.act];
  const rng=random(hash(d.nonce));
  const roll=rng();
  let result='';
  if(option==='nest'){
    if(roll<.5){addEgg(p,d.kind);result='A warm egg is tucked inside.';}
    else{change(p.bag,'resin',2);result='The nest is empty, but amber resin lines its branches.';}
  }else if(option==='cache'){
    if(roll<.65){const id=site.rare[0];change(p.bag,id,3);result='You recover three '+ITEMS[id].name.toLowerCase()+'.';}
    else{addGold(p,21);result='A courier left 21 gold in the cache.';}
  }else throw Error('Choose a discovery reward.');
  addXp(p,site.skill,site.xp*2);trackSkill(p,site.skill,0,1);p.stats.rare++;p.stats.discoveries++;p.discovery=null;
  return result;
}
export function questReady(p,q){
  return (!q.after||p.quests[q.after])&&!p.quests[q.id]&&has(p,q.items)
    &&Object.entries(q.kills||{}).every(([id,n])=>(p.kills[id]||0)>=n)
    &&Object.entries(q.stats||{}).every(([id,n])=>(p.stats[id]||0)>=n)
    &&(!q.statHouse||Object.keys(p.house).length>=q.statHouse);
}
export function completeQuest(p,id){
  const q=QUESTS.find(x=>x.id===id);
  if(!q||!questReady(p,q))throw Error('The guild still needs something from you.');
  materials(p,q.items,-1); materials(p,q.gives);
  addGold(p,q.gold); for(const [skill,n] of Object.entries(q.xp)) addXp(p,skill,n);
  if(q.egg)addEgg(p,q.egg);
  p.quests[id]=true; p.stats.quests++;
}
export function setEquipment(p,id){
  if(p.activity||p.ticket)throw Error('Stop your activity before changing equipment.');
  const g=p.gear[id];
  if(!g)throw Error('That equipment is no longer in your pack.');
  const base=GEAR[g.base];
  if(level(p.xp[base.skill])<base.level)throw Error('Requires '+SKILLS[base.skill][0]+' '+base.level+'.');
  p.equipped[base.slot]=id;
}
export function stash(p,kind,id,n,deposit){
  const from=deposit?p.bag:p.bank, to=deposit?p.bank:p.bag;
  if(kind==='gear'){
    if(Object.values(p.equipped).includes(id))throw Error('Equip a replacement before banking that item.');
    const source=deposit?p.gear:p.vault, dest=deposit?p.vault:p.gear;
    if(!source[id]||Object.keys(dest).length>=(deposit?BANK_MAX:BAG_MAX))throw Error('Storage is full or that item moved.');
    dest[id]=source[id];delete source[id]; return;
  }
  if(!ITEMS[id]||!Number.isInteger(n)||n<=0)throw Error('Set a valid amount.');
  change(from,id,-n); change(to,id,n);
}
export function collectProfile(p,pet){
  return {name:p.name,appearance:p.appearance,rank:level(p.xp.combat),xp:totalXP(p),
    kills:p.stats.kills,karma:p.karma,house:p.house,weapon:p.gear[p.equipped.weapon]?.base||'sword',
    pet:pet?{id:pet.id,name:pet.name,traits:pet.traits}:null};
}
