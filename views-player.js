import {ACHIEVEMENTS,EGGS,EQUIPMENT_SLOTS,GEAR,ITEMS,SKILLS} from './content.js';
import {count,level,totalXP} from './engine.js';
import {furnishingArt,itemArt,petArt,rangerArt} from './art.js';
import {buffText,petVisualInfo} from './pets.js';
import {assetIcon,assetName,button,card,detailAsset,field,form,gearDetails,gold,h,heading,
  itemName,listing,note,number,panel,pill,row,stack,subnav,timeText,title,words} from './ui.js';

export function pages(c,key,items){
  const previous=(c.state.pages[key]||[]).length;
  return previous||items.length===24?row(
    button('Previous',()=>c.pageTo(key,'back'),{small:true,disabled:!previous}),
    pill('Page '+(previous+1)),button('Next',()=>c.pageTo(key,'next'),{small:true,disabled:items.length<24})):null;
}
function confirm(c,title,text,action){
  c.display(title,stack(note(text),row(button('Cancel',c.closeModal),
    button('Confirm',action,{style:'danger'}))));
}
function inspect(c,asset,bank=false){
  const p=c.state.p;
  const common=asset.kind==='item'?ITEMS[asset.id]:null;
  const item=asset.kind==='gear'?asset.gear:null;
  const equipped=item&&Object.values(p.equipped).includes(item.id);
  const controls=[];
  if(item){
    if(!bank)controls.push(button(equipped?'Equipped':'Equip',async()=>{
      if(await c.run('equipment',{id:item.id},{success:'Equipment changed.'}))c.closeModal();
    },{style:'primary',disabled:equipped||!!p.activity||!!p.ticket||level(p.xp[GEAR[item.base].skill])<GEAR[item.base].level}));
    controls.push(button(bank?'Withdraw':'Bank',async()=>{
      if(await c.run('bank',{kind:'gear',id:item.id,qty:1,deposit:!bank},{success:'Storage updated.'}))c.closeModal();
    },{disabled:equipped||!!p.ticket}));
    if(!bank&&!equipped)controls.push(button('Salvage',()=>{
      confirm(c,'Salvage equipment','Break down '+GEAR[item.base].name+' for '+(1+item.grade)+' bronze bars.',async()=>{
        if(await c.run('salvage',{id:item.id},{success:'Equipment salvaged.'}))c.closeModal();
      });
    },{style:'ghost'}));
  }else if(common){
    controls.push(form([number('Amount','qty',asset.qty,1,asset.qty),h('button',{type:'submit',class:'button secondary'},bank?'Withdraw to pack':'Deposit to bank')],async data=>{
      if(await c.run('bank',{kind:'item',id:asset.id,qty:+data.get('qty'),deposit:!bank},{success:'Storage updated.'}))c.closeModal();
    }));
  }
  if(!bank&&!equipped)controls.push(button('Trade in town',()=>{
    c.closeModal();c.state.tradePick=asset.kind+'|'+asset.id;c.goTo('market');
  },{style:'ghost'}));
  c.display(assetName(asset),stack(detailAsset(asset),common?note(common.text):gearDetails(item),
    row(controls.filter(x=>x.tagName!=='FORM')),controls.filter(x=>x.tagName==='FORM'),
    h('p',{class:'feedback',id:'modal-feedback',role:'status'})));
}
function inventory(c,bank){
  const p=c.state.p;
  const stock=bank?p.bank:p.bag,gear=bank?p.vault:p.gear;
  const items=Object.entries(stock).sort(([a],[b])=>itemName(a).localeCompare(itemName(b)))
    .map(([id,qty])=>({kind:'item',id,qty}));
  const equips=Object.values(gear).sort((a,b)=>GEAR[a.base].slot.localeCompare(GEAR[b.base].slot)).map(g=>({kind:'gear',id:g.id,gear:g,qty:1}));
  function grid(rows,empty){
    return rows.length?h('div',{class:'inventory'},rows.map(asset=>h('button',{type:'button',class:'thing',
      onclick:()=>inspect(c,asset,bank)},assetIcon(asset),
      h('small',{},asset.kind==='gear'?assetName(asset):itemName(asset.id)),
      h('strong',{},asset.kind==='gear'?(Object.values(p.equipped).includes(asset.id)?'Equipped':''):'×'+words(asset.qty))))):note(empty);
  }
  return stack(panel(h('div',{class:'line'},title(bank?'Bank supplies':'Pack supplies'),pill(items.length+' stacks')),
    grid(items,bank?'Move supplies here from your pack.':'Your supplies are depleted. Gather or visit the Exchange.')),
    panel(h('div',{class:'line'},title(bank?'Bank gear':'Equipment'),pill(equips.length+' / '+(bank?96:48))),
      grid(equips,bank?'Banked equipment will appear here.':'Craft equipment or find it in combat.')));
}
function petDetails(c,pet){
  const p=c.state.p;
  const worn=p.pet===pet.id;
  const placed=Object.values(p.house).some(x=>x.kind==='pet'&&x.id===pet.id);
  const busy=!!p.activity||!!p.ticket;
  const appearance=()=>h('div',{class:'pet-frame'},petArt(pet.traits,pet.name));
  const controls=[
    button(worn?'Unequip':'Equip',async()=>{
      if(await c.run('petEquip',{id:worn?null:pet.id},{success:worn?'Companion stabled.':'Companion equipped.'}))c.closeModal();
    },{style:'primary',disabled:placed||busy}),
    button('Trade in town',()=>{
      c.closeModal();c.state.tradePick='pet|'+pet.id;c.goTo('market');
    },{disabled:worn||placed}),
    button('Display at home',()=>{
      c.state.houseSelection={kind:'pet',id:pet.id};c.closeModal();c.goTo('home');
    },{disabled:worn||placed}),
    button('Release',()=>{
      const gain=1+pet.buffs.length+(pet.traits.accessory>=5?2:0);
      confirm(c,'Release '+pet.name,'This permanently releases the pet into the wild and awards '+gain+' Karma.',async()=>{
        const out=await c.run('release',{id:pet.id},{success:n=>'Released into the wild. +'+n+' Karma.'});
        if(out)c.closeModal();
      });
    },{style:'danger',disabled:worn||placed})];
  const name=form([field('Pet name','name',pet.name,'text',{maxlength:20,required:true}),
    h('button',{type:'submit',class:'button ghost'},'Rename')],async data=>{
    if(await c.run('petName',{id:pet.id,name:data.get('name')},{success:'Companion named.'}))c.closeModal();
  });
  const hatched=pet.hatched?.toDate?.().toLocaleDateString();
  c.display(pet.name,stack(appearance(),note(petVisualInfo(pet.traits)),
    row(pill(EGGS[pet.egg].name),pill(worn?'Equipped':placed?'Displayed':'Stabled')),
    listing(pet.buffs,b=>h('strong',{},buffText(b)),''),
    note('Discovered at '+pet.source+'.'+(hatched?' Hatched '+hatched+'.':'')+' '+pet.hops+' ownership changes.'),
    row(controls),name,h('p',{id:'modal-feedback',class:'feedback',role:'status'})));
}
function companions(c){
  const {p,shops,pets,user,activePet}=c.state;
  const aviary=shops.hatchery;
  const fee=aviary?.owner&&aviary.owner!==user.uid?aviary.fee:0;
  const atAviary=c.atSite('hatchery'), atGuild=c.atSite('guild');
  const ownedEggs=Object.entries(p.eggs).filter(([,n])=>n>0);
  async function hatch(id,fallback=false){
    const result=await c.run('hatch',{id,fee:fallback?0:fee,fallback});
    if(result)c.display('A new companion',stack(h('div',{class:'pet-frame flash'},petArt(result.traits,result.name)),
      h('h3',{},result.name),note(petVisualInfo(result.traits)),listing(result.buffs,b=>h('strong',{},buffText(b)),''),
      button('Inspect companion',()=>petDetails(c,result),{style:'primary'})));
  }
  const eggs=ownedEggs.map(([id,qty])=>card(h('div',{class:'icon-pair'},itemArt('egg',itemName(id),EGGS[id].color),h('h3',{},itemName(id)+' ×'+qty)),
    note(EGGS[id].hint),atAviary?button('Hatch '+EGGS[id].name,()=>hatch(id),
      {small:true,style:'primary',disabled:p.gold<fee}):
      atGuild?button('Hatch '+EGGS[id].name,()=>hatch(id,true),{small:true,style:'primary'}):null));
  return stack(
    panel(h('div',{class:'line'},title('Eggs'),atAviary||atGuild?pill(atAviary&&fee?fee+' g aviary fee':'Free hatching'):null),
      ownedEggs.length?h('div',{class:'grid two'},eggs):note('Eggs turn up while gathering, making goods, fighting, and completing guild quests.'),
      ownedEggs.length&&!atAviary&&!atGuild?note('Bring eggs to Moonnest Aviary or the Rangers’ Guild to hatch them.'):null,
      ownedEggs.length&&!atAviary&&!atGuild&&c.state.region==='town'?button('Walk to Moonnest Aviary',()=>c.goTo('shop','hatchery'),{small:true}):null),
    panel(h('div',{class:'line'},title('Companion stable'),pill(p.karma+' Karma')),
      activePet?note('Active buff: '+activePet.buffs.map(buffText).join(' · ')):note('Equip one companion to receive its passive bonuses.'),
      pets.length?h('div',{class:'grid',style:'margin-top:8px'},pets.map(pet=>card(
        h('div',{class:'pet-frame'},petArt(pet.traits,pet.name)),h('h3',{},pet.name),
        note(pet.buffs.map(buffText).join(' · ')),
        button('Inspect '+pet.name,()=>petDetails(c,pet),{small:true,style:pet.id===p.pet?'primary':'secondary'}))))
      :note('Hatched and received companions will appear here.'),pages(c,'pets',pets)));
}
function character(c){
  const {p,activePet}=c.state;
  const stats=[
    ['Lifetime XP',totalXP(p)],['Resources gathered',p.stats.gathered],['Items produced',p.stats.made],
    ['Enemies defeated',p.stats.kills],['Bosses defeated',p.stats.bosses],['Rare finds',p.stats.rare],
    ['Eggs discovered',p.stats.eggs],['Eggs hatched',p.stats.hatches],['Companions released',p.stats.released],
    ['Karma',p.karma],['Gold earned',p.stats.goldEarned],['Gold spent',p.stats.goldSpent],
    ['Revenue collected',p.stats.revenue],['Production and hatch fees',p.stats.fees],
    ['Quests completed',p.stats.quests],['Contracts fulfilled',p.stats.contracts],['Market purchases',p.stats.trades],
    ['House visits',p.stats.visits],['Activity time',timeText(p.stats.time)]
  ];
  const achievements=ACHIEVEMENTS.map(([name,help,test])=>({name,help,on:test(p,level)}));
  return stack(
    panel(h('div',{class:'line'},title(p.name),button('Customize',()=>c.customize(true),{small:true})),
      h('div',{class:'row'},h('div',{class:'pet-frame sprite-home'},rangerArt(p.appearance,p.gear[p.equipped.weapon]?.base,p.name)),
        activePet?h('div',{class:'pet-frame sprite-home'},petArt(activePet.traits,activePet.name)):null),
      listing(Object.entries(EQUIPMENT_SLOTS),([slot,label])=>{
        const gear=p.gear[p.equipped[slot]];
        return [note(label),gear?button(assetName({kind:'gear',gear}),()=>inspect(c,{kind:'gear',gear,id:gear.id}),{small:true}):note('Empty')];
      },'')),
    panel(title('Lifetime records'),h('dl',{class:'kv'},stats.flatMap(([k,v])=>[h('dt',{},k),h('dd',{},typeof v==='number'?words(v):v)]))),
    panel(title('Achievements'),listing(achievements,a=>[stack(h('strong',{},a.name),note(a.help)),pill(a.on?'Earned':'Open')],'')));
}
export function packView(c){
  const tab=c.state.packTab;
  const choices=[['items','Pack'],['pets','Companions'],['character','Character']];
  if(c.atSite('bank'))choices.splice(1,0,['bank','Bank']);
  return h('div',{},heading('The lodge','Manage equipment, supplies, and the companions you’ve found.'),
    subnav(tab,choices,id=>{c.state.packTab=id;c.refreshPane();c.render();}),
    tab==='pets'?companions(c):tab==='character'?character(c):inventory(c,tab==='bank'));
}
export function houseView(c){
  const {p,user,visited,party,pets}=c.state;
  const target=visited||p;
  const own=!visited;
  const select=c.state.houseSelection;
  const move=c.state.houseMove;
  const chooseTile=async n=>{
    if(!own)return;
    const tile=p.house[n];
    if(move!==null){
      if(n===move){c.state.houseMove=null;c.render();return;}
      if(!tile&&await c.run('decorate',{pos:n,move},{success:'Display moved.'})){c.state.houseMove=null;c.render();}
      return;
    }
    if(tile){
      c.display(tile.kind==='pet'?tile.name:itemName(tile.id),stack(
        tile.kind==='pet'?h('div',{class:'pet-frame'},petArt(tile.traits,tile.name)):detailAsset({kind:'item',id:tile.id,qty:1}),
        row(button('Move',()=>{c.state.houseMove=n;c.state.houseSelection=null;c.closeModal();c.render();}),
          button('Remove',async()=>{if(await c.run('decorate',{pos:n,remove:true},{success:'Display removed.'}))c.closeModal();},{style:'danger'}))));
    }else if(select){
      if(await c.run('decorate',{pos:n,...select},{success:'Display placed.'})){c.state.houseSelection=null;c.render();}
    }else c.notice('Select a furnishing or a stabled companion below.');
  };
  const tiles=Array.from({length:25},(_,n)=>{
    const tile=target.house[n];
    const label=tile?tile.kind==='pet'?tile.name:itemName(tile.id):'empty';
    const art=tile?tile.kind==='pet'?petArt(tile.traits,tile.name):furnishingArt(tile.id,label):null;
    return h(own?'button':'div',{type:own?'button':null,class:'house-tile'+(move===n?' selected':'')+(!own?' blocked':''),
      'aria-label':'Tile '+(n+1)+' · '+label,onclick:()=>chooseTile(n)},art);
  });
  const dec=Object.keys(p.bag).filter(id=>ITEMS[id]?.decor&&count(p,id)>0).map(id=>({kind:'item',id,label:itemName(id)}));
  const displayPets=pets.filter(x=>x.id!==p.pet&&!Object.values(p.house).some(i=>i.kind==='pet'&&i.id===x.id))
    .map(x=>({kind:'pet',id:x.id,label:x.name}));
  const pick=[...dec,...displayPets].map(item=>button(item.label,()=>{
    c.state.houseMove=null;c.state.houseSelection={kind:item.kind,id:item.id};c.render();
  },{small:true,style:'ghost',pressed:select?.id===item.id}));
  return h('div',{},heading(own?'Your house':target.name+'’s house',own?'Place furnishings and show off mementos and companions.':'You’re visiting a neighbour in Alderwatch.'),
    panel(h('div',{class:'line'},title('The hearth'),!own?button('Return home',()=>c.visit({id:user.uid}),{small:true}):null),
      h('div',{class:'house-grid','aria-label':'House floor plan'},tiles),
      own?note(move!==null?'Choose an empty tile to move this display.':select?'Choose an empty tile to place your selection.':'Select a display to place, or tap an occupied tile to move or remove it.'):null),
    own?panel(title('Available displays'),pick.length?row(pick):note('Craft furnishings at Hearthwood, win boss trophies, or hatch a companion.'),
      pages(c,'pets',pets)):null,
    panel(title('Neighbours'),listing(party.filter(x=>x.id!==user.uid),other=>[h('strong',{},other.name),button('Visit '+other.name,async()=>{
      await c.visit(other);
    },{small:true})],'Other rangers appear after creating a character.')));
}
