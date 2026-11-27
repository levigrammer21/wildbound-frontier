import {ITEMS} from './content.js';
import {damage,random} from './engine.js';
import {DIRECTIONS,distance,route,sameCell,walkable} from './field-data.js';

const PATTERNS={
  charge:['Charge','Step sideways out of the charging line.'],
  cast:['Hex','Leave the marked ground before the spell lands.'],
  duel:['Blade arc','Back away from the swing or time a guard.'],
  quake:['Groundquake','Move between the crossing shockwaves.'],
  pounce:['Pounce','Leave the marked landing area.']
};
const adjacent=(a,b)=>({x:b.x-a.x,y:b.y-a.y});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class Battle {
  constructor(enemy,stats,supplies,seed,scene,player,monster){
    this.enemy=enemy;this.stats=stats;this.supplies={...supplies};this.rng=random(seed);
    this.scene=scene;this.bounds=scene.arenas[enemy.id];
    this.position={...player};this.enemyPos={...monster};
    this.hp=stats.max;this.foe=enemy.hp;
    this.time=0;this.nextHit=1.6;this.nextBasic=.35;this.nextMove=.52;this.moveAt=0;
    this.specialAt=0;this.guardAt=0;this.dodgeAt=0;this.foodAt=0;
    this.guarding=0;this.evading=0;this.ward=0;this.fury=0;this.pin=0;this.facing=[0,-1];
    this.telegraph=null;this.events=[];this.used={};this.finished=false;this.win=false;this.cycle=0;
  }
  get inRange(){return distance(this.position,this.enemyPos)<=this.stats.reach;}
  move(dx,dy){
    if(this.finished||this.time<this.moveAt||Math.abs(dx)+Math.abs(dy)!==1)return false;
    this.facing=[dx,dy];
    const next={x:this.position.x+dx,y:this.position.y+dy};
    if(!walkable(this.scene,next.x,next.y,this.bounds)||sameCell(next,this.enemyPos))return false;
    this.position=next;this.moveAt=this.time+.135;
    return true;
  }
  step(delta){
    if(this.finished)return;
    this.time+=delta;
    if(this.time>=this.nextMove){
      this.nextMove=this.time+Math.max(.29,this.enemy.speed*.44);
      const gap=distance(this.position,this.enemyPos);
      if(!this.telegraph&&this.time>=this.pin&&gap>(this.enemy.pattern==='cast'?3:1)){
        const around=DIRECTIONS.map(([dx,dy])=>({x:this.position.x+dx,y:this.position.y+dy}));
        const next=route(this.scene,this.enemyPos,around,this.bounds)?.[0];
        if(next)this.enemyPos=next;
      }
    }
    if(this.time>=this.nextBasic&&this.inRange){
      this.nextBasic=this.time+this.stats.speed;
      this.hit(this.stats.attack,'Strike');
    }
    if(this.finished)return;
    if(this.telegraph&&this.time>=this.telegraph.at){
      this.enemyAttack(this.telegraph);
      this.telegraph=null;
      this.nextHit=this.time+1.05+this.enemy.speed;
    }else if(!this.telegraph&&this.time>=this.nextHit){
      this.telegraph=this.windup();
      this.signal('warn',this.telegraph.name);
    }
    if(this.hp<=0||this.time>=150)this.finish(false);
  }
  windup(){
    const {pattern,boss}=this.enemy;
    const p=this.position,e=this.enemyPos,b=this.bounds;
    const phase=boss&&this.foe<this.enemy.hp*.48;
    const d=adjacent(e,p);
    const horizontal=Math.abs(d.x)>=Math.abs(d.y)&&d.x!==0;
    const sign=Math.sign(horizontal?d.x:d.y)||1;
    const danger=(x,y)=>{
      if(pattern==='charge'){
        const along=horizontal?x-e.x:y-e.y;
        const side=horizontal?y-e.y:x-e.x;
        return along*sign>=0&&Math.abs(side)<=(phase?1:0);
      }
      if(pattern==='cast'){
        const offset={x:clamp(2*e.x-p.x,b.left,b.right),y:clamp(2*e.y-p.y,b.top,b.bottom)};
        return distance(p,{x,y})<=1||distance(offset,{x,y})<=(phase?2:1);
      }
      if(pattern==='duel')return distance(e,{x,y})<=(phase?3:2);
      if(pattern==='quake')return Math.abs(p.x-x)<=(phase?1:0)||Math.abs(p.y-y)<=(phase?1:0);
      return Math.max(Math.abs(p.x-x),Math.abs(p.y-y))<=(phase?2:1);
    };
    const cells=[];
    for(let y=b.top;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++)if(danger(x,y))cells.push({x,y});
    const [name,help]=PATTERNS[pattern];
    return {cells,at:this.time+(phase?1.04:1.27),name,help,heavy:phase||this.cycle++%3===2,
      target:{...p}};
  }
  enemyAttack(t){
    if(this.enemy.pattern==='pounce'||this.enemy.pattern==='charge'){
      const options=[t.target,...DIRECTIONS.map(([dx,dy])=>({x:t.target.x+dx,y:t.target.y+dy}))];
      const landing=options.find(next=>!sameCell(next,this.position)&&walkable(this.scene,next.x,next.y,this.bounds));
      if(landing)this.enemyPos=landing;
    }
    if(!t.cells.some(cell=>sameCell(cell,this.position))||this.evading>this.time){
      this.signal('miss','Evaded');return;
    }
    const guard=this.guarding>this.time;
    const protection=this.stats.defence+(this.ward>this.time?14:0);
    const raw=damage(this.enemy.attack*(t.heavy?1.55:1),protection);
    const amount=guard?Math.max(1,Math.round(raw*.32)):raw;
    this.hp=Math.max(0,this.hp-amount);
    this.signal(guard?'block':'hurt',guard?'Guard −'+amount:'−'+amount+' HP');
  }
  hit(power,label){
    const crit=this.rng()<this.stats.crit/100;
    const amount=damage(power*(crit?1.7:1)*(this.fury>this.time?1.28:1),this.enemy.defence);
    this.foe=Math.max(0,this.foe-amount);
    this.hp=Math.min(this.stats.max,this.hp+Math.floor(amount*this.stats.leech/100));
    this.signal(crit?'crit':'hit',label+' '+amount);
    if(!this.foe)this.finish(true);
  }
  act(k,arg){
    if(this.finished)return false;
    if(k==='guard'&&this.time>=this.guardAt){
      this.guarding=this.time+1.45;this.guardAt=this.time+3.4;this.signal('block','Guard raised');return true;
    }
    if(k==='dodge'&&this.time>=this.dodgeAt){
      this.dodgeAt=this.time+4.2;this.evading=this.time+.66;
      const [dx,dy]=this.facing;
      for(let i=0;i<2;i++){
        const next={x:this.position.x+dx,y:this.position.y+dy};
        if(!walkable(this.scene,next.x,next.y,this.bounds)||sameCell(next,this.enemyPos))break;
        this.position=next;
      }
      this.moveAt=this.time+.16;this.signal('miss','Dodge');return true;
    }
    if(k==='special'&&this.time>=this.specialAt&&this.inRange){
      this.specialAt=this.time+(this.stats.type==='Dagger'?5.2:6.8);
      let power={Sword:1.9,Dagger:2.25,Spear:1.7,Bow:1.5,Staff:2.4,Greatsword:2.55}[this.stats.type]||1.8;
      if(this.telegraph){
        this.telegraph.at+=.42;
        if(this.stats.type==='Sword'||this.stats.type==='Greatsword')power+=.43;
      }
      if(this.stats.type==='Bow'||this.stats.type==='Spear')this.pin=this.time+3.5;
      this.hit(power*this.stats.attack,this.stats.special);return true;
    }
    if(k==='consume'&&this.time>=this.foodAt&&this.supplies[arg]>0){
      const item=ITEMS[arg];
      if((!item?.heal&&!item?.boost)||(item.heal&&this.hp===this.stats.max))return false;
      this.supplies[arg]--;this.used[arg]=(this.used[arg]||0)+1;this.foodAt=this.time+2.8;
      if(item.heal)this.hp=Math.min(this.stats.max,this.hp+Math.round(item.heal*(1+this.stats.healing/100)));
      if(item.boost)this[item.boost]=this.time+10;
      this.signal('heal',item.name);return true;
    }
    return false;
  }
  signal(kind,text){this.events.push({kind,text});}
  finish(win){
    this.finished=true;this.win=win;this.telegraph=null;
    this.signal(win?'victory':'defeat',win?'Victory':'Retreated');
  }
  outcome(){return {win:this.win,used:this.used,time:this.time};}
}
