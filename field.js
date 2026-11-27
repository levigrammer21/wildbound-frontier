import {ACTIVITIES,ENEMIES,ITEMS,LOCATIONS} from './content.js';
import {foeArt,furnishingArt,petArt} from './art.js';
import {Battle} from './combat.js?v=1.1.0';
import {DIRECTIONS,SCENES,TILE,distance,exitCell,interactionCells,route,sameCell,walkable} from './field-data.js';
import {paintScene,ranger} from './field-art.js';
import {bar,button,h,timeText} from './ui.js';

const KEYS={ArrowUp:0,w:0,ArrowRight:1,d:1,ArrowDown:2,s:2,ArrowLeft:3,a:3};
const LABELS=['Move north','Move east','Move south','Move west'];
const GLYPHS=['↑','→','↓','←'];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const coords=spot=>({x:spot.x*TILE+8,y:spot.y*TILE+12});
const copy=({x,y})=>({x,y});
const tagColor={gate:'#f9dc9a',enemy:'#fdb09d',gather:'#d4eda7',shop:'#ffe2a2',leave:'#f6d8a2'};
const isTextEntry=target=>target?.closest?.('input,select,textarea,[contenteditable=true]');
const controlText={gate:'Travel',enemy:'Challenge',shop:'Enter',home:'Enter house',leave:'Leave',gather:'Gather',
  guild:'Talk to Bram',mail:'Check mail',market:'Browse',community:'Read board',discovery:'Investigate',
  neighbors:'Visit',decorate:'Decorate',bank:'Open bank'};
function text(node,content){if(node.textContent!==content)node.textContent=content;}
function stroke(c,color,x,y,w,h){
  c.fillStyle=color;
  c.fillRect(x,y,w,1);c.fillRect(x,y+h-1,w,1);c.fillRect(x,y,1,h);c.fillRect(x+w-1,y,1,h);
}

export class Field {
  constructor(mount,context){
    this.context=context;this.region=null;this.owner=null;
    this.keys=new Set();this.art=new Map();this.backgrounds=new Map();this.path=[];this.pending=null;
    this.anchor={x:0,y:0};this.facing=2;this.clock=0;this.frame=0;this.zoom=2.6;
    this.canvas=h('canvas',{class:'field-map',tabindex:'0','aria-label':'Top-down world. Tap to walk or use the arrow keys. Press E to interact.'});
    this.canvas.addEventListener('pointerup',event=>this.point(event));
    this.draw=this.canvas.getContext('2d',{alpha:false});
    this.name=h('h1');this.place=h('p');this.wallet=h('span',{class:'field-wallet'});
    this.jobLabel=h('strong');this.jobTime=h('span');
    this.job=h('button',{type:'button',class:'field-job',onclick:()=>this.context.job(),hidden:true},this.jobLabel,this.jobTime);
    this.hint=h('p',{class:'field-hint'},'Tap the ground to walk. Approach a person, resource, or trail sign.');
    this.target=h('small');
    this.action=button('Interact',()=>this.interact(),{style:'primary'});
    this.near=h('div',{class:'field-target',hidden:true},this.target,this.action);
    this.combat=h('div',{class:'field-combat',hidden:true});
    this.result=h('div',{class:'field-result',hidden:true,role:'status'});
    const pad=h('div',{class:'field-pad','aria-label':'Movement pad'},LABELS.map((label,i)=>{
      const key=h('button',{type:'button','aria-label':label},GLYPHS[i]);
      key.addEventListener('pointerdown',event=>{
        if(event.button!==0||this.isPaused())return;
        event.preventDefault();key.setPointerCapture(event.pointerId);
        this.path=[];this.pending=null;this.touchDirection=i;this.go(i);
      });
      for(const kind of ['pointerup','pointercancel','lostpointercapture'])key.addEventListener(kind,()=>{this.touchDirection=null;});
      key.addEventListener('click',event=>{if(event.detail===0)this.go(i);});
      return key;
    }));
    this.root=h('section',{class:'field','aria-label':'Explore Alderwatch'},this.canvas,h('div',{class:'field-vignette'}),
      h('div',{class:'field-top'},h('div',{class:'field-location'},this.name,this.place),this.wallet),
      this.job,this.hint,this.near,pad,this.combat,this.result);
    mount.append(this.root);
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(this.root);
    document.addEventListener('keydown',event=>this.keyDown(event));
    document.addEventListener('keyup',event=>this.keys.delete(event.key.toLowerCase() in KEYS?event.key.toLowerCase():event.key));
    window.addEventListener('blur',()=>this.clearInput());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clearInput();});
    this.loop=this.loop.bind(this);
  }
  setOwner(owner,region){
    this.owner=owner;
    this.activeBattle=null;this.result.hidden=true;this.combat.hidden=true;
    const scene=SCENES[region]||SCENES.town;
    let saved;
    try{saved=JSON.parse(localStorage.getItem('cairn-field-position:'+owner));}catch{}
    const resume=saved?.region===scene.id&&Number.isInteger(saved.x)&&Number.isInteger(saved.y)&&walkable(scene,saved.x,saved.y);
    this.enter(scene.id,resume?{x:saved.x,y:saved.y}:scene.spawn);
  }
  enter(region,position){
    if(!SCENES[region])return;
    this.region=region;this.scene=SCENES[region];this.position=copy(position||this.scene.spawn);
    this.visual=coords(this.position);this.facing=2;this.path=[];this.pending=null;this.targetSpot=null;this.movement=null;
    this.result.hidden=true;
    this.clearInput();
    if(!this.backgrounds.has(region))this.backgrounds.set(region,paintScene(this.scene));
    this.background=this.backgrounds.get(region);
    this.context.area(region);
    this.savePosition();
    this.updatePlayer();
    this.resize();
    this.camera(this.visual,100);
    this.paint();
    if(!this.frame)this.frame=requestAnimationFrame(this.loop);
  }
  travel(region){
    const from=this.region;
    this.enter(region,exitCell(SCENES[region],from));
  }
  clearInput(){this.keys.clear();this.touchDirection=null;}
  isPaused(){return this.context.paused()||document.hidden;}
  savePosition(){
    if(this.region==='home'||this.activeBattle)return;
    try{localStorage.setItem('cairn-field-position:'+this.owner,JSON.stringify({region:this.region,...this.position}));}catch{}
  }
  updatePlayer(){
    const {p}=this.context.state;
    if(!p||!this.scene)return;
    const home=this.region==='home';
    text(this.name,home?(this.context.state.visited?this.context.state.visited.name+'’s house':'Your house'):LOCATIONS[this.region].name);
    text(this.place,home?'Alderwatch':LOCATIONS[this.region].title);
    text(this.wallet,'◆ '+p.gold.toLocaleString()+' gold');
    this.updateJob();
  }
  updateJob(){
    const {p}=this.context.state;
    const job=p?.activity;
    this.job.hidden=!job&&!p?.ticket&&!p?.report||!!this.activeBattle;
    if(this.job.hidden)return;
    if(job){
      const act=ACTIVITIES[job.kind][job.key];
      text(this.jobLabel,act.name);
      const remaining=Math.max(0,(Date.now()-job.cursor)/1000);
      text(this.jobTime,Math.floor(remaining/job.seconds)+' ready · '+timeText(job.seconds-remaining%job.seconds)+' to next');
    }else if(p.ticket){
      text(this.jobLabel,'Encounter in progress');text(this.jobTime,'Resume or abandon');
    }else{
      text(this.jobLabel,'Last field report');text(this.jobTime,'View rewards');
    }
  }
  resize(){
    if(!this.scene)return;
    const {width,height}=this.canvas.getBoundingClientRect();
    if(!width||!height)return;
    this.zoom=width<600?(height<440?2.15:2.55):width<1000?2.7:3.15;
    const w=Math.max(1,Math.round(width/this.zoom)),heightPixels=Math.max(1,Math.round(height/this.zoom));
    if(this.canvas.width!==w||this.canvas.height!==heightPixels){
      this.canvas.width=w;this.canvas.height=heightPixels;this.draw.imageSmoothingEnabled=false;
      this.camera(this.visual,100);this.paint();
    }
  }
  camera(player,dt){
    const w=this.canvas.width,h=this.canvas.height;
    const x=this.background.width<w?(this.background.width-w)/2:clamp(player.x-w/2,0,this.background.width-w);
    const y=this.background.height<h?(this.background.height-h)/2:clamp(player.y-h/2,0,this.background.height-h);
    const follow=Math.min(1,dt*13);
    this.anchor.x+=(x-this.anchor.x)*follow;
    this.anchor.y+=(y-this.anchor.y)*follow;
  }
  keyDown(event){
    if(this.isPaused()||event.altKey||event.metaKey||event.ctrlKey||isTextEntry(event.target))return;
    const key=event.key.length===1?event.key.toLowerCase():event.key;
    if(key in KEYS){
      event.preventDefault();this.keys.add(key);this.path=[];this.pending=null;
      return;
    }
    if(event.repeat)return;
    if(key==='e'){event.preventDefault();this.interact();return;}
    const battle=this.activeBattle;
    if(!battle)return;
    if(key==='1')battle.act('guard');
    if(key==='2')battle.act('dodge');
    if(key==='3')battle.act('special');
    if(key==='4'){
      const id=Object.keys(battle.supplies).find(id=>battle.supplies[id]>0&&ITEMS[id].heal);
      if(id)battle.act('consume',id);
    }
  }
  point(event){
    if(event.button!==0||this.isPaused())return;
    const rect=this.canvas.getBoundingClientRect(), x=(event.clientX-rect.left)*this.canvas.width/rect.width+this.anchor.x;
    const y=(event.clientY-rect.top)*this.canvas.height/rect.height+this.anchor.y;
    const cell={x:Math.floor(x/TILE),y:Math.floor(y/TILE)};
    const battle=this.activeBattle;
    if(battle){
      if(!battle.finished){
        this.path=route(this.scene,this.position,[cell],battle.bounds)||[];
        this.pending=null;
      }
      return;
    }
    const hit=this.spots().filter(spot=>{
      const point=coords(spot);
      return Math.abs(point.x-x)<=11&&y>=point.y-17&&y<=point.y+5;
    }).sort((a,b)=>Math.abs(coords(a).y-5-y)-Math.abs(coords(b).y-5-y))[0];
    if(hit){this.toSpot(hit);return;}
    this.pending=null;
    this.path=route(this.scene,this.position,[cell])||[];
  }
  spots(){
    const p=this.context.state.p;
    return this.scene.spots.filter(s=>s.kind!=='discovery'||p?.discovery);
  }
  toSpot(spot){
    if(!spot||this.activeBattle||this.isPaused())return false;
    const steps=route(this.scene,this.position,interactionCells(spot));
    if(!steps){
      this.context.notice('There is no clear path to '+spot.name+'.',true);return false;
    }
    this.path=steps;this.pending=spot;
    if(!steps.length&&!this.movement)this.arrive();
    return true;
  }
  toGate(id){return this.toSpot(this.spots().find(s=>s.kind==='gate'&&s.id===id));}
  arrive(){
    const target=this.pending;
    if(target&&distance(target,this.position)<=1){
      this.pending=null;this.path=[];this.context.interact(target);
    }
  }
  interact(){
    if(this.isPaused()||this.activeBattle||!this.targetSpot)return;
    this.path=[];this.pending=null;
    this.context.interact(this.targetSpot);
  }
  go(direction){
    if(this.isPaused()||this.movement)return false;
    const [dx,dy]=DIRECTIONS[direction];
    const next={x:this.position.x+dx,y:this.position.y+dy};
    this.facing=direction;
    const battle=this.activeBattle;
    if(battle){
      if(!battle.move(dx,dy))return false;
    }else if(!walkable(this.scene,next.x,next.y))return false;
    const from={...this.visual};
    this.position=next;
    this.movement={from,to:coords(next),start:this.clock,end:this.clock+.135};
    return true;
  }
  battle(enemy,ticket){
    if(this.activeBattle)return;
    if(this.region!==enemy.region)this.enter(enemy.region);
    const monster=this.scene.spots.find(spot=>spot.id===enemy.id),b=this.scene.arenas[enemy.id];
    const edge={x:monster.x,y:b.bottom-1};
    const p=walkable(this.scene,this.position.x,this.position.y,b)&&!sameCell(this.position,monster)?this.position:edge;
    this.position=copy(p);this.visual=coords(p);this.movement=null;this.clearInput();this.pending=null;this.path=[];
    const battle=new Battle(enemy,ticket.stats,ticket.supplies,ticket.seed,this.scene,p,monster);
    this.activeBattle=battle;
    this.foePoint=coords(monster);
    this.ticket=ticket;
    this.effect=null;
    this.result.hidden=true;
    this.combat.hidden=false;
    this.near.hidden=true;
    this.hint.hidden=true;
    this.battleControls(battle);
    this.updateJob();
  }
  battleControls(battle){
    const warning=h('p',{class:'field-warning',role:'status'});
    const health=h('span'),foe=h('span'),hp=bar(100),enemyHp=bar(100);
    enemyHp.classList.add('foe-health');
    const panel=h('div',{class:'field-battle-hud'},h('div',{class:'field-health'},h('div',{},health,hp),h('div',{},foe,enemyHp)),warning);
    const guard=button('Guard',()=>battle.act('guard'),{small:true});
    const dodge=button('Dodge',()=>battle.act('dodge'),{small:true});
    const special=button(battle.stats.special,()=>battle.act('special'),{small:true,style:'primary'});
    const retreat=button('Retreat',()=>battle.finish(false),{small:true,style:'ghost',extra:'field-retreat'});
    const supplies=Object.keys(battle.supplies).map(id=>[id,button('',()=>battle.act('consume',id),{small:true,style:'ghost'})]);
    const actions=h('div',{class:'field-actions'},guard,dodge,special,supplies.map(([,b])=>b),retreat);
    this.combat.replaceChildren(panel,actions);
    this.controls={warning,health,foe,hp:hp.firstElementChild,enemyHp:enemyHp.firstElementChild,guard,dodge,special,supplies,actions};
  }
  drawBattle(battle){
    const {warning,health,foe,hp,enemyHp,guard,dodge,special,supplies}=this.controls;
    text(health,this.context.state.p.name+' · '+battle.hp+'/'+battle.stats.max);
    text(foe,battle.enemy.name+' · '+battle.foe+'/'+battle.enemy.hp);
    hp.style.width=100*battle.hp/battle.stats.max+'%';
    enemyHp.style.width=100*battle.foe/battle.enemy.hp+'%';
    const t=battle.telegraph;
    text(warning,battle.finished?'':t?t.name+'! '+t.help:battle.inRange?'In range · Basic attacks are automatic.':'Move toward the enemy to attack.');
    const ready=(node,label,until,blocked=false)=>{
      const seconds=Math.ceil(until-battle.time);
      node.disabled=seconds>0||blocked;
      text(node,seconds>0?label+' '+seconds+'s':label);
    };
    ready(guard,'Guard',battle.guardAt);
    ready(dodge,'Dodge',battle.dodgeAt);
    ready(special,battle.stats.special,battle.specialAt,!battle.inRange);
    for(const [id,node] of supplies)ready(node,ITEMS[id].name+' ×'+battle.supplies[id],battle.foodAt,
      !battle.supplies[id]||!!ITEMS[id].heal&&battle.hp===battle.stats.max);
  }
  async settle(battle){
    if(this.settling||this.activeBattle!==battle)return;
    this.controls.actions.hidden=true;
    this.settling=true;this.result.hidden=false;
    this.result.replaceChildren(h('span',{},'Recording encounter…'));
    const report=await this.context.finish(this.ticket,battle.outcome());
    this.settling=false;
    if(this.activeBattle!==battle)return;
    if(report){
      this.result.replaceChildren(h('strong',{},battle.win?'Victory':'Retreated'),
        button('Loot and results',()=>{this.result.hidden=true;this.context.report(report);},{small:true,style:'primary'}),
        button('Dismiss',()=>{this.result.hidden=true;},{small:true,style:'ghost'}));
      this.activeBattle=null;this.combat.hidden=true;this.path=[];this.pending=null;
      this.savePosition();this.context.updated();
    }else this.result.replaceChildren(h('span',{},'Reconnect to record this result.'),
      button('Retry',()=>this.settle(battle),{small:true,style:'primary'}));
  }
  updateMovement(dt){
    const battle=this.activeBattle;
    if(this.movement){
      const {from,to,start,end}=this.movement;
      const step=clamp((this.clock-start)/(end-start),0,1);
      this.visual={x:from.x+(to.x-from.x)*step,y:from.y+(to.y-from.y)*step};
      if(step===1){
        this.movement=null;this.savePosition();
        if(!this.path.length)this.arrive();
      }
    }
    if(battle){
      battle.step(dt);
      const goal=coords(battle.enemyPos);
      const pace=Math.min(1,dt*(battle.telegraph?12:17));
      this.foePoint.x+=(goal.x-this.foePoint.x)*pace;this.foePoint.y+=(goal.y-this.foePoint.y)*pace;
      if(!sameCell(this.position,battle.position)){
        this.position=copy(battle.position);this.visual=coords(this.position);this.movement=null;this.path=[];
      }
    }
    if(this.movement)return;
    const key=[...this.keys].at(-1);
    const direction=this.touchDirection??KEYS[key];
    if(direction!==undefined&&direction!==null){this.go(direction);return;}
    if(this.path.length){
      const next=this.path[0];
      const heading=DIRECTIONS.findIndex(([dx,dy])=>this.position.x+dx===next.x&&this.position.y+dy===next.y);
      if(heading===-1||!this.go(heading)){this.path=[];this.pending=null;}
      else this.path.shift();
    }
  }
  updateNearby(){
    const battle=this.activeBattle;
    const nearest=battle?null:this.spots().filter(s=>distance(s,this.position)<=1)
      .sort((a,b)=>distance(a,this.position)-distance(b,this.position))[0];
    this.targetSpot=nearest||null;
    this.near.hidden=!nearest;
    this.hint.hidden=!!nearest||!!battle;
    if(nearest){text(this.target,nearest.name);text(this.action,controlText[nearest.kind]);}
  }
  sprite(key,build){
    if(!this.art.has(key)){
      if(this.art.size>120)this.art.clear();
      this.art.set(key,build());
    }
    return this.art.get(key);
  }
  label(c,message,x,y,color){
    c.font='8px system-ui';c.textAlign='center';c.textBaseline='middle';
    const w=Math.ceil(c.measureText(message).width)+8,left=Math.round(x-w/2),top=Math.round(y-6);
    c.fillStyle='#172421e9';c.fillRect(left,top,w,12);
    stroke(c,'#b7ac7970',left,top,w,12);
    c.fillStyle=color;c.fillText(message,Math.round(x),top+6);
  }
  paint(){
    if(!this.background)return;
    const c=this.draw,battle=this.activeBattle,scene=this.scene,p=this.context.state.p;
    if(!p)return;
    const w=this.canvas.width,height=this.canvas.height;
    c.setTransform(1,0,0,1,0,0);
    c.fillStyle='#151d1d';c.fillRect(0,0,w,height);
    c.save();c.translate(-Math.round(this.anchor.x),-Math.round(this.anchor.y));
    c.drawImage(this.background,0,0);
    if(battle){
      const b=battle.bounds;
      const x=b.left*TILE,y=b.top*TILE,width=(b.right-b.left+1)*TILE,h=(b.bottom-b.top+1)*TILE;
      stroke(c,'#e6c988ba',x,y,width,h);
      if(battle.telegraph)for(const cell of battle.telegraph.cells){
        const lx=cell.x*TILE,ly=cell.y*TILE;
        c.fillStyle=Math.sin(battle.time*27)>0?'#f6765777':'#e5685655';
        c.fillRect(lx,ly,TILE,TILE);stroke(c,'#ffd3929c',lx,ly,TILE,TILE);
      }
    }
    if(this.path.length){
      const end=coords(this.path.at(-1));
      stroke(c,'#ffe7a5d7',end.x-4,end.y-4,9,9);
    }
    const visible=(x,y)=>x>=this.anchor.x-25&&x<=this.anchor.x+w+25&&y>=this.anchor.y-25&&y<=this.anchor.y+height+25;
    const objects=[];
    for(const spot of this.spots()){
      const q=coords(spot);
      if(!visible(q.x,q.y)&&(!battle||spot.id!==battle.enemy.id))continue;
      if(spot.kind==='enemy'){
        const enemy=ENEMIES[spot.id],active=battle?.enemy.id===spot.id;
        if(active&&battle.finished&&battle.win)continue;
        const to=active?this.foePoint:{x:q.x+Math.sin(this.clock*1.45+spot.x)*3,y:q.y+Math.sin(this.clock*1.15+spot.y)*2};
        const art=this.sprite('enemy/'+enemy.id,()=>foeArt(enemy));
        const size=enemy.boss?34:28;
        objects.push({y:to.y,draw:()=>c.drawImage(art,Math.round(to.x-size/2),Math.round(to.y-size*.76),size,Math.round(size*.86))});
      }
      if(spot.npc){
        const x=q.x+(spot.kind==='shop'?10:9),y=q.y;
        const style={skin:spot.x%5,hair:spot.y%5,coat:(spot.x+spot.y)%6};
        objects.push({y,draw:()=>ranger(c,x,y,style,2,null,'',true)});
      }
    }
    if(scene.id==='home'){
      for(const [i,tile] of Object.entries((this.context.state.visited||p).house)){
        const x=(4+i%5)*TILE+8,y=(3+Math.floor(i/5))*TILE+13;
        const key=tile.kind+'/'+tile.id;
        const art=this.sprite(key,()=>tile.kind==='pet'?petArt(tile.traits,tile.name):furnishingArt(tile.id,tile.id));
        objects.push({y,draw:()=>c.drawImage(art,x-9,y-15,18,16)});
      }
    }
    const v=this.visual,pet=this.context.state.activePet;
    if(pet){
      const art=this.sprite('pet/'+pet.id,()=>petArt(pet.traits,pet.name));
      objects.push({y:v.y+2,draw:()=>c.drawImage(art,Math.round(v.x-18),Math.round(v.y-12+Math.sin(this.clock*4)),16,14)});
    }
    objects.push({y:v.y,draw:()=>{
      c.fillStyle='#fff0b45e';
      c.fillRect(Math.round(v.x)-7,Math.round(v.y)+2,15,1);
      c.fillRect(Math.round(v.x)-5,Math.round(v.y)+3,11,1);
      if(battle&&battle.guarding>battle.time)stroke(c,'#a4e0d8c9',Math.round(v.x)-8,Math.round(v.y)-19,17,21);
      ranger(c,v.x,v.y,p.appearance,this.facing,this.movement?this.clock*9:null,p.gear[p.equipped.weapon]?.base);
    }});
    objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
    if(!battle){
      const labels=this.spots().filter(spot=>distance(spot,this.position)<=(this.canvas.width<200?4:5)&&spot.id!==this.targetSpot?.id)
        .sort((a,b)=>distance(a,this.position)-distance(b,this.position)).slice(0,2);
      if(this.targetSpot)labels.unshift(this.targetSpot);
      for(const spot of labels){
        const q=coords(spot);
        if(visible(q.x,q.y)){
          const x=clamp(q.x,this.anchor.x+45,this.anchor.x+w-45);
          this.label(c,spot.name,x,q.y-(spot.kind==='enemy'||spot.npc?23:17),tagColor[spot.kind]||'#f1e1bf');
        }
      }
    }else if(this.effect&&this.clock-this.effect.at<.8){
      const hit=['hit','crit'].includes(this.effect.kind);
      const spot=hit?this.foePoint:v;
      const lift=Math.floor((this.clock-this.effect.at)*10);
      if(hit&&lift<3)stroke(c,'#fff0bdc4',Math.round(spot.x)-11,Math.round(spot.y)-19,23,20);
      this.label(c,this.effect.text,spot.x,spot.y-29-lift,hit?'#ffda8f':this.effect.kind==='hurt'?'#ffae95':'#c7eddf');
    }
    c.restore();
  }
  loop(now){
    this.frame=0;
    if(!this.context.state.p)return;
    const dt=Math.min(.09,(now-(this.previous??now))/1000);
    this.previous=now;
    if(!this.isPaused()){
      this.clock+=dt;this.updateMovement(dt);this.updateNearby();
      if(this.activeBattle){
        const battle=this.activeBattle;
        const event=battle.events.splice(0).reverse().find(e=>e.text&&e.kind!=='warn');
        if(event)this.effect={...event,at:this.clock};
        this.drawBattle(battle);
        if(battle.finished&&!this.settling&&this.controls.actions.hidden===false)this.settle(battle);
      }
      this.camera(this.visual,dt);
      this.paint();
    }
    this.frame=requestAnimationFrame(this.loop);
  }
  pauseInput(){
    this.clearInput();this.path=[];this.pending=null;
  }
  resume(){
    this.resize();
    if(!this.frame&&this.scene)this.frame=requestAnimationFrame(this.loop);
  }
}
