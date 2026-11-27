import {ACTIVITIES,ENEMIES,LOCATIONS,SHOPS,VERSION,eventAt} from './content.js?v=1.1.0';
import {clone,regionUnlocked} from './engine.js';
import {COAT,HAIR,SKIN,rangerArt} from './art.js';
import {el,h,button,field,form,note,row,stack,summary,timeText} from './ui.js';
import {atlasView,encounterView,skillsView} from './views-world.js?v=1.1.0';
import {houseView,packView} from './views-player.js?v=1.1.0';
import {townView} from './views-town.js?v=1.1.0';
import {Field} from './field.js?v=1.1.0';
import {distance} from './field-data.js';

const tabs={atlas:atlasView,skills:skillsView,pack:packView,town:townView,house:houseView,encounter:encounterView};
const state={view:'field',region:'town',skill:'woodcutting',packTab:'items',townTab:'guild',shop:'forge',
  user:null,p:null,profileSeen:false,profileError:null,shops:{},party:[],pets:[],market:[],mail:[],
  activePet:null,activePetId:null,event:eventAt(Date.now()),online:navigator.onLine,busy:false,
  houseSelection:null,houseMove:null,visited:null,page:{},cursor:{},pages:{},drawn:false};
let api;
let baseSubs=[];
let paneSubs=[];
let petSub;
let firstReport=false;
let loading;
let toastTimer;
let joinSerial=0;
let worldSlot=-1;
let autoAt=0;
let npcWindow=-1;
let npcBusy=false;
const ctx={state,render,display,closeModal,notice,run,navigate,refreshPane,pageTo,showReport,customize,account,
  launchFight,returnToField,goTo,visit,atSite};
const world=new Field(el('field-mount'),{
  state,notice,paused:()=>state.view!=='field'||el('modal').open||!state.p,
  area:region=>{state.region=region;reconcileNpcOrders();},
  interact,job:showJob,report:showReport,updated:render,
  finish:(ticket,outcome)=>run('finishFight',{id:ticket.id,outcome})
});
let returnSpot=null;
export function display(label,contents){
  world.pauseInput();
  el('modal-title').textContent=label;
  el('modal-body').replaceChildren(...(Array.isArray(contents)?contents:[contents]));
  if(!el('modal-feedback'))el('modal-body').append(h('p',{id:'modal-feedback',class:'feedback',role:'status'}));
  if(!el('modal').open)el('modal').showModal();
}
function closeModal(){if(el('modal').open)el('modal').close();}
function explanation(error){
  const choices={
    'auth/invalid-credential':'Check your email and password.',
    'auth/email-already-in-use':'That email already has an account. Choose Sign in or reset your password.',
    'auth/weak-password':'Use a stronger password with at least six characters.',
    'auth/invalid-email':'Enter a valid email address.',
    'auth/network-request-failed':'Firebase is unreachable. Check your connection.',
    'permission-denied':'The world could not open. Check that the latest Cairn & Crown rules were published in Firebase.',
    'unavailable':'Connection interrupted. Reconnect and retry.',
    'failed-precondition':'Firebase needs an index for this view. See the setup guide.'
  };
  return choices[error.code]||error.message||'Something went wrong.';
}
export function notice(message,error=false){
  const toast=el('status');
  clearTimeout(toastTimer);
  toast.textContent=message;toast.hidden=!message;toast.classList.toggle('error',error);
  if(message)toastTimer=setTimeout(()=>toast.hidden=true,6200);
}
function cloud(){
  if(!loading)loading=import('./backend.js').then(module=>{
    api=module;
    api.observe(syncAccount);
    return module;
  }).catch(error=>{loading=null;throw error;});
  return loading;
}
function clean(which){while(which.length)which.pop()();}
function syncAccount(user){
  const session=++joinSerial;
  clean(baseSubs);clean(paneSubs);petSub?.();petSub=null;
  firstReport=false;worldSlot=-1;autoAt=0;npcWindow=-1;
  Object.assign(state,{user,p:null,view:'field',profileSeen:false,profileError:null,shops:{},party:[],pets:[],market:[],mail:[],
    activePet:null,activePetId:null,visited:null,page:{},cursor:{},pages:{},drawn:false});
  render();
  if(el('modal').open)account();
  if(!user?.emailVerified)return;
  const showError=err=>notice(explanation(err),true);
  baseSubs.push(api.watch('players',user.uid,p=>{
    if(session!==joinSerial)return;
    const initial=!state.profileSeen;
    const firstSave=p&&!state.p;
    state.profileSeen=true;state.profileError=null;state.p=p||null;
    syncPet(p?.pet??null);
    if(initial&&el('modal').open){
      if(p)closeModal();
      else customize(false);
    }
    if(firstSave){
      render();
      world.setOwner(user.uid,p.region);
      world.resume();
      refreshPane();
      reconcileWorld();
      maybeCollect(true);
    }else updateRender();
  },err=>{
    if(session!==joinSerial)return;
    if(state.p){showError(err);return;}
    state.profileError=err;
    render();
    if(el('modal').open)account();
  }));
  baseSubs.push(api.watch('world','calendar',world=>{
    if(world)worldSlot=world.slot;
  },showError));
  baseSubs.push(api.list('shops',items=>{
    state.shops=Object.fromEntries(items.map(item=>[item.id,item]));
    updateRender();
    reconcileNpcOrders();
  },showError,8));
}
function syncPet(id){
  if(state.activePetId===id)return;
  state.activePetId=id;state.activePet=null;petSub?.();petSub=null;
  if(id)petSub=api.watch('pets',id,pet=>{state.activePet=pet||null;updateRender();},error=>notice(explanation(error),true));
}
function updateRender(){
  const active=document.activeElement;
  if(active?.matches('input,select')&&active.closest('#game-content')){
    world.updatePlayer();
    return;
  }
  render();
}
export function refreshPane(){
  clean(paneSubs);
  if(!state.p||!state.user)return;
  const err=error=>notice(explanation(error),true);
  const set=(key,values,cursor)=>{state[key]=values;state.cursor[key]=cursor;updateRender();};
  const tab=state.view==='town'?state.townTab:state.packTab;
  if(state.view==='house'||state.view==='town'&&['market','community','mail'].includes(tab))
    paneSubs.push(api.list('profiles',items=>{
      state.party=items;
      if(state.visited)state.visited=items.find(item=>item.id===state.visited.id)||state.visited;
      updateRender();
    },err,24));
  if(state.view==='house'||state.view==='pack'&&tab==='pets'||state.view==='town'&&tab==='market')
    paneSubs.push(api.watchPets(state.user.uid,(items,cursor)=>set('pets',items,cursor),err,state.page.pets));
  if(state.view==='town'&&tab==='market')
    paneSubs.push(api.watchMarket((items,cursor)=>set('market',items,cursor),err,state.page.market));
  if(state.view==='town'&&tab==='mail')
    paneSubs.push(api.watchMail(state.user.uid,(items,cursor)=>set('mail',items,cursor),err,state.page.mail));
}
function pageTo(which,direction){
  const history=state.pages[which]??=[];
  if(direction==='next'&&state.cursor[which]){
    history.push(state.page[which]??null);
    state.page[which]=state.cursor[which];
  }else if(direction==='back')state.page[which]=history.pop()??null;
  state.pages[which]=history;
  state[which]=[];state.cursor[which]=null;
  refreshPane();render();
}
async function reconcileNpcOrders(){
  if(state.region!=='town'||!state.p||!state.online||npcBusy||npcWindow===state.event.slot)return;
  const stale=Object.values(state.shops).filter(shop=>shop.owner&&shop.npcSlot<state.event.slot);
  if(!stale.length)return;
  const owner=state.user.uid;
  npcWindow=state.event.slot;
  npcBusy=true;
  try{
    for(const shop of stale){
      if(state.user?.uid!==owner)break;
      await api.command(owner,'npc',{id:shop.id});
    }
  }catch{npcWindow=-1;}
  finally{npcBusy=false;}
}
function reconcileWorld(){
  if(!state.online||!state.p||worldSlot>=state.event.slot)return;
  const owner=state.user.uid;
  worldSlot=state.event.slot;
  api.moment(owner).then(now=>api.advanceWorld(owner,now)).catch(()=>{worldSlot=-1;});
}
export async function run(kind,args={},options={}){
  if(!state.online){notice('Reconnect to save changes in Alderwatch.',true);return null;}
  if(state.busy||!state.p)return null;
  state.busy=true;
  try{
    const result=await api.command(state.user.uid,kind,args);
    if(options.success)notice(typeof options.success==='function'?options.success(result):options.success);
    return result;
  }catch(error){
    notice(explanation(error),true);
    const inline=el('modal-feedback')||el('battle-feedback');
    if(inline)inline.textContent=explanation(error);
    return null;
  }finally{state.busy=false;}
}
function showReport(report){display(report.kind==='combat'?'Field report':'Activity report',summary(report));}
async function maybeCollect(first=false){
  if(!state.p?.activity||state.busy||!state.online||document.hidden)return;
  const task=state.p.activity;
  const elapsed=Date.now()-task.cursor;
  if(elapsed<task.seconds*1000||!first&&elapsed<100000)return;
  const result=await run('collect');
  if(result&&first&&elapsed>80000&&!el('modal').open&&!world.activeBattle&&!firstReport){
    firstReport=true;showReport(result);
  }
}
function showJob(){
  const p=state.p;
  if(p.activity){
    const task=p.activity, activity=ACTIVITIES[task.kind][task.key];
    display(activity.name,stack(note('This activity keeps running while the game is closed.'),
      note('Each action takes '+timeText(task.seconds)+(task.quote.fee?' and costs '+task.quote.fee+' gold.':'.')),
      row(button('Collect rewards',async()=>{
        const report=await run('collect');
        if(report)showReport(report);
        else if(state.p?.activity)notice('The next action is still underway.');
      },{style:'primary'}),button('Stop activity',async()=>{
        const report=await run('stop');
        if(report&&report!==true)showReport(report);
        else if(report)closeModal();
      }))));
  }else if(p.ticket){
    display('Encounter in progress',row(button('Resume encounter',()=>{
      closeModal();launchFight(p.ticket.enemy,p.ticket);
    },{style:'primary'}),button('Abandon',async()=>{
      if(await run('abandon',{}, {success:'Encounter abandoned.'}))closeModal();
    })));
  }else if(p.report)showReport(p.report);
}
function render(){
  const ready=!!state.p;
  document.body.classList.toggle('in-field',ready);
  el('version').textContent='v'+VERSION;
  el('gate').hidden=ready;el('world-layout').hidden=!ready;el('nav').hidden=!ready;
  el('account-open').textContent=state.user?'Account':'Sign in';
  el('gate-note').textContent=state.profileError?explanation(state.profileError):
    state.user&&!state.user.emailVerified?'Verify your email to enter Alderwatch.':
    state.user&&!state.profileSeen?'Loading your saved ranger…':'';
  if(!ready)return;
  world.updatePlayer();
  const view=state.view;
  const navView=['atlas','skills','pack'].includes(view)?view:'field';
  document.querySelectorAll('[data-nav]').forEach(link=>{
    if(link.dataset.nav===navView)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
    link.setAttribute('aria-disabled',String(!!world.activeBattle&&link.dataset.nav!=='field'));
  });
  el('field-overlay').hidden=view==='field';
  el('field-overlay').dataset.view=view;
  el('field-mount').inert=view!=='field';
  if(view==='field'){world.resume();return;}
  const titles={atlas:'Atlas',skills:'Skills',pack:'Travelling pack',house:'The hearth',encounter:state.spot?.name,town:state.stationName};
  el('panel-title').textContent=titles[view]||'Alderwatch';
  el('game-content').replaceChildren(tabs[view](ctx));
}
function navigate(view){
  if(view!=='field'&&!tabs[view])return;
  if(world.activeBattle&&view!=='field')return;
  world.pauseInput();
  const resetScroll=state.view!==view;
  if(view==='pack'&&state.packTab==='bank'&&!atSite('bank'))state.packTab='items';
  state.view=view;
  const navView=['atlas','skills','pack'].includes(view)?view:'field';
  history.replaceState(null,'','#'+navView);
  refreshPane();render();
  if(resetScroll)el('game-content').scrollTop=0;
}
function returnToField(){if(state.view!=='field')navigate('field');}
function atSite(id){
  return world.region==='town'&&world.spots().some(s=>s.id===id&&distance(s,world.position)<=1);
}
function goTo(kind,id){
  if(world.activeBattle)return;
  returnToField();
  if(kind==='home'&&world.region==='home'){
    if(state.visited)enterHouse(null);
    world.toSpot(world.spots().find(s=>s.kind==='decorate'));
    return;
  }
  const spot=world.spots().find(s=>s.kind===kind&&(!id||s.id===id));
  if(!spot){
    notice(world.region==='home'?'Step outside to continue.':'Follow the road back to Alderwatch first.');
    return;
  }
  world.toSpot(spot);
}
function station(tab,name){
  state.townTab=tab;state.stationName=name;navigate('town');
}
function enterHouse(visited){
  if(world.region!=='home')returnSpot={...world.position};
  state.visited=visited;state.houseMove=null;
  returnToField();world.enter('home');
}
async function visit(other){
  if(other.id===state.user.uid){enterHouse(null);return;}
  if(await run('visit',{uid:other.id}))enterHouse(other);
}
async function interact(spot){
  if(state.busy||!state.p||world.activeBattle)return;
  if(spot.kind==='gate'){
    if(!regionUnlocked(state.p,spot.id)){
      notice('Reach level '+LOCATIONS[spot.id].unlock+' in any skill to take this road.');return;
    }
    if(await run('travel',{id:spot.id}))world.travel(spot.id);
    return;
  }
  if(spot.kind==='home'){
    enterHouse(null);
    if(state.houseSelection)navigate('house');
    return;
  }
  if(spot.kind==='leave'){
    state.visited=null;state.houseSelection=null;world.enter('town',returnSpot);return;
  }
  if(spot.kind==='shop'){
    state.shop=spot.id;station('business',SHOPS[spot.id].name);return;
  }
  if(spot.kind==='bank'){state.packTab='bank';navigate('pack');return;}
  if(spot.kind==='neighbors'){navigate('house');return;}
  if(spot.kind==='decorate'){
    if(!state.visited)navigate('house');
    else notice('Your neighbour’s furnishings are on display.');
    return;
  }
  if(['guild','market','mail','community'].includes(spot.kind)){
    station(spot.kind,spot.name);return;
  }
  state.spot=spot;navigate('encounter');
}
function modeFromHash(){
  if(!state.p)return;
  const target=location.hash.slice(1);
  navigate(['atlas','pack','skills'].includes(target)?target:'field');
}
function account(){
  if(!state.user){
    const feedback=h('p',{id:'modal-feedback',class:'feedback',role:'status'});
    const inputs=[
      field('Email','email','','email',{required:true,autocomplete:'email'}),
      field('Password','password','','password',{required:true,autocomplete:'current-password'}),
      feedback,
      row(h('button',{type:'submit',class:'button primary',name:'intent',value:'login'},'Sign in'),
        h('button',{type:'submit',class:'button secondary',name:'intent',value:'create'},'Create account')),
      button('Reset password',async event=>{
        const input=event.currentTarget.closest('form').elements.email;
        if(!input.reportValidity())return;
        try{await (await cloud()).reset(input.value);feedback.textContent='Check your email for the reset link.';}
        catch(error){feedback.textContent=explanation(error);}
      },{style:'ghost',small:true})];
    display('Enter Alderwatch',stack(note('Sign in with your email and password, or create an account to start playing.'),form(inputs,async(data,submitter)=>{
      if(state.busy)return;
      state.busy=true;feedback.textContent='Connecting…';
      try{
        await (await cloud()).login(submitter?.value||'login',data.get('email'),data.get('password'));
      }catch(error){feedback.textContent=explanation(error);}
      finally{state.busy=false;}
    })));
  }
  else if(!state.user.emailVerified){
    const feedback=h('p',{id:'modal-feedback',class:'feedback',role:'status'});
    display('Verify your email',stack(note('Verify '+state.user.email+' to enter Alderwatch.'),feedback,
      row(button('Send verification email',async()=>{
        try{await api.verification();feedback.textContent='Verification sent. Open the link in your email, then return here.';}
        catch(error){feedback.textContent=explanation(error);}
      },{style:'primary'}),button('I verified my email',async()=>{
        try{
          const verified=await api.verifiedAccount();
          if(verified?.emailVerified)syncAccount(verified);
          else feedback.textContent='Open the verification link before trying again.';
        }catch(error){feedback.textContent=explanation(error);}
      }),button('Sign out',()=>api.signout(),{style:'ghost'}))));
  }
  else if(state.profileError){
    const permissionDenied=state.profileError.code==='permission-denied';
    display('Unable to load your ranger',stack(note(explanation(state.profileError)),
      row(button('Retry',()=>syncAccount(state.user),{style:'primary'}),
        permissionDenied?h('a',{href:'./rules-setup.html',target:'_blank',rel:'noopener',class:'button ghost'},'Firebase rules setup'):null,
        button('Sign out',()=>api.signout(),{style:'ghost'}))));
  }
  else if(!state.profileSeen)display('Connecting to Alderwatch',note('Loading your saved ranger…'));
  else if(!state.p)customize(false);
  else display('World account',stack(note(state.user.email),button('Sign out',()=>api.signout().then(closeModal))));
}
function customize(existing){
  const appearance=existing?clone(state.p.appearance):{skin:1,hair:0,coat:0};
  const art=h('div',{class:'pet-frame'},rangerArt(appearance));
  const groups=[['skin','Skin',SKIN],['hair','Hair',HAIR],['coat','Coat',COAT]];
  const swatches=groups.map(([key,label,colors])=>stack(h('strong',{},label),h('div',{class:'swatches'},colors.map((color,index)=>
    h('button',{type:'button',class:'swatch',style:'--swatch:'+color,'aria-pressed':String(index===appearance[key]),
      'aria-label':label+' color '+(index+1),onclick:event=>{
        appearance[key]=index;
        Array.from(event.currentTarget.parentElement.children).forEach((element,idx)=>element.setAttribute('aria-pressed',String(idx===index)));
        art.replaceChildren(rangerArt(appearance));
      }})))));
  display(existing?'Change appearance':'Create your ranger',form([art,
    existing?null:field('Ranger name','name','','text',{minlength:2,maxlength:22,required:true,autocomplete:'nickname'}),
    swatches,h('p',{id:'modal-feedback',class:'feedback',role:'status'}),
    h('button',{type:'submit',class:'button primary'},existing?'Save appearance':'Enter the valley')
  ],async data=>{
    if(existing){if(await run('customize',{appearance},{success:'Appearance updated.'}))closeModal();return;}
    if(state.busy)return;
    state.busy=true;
    try{
      await api.onboard(state.user.uid,data.get('name'),appearance);
      closeModal();
    }catch(error){el('modal-feedback').textContent=explanation(error);}
    finally{state.busy=false;}
  }));
}
async function launchFight(id,resume=null){
  if(world.activeBattle)return;
  const ticket=resume||await run('startFight',{id});
  if(ticket&&state.p){
    returnToField();world.battle(ENEMIES[id],ticket);render();
  }
}

el('welcome-action').addEventListener('click',account);
el('account-open').addEventListener('click',account);
el('modal-close').addEventListener('click',closeModal);
el('panel-close').addEventListener('click',returnToField);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!el('modal').open&&state.view!=='field')returnToField();
});
for(const link of document.querySelectorAll('[data-nav]'))link.addEventListener('click',event=>{event.preventDefault();navigate(link.dataset.nav);});
window.addEventListener('hashchange',modeFromHash);
window.addEventListener('online',()=>{state.online=true;notice('Back online.');reconcileWorld();reconcileNpcOrders();maybeCollect(true);});
window.addEventListener('offline',()=>{state.online=false;notice('Connection lost. Assigned activities keep running.',true);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){reconcileWorld();maybeCollect(true);}});
setInterval(()=>{
  if(!state.p||document.hidden)return;
  const now=Date.now();
  const event=eventAt(now);
  if(state.event.slot!==event.slot){state.event=event;reconcileWorld();reconcileNpcOrders();render();}
  world.updateJob();
  if(now-autoAt>30000){
    autoAt=now;
    maybeCollect();
  }
},1000);
render();
cloud().catch(error=>{el('gate-note').textContent=explanation(error);});
