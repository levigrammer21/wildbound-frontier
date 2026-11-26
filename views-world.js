import {ENEMIES,GATHERING,GEAR,LOCATIONS,MAX_FEE,RECIPES,SHOPS,SKILLS} from './content.js';
import {activityTerms,has,interval,level,regionUnlocked,requirement,thresholds} from './engine.js';
import {foeArt,itemArt} from './art.js';
import {bar,button,card,gold,h,heading,itemText,note,panel,pill,row,stack,subnav,timeText,title,words} from './ui.js';

function currentFee(c,act){
  const shop=c.state.shops[act.shop];
  return shop?.owner&&shop.owner!==c.state.user.uid?shop.fee:0;
}
function begin(c,act,fallback=false){
  const fee=fallback?0:currentFee(c,act);
  return c.run('start',{kind:act.kind,id:act.id,fee,fallback},{
    success:fallback?'Started at the free guild facility.':'Started '+act.name+'.'
  });
}
function actionCard(c,a){
  const {p,activePet}=c.state;
  const blocked=requirement(p,a);
  const speed=interval(a,activityTerms(p,a,activePet));
  const occupied=!!p.activity||!!p.ticket;
  const fee=currentFee(c,a);
  const enough=has(p,a.requires);
  const resourceText=a.gear?'Equipment roll · '+GEAR[a.gear].name:itemText(a.gives);
  const isCraft=a.kind==='make';
  return card(h('h3',{},a.name),row(pill(SKILLS[a.skill][0]+' '+a.level),a.tool?pill('Tool '+a.tool):null,
    pill(timeText(speed)),pill(a.xp+' XP')),
    note(resourceText),
    isCraft?note('Needs '+itemText(a.requires)):null,
    isCraft?note(SHOPS[a.shop].name+(fee?' · '+fee+' g per action':' · no production fee')):null,
    blocked?note(blocked):null,
    row(button('Begin idle',()=>begin(c,a),{style:'primary',small:true,disabled:occupied||!!blocked||!enough||p.gold<fee}),
      fee>0?button('Free guild facility',()=>begin(c,a,true),{style:'ghost',small:true,disabled:occupied||!!blocked||!enough}):null));
}
function enemyCard(c,e){
  const p=c.state.p;
  const locked=requirement(p,e);
  const occupied=!!p.activity||!!p.ticket;
  const sprite=h('div',{class:'pet-frame enemy-thumb'},foeArt(e));
  return card(sprite,h('h3',{},e.name),row(pill(e.boss?'Boss':'Combat '+e.level),pill(e.hp+' HP'),gold(e.gold)),
    note(e.boss?'A regional boss with a second phase.':{charge:'Charges marked lanes.',cast:'Casts across multiple lanes.',
      duel:'Punishes nearby fighters.',quake:'Shakes the middle lanes.',pounce:'Leaps onto marked targets.'}[e.pattern]),
    locked?note(locked):null,
    row(button('Fight',()=>c.launchFight(e.id),{style:'primary',small:true,disabled:occupied||!!locked}),
      button('Idle hunt',()=>begin(c,e),{small:true,disabled:occupied||!!locked})));
}
export function worldView(c){
  const {p,region,skill}=c.state;
  const info=LOCATIONS[region];
  const open=regionUnlocked(p,region);
  const selectRegion=id=>{c.state.region=id;c.render();};
  const pins=Object.entries(LOCATIONS).map(([id,loc])=>{
    const unlocked=regionUnlocked(p,id);
    return h('button',{type:'button',style:'--x:'+loc.x+'%;--y:'+loc.y+'%;--spot:'+loc.color,
      class:'waypoint'+(id===region?' selected':'')+(unlocked?'':' locked'),
      'aria-pressed':String(id===region),onclick:()=>selectRegion(id)},
      h('span',{'aria-hidden':'true'},loc.glyph),loc.name);
  });
  const discovery=p.discovery?panel(title('Something off the trail'),
    note('A gap in the stone opens into a hollow. Something has nested there, and a weathered supply cache lies just inside.'),
    row(button('Look inside the nest',async()=>{
      const outcome=await c.run('discover',{option:'nest'});
      if(outcome)c.display('Trail discovery',note(outcome));
    },{style:'primary'}),button('Open the cache',async()=>{
      const outcome=await c.run('discover',{option:'cache'});
      if(outcome)c.display('Trail discovery',note(outcome));
    }))):null;
  const hero=h('section',{class:'panel region',style:'--scene:url("./img/'+(region==='town'?'alderwatch':region)+'.webp")'},
    h('p',{class:'eyebrow'},info.title),title(info.name),note(info.text),
    !open?note('Unlock by reaching level '+info.unlock+' in any skill.'):null,
    region==='town'?row(button('Enter town',()=>c.navigate('town'),{style:'primary',small:true}),button('Visit your house',()=>c.navigate('house'),{small:true})):null);
  const gathers=Object.values(GATHERING).filter(a=>a.region===region);
  const foes=Object.values(ENEMIES).filter(a=>a.region===region);
  return h('div',{class:'stack-lg'},
    heading('The valley','Choose a location, work its trails, or challenge what lives there.'),
    h('section',{class:'map','aria-label':'Interactive map of Alderwatch'},h('p',{class:'map-label eyebrow'},'Alderwatch Valley'),pins),
    discovery,hero,open&&gathers.length?stack(title('Work the land'),h('div',{class:'grid two'},gathers.map(a=>actionCard(c,a)))):null,
    open&&foes.length?stack(title('Encounters'),h('div',{class:'grid two'},foes.map(a=>enemyCard(c,a)))):null);
}
export function skillsView(c){
  const {p,skill}=c.state;
  const rank=level(p.xp[skill]);
  const record=p.stats.skills?.[skill]||{actions:0,rare:0};
  const status=rank===99?'Mastered · '+words(p.xp[skill])+' lifetime XP':
    words(p.xp[skill]-thresholds[rank])+' / '+words(thresholds[rank+1]-thresholds[rank])+' XP to level '+(rank+1);
  const all=Object.entries(SKILLS).map(([key,[name,glyph]])=>
    button(glyph+' '+name+' · '+level(p.xp[key]),()=>{c.state.skill=key;c.render();},
      {style:'ghost',small:true,pressed:key===skill}));
  const gathering=Object.values(GATHERING).filter(a=>a.skill===skill);
  const recipes=Object.values(RECIPES).filter(a=>a.skill===skill);
  const list=skill==='combat'?Object.values(ENEMIES).map(e=>enemyCard(c,e)):
    [...gathering,...recipes].map(a=>actionCard(c,a));
  return h('div',{},heading('Skills','Train any profession. Every skill can reach level 99.'),
    h('div',{class:'subnav'},all),
    panel(h('div',{class:'line'},title(SKILLS[skill][0]),pill('Level '+rank)),
      bar(rank===99?100:(p.xp[skill]-thresholds[rank])/(thresholds[rank+1]-thresholds[rank])*100),
      note(status),row(pill(words(record.actions)+' lifetime actions'),pill(words(record.rare)+' rare finds')),
      note(p.activity||p.ticket?'Finish or stop your current activity before starting another.':
        skill==='combat'?'Fight actively to avoid attacks, or bring enough food for an idle hunt.':'Idle work continues after you close the game.')),
    h('div',{class:'grid two',style:'margin-top:12px'},list));
}
