import {ENEMIES,ITEMS} from './content.js';
import {Battle} from './combat.js';
import {foeArt,petArt,rangerArt} from './art.js';
import {bar,button,el,h,note,row,summary,timeText} from './ui.js';

export function launchBattle(c,id,ticket){
  const dialog=el('battle');
  const enemy=ENEMIES[id];
  const p=c.state.p;
  const pet=c.state.activePet;
  const arena=el('arena');
  const bars=el('combat-bars');
  const battle=new Battle(enemy,ticket.stats,ticket.supplies,ticket.seed);
  let prev=performance.now(),frameId=0,flashTimer=0,position=-1,foePos=-1,done=false;
  const playerSprite=rangerArt(p.appearance,p.gear[p.equipped.weapon]?.base,p.name);
  playerSprite.classList.add('player-sprite');
  const foe=foeArt(enemy);
  foe.classList.add('enemy-sprite');
  const ally=pet?petArt(pet.traits,pet.name):null;
  ally?.classList.add('ally-sprite');
  const lanes=Array.from({length:5},(_,i)=>h('button',{class:'lane',type:'button','aria-label':'Move to lane '+(i+1),onclick:()=>{
    if(Math.abs(i-battle.position)===1)battle.move(i-battle.position);
  }},h('span',{class:'lane-number','aria-hidden':'true'},i+1)));
  arena.replaceChildren(...lanes);
  el('battle-title').textContent=enemy.name;
  el('battle-stage').style.setProperty('--arena','url("./img/'+enemy.region+'.webp")');
  el('retreat').textContent='Retreat';
  el('combat-effect').textContent='';
  el('combat-result').hidden=true;
  const health=h('span',{class:'note'},'');
  const foeHealth=h('span',{class:'note'},'');
  bars.replaceChildren(h('div',{},h('p',{},p.name,' · ',health),bar(100,'battle-hp')),
    h('div',{},h('p',{},enemy.name,' · ',foeHealth),bar(100,'battle-foe')));
  const control=(label,key,tip)=>button(label,()=>battle.act(key),{style:key==='special'?'primary':'secondary',
    small:true,extra:tip||''});
  const guard=control('Guard','guard');
  const dodge=control('Dodge','dodge');
  const special=control(battle.stats.special,'special');
  const left=button('← Move',()=>battle.move(-1),{small:true});
  const right=button('Move →',()=>battle.move(1),{small:true});
  const food=Object.keys(battle.supplies).map(id=>{
    const chip=button('',()=>battle.act('consume',id),{small:true,style:'ghost'});
    return [id,chip];
  });
  el('combat-controls').replaceChildren(row(left,right,guard,dodge,special),food.length?row(food.map(([,node])=>node)):note('No meals or tonics in your pack.'));
  const hint=el('combat-hint');
  const controls=el('combat-controls');
  controls.hidden=false;
  const put=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
  function draw(){
    if(position!==battle.position||foePos!==battle.enemyPos){
      position=battle.position;foePos=battle.enemyPos;
      lanes[position].append(playerSprite);
      lanes[foePos].append(foe);
      if(ally)lanes[position].append(ally);
      playerSprite.classList.toggle('in-lane',position===foePos);
    }
    const t=battle.telegraph;
    for(const [i,lane] of lanes.entries()){
      lane.classList.toggle('warn',!!t?.lanes.includes(i));
      lane.setAttribute('aria-pressed',String(i===position));
    }
    put(health,battle.hp+'/'+battle.stats.max+' HP');
    put(foeHealth,battle.foe+'/'+enemy.hp+' HP');
    el('battle-hp').style.width=(battle.hp/battle.stats.max*100)+'%';
    el('battle-foe').style.width=(battle.foe/enemy.hp*100)+'%';
    put(hint,t?t.name+'! '+t.help:'Basic attacks are automatic within range '+battle.stats.reach+'.');
    const ready=(node,label,until,extra=false)=>{
      const left=Math.ceil(until-battle.time);node.disabled=left>0||extra;
      put(node,left>0?label+' '+timeText(left):label);
    };
    ready(guard,'Guard',battle.guardAt);
    ready(dodge,'Dodge',battle.dodgeAt);
    ready(special,battle.stats.special,battle.specialAt,Math.abs(position-foePos)>battle.stats.reach);
    left.disabled=position===0;right.disabled=position===4;
    for(const [id,button] of food)ready(button,ITEMS[id].name+' ×'+battle.supplies[id],battle.foodAt,!battle.supplies[id]);
    if(battle.events.length){
      const emitted=battle.events.splice(0);
      const effect=[...emitted].reverse().find(x=>x.text);
      if(effect){
        put(el('combat-effect'),effect.text);
        const animation=effect.kind==='crit'?'hit':effect.kind;
        arena.classList.remove('hit','hurt');
        if(animation==='hit'||animation==='hurt'){void arena.offsetWidth;arena.classList.add(animation);}
        clearTimeout(flashTimer);
        flashTimer=setTimeout(()=>put(el('combat-effect'),''),660);
      }
    }
  }
  async function settle(){
    if(done)return;
    done=true;
    cancelAnimationFrame(frameId);
    controls.hidden=true;
    el('retreat').disabled=true;
    el('combat-result').hidden=false;
    el('combat-result').replaceChildren(note('Recording encounter…'));
    const feedback=h('p',{id:'battle-feedback',class:'feedback',role:'status'});
    el('combat-result').append(feedback);
    const report=await c.run('finishFight',{id:ticket.id,outcome:battle.outcome()});
    el('retreat').disabled=false;
    el('retreat').textContent='Close';
    if(report)el('combat-result').replaceChildren(h('strong',{},battle.win?'Encounter won':'Retreated'),summary(report));
    else el('combat-result').replaceChildren(note('The result is ready. Reconnect and retry before closing.'),feedback,
      button('Retry result',()=>{done=false;settle();},{style:'primary'}));
  }
  function tick(now){
    if(!dialog.open)return;
    const dt=Math.min(.14,(now-prev)/1000);prev=now;
    if(!document.hidden)battle.step(dt);
    draw();
    if(battle.finished){settle();return;}
    frameId=requestAnimationFrame(tick);
  }
  function retreat(){
    if(done){dialog.close();return;}
    battle.finish(false);
    draw();
    settle();
  }
  function keyboard(ev){
    if(!dialog.open||ev.repeat)return;
    if(ev.key==='ArrowLeft')battle.move(-1);
    else if(ev.key==='ArrowRight')battle.move(1);
    else if(ev.key==='1')battle.act('guard');
    else if(ev.key==='2')battle.act('dodge');
    else if(ev.key==='3')battle.act('special');
  }
  function cancel(ev){ev.preventDefault();retreat();}
  el('retreat').onclick=retreat;
  dialog.addEventListener('cancel',cancel);
  document.addEventListener('keydown',keyboard);
  dialog.addEventListener('close',()=>{
    clearTimeout(flashTimer);cancelAnimationFrame(frameId);dialog.removeEventListener('cancel',cancel);
    document.removeEventListener('keydown',keyboard);
  },{once:true});
  dialog.showModal();
  draw();
  frameId=requestAnimationFrame(tick);
}
