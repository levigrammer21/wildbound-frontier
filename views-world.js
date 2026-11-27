import {ENEMIES,GATHERING,GEAR,LOCATIONS,RECIPES,SHOPS,SKILLS} from './content.js';
import {activityTerms,has,interval,level,regionUnlocked,requirement,thresholds} from './engine.js';
import {foeArt} from './art.js';
import {SCENES} from './field-data.js';
import {bar,button,card,gold,h,heading,itemText,note,panel,pill,row,stack,timeText,title,words} from './ui.js';

function currentFee(c,act){
  const shop=c.state.shops[act.shop];
  return shop?.owner&&shop.owner!==c.state.user.uid?shop.fee:0;
}
function begin(c,act,fallback=false){
  return c.run('start',{kind:act.kind,id:act.id,fee:fallback?0:currentFee(c,act),fallback},{
    success:act.kind==='combat'?'Hunt assigned. You can leave the game while it runs.':'Started '+act.name+'.'
  }).then(result=>{if(result)c.returnToField();return result;});
}
export function activityCard(c,a,fallback=false){
  const {p,activePet}=c.state;
  const blocked=requirement(p,a);
  const speed=interval(a,activityTerms(p,a,activePet));
  const occupied=!!p.activity||!!p.ticket;
  const fee=fallback?0:currentFee(c,a);
  const enough=has(p,a.requires);
  const resourceText=a.gear?'Equipment roll · '+GEAR[a.gear].name:itemText(a.gives);
  const craft=a.kind==='make';
  return card(h('h3',{},a.name),row(pill(SKILLS[a.skill][0]+' '+a.level),a.tool?pill('Tool '+a.tool):null,
    pill(timeText(fallback?Math.ceil(speed*1.8):speed)),pill(a.xp+' XP')),
    note(resourceText),
    craft?note('Needs '+itemText(a.requires)):null,
    craft?note(fee?fee+' gold per completed action':'No production fee'):null,
    blocked?note(blocked):!enough?note('Bring the required materials to begin.'):null,
    occupied?note('Finish or stop your current activity first.'):null,
    button(craft?'Start production':'Start gathering',()=>begin(c,a,fallback),
      {style:'primary',small:true,disabled:occupied||!!blocked||!enough||p.gold<fee}));
}
function encounter(c,e){
  const p=c.state.p;
  const locked=requirement(p,e);
  const occupied=!!p.activity||!!p.ticket;
  const sprite=h('div',{class:'pet-frame enemy-thumb'},foeArt(e));
  const behavior={charge:'Charges along a marked line.',cast:'Casts on marked ground.',
    duel:'Punishes nearby fighters.',quake:'Sends shockwaves in a cross.',pounce:'Pounces onto marked ground.'}[e.pattern];
  return card(sprite,h('h3',{},e.name),row(pill(e.boss?'Boss · Combat '+e.level:'Combat '+e.level),pill(e.hp+' HP'),gold(e.gold)),
    note(behavior+(e.boss?' Attacks change when wounded.':'')),locked?note(locked):null,
    occupied?note('Finish or stop your current activity first.'):null,
    row(button('Fight',()=>c.launchFight(e.id),{style:'primary',small:true,disabled:occupied||!!locked}),
      button('Assign idle hunt',()=>begin(c,e),{small:true,disabled:occupied||!!locked})));
}
export function encounterView(c){
  const s=c.state.spot;
  if(s.kind==='enemy')return encounter(c,ENEMIES[s.id]);
  if(s.kind==='gather')return activityCard(c,GATHERING[s.id]);
  return stack(note('A gap in the stone opens into a hollow. Something has nested there beside a weathered supply cache.'),
    row(button('Look inside the nest',async()=>{
      const outcome=await c.run('discover',{option:'nest'});
      if(outcome){c.returnToField();c.display('Trail discovery',note(outcome));}
    },{style:'primary'}),button('Open the cache',async()=>{
      const outcome=await c.run('discover',{option:'cache'});
      if(outcome){c.returnToField();c.display('Trail discovery',note(outcome));}
    })));
}
export function atlasView(c){
  const current=c.state.region==='home'?'town':c.state.region;
  const landmarks=SCENES[c.state.region].spots.filter(s=>['shop','guild','home','market','mail','bank','community','gather','enemy'].includes(s.kind));
  const local=landmarks.length?panel(title('Nearby landmarks'),
    h('ul',{class:'list'},landmarks.map(s=>h('li',{},h('span',{},s.name),
      button('Walk to '+s.name,()=>c.goTo(s.kind,s.id),{small:true,style:'ghost'}))))):null;
  return stack(heading('Alderwatch Valley','Follow marked roads between Alderwatch and the wilds.'),
    h('img',{class:'field-atlas',src:'./img/eldervale.webp',alt:'Illustrated map of the valley and its four wilderness regions'}),
    h('div',{class:'field-travel'},Object.entries(LOCATIONS).map(([id,loc])=>{
      const unlocked=regionUnlocked(c.state.p,id);
      const reachable=id!==current&&c.state.region!=='home'&&(current==='town'||id==='town');
      return panel(title(loc.name),note(loc.text),
        id===current?pill('Current region'):!unlocked?note('Unlocks at level '+loc.unlock+' in any skill.'):
        reachable?button('Walk to '+loc.name+' trail',()=>c.goTo('gate',id),{style:'primary',small:true}):note('The trail starts in Alderwatch.'));
    })),local);
}
export function skillsView(c){
  const {p,skill}=c.state;
  const rank=level(p.xp[skill]);
  const record=p.stats.skills?.[skill]||{actions:0,rare:0};
  const status=rank===99?'Mastered · '+words(p.xp[skill])+' lifetime XP':
    words(p.xp[skill]-thresholds[rank])+' / '+words(thresholds[rank+1]-thresholds[rank])+' XP to level '+(rank+1);
  const all=Object.entries(SKILLS).map(([key,[name]])=>
    button(name+' · '+level(p.xp[key]),()=>{c.state.skill=key;c.render();},{style:'ghost',small:true,pressed:key===skill}));
  const content=skill==='combat'?Object.values(ENEMIES):[...Object.values(GATHERING),...Object.values(RECIPES)].filter(a=>a.skill===skill);
  return stack(h('div',{class:'subnav'},all),
    panel(h('div',{class:'line'},title(SKILLS[skill][0]),pill('Level '+rank)),
      bar(rank===99?100:(p.xp[skill]-thresholds[rank])/(thresholds[rank+1]-thresholds[rank])*100),
      note(status),row(pill(words(record.actions)+' lifetime actions'),pill(words(record.rare)+' rare finds'))),
    panel(title('Locations and unlocks'),h('ul',{class:'list'},content.map(a=>h('li',{},
      stack(h('strong',{},a.name),note(a.shop?SHOPS[a.shop].name:LOCATIONS[a.region].name)),pill('Level '+a.level))))));
}
