import {EGGS,GEAR,ITEMS,SKILLS} from './content.js';
import {itemArt,petArt} from './art.js';

export const el=id=>document.getElementById(id);
export function h(tag,attrs={},...children){
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(attrs)){
    if(value===false||value===null||value===undefined)continue;
    if(key==='class')node.className=value;
    else if(key==='value')node.value=value;
    else if(key.startsWith('on'))node.addEventListener(key.slice(2),value);
    else node.setAttribute(key,value===true?'':value);
  }
  node.append(...children.flat(Infinity).filter(x=>x!==null&&x!==undefined&&x!==false));
  return node;
}
export const note=text=>h('p',{class:'note'},text);
export const title=text=>h('h2',{},text);
export const panel=(...children)=>h('section',{class:'panel'},...children);
export const row=(...children)=>h('div',{class:'row'},...children);
export const stack=(...children)=>h('div',{class:'stack'},...children);
export const card=(...children)=>h('section',{class:'card stack'},...children);
export const pill=text=>h('span',{class:'pill'},text);
export const heading=(name,description)=>h('header',{class:'section-head'},h('h1',{},name),description?note(description):null);
export const button=(label,callback,{style='secondary',disabled=false,small=false,pressed=null,extra='',type='button'}={})=>
  h('button',{type,class:'button '+style+(small?' small':'')+(extra?' '+extra:''),
    disabled,'aria-pressed':pressed===null?null:String(pressed),onclick:callback},label);
export const bar=(percent,id)=>h('div',{class:'progress','aria-hidden':'true'},h('span',{id,style:'width:'+Math.max(0,Math.min(100,percent))+'%'}));
export const gold=n=>h('span',{class:'coin'},Number(n).toLocaleString()+' g');
export const words=n=>Number(n).toLocaleString();
export function timeText(seconds){
  const n=Math.max(0,Math.ceil(seconds));
  return n>=3600?Math.floor(n/3600)+'h '+Math.floor(n%3600/60)+'m':
    n>=60?Math.floor(n/60)+'m '+n%60+'s':n+'s';
}
export function listing(items,render,empty){
  if(!items.length)return note(empty);
  return h('ul',{class:'list'},items.map(x=>h('li',{},render(x))));
}
export function field(label,name,value,type='text',attrs={}){
  return h('label',{},label,h('input',{type,name,value,...attrs}));
}
export function number(label,name,value,min,max,attrs={}){
  return field(label,name,value,'number',{min,max,step:1,required:true,...attrs});
}
export function select(label,name,options,current,attrs={}){
  const input=h('select',{name,'aria-label':label,...attrs},options.map(([v,n])=>h('option',{value:v},n)));
  if(current!==undefined)input.value=current;
  return h('label',{},label,input);
}
export function form(children,onSubmit){
  return h('form',{class:'form',onsubmit:event=>{
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget),event.submitter);
  }},children);
}
export function subnav(active,choices,choose){
  return h('div',{class:'subnav','aria-label':'Section'},choices.map(([id,label])=>
    button(label,()=>choose(id),{small:true,style:'ghost',pressed:id===active})));
}
export const itemName=id=>ITEMS[id]?.name||EGGS[id]?.name||id;
export function itemText(items){
  return Object.entries(items||{}).map(([id,n])=>words(n)+' '+itemName(id)).join(' · ');
}
export const rarity=['Common','Fine','Rare','Masterwork'];
export function labelGear(gear){return rarity[gear.grade]+' '+GEAR[gear.base].name;}
export function assetName(asset){
  if(asset.kind==='pet')return asset.name;
  if(asset.kind==='gear')return labelGear(asset.gear);
  return itemName(asset.id)+(asset.qty>1?' ×'+asset.qty:'');
}
export function assetIcon(asset){
  if(asset.kind==='pet')return petArt(asset.traits,asset.name);
  if(asset.kind==='gear')return itemArt('gear',GEAR[asset.gear.base].name);
  if(asset.kind==='egg')return itemArt('egg',itemName(asset.id),EGGS[asset.id].color);
  return itemArt(ITEMS[asset.id].icon,ITEMS[asset.id].name);
}
export function detailAsset(asset){
  return h('span',{class:'icon-pair'},assetIcon(asset),h('span',{},assetName(asset)));
}
export function summary(report){
  if(!report)return note('No complete actions yet.');
  return stack(
    h('p',{class:'eyebrow'},report.name),
    row(pill(words(report.actions)+' actions'),pill(timeText(report.seconds)),pill('+'+words(report.xp)+' XP'),
      report.levels?pill('+'+report.levels+' levels'):null,report.rare?pill(report.rare+' rare finds'):null),
    Object.keys(report.items).length?note(itemText(report.items)):null,
    report.gold||report.fees?row(report.gold?gold(report.gold):null,report.fees?note(report.fees+' g paid in fees'):null):null,
    Object.keys(report.eggs).length?row(h('strong',{},'Eggs found'),note(itemText(report.eggs))):null,
    report.meals?note(report.meals+' healing supplies used'):null,
    report.gearCount?stack(h('strong',{},report.gearCount+' equipment found'),report.gear.map(g=>detailAsset({kind:'gear',gear:g}))):null,
    report.salvaged?note(report.salvaged+' overflow items salvaged into bronze.'):null,
    report.stop?note(report.stop):null);
}
export function gearDetails(gear){
  const g=GEAR[gear.base];
  const names={attack:'Power',speed:'Attack interval',reach:'Range',crit:'Critical chance',defence:'Defence',
    hp:'Health',healing:'Healing received',tool:'Tool tier',leech:'Life leech',luck:'Rare loot chance',yield:'Extra yield',haste:'Action speed',conserve:'Material conservation'};
  const pct=new Set(['crit','healing','leech','luck','yield','haste','conserve']);
  const lines=Object.entries(g.stats).filter(([key])=>names[key]).map(([key,v])=>[names[key],key==='speed'?v+'s':v+(pct.has(key)?'%':'')]);
  const mods=Object.entries(gear.mods).map(([k,v])=>[names[k],'+'+v+(pct.has(k)?'%':'')]);
  return stack(note('Requires '+SKILLS[g.skill][0]+' '+g.level+(g.stats.type?' · '+g.stats.type:'')+
    (g.stats.special?' · '+g.stats.special:'')),h('dl',{class:'kv'},[...lines,...mods].flatMap(([k,v])=>[h('dt',{},k),h('dd',{},v)])));
}
