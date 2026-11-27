import {EGGS,GEAR,ITEMS,MAX_COMMISSION,MAX_FEE,QUESTS,RECIPES,SHOPS,SKILLS,VENDOR,tradeShop} from './content.js';
import {count,has,questReady} from './engine.js';
import {petArt,rangerArt} from './art.js';
import {pages} from './views-player.js?v=1.1.0';
import {activityCard} from './views-world.js?v=1.1.0';
import {assetName,button,card,detailAsset,form,gold,h,heading,itemName,itemText,listing,note,number,
  panel,pill,row,select,stack,timeText,title,words} from './ui.js';

function guildWorkshop(c){
  const stations=Object.entries(SHOPS).filter(([id])=>Object.values(RECIPES).some(a=>a.shop===id));
  const active=c.state.guildShop||stations[0][0];
  return stack(button('Back to quests',()=>{c.state.townTab='guild';c.render();},{small:true}),
    note('The guild provides free work benches. Each action takes 80% longer.'),
    row(stations.map(([id,shop])=>button(shop.name,()=>{c.state.guildShop=id;c.render();},{small:true,pressed:id===active}))),
    h('div',{class:'field-recipe-list'},Object.values(RECIPES).filter(a=>a.shop===active).map(a=>activityCard(c,a,true))));
}
function guild(c){
  const {event,p}=c.state;
  const completed=p.eventDone>=event.slot;
  const ready=has(p,event.items);
  const shop=c.state.shops[event.shop];
  const cut=shop?.owner&&shop.owner!==c.state.user.uid?Math.floor(event.gold*shop.commission/100):0;
  return stack(row(button('Use free guild work benches',()=>{c.state.townTab='guildWorkshop';c.render();},{small:true}),
    Object.keys(p.eggs).length?button('Hatch eggs',()=>{c.state.packTab='pets';c.navigate('pack');},{small:true}):null),
    panel(h('p',{class:'eyebrow'},'Current commission'),title(event.name),note(event.detail),note(itemText(event.items)),
    row(gold(event.gold-cut),pill('+12% '+SKILLS[event.bonus][0]+' XP while event runs'),
      button(completed?'Commission filled':'Fulfill order',()=>c.run('contract',{}, {success:result=>'Town delivery paid '+result+' gold.'}),
        {small:true,style:'primary',disabled:completed||!ready})),
    note('Next commission in '+timeText((event.ends-Date.now())/1000)+'.')),
  panel(title('Guild quests'),listing(QUESTS,q=>{
    const done=!!p.quests[q.id], unlocked=!q.after||p.quests[q.after];
    const ready=questReady(p,q);
    return [stack(h('strong',{},q.name+' · '+q.npc),note(q.detail),
      note((q.items?itemText(q.items)+' · ':'')+'Reward '+q.gold+' g'+(q.egg?' and an egg':''))),
      button(done?'Completed':unlocked?'Deliver':'Locked',()=>c.run('quest',{id:q.id},{success:'Quest completed. Check your pack.'}),
        {small:true,style:ready?'primary':'ghost',disabled:!ready})];
  },'')));
}
function business(c){
  const {shop:id,shops,p,user,event}=c.state;
  const def=SHOPS[id];
  const shop=shops[id];
  const owner=shop?.owner===user.uid;
  const fee=shop?.fee??def.fee, commission=shop?.commission??def.commission;
  const actions=[];
  if(!shop)actions.push(button('Buy establishment · '+def.cost+' g',()=>c.run('claimShop',{id},{success:'You now own '+def.name+'.'}),
    {style:'primary',disabled:p.gold<def.cost}));
  if(shop?.price&&!owner)actions.push(button('Buy deed · '+shop.price+' g',()=>c.run('buyShop',{id,price:shop.price,seller:shop.owner},{success:'The deed has transferred.'}),
    {style:'primary',disabled:p.gold<shop.price}));
  if(shop&&event.slot>shop.npcSlot)actions.push(button('Reconcile NPC trade',()=>c.run('npc',{id},{success:'NPC orders settled for this establishment.'})));
  const recipes=Object.values(RECIPES).filter(r=>r.shop===id);
  if(id==='hatchery')actions.push(button('Open your companions',()=>{c.state.packTab='pets';c.navigate('pack');},{style:'primary'}));
  const budget=shop?(shop.level-1)*2+def.budget:def.budget;
  let control;
  if(owner){
    const required=Object.fromEntries(Object.entries(def.need).map(([id,n])=>[id,n*shop.level]));
    const next=shop.level<3?stack(note('Upgrade · '+itemText(required)+' and '+shop.level*100+' g.'),
      button('Upgrade to level '+(shop.level+1),()=>c.run('upgrade',{id},{success:'Workshop upgraded.'}),
        {disabled:!has(p,required)||p.gold<shop.level*100,small:true})):note('Level 3 · fully upgraded');
    const terms=panel(title('Manage establishment'),
      form([
        h('div',{class:'grid two'},number('Gold per action','fee',fee,0,MAX_FEE),number('Sale commission %','commission',commission,0,MAX_COMMISSION)),
        number('Deed asking price (0 keeps deed)','price',shop.price,0,100000),
        h('button',{type:'submit',class:'button secondary'},'Save business terms')
      ],data=>c.run('terms',{id,fee:+data.get('fee'),commission:+data.get('commission'),price:+data.get('price')},
      {success:'Terms saved. Running production keeps its quote.'})),
      h('hr',{}),next,
      h('hr',{}),row(gold(shop.balance),button('Collect revenue',()=>c.run('withdraw',{id},{success:n=>'Collected '+n+' gold.'}),
        {style:'primary',small:true,disabled:!shop.balance})));
    control=terms;
  }
  const history=shop?panel(title('Business ledger'),row(pill(words(shop.production)+' player actions'),pill(words(shop.sales)+' sales'),
    pill(words(shop.npc)+' NPC windows'),pill(words(shop.total)+' g lifetime revenue')),
    listing(shop.history,e=>[stack(h('strong',{},e.description),note(e.by+' · '+new Date(e.at).toLocaleString())),
      gold(e.amount)],'Activity will appear once the establishment trades.')):null;
  const vendor=id==='general'?panel(title('NPC stock'),note('Alderwatch keeps early materials available for new rangers.'),
    listing(Object.entries(VENDOR),([id,price])=>[detailAsset({kind:'item',id,qty:1}),button(price+' g',()=>{
      c.display('Buy '+itemName(id),form([note(price+' g per item'),number('Quantity','qty',1,1,30),
        h('button',{type:'submit',class:'button primary'},'Buy supplies'),h('p',{id:'modal-feedback',class:'feedback'})],async data=>{
        if(await c.run('vendor',{id,qty:+data.get('qty')},{success:'Supplies delivered to your pack.'}))c.closeModal();
      }));
    },{small:true})],'')):null;
  return stack(h('section',{class:'panel shop-detail stack'},
    h('div',{class:'line'},h('div',{},h('p',{class:'eyebrow'},'Alderwatch establishments'),title(def.name)),
      pill(shop?'Level '+shop.level:'NPC owned')),note(def.description),
    note('Proprietor: '+(shop?.ownerName||def.keeper)),
    row(pill(shop?(owner?'Your own use is free':fee+' g per action'):'Guild rate · free'),pill(shop?commission+'% sale cut':'Standard NPC terms'),pill(budget+' g NPC gross budget per window')),
    note('NPC trade settles in six-hour windows. Production rates are locked for each session.'),
    note('The guild facility offers the same recipes at a slower rate for free.'),row(actions)),
    recipes.length?panel(title('Production'),h('div',{class:'field-recipe-list'},recipes.map(a=>activityCard(c,a)))):null,
    vendor,control,history);
}
function market(c){
  const {p,party,pets,user,market}=c.state;
  const equipped=new Set(Object.values(p.equipped));
  const displayed=new Set(Object.values(p.house).filter(x=>x.kind==='pet').map(x=>x.id));
  const items=[
    ...Object.entries(p.bag).map(([id,n])=>['item|'+id,ITEMS[id].name+' ×'+n]),
    ...Object.entries(p.eggs).map(([id,n])=>['egg|'+id,EGGS[id].name+' ×'+n]),
    ...Object.values(p.gear).filter(item=>!equipped.has(item.id)).map(item=>['gear|'+item.id,assetName({kind:'gear',gear:item})]),
    ...pets.filter(pet=>p.pet!==pet.id&&!displayed.has(pet.id)).map(pet=>['pet|'+pet.id,pet.name+' · companion'])
  ];
  const recipients=party.filter(x=>x.id!==user.uid);
  const preferred=items.some(([key])=>key===c.state.tradePick)?c.state.tradePick:items[0]?.[0];
  function postingTerms(key){
    const [kind,id]=(key||'').split('|');
    if(!kind)return '';
    const business=tradeShop({kind,id,gear:p.gear[id]});
    const shop=c.state.shops[business];
    return 'Sales use '+SHOPS[business].name+' · '+(shop?.owner===user.uid?'owner self-sale':(shop?.owner?shop.commission:0)+'% current commission')+'.';
  }
  const quote=note(postingTerms(preferred));
  const trade=items.length?form([
    select('Offer','asset',items,preferred,{onchange:e=>{
      c.state.tradePick=e.target.value;quote.textContent=postingTerms(e.target.value);
    }}),quote,
    h('div',{class:'grid two'},number('Stack quantity','qty',c.state.tradeQty??1,1,10000,{oninput:e=>c.state.tradeQty=e.target.value}),
      number('Sale price in gold','price',c.state.tradePrice??20,1,100000,{oninput:e=>c.state.tradePrice=e.target.value})),
    recipients.length?select('Gift recipient','to',[['','Choose a ranger'],...recipients.map(x=>[x.id,x.name])],
      c.state.tradeTo??'',{onchange:e=>c.state.tradeTo=e.target.value}):null,
    row(h('button',{type:'submit',class:'button primary',value:'list'},'List for sale'),
      recipients.length?h('button',{type:'submit',class:'button secondary',value:'gift'},'Send gift'):null),
    note('A listing reserves the item. Gifts arrive in the recipient’s mailbox, even if they are offline.')
  ],async(data,submitter)=>{
    const [kind,id]=String(data.get('asset')).split('|');
    const asset={kind,id,qty:kind==='item'?+data.get('qty'):1};
    if(submitter?.value==='gift'){
      const to=data.get('to');
      if(!to){c.notice('Choose a gift recipient.',true);return;}
      const target=recipients.find(x=>x.id===to);
      c.display('Send a gift',stack(note('Send this offer to '+target.name+'?'),
        row(button('Cancel',c.closeModal),button('Send gift',async()=>{
          if(await c.run('gift',{asset,to},{success:'Gift delivered to the mailbox.'}))c.closeModal();
        },{style:'primary'}))));
    }else await c.run('list',{asset,price:+data.get('price')},{success:'Your offer is open.'});
  }):note('Move supplies into your pack or unequip an item before trading.');
  return stack(panel(title('Offer a trade or gift'),trade),panel(title('Current offers'),
    listing(market,offer=>{
      const mine=offer.seller===user.uid;
      return [stack(detailAsset(offer.asset),note(offer.sellerName+' · '+SHOPS[offer.shop].name)),row(gold(offer.price),
        button(mine?'Cancel listing':'Buy',()=>{
          if(mine)c.run('cancelListing',{id:offer.id},{success:'Offer canceled. Your asset is back.'});
          else c.display('Buy '+assetName(offer.asset),stack(detailAsset(offer.asset),gold(offer.price),
            offer.asset.kind==='gear'?note('Rolled modifiers: '+(Object.entries(offer.asset.gear.mods).map(([k,v])=>'+'+v+' '+k).join(', ')||'None')):null,
            row(button('Cancel',c.closeModal),button('Confirm purchase',async()=>{
              if(await c.run('buy',{id:offer.id,price:offer.price},{success:'Purchase complete.'}))c.closeModal();
            },{style:'primary'}))));
        },{disabled:!mine&&p.gold<offer.price,small:true}))];
    },'New member listings will appear here.'),pages(c,'market',market)));
}
function mailbox(c){
  const {mail}=c.state;
  return panel(title('Mailbox'),note('Collect gifts, sale proceeds, and earnings from past ownership.'),
    listing(mail,entry=>[stack(h('strong',{},entry.label),entry.asset?detailAsset(entry.asset):gold(entry.gold)),
      button('Collect parcel',()=>c.run('mail',{id:entry.id},{success:'Parcel collected.'}),{small:true,style:'primary'})],
    'There are no unclaimed parcels.'),pages(c,'mail',mail));
}
function community(c){
  const party=[...c.state.party].sort((a,b)=>b.xp-a.xp);
  const visit=other=>c.visit(other);
  function profile(other){
    c.display(other.name,stack(h('div',{class:'pet-frame'},rangerArt(other.appearance,other.weapon,other.name)),
      row(pill('Combat '+other.rank),pill(words(other.xp)+' total XP'),pill(other.karma+' Karma')),
      other.pet?stack(h('div',{class:'pet-frame'},petArt(other.pet.traits,other.pet.name)),note(other.pet.name+' · equipped')):null,
      h('strong',{},'Displayed companions'),
      listing(Object.values(other.house).filter(x=>x.kind==='pet'),x=>detailAsset({kind:'pet',...x}),'No companions on display.'),
      button('Visit house',()=>{c.closeModal();visit(other);},{style:'primary'})));
  }
  return panel(title('Alderwatch records'),listing(party,(member)=>[
    stack(h('strong',{},member.name),note(words(member.xp)+' XP · '+member.kills+' victories')),
    button('Inspect '+member.name,()=>profile(member),{small:true})
  ],'Other rangers appear after creating a character.'));
}
export function townView(c){
  const tab=c.state.townTab;
  return {guild,guildWorkshop,business,market,mail:mailbox,community}[tab](c);
}
