import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import * as A from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import * as F from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';
import {firebaseConfig,emulator} from './config.js';
import {
  ACTIVITIES,EGGS,ENEMIES,EVENT_SECONDS,GEAR,ITEMS,LOCATIONS,MAX_COMMISSION,MAX_FEE,NAMESPACE,SHOPS,
  TRADE_MAX,VENDOR,eventAt,tradeShop
} from './content.js';
import {
  BAG_MAX,activeRewards,addEgg,addGold,addXp,change,clone,collectProfile,combatStats,completeQuest,
  count,hash,has,materials,newActivity,reconcile,regionUnlocked,requirement,setEquipment,solveDiscovery,starter,stash,uid
} from './engine.js';
import {generatePet,petName} from './pets.js';

const app=initializeApp(firebaseConfig,NAMESPACE);
export const auth=A.getAuth(app);
let firestore=F.getFirestore(app);
if(emulator){
  A.connectAuthEmulator(auth,emulator.auth,{disableWarnings:true});
  F.connectFirestoreEmulator(firestore,emulator.host,emulator.port);
}
const root=()=>F.doc(firestore,'gameNamespaces',NAMESPACE);
const doc=(group,id)=>F.doc(root(),group,id);
const collection=group=>F.collection(root(),group);
const mail=(owner,id)=>F.doc(root(),'mail',owner,'entries',id);
const mailCollection=owner=>F.collection(root(),'mail',owner,'entries');
const at=()=>F.serverTimestamp();

export const observe=callback=>A.onAuthStateChanged(auth,callback);
export const login=(mode,email,password)=>mode==='create'?
  A.createUserWithEmailAndPassword(auth,email.trim().toLowerCase(),password):
  A.signInWithEmailAndPassword(auth,email.trim().toLowerCase(),password);
export const signout=()=>A.signOut(auth);
export const verification=()=>A.sendEmailVerification(auth.currentUser);
export async function verifiedAccount(){
  const user=auth.currentUser;
  if(!user)return null;
  await A.reload(user);
  await A.getIdToken(user,true);
  return auth.currentUser;
}
export const reset=email=>A.sendPasswordResetEmail(auth,email.trim().toLowerCase());
export const watch=(group,id,callback,err)=>F.onSnapshot(doc(group,id),{includeMetadataChanges:true},snap=>{
  if(!snap.metadata.hasPendingWrites&&(snap.exists()||!snap.metadata.fromCache))callback(snap.data());
},err);
export async function once(group,id){return (await F.getDocFromServer(doc(group,id))).data();}
export function list(group,callback,err,max=20){
  return F.onSnapshot(F.query(collection(group),F.limit(max)),snap=>callback(snap.docs.map(x=>({id:x.id,...x.data()})),snap.docs.at(-1)),err);
}
export function watchMarket(callback,err,after){
  const fields=[F.where('state','==','open'),F.orderBy('stamp','desc')];
  if(after)fields.push(F.startAfter(after));
  fields.push(F.limit(24));
  return F.onSnapshot(F.query(collection('market'),...fields),snap=>callback(snap.docs.map(x=>({id:x.id,...x.data()})),snap.docs.at(-1)),err);
}
export function watchMail(owner,callback,err,after){
  const fields=[F.where('state','==','open'),F.orderBy('stamp','desc')];
  if(after)fields.push(F.startAfter(after));
  fields.push(F.limit(24));
  return F.onSnapshot(F.query(mailCollection(owner),...fields),snap=>callback(snap.docs.map(x=>({id:x.id,...x.data()})),snap.docs.at(-1)),err);
}
export function watchPets(owner,callback,err,after){
  const fields=[F.where('owner','==',owner),F.where('state','==','owned'),F.orderBy(F.documentId())];
  if(after)fields.push(F.startAfter(after));
  fields.push(F.limit(24));
  return F.onSnapshot(F.query(collection('pets'),...fields),snap=>callback(snap.docs.map(x=>x.data()),snap.docs.at(-1)),err);
}
const clockReads=new Map();
export function moment(owner){
  if(clockReads.has(owner))return clockReads.get(owner);
  const ref=doc('clock',owner);
  const check=F.setDoc(ref,{stamp:at()}).then(()=>F.getDocFromServer(ref))
    .then(snap=>snap.data().stamp.toMillis()).finally(()=>clockReads.delete(owner));
  clockReads.set(owner,check);
  return check;
}

function shopData(id,data){
  const base=SHOPS[id];
  if(!base)throw Error('Unknown establishment.');
  return data||{owner:'',ownerName:base.keeper,fee:base.fee,commission:base.commission,price:0,level:1,
    balance:0,total:0,npcSlot:-1,production:0,sales:0,npc:0,history:[],actor:'',rev:0,stamp:null};
}
function coins(n,min=0,max=TRADE_MAX){
  if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('Enter a whole number from '+min+' to '+max+'.');
  return n;
}
function safeName(name,min,max){
  const value=String(name??'').trim();
  if(value.length<min||value.length>max||/[\u0000-\u001f]/.test(value))throw Error('Use a name between '+min+' and '+max+' characters.');
  return value;
}
function exhaustChecks(p){
  if(p.ticket)throw Error('Finish or abandon the current encounter first.');
  if(p.activity)throw Error('Collect and stop the current activity first.');
}
function eggTake(p,id){
  if(!EGGS[id])throw Error('Unknown egg source.');
  change(p.eggs,id,-1);
  return p.eggSources?.[id]?.shift()||EGGS[id].name;
}
function take(p,selection,pet){
  const {kind,id}=selection;
  if(kind==='item'){
    if(!ITEMS[id])throw Error('Unknown resource.');
    const qty=coins(selection.qty,1,10000);change(p.bag,id,-qty);return {kind,id,qty};
  }
  if(kind==='egg')return {kind,id,qty:1,source:eggTake(p,id)};
  if(kind==='gear'){
    if(!p.gear[id]||Object.values(p.equipped).includes(id))throw Error('That item is equipped or unavailable.');
    const gear=p.gear[id];delete p.gear[id];return {kind,id,gear,qty:1};
  }
  if(kind==='pet'){
    if(!pet||pet.state!=='owned'||p.pet===id||Object.values(p.house).some(x=>x.kind==='pet'&&x.id===id))
      throw Error('Remove this pet from your equipment and house first.');
    return {kind,id,qty:1,name:pet.name,traits:pet.traits};
  }
  throw Error('Select an asset to trade.');
}
function give(p,asset){
  if(asset.kind==='item')change(p.bag,asset.id,asset.qty);
  else if(asset.kind==='egg'){
    change(p.eggs,asset.id,1);
    p.eggSources??={};
    const sources=p.eggSources[asset.id]??[];
    if(sources.length<64)p.eggSources[asset.id]=[...sources,asset.source||EGGS[asset.id].name];
  }else if(asset.kind==='gear'){
    if(Object.keys(p.gear).length>=BAG_MAX)throw Error('Your pack is full. Bank surplus equipment first.');
    if(p.gear[asset.id]||p.vault[asset.id]){
      const id=uid();
      p.gear[id]={...asset.gear,id};
    }else p.gear[asset.id]=asset.gear;
  }
}
function milestone(shop,kind,description,amount,user,now){
  shop.history=[{kind,description,amount,by:user,at:now},...shop.history].slice(0,16);
}
function gain(shop,kind,description,amount,who,now){
  shop.total+=amount;
  shop.balance+=amount;
  milestone(shop,kind,description,amount,who,now);
}
function tradeFee(price,shop,customer,seller=''){
  return shop.owner&&shop.owner!==customer&&shop.owner!==seller?Math.floor(price*shop.commission/100):0;
}
function validProfileAppearance(a){
  return a&&Number.isInteger(a.skin)&&a.skin>=0&&a.skin<5&&Number.isInteger(a.hair)&&a.hair>=0&&a.hair<5&&
    Number.isInteger(a.coat)&&a.coat>=0&&a.coat<6;
}

export async function onboard(user,name,appearance){
  if(!validProfileAppearance(appearance))throw Error('Choose a valid appearance.');
  const player=doc('players',user);
  const display=doc('profiles',user);
  return F.runTransaction(firestore,async tx=>{
    if((await tx.get(player)).exists())return;
    const initial=starter(safeName(name,2,22),appearance);
    tx.set(player,{...initial,stamp:at()});
    tx.set(display,{...collectProfile(initial,null),stamp:at()});
  });
}
export function advanceWorld(owner,now){
  const here=eventAt(now);
  return F.runTransaction(firestore,async tx=>{
    const ref=doc('world','calendar');
    const old=(await tx.get(ref)).data();
    if(old&&old.slot>=here.slot)return old.slot;
    tx.set(ref,{slot:here.slot,by:owner,stamp:at()});
    return here.slot;
  });
}

async function transact(operation){
  try{return await F.runTransaction(firestore,operation);}
  catch(error){
    if(error.code!=='permission-denied')throw error;
    // Rules can see the winning write before Firestore reports a stale precondition.
    // Reevaluating the same operation against a fresh snapshot remains atomic.
    return F.runTransaction(firestore,operation);
  }
}
export async function command(owner,kind,args={}){
  const nonce=uid();
  const timed=['start','stop','collect','startFight','finishFight','npc','claimShop','contract','buyShop','upgrade'].includes(kind);
  const now=timed?await moment(owner):Date.now();
  return transact(async tx=>{
    const writes=[];
    const set=(ref,data)=>writes.push(()=>tx.set(ref,data));
    const data=async ref=>(await tx.get(ref)).data();
    const pRef=doc('players',owner);
    const player=await data(pRef);
    if(!player)throw Error('Create your ranger before entering the world.');
    const p=clone(player);
    let visible=false,value;
    let currentPet;
    const ownedPet=async(id=p.pet)=>{
      if(!id)return null;
      const pet=await data(doc('pets',id));
      return pet?.owner===owner&&pet.state==='owned'?pet:null;
    };
    const shopRead=async id=>clone(shopData(id,await data(doc('shops',id))));
    const shopWrite=(id,shop)=>{
      shop.rev++;
      set(doc('shops',id),{...shop,actor:owner,stamp:at()});
    };
    const parcel=(to,suffix,entry)=>{
      if(!to)throw Error('Choose a valid recipient.');
      set(mail(to,nonce+suffix),{from:owner,to,state:'open',stamp:at(),...entry});
    };
    function petWrite(pet,changes,link=''){
      set(doc('pets',pet.id),{...pet,...changes,actor:owner,link,stamp:at()});
      if(changes.hops>pet.hops){
        const entry=changes.history.at(-1);
        set(F.doc(doc('pets',pet.id),'trail',String(changes.hops)),{...entry,stamp:at()});
      }
    }
    async function publishPetData(){
      currentPet=p.pet?await ownedPet():null;
      visible=true;
    }
    async function productionReport(stop){
      const task=p.activity;
      if(!task)return null;
      const result=reconcile(p,now);
      if(stop)p.activity=null;
      if(!result&&!stop)return null;
      if(result?.fees&&task.quote.owner){
        const id=task.quote.shop;
        const business=await shopRead(id);
        if(business.owner===task.quote.owner){
          business.production+=result.actions;
          gain(business,'production',result.name,result.fees,p.name,now);shopWrite(id,business);
        }else parcel(task.quote.owner,'fee',{kind:'revenue',gold:result.fees,shop:id,label:result.name});
      }else if(result?.actions&&task.quote.shop){
        const id=task.quote.shop;
        const business=await shopRead(id);
        if(business.owner&&business.owner===owner&&task.quote.owner===owner){
          business.production+=result.actions;
          milestone(business,'production',result.name,0,p.name,now);
          shopWrite(id,business);
        }
      }
      if(result)await publishPetData();
      return result;
    }
    switch(kind){
      case 'travel':
        if(!LOCATIONS[args.id]||!regionUnlocked(p,args.id))throw Error('This region is still locked.');
        p.region=args.id;break;
      case 'customize':
        if(!validProfileAppearance(args.appearance))throw Error('Choose a valid appearance.');
        p.appearance=args.appearance;await publishPetData();break;
      case 'start': {
        exhaustChecks(p);
        const candidate=ACTIVITIES[args.kind]?.[args.id];
        if(!candidate)throw Error('Unknown activity.');
        const shop=candidate.shop?await shopRead(candidate.shop):null;
        const fee=shop?.owner&&shop.owner!==owner&&!args.fallback?shop.fee:0;
        if(!args.fallback&&args.fee!==undefined&&fee!==args.fee)throw Error('The shop fee changed. Check the updated quote.');
        const quote={fee,owner:args.fallback?'':shop?.owner||'',shop:args.fallback?'':candidate.shop||''};
        currentPet=await ownedPet();
        p.activity=newActivity(candidate,p,currentPet,now,quote,nonce);
        if(args.fallback)p.activity.seconds=Math.ceil(p.activity.seconds*1.8);
        if(candidate.region)p.region=candidate.region;
        value=p.activity;break;
      }
      case 'collect':
      case 'stop':
        value=await productionReport(kind==='stop');
        if(!value&&kind==='collect')return null;
        break;
      case 'startFight': {
        exhaustChecks(p);
        const foe=ENEMIES[args.id];
        if(!foe)throw Error('Unknown encounter.');
        const locked=requirement(p,foe);
        if(locked)throw Error(locked);
        currentPet=await ownedPet();
        const supplies=Object.fromEntries(Object.entries(p.bag).filter(([id])=>ITEMS[id]?.heal||ITEMS[id]?.boost));
        p.ticket={id:nonce,at:now,seed:hash(nonce),enemy:args.id,stats:combatStats(p,currentPet),supplies};
        p.region=foe.region;value=p.ticket;break;
      }
      case 'finishFight': {
        const t=p.ticket;
        if(!t||t.id!==args.id)throw Error('This encounter has already been settled or abandoned.');
        const result=args.outcome;
        if(!result||!Number.isFinite(result.time)||result.time<0||result.time>180||typeof result.win!=='boolean'||
          Object.entries(result.used||{}).some(([key,n])=>!Number.isInteger(n)||n<1||n>(t.supplies[key]||0)))throw Error('Invalid combat result.');
        value=activeRewards(p,ENEMIES[t.enemy],t,result,now);
        await publishPetData();break;
      }
      case 'abandon':
        p.ticket=null;break;
      case 'equipment':
        setEquipment(p,args.id);await publishPetData();break;
      case 'bank':
        if(p.ticket)throw Error('Finish the encounter before moving supplies.');
        stash(p,args.kind,args.id,args.qty,args.deposit);break;
      case 'salvage': {
        if(!p.gear[args.id]||Object.values(p.equipped).includes(args.id))throw Error('Equip a replacement before salvaging.');
        const g=p.gear[args.id]; delete p.gear[args.id];
        change(p.bag,'bronze',1+g.grade);break;
      }
      case 'discover':
        value=solveDiscovery(p,args.option);await publishPetData();break;
      case 'quest':
        completeQuest(p,args.id);await publishPetData();break;
      case 'visit':
        if(args.uid===owner||!await data(doc('profiles',args.uid)))throw Error('This house is unavailable.');
        p.stats.visits++;break;
      case 'decorate': {
        const cell=String(coins(args.pos,0,24));
        const current=p.house[cell];
        if(args.move!==undefined){
          const from=String(coins(args.move,0,24));
          if(current||!p.house[from])throw Error('Select an open tile.');
          p.house[cell]=p.house[from];delete p.house[from];
        }else if(args.remove){
          if(!current)throw Error('This tile is already empty.');
          if(current.kind==='item')change(p.bag,current.id,1);
          delete p.house[cell];
        }else if(args.kind==='pet'){
          const pet=await ownedPet(args.id);
          if(!pet||p.pet===args.id||Object.values(p.house).some(x=>x.kind==='pet'&&x.id===args.id))
            throw Error('Unequip your pet and make sure it is not already on display.');
          if(current)throw Error('Select an open tile.');
          p.house[cell]={kind:'pet',id:pet.id,name:pet.name,traits:pet.traits};
        }else{
          if(current||!ITEMS[args.id]?.decor)throw Error('Select an open tile and a furnishing.');
          change(p.bag,args.id,-1);p.house[cell]={kind:'item',id:args.id};
        }
        await publishPetData();break;
      }
      case 'petEquip':{
        exhaustChecks(p);
        if(!args.id){p.pet=null;await publishPetData();break;}
        const pet=await ownedPet(args.id);
        if(!pet||Object.values(p.house).some(x=>x.kind==='pet'&&x.id===args.id))
          throw Error('Remove this pet from display first.');
        p.pet=pet.id;currentPet=pet;visible=true;break;
      }
      case 'petName':{
        const pet=await ownedPet(args.id);
        if(!pet)throw Error('This pet is no longer in your collection.');
        const name=safeName(args.name,1,20);
        petWrite(pet,{name});
        for(const tile of Object.values(p.house))if(tile.kind==='pet'&&tile.id===pet.id)tile.name=name;
        currentPet=p.pet===pet.id?{...pet,name}:await ownedPet();
        visible=true;break;
      }
      case 'release': {
        const pet=await ownedPet(args.id);
        if(!pet||p.pet===args.id||Object.values(p.house).some(x=>x.kind==='pet'&&x.id===args.id))
          throw Error('Unequip or take this pet off display before releasing it.');
        const score=1+pet.buffs.length+(pet.traits.accessory>=5?2:0);
        p.karma+=score;p.stats.released++;
        petWrite(pet,{owner:'',state:'released',history:[...pet.history,{from:owner,to:'',at:now,kind:'release'}].slice(-32),hops:pet.hops+1});
        await publishPetData();value=score;break;
      }
      case 'hatch': {
        if(!EGGS[args.id])throw Error('Choose an egg to hatch.');
        const aviary=await shopRead('hatchery');
        const fee=aviary.owner&&aviary.owner!==owner&&!args.fallback?aviary.fee:0;
        if(args.fee!==undefined&&fee!==args.fee)throw Error('The aviary fee changed.');
        if(p.gold<fee)throw Error('You do not have the quoted hatch fee.');
        const source=eggTake(p,args.id);
        let generated;
        for(let index=0;index<8;index++){
          const candidate=generatePet(hash(nonce+'|'+index),args.id);
          if(!await data(doc('signatures',candidate.signature))){generated=candidate;break;}
        }
        if(!generated)throw Error('The egg is still stirring. Try opening it again.');
        addGold(p,-fee);p.stats.fees+=fee;p.stats.hatches++;
        if(fee){
          aviary.production++;
          gain(aviary,'production',EGGS[args.id].name+' hatch',fee,p.name,now);shopWrite('hatchery',aviary);
        }
        const pet={id:nonce,...generated,name:petName(args.id),egg:args.id,source,original:owner,owner,
          state:'owned',recipient:'',hatched:at(),actor:owner,link:'',hops:0,history:[],stamp:at()};
        set(doc('pets',nonce),pet);
        set(doc('signatures',pet.signature),{pet:nonce,owner,stamp:at()});
        value=pet;break;
      }
      case 'claimShop': {
        const id=args.id;
        const shop=await shopRead(id);
        if(shop.owner)throw Error('Another player already owns this establishment.');
        const def=SHOPS[id];
        addGold(p,-def.cost);
        Object.assign(shop,{owner,ownerName:p.name,npcSlot:eventAt(now).slot,price:0,fee:def.fee,commission:def.commission});
        milestone(shop,'deed','Purchased from '+def.keeper,def.cost,p.name,now);
        shopWrite(id,shop);break;
      }
      case 'terms': {
        const id=args.id,shop=await shopRead(id);
        if(shop.owner!==owner)throw Error('Only the current owner can set terms.');
        Object.assign(shop,{fee:coins(args.fee,0,MAX_FEE),commission:coins(args.commission,0,MAX_COMMISSION),price:coins(args.price)});
        shopWrite(id,shop);break;
      }
      case 'upgrade':{
        const id=args.id,shop=await shopRead(id);
        if(shop.owner!==owner||shop.level>=3)throw Error('This property cannot be upgraded.');
        const required=Object.fromEntries(Object.entries(SHOPS[id].need).map(([item,n])=>[item,n*shop.level]));
        if(!has(p,required))throw Error('Gather the listed building supplies.');
        const price=100*shop.level;
        addGold(p,-price);materials(p,required,-1);shop.level++;
        milestone(shop,'upgrade','Workshop level '+shop.level,price,p.name,now);
        shopWrite(id,shop);break;
      }
      case 'withdraw': {
        const shop=await shopRead(args.id);
        if(shop.owner!==owner||!shop.balance)throw Error('No earnings are ready to collect.');
        const amount=shop.balance;
        addGold(p,amount);p.stats.revenue+=amount;shop.balance=0;
        milestone(shop,'withdraw','Owner collected earnings',amount,p.name,now);
        shopWrite(args.id,shop);value=amount;break;
      }
      case 'buyShop': {
        const id=args.id,shop=await shopRead(id);
        if(!shop.owner||shop.owner===owner||shop.price<1||shop.price!==args.price||shop.owner!==args.seller)
          throw Error('The deed or asking price has changed.');
        addGold(p,-shop.price);
        parcel(shop.owner,'deed',{kind:'deed',gold:shop.price,shop:id,label:SHOPS[id].name});
        if(shop.balance)parcel(shop.owner,'credit',{kind:'revenue',gold:shop.balance,shop:id,label:'Earnings before deed transfer'});
        milestone(shop,'deed','Sold to '+p.name,shop.price,p.name,now);
        Object.assign(shop,{owner,ownerName:p.name,price:0,balance:0,npcSlot:eventAt(now).slot});
        shopWrite(id,shop);break;
      }
      case 'npc': {
        const id=args.id,shop=await shopRead(id);
        if(!shop.owner)return null;
        const current=eventAt(now).slot;
        if(current<=shop.npcSlot)return null;
        const gap=Math.min(12,current-shop.npcSlot);
        let amount=0;
        for(let slot=current-gap+1;slot<=current;slot++){
          const ev=eventAt(slot*EVENT_SECONDS*1000);
          const gross=SHOPS[id].budget+((slot+id.length)%3);
          amount+=Math.floor(gross*.63)+(shop.level-1)*2+(id===ev.shop?ev.fund:0);
        }
        shop.npcSlot=current;shop.npc+=gap;
        gain(shop,'npc',gap+' NPC trading windows',amount,'Alderwatch',now);
        shopWrite(id,shop);value=amount;break;
      }
      case 'contract': {
        const ev=eventAt(now);
        if(p.eventDone>=ev.slot||!has(p,ev.items))throw Error('The current order is complete or you still need supplies.');
        const shop=await shopRead(ev.shop);
        const cut=tradeFee(ev.gold,shop,owner);
        materials(p,ev.items,-1);addGold(p,ev.gold-cut);
        addXp(p,ev.bonus,45);if(ev.egg)addEgg(p,ev.egg);
        p.stats.contracts++;p.eventDone=ev.slot;
        if(shop.owner){shop.sales++;gain(shop,'commission',ev.name,cut,p.name,now);shopWrite(ev.shop,shop);}
        await publishPetData();value=ev.gold-cut;break;
      }
      case 'vendor': {
        const price=VENDOR[args.id],n=coins(args.qty,1,30);
        if(!price)throw Error('This NPC item is unavailable.');
        const shop=await shopRead('general');
        const total=price*n, cut=tradeFee(total,shop,owner);
        addGold(p,-total);change(p.bag,args.id,n);
        if(shop.owner){shop.sales++;gain(shop,'commission','Stock order',cut,p.name,now);shopWrite('general',shop);}
        break;
      }
      case 'list':
      case 'gift': {
        if(p.ticket)throw Error('Finish your encounter before sending inventory.');
        const selection=args.asset;
        const pet=selection?.kind==='pet'?await ownedPet(selection.id):null;
        if(selection?.kind==='pet'&&!pet)throw Error('This pet is unavailable.');
        if(kind==='gift'&&(args.to===owner||!await data(doc('profiles',args.to))))throw Error('Choose another player.');
        const asset=take(p,selection,pet);
        const target=kind==='list'?nonce:nonce+'gift';
        if(pet)petWrite(pet,{state:kind==='list'?'listed':'gifted',owner,recipient:kind==='gift'?args.to:''},target);
        if(kind==='list'){
          const price=coins(args.price,1);
          set(doc('market',nonce),{seller:owner,sellerName:p.name,asset,price,actor:owner,nonce,shop:tradeShop(asset),state:'open',buyer:'',stamp:at()});
        }else parcel(args.to,'gift',{kind:'gift',label:p.name,asset});
        value=asset;break;
      }
      case 'buy':
      case 'cancelListing': {
        const ref=doc('market',args.id);
        const offer=await data(ref);
        if(!offer||offer.state!=='open')throw Error('This offer is already closed.');
        const cancel=kind==='cancelListing';
        if(cancel?offer.seller!==owner:offer.seller===owner||offer.price!==args.price)throw Error('This offer changed.');
        const pet=offer.asset.kind==='pet'?await data(doc('pets',offer.asset.id)):null;
        if(offer.asset.kind==='pet'&&(!pet||pet.state!=='listed'||pet.link!==args.id||pet.owner!==offer.seller))
          throw Error('The companion is no longer in escrow.');
        if(!cancel){
          const shop=await shopRead(offer.shop);
          const cut=tradeFee(offer.price,shop,owner,offer.seller);
          addGold(p,-offer.price);p.stats.trades++;
          if(shop.owner){shop.sales++;gain(shop,'commission','Ranger market',cut,p.name,now);shopWrite(offer.shop,shop);}
          parcel(offer.seller,'market',{kind:'sale',gold:offer.price-cut,offer:args.id,shop:offer.shop,label:'Ranger market sale'});
        }
        give(p,offer.asset);
        if(pet){
          const notes=cancel?{}:{history:[...pet.history,{from:pet.owner,to:owner,at:now,kind:'sale'}].slice(-32),hops:pet.hops+1};
          petWrite(pet,{state:'owned',owner,...notes},args.id);
          // A newly received pet needs no association with the active slot.
        }
        set(ref,{...offer,state:cancel?'canceled':'sold',buyer:cancel?'':owner,actor:owner,nonce,closed:at()});
        value=offer.asset;break;
      }
      case 'mail': {
        const id=args.id,ref=mail(owner,id);
        const letter=await data(ref);
        if(!letter||letter.state!=='open')throw Error('This parcel was already collected.');
        if(letter.asset?.kind==='pet'){
          const pet=await data(doc('pets',letter.asset.id));
          if(!pet||pet.state!=='gifted'||pet.link!==id||pet.owner!==letter.from)throw Error('This pet is no longer in the parcel.');
          petWrite(pet,{state:'owned',owner,recipient:'',history:[...pet.history,{from:pet.owner,to:owner,at:now,kind:'gift'}].slice(-32),hops:pet.hops+1},id);
        }else if(letter.asset)give(p,letter.asset);
        if(letter.gold){addGold(p,letter.gold);if(letter.kind==='revenue')p.stats.revenue+=letter.gold;}
        set(ref,{...letter,state:'claimed',closed:at()});value=letter;break;
      }
      default:throw Error('Unknown world command.');
    }
    p.rev=player.rev+1;p.last=nonce;
    set(pRef,{...p,stamp:at()});
    if(visible)set(doc('profiles',owner),{...collectProfile(p,currentPet),stamp:at()});
    for(const write of writes)write();
    return value??true;
  });
}
