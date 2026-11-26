import {ACTIVITIES,EVENT_SECONDS,LOCATIONS,VERSION,eventAt} from './content.js';
import {clone,level} from './engine.js';
import {COAT,HAIR,SKIN,petArt,rangerArt} from './art.js';
import {el,h,button,bar,field,form,gold,note,panel,pill,row,stack,summary,timeText,title} from './ui.js';
import {worldView,skillsView} from './views-world.js';
import {houseView,packView} from './views-player.js';
import {townView} from './views-town.js';
import {launchBattle} from './battle-ui.js';

const tabs={map:worldView,skills:skillsView,pack:packView,town:townView,house:houseView};
const state={view:'map',region:'town',skill:'woodcutting',packTab:'items',townTab:'guild',shop:'forge',
  user:null,invite:null,p:null,ready:false,profileSeen:false,shops:{},party:[],pets:[],market:[],mail:[],
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
let lastShownPlayer='';
let npcWindow=-1;
let npcBusy=false;
const ctx={state,render,display,closeModal,notice,run,navigate,refreshPane,pageTo,showReport,customize,account,launchFight};
export function display(label,contents){
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
    'permission-denied':'Firebase denied access. Check your world invitation and the published rules.',
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
async function syncAccount(user){
  const session=++joinSerial;
  clean(baseSubs);clean(paneSubs);petSub?.();petSub=null;
  firstReport=false;worldSlot=-1;autoAt=0;npcWindow=-1;
  Object.assign(state,{user,invite:null,p:null,ready:false,profileSeen:false,shops:{},party:[],pets:[],market:[],mail:[],
    activePet:null,activePetId:null,visited:null,page:{},cursor:{},pages:{},drawn:false});
  if(!user){render();if(el('modal').open)account();return;}
  render();
  try{
    const invite=await api.myInvite(user.email.toLowerCase());
    if(session!==joinSerial)return;
    state.invite=invite||{active:false,admin:false};
    state.ready=true;
    if(!invite?.active||!user.emailVerified){render();if(el('modal').open)account();return;}
    const showError=err=>notice(explanation(err),true);
    baseSubs.push(api.watch('players',user.uid,p=>{
      if(session!==joinSerial)return;
      const initial=!state.profileSeen;
      state.profileSeen=true;state.p=p||null;
      if(p&&lastShownPlayer!==user.uid){
        lastShownPlayer=user.uid;
        state.region=p.region;
      }
      syncPet(p?.pet??null);
      if(initial){
        if(el('modal').open){
          if(p)closeModal();
          else customize(false);
        }
        if(p){
          refreshPane();
          reconcileWorld();
          maybeCollect(true);
        }
      }
      updateRender();
    },showError));
    baseSubs.push(api.watch('world','calendar',world=>{
      if(world)worldSlot=world.slot;
      renderRail();
    },showError));
  }catch(error){
    if(session!==joinSerial)return;
    state.ready=true;state.invite={active:false,admin:false};
    notice(explanation(error),true);
    render();
    if(el('modal').open)account();
  }
}
function syncPet(id){
  if(state.activePetId===id)return;
  state.activePetId=id;state.activePet=null;petSub?.();petSub=null;
  if(id)petSub=api.watch('pets',id,pet=>{state.activePet=pet||null;updateRender();},error=>notice(explanation(error),true));
}
function updateRender(){
  const active=document.activeElement;
  if(active?.matches('input,select')&&active.closest('#game-content')){
    renderRail();
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
  if(['town','skills'].includes(state.view)||state.view==='pack'&&tab==='pets')
    paneSubs.push(api.list('shops',items=>{
      state.shops=Object.fromEntries(items.map(item=>[item.id,item]));
      updateRender();
      reconcileNpcOrders();
    },err,8));
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
  if(state.view!=='town'||!state.p||!state.online||npcBusy||npcWindow===state.event.slot)return;
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
  if(result&&first&&elapsed>80000&&!el('modal').open&&!el('battle').open&&!firstReport){
    firstReport=true;showReport(result);
  }
}
function renderRail(){
  if(!state.p)return;
  const p=state.p;
  const gear=p.gear[p.equipped.weapon];
  const pet=state.activePet;
  const profile=h('div',{class:'panel profile-rail'},
    h('div',{class:'avatar-top'},rangerArt(p.appearance,gear?.base,p.name),
      h('div',{},title(p.name),row(gold(p.gold),pill('Combat '+level(p.xp.combat))))),
    button('Character',()=>{state.packTab='character';navigate('pack');},{small:true,style:'ghost'}));
  const side=[profile];
  if(p.activity){
    const a=ACTIVITIES[p.activity.kind][p.activity.key];
    side.push(panel(h('p',{class:'eyebrow'},'Active contract'),
      h('strong',{},a.name),bar(0,'work-fill'),h('p',{id:'work-time',class:'note'}),
      row(button('Collect',async()=>{
        const result=await run('collect');
        if(result)showReport(result);else if(state.p?.activity)notice('The next action is still underway.');
      },{small:true}),button('Stop',async()=>{const out=await run('stop');if(out&&out!==true)showReport(out);},{small:true,style:'ghost'}))));
  }else if(p.ticket){
    side.push(panel(h('strong',{},'Encounter in progress'),button('Resume encounter',()=>launchFight(p.ticket.enemy,p.ticket),{small:true}),button('Abandon',()=>run('abandon',{}, {success:'Encounter abandoned.'}),{small:true,style:'ghost'})));
  }else if(p.report){
    side.push(panel(button('Last activity report',()=>showReport(p.report),{small:true,style:'ghost'})));
  }
  if(p.discovery)side.push(panel(h('strong',{},'A trail discovery awaits'),button('Investigate',()=>navigate('map'),{small:true,style:'primary'})));
  if(pet)side.push(h('section',{class:'panel event-rail'},h('div',{class:'avatar-top'},petArt(pet.traits,pet.name),
    h('div',{},h('strong',{},pet.name),note('Equipped companion')))));
  side.push(h('section',{class:'panel event-rail'},h('p',{class:'eyebrow'},'Town commission'),h('strong',{},state.event.name),
    note(state.event.detail),button('Guild board',()=>{state.townTab='guild';navigate('town');},{small:true,style:'ghost'})));
  el('rail').replaceChildren(...side);
  progressClock();
}
function progressClock(){
  const task=state.p?.activity;
  const fill=el('work-fill');
  const time=el('work-time');
  if(!task||!fill||!time)return;
  const elapsed=Math.max(0,(Date.now()-task.cursor)/1000);
  const next=task.seconds-elapsed%task.seconds;
  fill.style.width=(100-next/task.seconds*100)+'%';
  const message=Math.floor(elapsed/task.seconds)+' ready · '+timeText(next)+' to next';
  if(time.textContent!==message)time.textContent=message;
}
function render(){
  el('version').textContent='v'+VERSION;
  el('gate').hidden=!!state.p;el('world-layout').hidden=!state.p;el('nav').hidden=!state.p;
  el('account-open').textContent=state.user?'Account':'Sign in';
  el('gate-note').textContent=state.user&&!state.ready?'Checking world access…':
    state.user&&state.invite?.active===false?'This account still needs a world invitation.':
    state.user&&state.invite?.active&&!state.user.emailVerified?'Verify your email to enter the private world.':'';
  if(!state.p)return;
  renderRail();
  document.querySelectorAll('[data-nav]').forEach(link=>{
    if(link.dataset.nav===state.view)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  const body=tabs[state.view]?.(ctx)||worldView(ctx);
  el('game-content').replaceChildren(body);
}
function navigate(view){
  if(!tabs[view])return;
  if(state.view!==view)window.scrollTo({top:0});
  state.view=view;history.replaceState(null,'','#'+view);
  refreshPane();render();
}
function modeFromHash(){const view=location.hash.slice(1);if(tabs[view]){state.view=view;refreshPane();render();}}
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
    display('Enter Alderwatch',stack(note('Use an email invited to this private world. New players can create an account here.'),form(inputs,async(data,submitter)=>{
      if(state.busy)return;
      state.busy=true;feedback.textContent='Connecting…';
      try{
        await (await cloud()).login(submitter?.value||'login',data.get('email'),data.get('password'));
        if(state.user&&el('modal').open&&state.ready)account();
      }catch(error){feedback.textContent=explanation(error);}
      finally{state.busy=false;}
    })));
  }else if(!state.ready||state.invite?.active&&state.user.emailVerified&&!state.profileSeen)display('Connecting to Alderwatch',note('Checking your account and saved character…'));
  else if(!state.invite?.active)display('Invitation required',stack(note('Ask the world host to invite '+state.user.email+'. Return here after they activate access.'),
    row(button('Check invitation',()=>{syncAccount(state.user);account();},{style:'primary'}),button('Sign out',()=>api.signout()))));
  else if(!state.user.emailVerified){
    const feedback=h('p',{id:'modal-feedback',class:'feedback',role:'status'});
    display('Verify your email',stack(note('Verify '+state.user.email+' to open your private world invitation.'),feedback,
      row(button('Send verification email',async()=>{
        try{await api.verification();feedback.textContent='Verification sent. Open the link in your email, then return here.';}
        catch(error){feedback.textContent=explanation(error);}
      },{style:'primary'}),button('I verified my email',async()=>{
        try{
          const verified=await api.verifiedAccount();
          if(verified?.emailVerified){syncAccount(verified);account();}
          else feedback.textContent='Open the verification link before trying again.';
        }catch(error){feedback.textContent=explanation(error);}
      }),button('Sign out',()=>api.signout(),{style:'ghost'}))));
  }
  else if(!state.p)customize(false);
  else{
    const controls=[note(state.user.email)];
    if(state.invite.admin)controls.push(form([
      field('Invite email','email','','email',{required:true}),
      h('button',{type:'submit',class:'button primary'},'Invite to Alderwatch'),
      h('p',{id:'modal-feedback',class:'feedback',role:'status'})
    ],async data=>{
      try{
        await api.invite(state.user,String(data.get('email')));
        el('modal-feedback').textContent='Invite activated. Share the game URL with this player.';
      }catch(error){el('modal-feedback').textContent=explanation(error);}
    }));
    controls.push(button('Sign out',()=>api.signout().then(closeModal)));
    display('World account',stack(controls));
  }
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
  if(el('battle').open)return;
  const ticket=resume||await run('startFight',{id});
  if(ticket)launchBattle(ctx,id,ticket);
}

el('welcome-action').addEventListener('click',account);
el('account-open').addEventListener('click',account);
el('modal-close').addEventListener('click',closeModal);
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
  progressClock();
  if(now-autoAt>30000){
    autoAt=now;
    maybeCollect();
  }
},1000);
modeFromHash();
render();
cloud().catch(error=>{el('gate-note').textContent=explanation(error);});
