import assert from 'node:assert/strict';
import {ACTIVITIES,EGGS,ENEMIES,EVENTS,GEAR,ITEMS,QUESTS,RECIPES,SHOPS,SKILLS,TOOLS,VENDOR,eventAt} from './content.js';
import {
  OFFLINE_SECONDS,activeRewards,combatStats,completeQuest,count,hash,level,makeGear,newActivity,
  reconcile,requirement,starter,stash,thresholds
} from './engine.js';
import {Battle} from './combat.js';
import {generatePet,signature} from './pets.js';

const test=(name,fn)=>{fn(); console.log('PASS '+name);};
const start=1764180000000;
const gather=ACTIVITIES.gather.ashgrove;

test('Interconnected materials and recipe definitions',()=>{
  const used=new Set();
  const obtainable=new Set([...Object.keys(VENDOR),...Object.keys(starter('Test').bag)]);
  for(const activity of Object.values(ACTIVITIES.gather)){
    Object.keys(activity.gives).forEach(id=>obtainable.add(id));
    obtainable.add(activity.rare[0]);
    assert.ok(GEAR['plain'+TOOLS[activity.skill]]);
  }
  for(const e of Object.values(ENEMIES)){
    Object.keys(e.drops).forEach(id=>obtainable.add(id));assert.ok(GEAR[e.gear]);
  }
  for(const source of [...Object.values(RECIPES),...EVENTS,...QUESTS,...Object.values(SHOPS)]){
    for(const id of Object.keys(source.requires||source.items||source.need||{}))used.add(id);
    for(const id of Object.keys(source.gives||{}))obtainable.add(id);
  }
  for(const [id,item] of Object.entries(ITEMS)){
    assert.ok(obtainable.has(id),id+' cannot be obtained');
    assert.ok(used.has(id)||item.heal||item.boost||item.decor,id+' lacks a functional use');
  }
  assert.equal(Object.keys(SKILLS).length,10);
});
test('Skill mastery and unlock paths',()=>{
  const p=starter('Tester');
  for(let n=1;n<=99;n++){assert.equal(level(thresholds[n]),n);if(n>1)assert.equal(level(thresholds[n]-1),n-1);}
  assert.equal(level(90000000),99);
  const frost=ACTIVITIES.gather.ironspine;
  assert.match(requirement(p,frost),/Reach level 6/);
  p.xp.mining=thresholds[6];assert.match(requirement(p,frost),/tier 2/);
  p.gear.pick=makeGear('bronzepick','pick');
  p.equipped.pick='pick';
  assert.equal(requirement(p,frost),'');
});
test('Offline work counts completed actions once and caps elapsed time',()=>{
  const p=starter('Tester');
  p.activity=newActivity(gather,p,null,start,undefined,'a-fixed-activity');
  const initial=count(p,'ash');
  assert.equal(reconcile(p,start+8000),null);
  const report=reconcile(p,start+39000);
  assert.equal(report.actions,3);
  assert.equal(count(p,'ash'),initial+6);
  assert.equal(reconcile(p,start+39000),null);
  const capped=reconcile(p,start+48*3600000);
  assert.ok(capped.seconds<=OFFLINE_SECONDS);
  assert.ok(capped.actions>1000);
  assert.ok(capped.eggs.grove>0&&p.eggs.grove>=capped.eggs.grove);
  assert.equal(reconcile(p,start+48*3600000),null);
});
test('Production stops at available materials and only charges completed work',()=>{
  const p=starter('Tester');
  p.bag.copper=6;p.bag.ash=6;p.gold=20;
  p.activity=newActivity(RECIPES.bronze,p,null,start,{fee:3,owner:'a',shop:'forge'},'test-bronze-materials');
  const result=reconcile(p,start+60000);
  assert.equal(result.actions,3);
  assert.equal(result.fees,9);
  assert.equal(p.gold,11);
  assert.equal(p.bag.bronze,6);
  assert.match(result.stop,/Materials/);
  assert.equal(p.activity,null);

  p.bag.copper=14;p.bag.ash=7;p.gold=7;
  p.activity=newActivity(RECIPES.bronze,p,null,start,{fee:3,owner:'a',shop:'forge'},'test-bronze-gold');
  const cost=reconcile(p,start+60000);
  assert.equal(cost.actions,2);assert.equal(cost.fees,6);assert.equal(p.gold,1);
  assert.equal(p.bag.copper,10);
  assert.match(cost.stop,/Gold/);
});
test('Idle combat uses food and stops after defeat',()=>{
  const p=starter('Tester');
  p.bag={trailmeal:1};
  p.activity=newActivity(ENEMIES.boar,p,null,start,undefined,'test-fight');
  const report=reconcile(p,start+7200000);
  assert.ok(report.actions>0&&report.actions<15);
  assert.equal(report.meals,1);assert.equal(p.activity,null);
  assert.match(report.stop,/Retreated/);
  assert.equal(p.stats.kills,report.actions);
});
test('Real-time movement, telegraphs, guard, cooldowns, healing, loot, and defeat',()=>{
  const p=starter('Tester');
  const stats=combatStats(p,{buffs:[{kind:'damage',skill:'combat',value:10}]});
  assert.ok(stats.attack>combatStats(p,null).attack);
  const enemy=ENEMIES.boar;
  const b=new Battle(enemy,stats,{trailmeal:2},9);
  const tick=n=>{for(let i=0;i<n;i++)b.step(.05);};
  b.move(1);tick(26);
  assert.equal(b.position,2);
  assert.ok(b.foe<enemy.hp);
  tick(6);
  assert.ok(b.telegraph?.lanes.includes(2));
  b.move(-1);tick(24);
  assert.equal(b.hp,stats.max);
  b.move(1);tick(7);
  assert.ok(b.act('special'));
  assert.ok(!b.act('special'));
  b.hp=6;
  assert.ok(b.act('consume','trailmeal')||b.finished);
  assert.ok(!b.act('consume','trailmeal'));
  assert.ok(b.hp>6||b.finished);
  while(!b.finished)b.step(.05);
  assert.ok(b.win);
  const result=activeRewards(p,enemy,{id:'test-battle',seed:8,stats},b.outcome(),start);
  assert.equal(result.actions,1);
  assert.equal(p.stats.kills,1);
  assert.equal(p.gold,90);
  const defend=new Battle(ENEMIES.crown,stats,{},8);
  defend.step(1.5);assert.equal(!!defend.telegraph,true);
  defend.position=defend.enemyPos;
  assert.ok(defend.act('guard'));assert.ok(!defend.act('guard'));
  defend.step(1.2);assert.ok(defend.hp>0);
  while(!defend.finished)defend.step(.08);
  assert.equal(defend.win,false);
});
test('Quest consumption, bank and duplicate restrictions',()=>{
  const p=starter('Tester');
  completeQuest(p,'guild');
  assert.equal(count(p,'ash'),0);assert.equal(p.gold,120);assert.equal(p.stats.quests,1);
  assert.throws(()=>completeQuest(p,'guild'));
  stash(p,'item','trailmeal',2,true);
  assert.equal(p.bank.trailmeal,2);
  stash(p,'item','trailmeal',2,false);
  assert.equal(p.bag.trailmeal,7);
  assert.throws(()=>stash(p,'gear','s0',1,true),/replacement/);
});
test('Procedural hatches across 25,000 rolls',()=>{
  const observed=new Set();
  const eggTypes=Object.keys(EGGS);
  const buffs={};
  const families={};
  let triples=0,rares=0,duplicates=0;
  for(let n=0;n<25000;n++){
    const egg=eggTypes[n%4];
    const pet=generatePet(hash('family-sample-'+n),egg);
    assert.equal(signature(pet.traits),pet.signature);
    if(observed.has(pet.signature))duplicates++;
    observed.add(pet.signature);
    if(pet.traits.accessory>=5)rares++;
    if(pet.buffs.length===3)triples++;
    families[pet.traits.body]=(families[pet.traits.body]||0)+1;
    assert.equal(new Set(pet.buffs.map(x=>x.kind)).size,pet.buffs.length);
    for(const b of pet.buffs){assert.ok(b.value>0&&b.value<=28);buffs[b.kind]=(buffs[b.kind]||0)+1;}
  }
  assert.ok(duplicates<100);assert.equal(Object.keys(buffs).length,10);
  assert.equal(Object.keys(families).length,4);
  assert.ok(triples>300&&triples<850);
  assert.ok(rares>2100&&rares<3400);
  console.log(JSON.stringify({rolls:25000,unique:observed.size,collisionCandidates:duplicates,threeBuff:triples,rareAccessories:rares}));
});
test('World calendar rotates shared, functional demand',()=>{
  const ev=eventAt(start);
  const next=eventAt(ev.ends);
  assert.equal(ev.slot+1,next.slot);
  assert.notEqual(ev.name,next.name);
  assert.ok(next.gold>0&&next.fund>0&&next.items);
});
