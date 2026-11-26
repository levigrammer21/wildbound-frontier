import {ITEMS} from './content.js';
import {damage,random} from './engine.js';

const PATTERNS={
  charge:['Charge','Move out of the marked lane.'],
  cast:['Hex','Two lanes light up. Move to an unmarked lane.'],
  duel:['Blade arc','Block or move beyond the swing.'],
  quake:['Groundquake','Reach the far lanes or guard.'],
  pounce:['Pounce','Leave the target lane before impact.']
};
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
export class Battle {
  constructor(enemy,stats,supplies,seed){
    this.enemy=enemy; this.stats=stats; this.supplies={...supplies}; this.rng=random(seed);
    this.hp=stats.max; this.foe=enemy.hp; this.position=1; this.enemyPos=4;
    this.time=0; this.nextHit=1.4; this.nextBasic=.35; this.nextMove=1.05;
    this.specialAt=0; this.guardAt=0; this.dodgeAt=0; this.foodAt=0;
    this.guarding=0; this.evading=0; this.ward=0; this.fury=0; this.pin=0;
    this.telegraph=null; this.events=[]; this.used={}; this.finished=false; this.win=false; this.cycle=0;
  }
  move(delta){
    if(this.finished||this.time<this.moveAt)return;
    this.position=clamp(this.position+delta,0,4); this.moveAt=this.time+.18;
    this.signal('move','');
  }
  step(delta){
    if(this.finished)return;
    this.time+=delta;
    if(this.time>=this.nextMove){
      if(!this.telegraph&&this.time>this.pin&&Math.abs(this.position-this.enemyPos)>(this.enemy.pattern==='cast'?2:1)){
        this.enemyPos+=Math.sign(this.position-this.enemyPos);
        this.signal('advance','');
      }
      this.nextMove=this.time+this.enemy.speed;
    }
    if(this.time>=this.nextBasic&&Math.abs(this.position-this.enemyPos)<=this.stats.reach){
      this.nextBasic=this.time+this.stats.speed;
      this.hit(this.stats.attack,'Strike');
    }
    if(this.finished)return;
    if(this.telegraph&&this.time>=this.telegraph.at){
      this.enemyAttack(this.telegraph);
      this.telegraph=null;
      this.nextHit=this.time+1.0+this.enemy.speed;
    }else if(!this.telegraph&&this.time>=this.nextHit){
      this.telegraph=this.windup();
      this.signal('warn',this.telegraph.name);
    }
    if(this.hp<=0||this.time>=150)this.finish(false);
  }
  windup(){
    const {pattern,boss}=this.enemy;
    let lanes;
    const p=this.position;
    const e=this.enemyPos;
    const ashen=boss&&this.foe<this.enemy.hp*.48;
    if(pattern==='charge')lanes=ashen?[p,clamp(p+(p<=2?1:-1),0,4)]:[p];
    if(pattern==='cast')lanes=[p,(p+2)%5,...(ashen?[(p+3)%5]:[])];
    if(pattern==='duel')lanes=[e-1,e,e+1,...(ashen?[e-2,e+2]:[])];
    if(pattern==='quake')lanes=ashen?[0,1,2,3]:[1,2,3];
    if(pattern==='pounce')lanes=[p,...(ashen?[(p+1)%5]:[])];
    const [name,help]=PATTERNS[pattern];
    return {lanes,at:this.time+(ashen?.85:1.15),name,help,heavy:ashen||this.cycle++%3===2};
  }
  enemyAttack(t){
    if(!t.lanes.includes(this.position)||this.evading>this.time){
      this.signal('miss','Evaded');
      return;
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
  act(key,arg){
    if(this.finished)return false;
    if(key==='guard'&&this.time>=this.guardAt){
      this.guarding=this.time+1.7;this.guardAt=this.time+3.4;this.signal('block','Guard raised');return true;
    }
    if(key==='dodge'&&this.time>=this.dodgeAt){
      this.dodgeAt=this.time+4.2;this.evading=this.time+.63;
      this.position=clamp(this.position+(this.position===4?-1:1),0,4);this.signal('miss','Sidestep');return true;
    }
    if(key==='special'&&this.time>=this.specialAt&&Math.abs(this.position-this.enemyPos)<=this.stats.reach){
      this.specialAt=this.time+(this.stats.type==='Dagger'?5.2:6.8);
      let power={Sword:1.9,Dagger:2.25,Spear:1.7,Bow:1.5,Staff:2.4,Greatsword:2.55}[this.stats.type]||1.8;
      if(this.telegraph){
        this.telegraph.at+=.54;
        if(this.stats.type==='Sword'||this.stats.type==='Greatsword')power+=.43;
      }
      if(this.stats.type==='Bow'||this.stats.type==='Spear')this.pin=this.time+3.5;
      this.hit(power*this.stats.attack,this.stats.special); return true;
    }
    if(key==='consume'&&this.time>=this.foodAt&&this.supplies[arg]>0){
      const item=ITEMS[arg];
      if(!item?.heal&&!item?.boost||item.heal&&this.hp===this.stats.max)return false;
      this.supplies[arg]--; this.used[arg]=(this.used[arg]||0)+1;this.foodAt=this.time+2.8;
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
