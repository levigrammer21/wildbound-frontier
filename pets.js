import {EGGS,SKILLS} from './content.js';
import {random} from './engine.js';

export const PALETTES=[
 ['#66915e','#bdd884'],['#b27645','#f6c978'],['#557995','#a7dce5'],['#8e65a0','#d9a0dd'],
 ['#be6c74','#f5b3a1'],['#548a81','#acf3d3'],['#9a9fbd','#e6ecfa'],['#b89a62','#f3df9c'],
 ['#697254','#c2d078'],['#524574','#aca0e7'],['#984556','#ed8b94'],['#916550','#dec2a7'],
 ['#437378','#91c5bc'],['#5e6caf','#a9b8f2'],['#c07a77','#ffcaac'],['#65545e','#d3a6b8']
];
export const EYES=['#fff3cc','#91f5e2','#f7b696','#eef1ff','#f7addf','#d5fc80','#eb795d','#abbfff'];
export const BODY=['Foxling','Mossback','Strix','Hearth Drake'];
const SHAPE=['Standard','Dwarf','Tall','Broad'];
const EARS=['Round','Blade','Folded','Tufted'];
const TAILS=['Curl','Brush','Fin','Feather'];
const MARKS=['Comet','Speckle','Bands','Mantle','Dashes','Crown','Diamond','Collar'];
const ACCESSORY=['None','Bell','Wildflower','Moonstone','Ribbon','Horns','Starlight','Flame'];
const BUFFS={
 xp:['Experience',3,12],yield:['Yield',5,19],speed:['Action speed',4,15],damage:['Combat damage',4,15],
 defence:['Defence',1,7],healing:['Healing received',5,20],gold:['Combat gold',4,16],
 luck:['Rare loot chance',6,24],egg:['Egg chance',7,28],conserve:['Material conservation',3,12]
};
const byEgg={grove:[0,0,1,1,2,3],crag:[1,1,3,3,0,2],tide:[2,2,1,3,0,1],dusk:[3,3,2,2,0,1]};
const bySkill={grove:['woodcutting','farming','hunting','crafting'],crag:['mining','smithing','combat'],
  tide:['fishing','cooking','alchemy'],dusk:['combat','alchemy','crafting','hunting']};
const buffSkills={yield:['woodcutting','farming','hunting','mining','fishing'],
 conserve:['smithing','crafting','cooking','alchemy'], damage:['combat'],defence:['combat'],healing:['combat'],gold:['combat']};
const pick=(list,r)=>list[Math.floor(r()*list.length)];
export function signature(t){return [t.body,t.size,t.color,t.eye,t.ears,t.tail,t.mark,t.accessory,t.eyeShape,t.accent].join('-');}
export function generatePet(seed,egg){
  const a=random(seed);
  const body=pick(byEgg[egg],a);
  const rare=a();
  const traits={body,size:Math.floor(a()*4),color:Math.floor(a()*PALETTES.length),
    eye:Math.floor(a()*EYES.length),ears:Math.floor(a()*4),tail:Math.floor(a()*4),mark:Math.floor(a()*8),
    accessory:rare<.011?7:rare<.043?6:rare<.11?5:rare<.47?1+Math.floor(a()*4):0,
    eyeShape:Math.floor(a()*3),accent:Math.floor(a()*6)};
  const b=random(seed^0x2545f491);
  const strength=b();
  const quantity=strength>.977?3:strength>.77?2:1;
  const types=Object.keys(BUFFS);
  const buffs=[];
  for(let j=0;j<quantity;j++){
    const kind=types.splice(Math.floor(b()*types.length),1)[0];
    const range=buffSkills[kind]||bySkill[egg];
    const possible=range.filter(x=>bySkill[egg].includes(x));
    const skill=pick(possible.length?possible:range,b);
    const [,min,max]=BUFFS[kind];
    buffs.push({kind,skill: ['damage','defence','healing','gold'].includes(kind)?'combat':skill,
      value:Math.round(min+(max-min)*b()*(j===2?.8:1))});
  }
  return {traits,buffs,signature:signature(traits)};
}
export function petVisualInfo(t){
  return [BODY[t.body],SHAPE[t.size],MARKS[t.mark],EARS[t.ears]+' ears',TAILS[t.tail]+' tail',ACCESSORY[t.accessory]].join(' · ');
}
export function buffText(buff){
  const unit=buff.kind==='defence'?'':'%';
  return '+'+buff.value+unit+' '+BUFFS[buff.kind][0]+(buff.skill&&buff.skill!=='combat'?' · '+SKILLS[buff.skill][0]:'');
}
export function petName(egg){return EGGS[egg].name.split(' ')[0]+' '+['Wisp','Scout','Sprite','Kindred'][Object.keys(EGGS).indexOf(egg)];}
