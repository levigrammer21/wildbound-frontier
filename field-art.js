import {COAT,HAIR,SKIN} from './art.js';
import {TILE} from './field-data.js';

const ink='#273031';
const hash=(x,y,i=0)=>Math.imul(x*521+y*859+i*173+59,2654435761)>>>0;
const r=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function poly(c,color,points){
  c.fillStyle=color;c.beginPath();
  c.moveTo(...points[0]);
  for(const point of points.slice(1))c.lineTo(...point);
  c.closePath();c.fill();
}
function grass(c,p,x,y,salt){
  r(c,p[0],x,y,16,16);
  for(let i=0;i<8;i++){
    const n=hash(x,y,i+salt);
    r(c,p[i%3===0?2:1],x+(n%13),y+((n>>>9)%14),1+((n>>>7)%3),1);
  }
  const n=hash(y,x,salt);
  if(n%8===0){
    r(c,p[2],x+5,y+8,1,4);r(c,p[3],x+4,y+7,1,2);r(c,p[1],x+6,y+9,2,1);
  }
  if(n%17===0){
    r(c,p[2],x+11,y+4,1,3);r(c,['#d6b575','#ce90a7','#a4c9b8'][n%3],x+10,y+3,3,2);
  }
}
function tiles(c,map,x,y,kind,p){
  const px=x*TILE,py=y*TILE,n=hash(x,y);
  grass(c,p,px,py,n%997);
  if(kind==='grass')return;
  if(kind==='void'){r(c,'#141a1c',px,py,16,16);return;}
  if(kind==='water'){
    r(c,p[8],px,py,16,16);
    r(c,p[7],px+1,py+1,15,14);
    for(let i=0;i<5;i++){
      const d=hash(x,y,i);
      r(c,i===1?p[9]:p[8],px+(d%10),py+((d>>>8)%15),2+(d%4),1);
    }
    for(const [dx,dy,sx,sy,w,h] of [[-1,0,0,0,2,16],[1,0,14,0,2,16],[0,-1,0,0,16,2],[0,1,0,14,16,2]]){
      const near=map.terrain[(y+dy)*map.w+x+dx];
      if(near&&near!=='water'&&near!=='bridge')r(c,p[10],px+sx,py+sy,w,h);
    }
    return;
  }
  if(kind==='bridge'||kind==='floor'){
    r(c,kind==='floor'?'#6d4d3d':'#4c4537',px,py,16,16);
    for(let j=0;j<4;j++){
      r(c,j%2?'#916c4e':'#a47d55',px,py+j*4,16,3);
      r(c,'#bd9369',px+(n%7),py+j*4,5,1);
      r(c,'#584635',px+((x+j)%3)*5,py+j*4,1,4);
    }
    return;
  }
  if(kind==='wall'){
    r(c,'#302932',px,py,16,16);
    r(c,'#665650',px,py+2,16,12);
    r(c,'#94735d',px,py+2,16,3);
    r(c,'#503e40',px+2,py+7,13,4);
    r(c,'#826a55',px+7,py+5,2,8);
    return;
  }
  if(kind==='farm'){
    r(c,'#655341',px,py,16,16);
    for(let j=1;j<16;j+=5){
      r(c,'#7d6149',px+1,py+j,14,3);
      for(const x of [3,9,13]){
        r(c,'#97ab65',px+x,py+j,1,3);r(c,'#6f9256',px+x+1,py+j+1,2,1);
      }
    }
    return;
  }
  if(kind==='stone'||kind==='ruin'){
    const mortar=map.id==='town'?'#6e6b58':p[5];
    const base=map.id==='town'?['#878073','#8f8877','#857f6e']: [p[6],p[6],p[9]];
    const light=map.id==='town'?'#9a907a':p[6];
    r(c,mortar,px,py,16,16);
    for(let j=0;j<3;j++){
      const top=py+j*5+(y%2&&j===0?0:1);
      const offset=(y+j)%2*4;
      r(c,base[hash(y,x,j)%base.length],px,top,16,4);
      r(c,mortar,px+offset,top,1,4);
      r(c,mortar,px+offset+8,top,1,4);
      if(n%4===j)r(c,light,px+offset+1,top,5,1);
    }
    if(kind==='ruin'&&n%4===0)r(c,p[0],px+2,py+3,4,2);
    return;
  }
  const field=kind==='field';
  const base=field?p[1]:p[4];
  r(c,base,px,py,16,16);
  const edge=field?p[0]:p[5];
  for(let i=0;i<11;i++){
    const d=hash(y,x,i);
    r(c,i%3===0?p[3]:edge,px+(d%13),py+((d>>>8)%15),1+(d%3),1);
  }
  for(const [dx,dy,sx,sy,w,h] of [[-1,0,0,0,2,16],[1,0,14,0,2,16],[0,-1,0,0,16,2],[0,1,0,14,16,2]]){
    if(map.terrain[(y+dy)*map.w+x+dx]==='grass')r(c,edge,px+sx,py+sy,w,h);
  }
}
function tree(c,map,x,y,size){
  const p=map.colors, x0=x+(size-1), y0=y-5-size, snow=map.id==='frost';
  r(c,'#212f344f',x-10,y+2,21,5);r(c,'#534139',x-2,y-13,5,17);
  r(c,'#8a6850',x-1,y-6,2,8);r(c,p[10],x-4,y+2,2,2);
  if(map.id==='march'){
    r(c,p[10],x-3,y-21,5,22);r(c,'#9a8064',x-2,y-20,3,12);
    poly(c,p[10],[[x,y-14],[x-10,y-21],[x-11,y-28],[x-8,y-24],[x-5,y-21],[x,y-19],[x+4,y-25],[x+10,y-29],[x+7,y-22],[x+5,y-14]]);
    r(c,'#bbae78',x+6,y-26,3,1);r(c,'#86634b',x-5,y-14,4,2);
    return;
  }
  const canopy=[[-13,-11],[-13,-18],[-9,-18],[-9,-23],[-4,-23],[-4,-27],[4,-27],[4,-24],[9,-24],[9,-20],[13,-20],[13,-10],[10,-10],[10,-6],[3,-6],[3,-3],[-7,-3],[-7,-7],[-11,-7],[-11,-11]];
  if(snow){
    poly(c,p[10],[[x0,y0-29],[x0-9,y0-19],[x0-5,y0-19],[x0-12,y0-10],[x0-7,y0-10],[x0-14,y0-1],[x0+14,y0-1],[x0+7,y0-10],[x0+12,y0-10],[x0+5,y0-19],[x0+9,y0-19]]);
    for(const j of [0,1,2]){
      const top=y0-28+j*9,w=6+j*2;
      poly(c,p[11],[[x0,top],[x0-w,top+10],[x0+w,top+10]]);
      r(c,p[13],x0-w+2,top+7,w+1,2);r(c,p[3],x0-w+5,top+5,5,2);
    }
    return;
  }
  poly(c,p[10],canopy.map(([a,b])=>[x0+a,y0+b+2]));
  poly(c,p[11],canopy.map(([a,b])=>[x0+a,y0+b]));
  for(const [a,b,w,h] of [[-9,-18,12,6],[-4,-22,9,5],[-5,-13,13,5],[-9,-10,7,3],[3,-18,7,6]]){
    r(c,p[12],x0+a,y0+b,w,h);
    r(c,p[13],x0+a+1,y0+b,Math.ceil(w*.6),2);
  }
  for(const [a,b] of [[-8,-14],[5,-14],[1,-8],[-6,-20]])r(c,p[11],x0+a,y0+b,3,1);
}
function house(c,{x,y,w,h,colors,door,id}){
  const a=x*16,b=y*16,width=w*16,height=h*16;
  const [shade,roof,light]=colors;
  r(c,'#22343070',a+3,b+8,width+7,height-1);
  r(c,'#342b31',a,b+6,width,height-4);
  r(c,'#74634f',a+2,b+12,width-4,height-12);
  for(let i=6;i<width;i+=12){
    r(c,'#91765b',a+i,b+height-12,6,3);
    r(c,'#4c423b',a+i-1,b+height-2,7,1);
  }
  const top=b-4, ridge=b+Math.floor(height*.28), last=b+Math.floor(height*.69);
  poly(c,ink,[[a-4,ridge],[a+6,top],[a+width-7,top],[a+width+4,ridge],[a+width+4,last],[a-4,last]]);
  poly(c,roof,[[a-1,ridge],[a+8,top+2],[a+width-9,top+2],[a+width+1,ridge],[a+width+1,last-3],[a-1,last-3]]);
  poly(c,light,[[a,ridge],[a+9,top+2],[a+width-10,top+2],[a+width,ridge]]);
  for(let j=ridge+3;j<last-2;j+=4){
    r(c,shade,a-1,j,width+2,1);
    for(let i=(j%8)*2+1;i<width;i+=9)r(c,shade,a+i,j+1,1,3);
  }
  r(c,shade,a-1,ridge,width+2,3);r(c,light,a+1,last-4,width-2,1);
  const front=b+height, dx=door*16+8;
  r(c,ink,dx-6,front-16,12,16);
  r(c,'#594537',dx-4,front-13,8,13);r(c,'#8f674b',dx-3,front-12,4,11);
  r(c,'#e0b364',dx+1,front-7,1,2);
  r(c,'#b19b7c',dx-9,front,18,2);
  for(const wx of [a+11,a+width-17]){
    r(c,'#392d31',wx,front-16,8,9);r(c,'#d4a165',wx+1,front-15,6,7);
    r(c,'#6e5141',wx+3,front-15,1,7);r(c,'#6e5141',wx+1,front-12,6,1);
  }
  if(id!=='home'){
    r(c,'#4e413c',a+width-18,top-5,9,13);
    r(c,'#816758',a+width-17,top-7,7,3);
    r(c,'#ba9474',a+width-17,top-7,7,1);
  }
  r(c,'#3b3033',a+6,front-2,2,2);
  r(c,'#3b3033',a+width-8,front-2,2,2);
}
function stone(c,p,x,y,copper=false){
  const q=copper?['#5d5149','#8f7770','#b19b83']:p;
  const dark=copper?q[0]:q[10],mid=copper?q[1]:q[6],light=copper?q[2]:q[9];
  poly(c,dark,[[x-11,y+2],[x-12,y-3],[x-5,y-12],[x+3,y-14],[x+11,y-7],[x+11,y+3]]);
  poly(c,mid,[[x-10,y],[x-10,y-4],[x-4,y-11],[x+3,y-12],[x+9,y-6],[x+9,y+1]]);
  poly(c,light,[[x-9,y-4],[x-4,y-10],[x+3,y-11],[x+6,y-8],[x+1,y-7],[x-4,y-4]]);
  r(c,light,x-4,y-2,3,2);r(c,mid,x+2,y-4,5,1);
  if(copper){r(c,'#d89d70',x+4,y-5,3,2);r(c,'#d2a57b',x-6,y-7,3,2);}
}
function lantern(c,x,y,t=0){
  r(c,'#342d30',x-1,y-12,3,16);r(c,'#614638',x,y-8,1,11);
  const a=c.globalAlpha;c.globalAlpha=.19+(Math.sin(t+x)*.04);
  r(c,'#f8ce7a',x-6,y-19,13,11);r(c,'#f8ce7a',x-4,y-21,9,15);c.globalAlpha=a;
  r(c,'#523932',x-3,y-18,7,8);r(c,'#dc974d',x-2,y-17,5,6);
  r(c,'#ffe6a0',x-1,y-16,3,4);r(c,'#fff0bd',x,y-16,1,3);
}
function counter(c,x,y,color){
  r(c,'#3f3330',x-12,y-12,25,17);
  r(c,'#875b41',x-10,y-5,21,9);
  r(c,'#b9895b',x-10,y-5,21,2);
  r(c,color,x-13,y-13,27,7);
  r(c,'#e6c78c',x-11,y-13,5,7);r(c,'#e6c78c',x,y-13,5,7);
  r(c,'#d1aa6d',x-7,y-3,3,3);r(c,'#9eb38a',x+2,y-3,3,3);
}
function sign(c,x,y){
  r(c,'#43392e',x-2,y-11,4,15);r(c,'#46382f',x-9,y-13,18,8);
  r(c,'#9f7851',x-8,y-12,16,6);r(c,'#eac78b',x-5,y-10,10,1);r(c,'#846348',x-5,y-8,8,1);
}
function prop(c,map,o){
  const x=o.x*16+8,y=o.y*16+12,p=map.colors;
  if(o.kind==='building'){house(c,o);return;}
  if(o.kind==='tree'){tree(c,map,x,y,o.size);return;}
  if(o.kind==='lantern'){lantern(c,x,y);return;}
  if(o.kind==='pillar'){
    r(c,'#232b345e',x-5,y-1,14,5);
    r(c,p[10],x-5,y-18,11,19);r(c,p[6],x-4,y-20,8,19);
    r(c,p[9],x-3,y-19,2,16);r(c,p[6],x-6,y-5,13,3);r(c,p[5],x+1,y-11,3,2);
  }
  if(o.kind==='fountain'){
    poly(c,'#3c4845',[[x-8,y-12],[x-14,y-6],[x-14,y+3],[x-8,y+7],[x+8,y+7],[x+14,y+3],[x+14,y-6],[x+8,y-12]]);
    poly(c,'#a9aa90',[[x-8,y-11],[x-12,y-6],[x-12,y+2],[x-7,y+5],[x+7,y+5],[x+12,y+2],[x+12,y-6],[x+8,y-11]]);
    r(c,'#406b70',x-9,y-6,18,9);r(c,'#8bc4b4',x-9,y-2,18,2);
    r(c,'#b0ae92',x-2,y-18,5,15);r(c,'#c8c098',x-4,y-18,9,2);
  }
  if(o.kind==='hearth'){
    r(c,'#423134',x-11,y-14,22,16);r(c,'#a08a6a',x-11,y-15,22,4);
    r(c,'#cdb28a',x-13,y-16,26,2);r(c,'#2d2528',x-7,y-9,14,10);
    r(c,'#a4513f',x-5,y-3,10,4);r(c,'#ffd483',x-4,y-4,8,3);r(c,'#f1a658',x-1,y-8,3,5);
  }
}
function landmark(c,map,s){
  const x=s.x*16+8,y=s.y*16+10,p=map.colors;
  if(s.kind==='gate'){
    if(map.id==='town'&&s.id==='frost')lantern(c,x-8,y+2);
    else{
      for(const dx of [-10,10]){
        r(c,p[10],x+dx-3,y-17,6,20);
        r(c,p[6],x+dx-2,y-18,4,18);
        r(c,p[9],x+dx-2,y-17,2,13);
      }
      r(c,p[10],x-12,y-17,24,5);r(c,p[6],x-12,y-17,24,2);
      r(c,'#dec288',x-2,y-15,5,3);
    }
    return;
  }
  if(s.kind==='gather'){
    if(s.skill==='woodcutting'){
      tree(c,map,x-4,y,1);
      r(c,'#684839',x+4,y-4,6,7);r(c,'#b68d58',x+4,y-4,6,3);
    }else if(s.skill==='mining')stone(c,p,x,y,map.id==='wood'||map.id==='march');
    else if(s.skill==='fishing'){
      r(c,'#594d3e',x-8,y-2,16,5);r(c,'#b89363',x-7,y-2,14,2);
      r(c,'#534537',x-4,y-11,2,12);r(c,'#d2bb8e',x-3,y-12,7,1);
      r(c,'#b6d4c6',x+3,y-11,1,11);r(c,'#ee9c81',x+3,y-2,2,2);
    }else if(s.skill==='farming'){
      r(c,'#4c4235',x-4,y-6,8,11);r(c,'#ac895c',x-3,y-5,6,8);
      r(c,'#6d8a4b',x-2,y-11,4,7);r(c,'#c1bc68',x,y-11,4,3);
    }else sign(c,x,y);
    return;
  }
  if(s.kind==='market')counter(c,x,y,'#9d634e');
  if(s.kind==='bank')counter(c,x,y,'#627e7b');
  if(['community','discovery','decorate','neighbors'].includes(s.kind))sign(c,x,y);
  if(s.kind==='mail'){
    r(c,'#574739',x-2,y-10,4,15);r(c,'#44383b',x-6,y-15,12,9);
    r(c,'#a96b57',x-5,y-15,10,7);r(c,'#e7bd82',x-4,y-13,8,1);
  }
}
export function paintScene(scene){
  const canvas=document.createElement('canvas');
  canvas.width=scene.w*TILE;canvas.height=scene.h*TILE;
  const c=canvas.getContext('2d',{alpha:false});
  c.imageSmoothingEnabled=false;
  for(let y=0;y<scene.h;y++)for(let x=0;x<scene.w;x++)tiles(c,scene,x,y,scene.terrain[y*scene.w+x],scene.colors);
  const figures=[...scene.props,...scene.spots.map(spot=>({kind:'spot',y:spot.y,spot}))].sort((a,b)=>(a.y+(a.h||0))-(b.y+(b.h||0)));
  for(const figure of figures){
    if(figure.kind==='spot')landmark(c,scene,figure.spot);
    else prop(c,scene,figure);
  }
  return canvas;
}
export function ranger(c,x,y,style,direction,phase,gear='sword',npc=false){
  const skin=SKIN[style.skin],hair=HAIR[style.hair],coat=COAT[style.coat];
  const move=phase===null?0:Math.floor(phase*2)%2?1:-1, flip=direction===3?-1:1;
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(flip,1);
  r(c,'#1c202754',-7,-2,14,4);r(c,ink,-5,-11,11,10);
  r(c,'#433936',-5,-4,4,4+move);r(c,'#433936',2,-4,4,4-move);
  r(c,'#b39877',-5,-1+move,4,1);r(c,'#b39877',2,-1-move,4,1);
  r(c,coat,-5,-11,10,7);r(c,'#34363a',-6,-6,12,2);
  r(c,'#caaa71',-1,-7,3,3);r(c,skin,5,-9,2,4);
  r(c,ink,-5,-20,10,9);r(c,hair,-4,-19,8,8);
  r(c,skin,-3,-15,8,5);r(c,hair,-4,-18,8,4);r(c,hair,-4,-15,2,3);
  if(direction===0){r(c,hair,-4,-18,8,7);r(c,'#948367',-3,-17,4,1);}
  else{
    if(direction===2)r(c,ink,-2,-14,1,1);
    r(c,ink,2,-14,1,1);r(c,'#ead6bc',3,-12,1,1);
  }
  if(npc){r(c,'#d4be7e',-6,-19,12,2);r(c,'#8f7152',-3,-21,6,3);}
  else if(/bow/.test(gear)){
    poly(c,'#c4975e',[[7,-14],[10,-10],[10,-5],[7,-1],[8,-6],[8,-10]]);
    r(c,'#eddfb7',7,-13,1,11);
  }else if(/staff|spear/.test(gear)){
    r(c,'#80614d',7,-16,2,15);r(c,'#b7e0d2',7,-19,2,4);
  }else{
    poly(c,'#d6ded4',[[6,-6],[11,-15],[12,-15],[12,-12],[8,-6]]);
    r(c,'#e0ba78',6,-7,4,2);
  }
  c.restore();
}
