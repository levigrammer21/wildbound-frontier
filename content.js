export const VERSION = '1.0.1';
export const NAMESPACE = 'cairnCrownV1';
export const SKILLS = {
  combat: ['Combat','⚔'], woodcutting: ['Woodcutting','🪓'], mining: ['Mining','⛏'],
  fishing: ['Fishing','🎣'], farming: ['Farming','🌱'], hunting: ['Hunting','🏹'],
  smithing: ['Smithing','⚒'], crafting: ['Crafting','🪚'], cooking: ['Cooking','🍲'], alchemy: ['Alchemy','⚗']
};
export const LOCATIONS = {
  town: { name:'Alderwatch', title:'The Lantern Town', x:50, y:53, color:'#f4c97e', glyph:'♜',
    text:'The guild bells mark the hours. Smiths, traders and old adventurers meet beneath the copper roofs.' },
  wood: { name:'Brackenwood', title:'The green road', x:23, y:29, color:'#a8d082', glyph:'♠',
    text:'Beneath the ash canopy, forgotten milestones lead to the old forest ward.' },
  frost: { name:'Frostvein', title:'The white pass', x:76, y:27, color:'#a1d0e9', glyph:'◆',
    text:'Glacial streams and silver seams lead toward the Graven Peak.', unlock:6 },
  fen: { name:'Mirefen', title:'The drowned reach', x:24, y:75, color:'#81cebe', glyph:'≋',
    text:'Lanterns flicker in the reeds. Cast a line, cut duskcap, or descend to the drowned shrine.', unlock:17 },
  march: { name:'Ashen March', title:'The crownless moor', x:76, y:75, color:'#e5a0a1', glyph:'✦',
    text:'Ironwood roots entwine fallen standing stones. The last Crown Warden still keeps watch.', unlock:31 }
};
const materials = [
  ['ash','Ash log','wood','Straight-grained wood for boards, handles and furniture.'],
  ['yew','Yew log','wood','Springy wood for weapons, advanced tools and furniture.'],
  ['ironwood','Ironwood','wood','Dense timber for masterwork weapons and durable furnishings.'],
  ['resin','Amber resin','relic','Burns long and binds protective tonics.'],
  ['stone','Fieldstone','ore','Level hearths and reinforce buildings.'],
  ['copper','Copper ore','ore','Smelted into bronze fittings and bars.'],
  ['iron','Iron ore','ore','The foundation of iron and starsteel equipment.'],
  ['silver','Silver ore','ore','Used for rings, amulets, and fittings.'],
  ['star','Star ore','ore','A meteor-vein alloy dulled with iron.'],
  ['trout','Brook trout','fish','Food for the trail.'],
  ['eel','Glass eel','fish','Rich meat for a large meal and ward tonic.'],
  ['crystalfin','Crystalfin','fish','A shimmering fish for restorative meals and tonics.'],
  ['pearl','River pearl','relic','For jewelry and high-grade tonic.'],
  ['flax','Flax fiber','herb','Lash tools and make bowstrings and upholstery.'],
  ['thyme','Wild thyme','herb','Season hearty meals and brew healing tonics.'],
  ['sunroot','Sunroot','herb','Sweetens recovery food and restores vitality.'],
  ['duskcap','Duskcap','herb','Temper in a ward or fury tonic.'],
  ['hide','Raw hide','hide','Leather armor, tool grips and house rugs.'],
  ['venison','Venison','food','Roast for a long expedition.'],
  ['bone','Carved bone','relic','Brace armor and strengthen amulets.'],
  ['claw','Wild claw','relic','File into blades or a hunter display.'],
  ['ember','Ember core','relic','Charges elite equipment and lamps.'],
  ['sigil','Crown sigil','relic','A late-game ingredient for heraldic equipment and trophies.'],
  ['bronze','Bronze bar','bar','Make tools, weapons and town fittings.'],
  ['ironbar','Iron bar','bar','For better weapons, tools and construction.'],
  ['starbar','Starsteel bar','bar','Build the highest-grade tools and steelwork.'],
  ['boards','Ash boards','wood','A staple for everything from bows to building upgrades.'],
  ['hardboard','Heartwood boards','wood','Durable stock for quality furniture and tools.'],
  ['cloth','Linen cloth','cloth','Craft light armor, rugs and hand wraps.'],
  ['leather','Tanned leather','hide','Armor, grips and boots.'],
  ['trailmeal','Herbed trout','food','Restores 32 health.',{heal:32}],
  ['roast','Hunter roast','food','Restores 66 health.',{heal:66}],
  ['eelmeal','Spiced eel','food','Restores 103 health.',{heal:103}],
  ['banquet','Moonwater stew','food','Restores 168 health.',{heal:168}],
  ['salve','Sunroot draught','potion','Restores 58 health.',{heal:58}],
  ['ward','Amber ward','potion','Grants extra defence for ten seconds.',{boost:'ward'}],
  ['fury','Duskcap tonic','potion','Grants extra attack power for ten seconds.',{boost:'fury'}],
  ['elixir','Pearl elixir','potion','Restores 145 health.',{heal:145}],
  ['stool','Ash stool','furniture','Place in an open house tile.',{decor:true}],
  ['rug','Woven rug','cloth','A warm, braided textile for the house.',{decor:true}],
  ['lamp','Ember lantern','potion','A spark sealed behind amber glass.',{decor:true}],
  ['rack','Hunter display','hide','Display claws and antlers in your house.',{decor:true}],
  ['lodgechest','Heartwood chest','furniture','A decorative chest with silver hinges.',{decor:true}],
  ['standard','Crown standard','relic','Fly the banner of a fallen order.',{decor:true}],
  ['thorns','Thornhart antlers','relic','Brackenwood trophy. Place it in your house.',{decor:true}],
  ['frostmark','Graven crest','relic','Frostvein trophy. Place it in your house.',{decor:true}],
  ['fenmark','Mireglass relic','relic','Mirefen trophy. Place it in your house.',{decor:true}],
  ['crownmark','Crown Warden helm','relic','Ashen March trophy. Place it in your house.',{decor:true}]
];
export const ITEMS = Object.fromEntries(materials.map(([id,name,icon,text,extra])=>[id,{id,name,icon,text,...extra}]));
export const EGGS = {
  grove:{name:'Grove egg',hint:'Warm and flecked with moss.',color:'#a9df86'},
  crag:{name:'Crag egg',hint:'Cold as a piece of mountain glass.',color:'#a5c9fa'},
  tide:{name:'Tide egg',hint:'Faint moonlight moves beneath the shell.',color:'#7de2d2'},
  dusk:{name:'Dusk egg',hint:'A pulse of colour at the edge of the light.',color:'#e6a1d6'}
};
export const TOOLS = {woodcutting:'axe',mining:'pick',fishing:'rod',farming:'hoe',hunting:'knife'};
export const PRODUCTION_TOOLS = {smithing:'hammer',crafting:'benchkit',cooking:'cookset',alchemy:'retort'};
export const EQUIPMENT_SLOTS = {hammer:'Smithing hammer',benchkit:'Carving kit',cookset:'Cookset',retort:'Retort',weapon:'Weapon',armor:'Armor',charm:'Charm',axe:'Axe',pick:'Pickaxe',rod:'Rod',hoe:'Hoe',knife:'Knife'};
const gear = [
  ['bronzehammer','Bronze planishing hammer','hammer','smithing',3,{tool:2,conserve:4}],
  ['ironhammer','Iron cross-peen','hammer','smithing',18,{tool:3,conserve:7}],
  ['bronzebench','Carver’s bench kit','benchkit','crafting',3,{tool:2,conserve:4}],
  ['silverbench','Silverhand bench kit','benchkit','crafting',18,{tool:3,conserve:7}],
  ['kettle','Copper cookset','cookset','cooking',3,{tool:2,conserve:4}],
  ['fieldoven','Iron field oven','cookset','cooking',18,{tool:3,conserve:7}],
  ['alembic','Sealed retort','retort','alchemy',3,{tool:2,conserve:4}],
  ['mireglass','Mireglass retort','retort','alchemy',18,{tool:3,conserve:7}],
  ['sword','Recruit sword','weapon','combat',1,{attack:10,speed:1.1,reach:1,type:'Sword',special:'Riposte'}],
  ['bronzesword','Bronze longsword','weapon','combat',3,{attack:16,speed:1.05,reach:1,type:'Sword',special:'Riposte'}],
  ['dagger','Thorn dagger','weapon','combat',6,{attack:13,speed:.66,reach:1,crit:14,type:'Dagger',special:'Flurry'}],
  ['spear','Iron pike','weapon','combat',12,{attack:22,speed:1.21,reach:2,type:'Spear',special:'Skewer'}],
  ['bow','Yew shortbow','weapon','combat',9,{attack:16,speed:1.1,reach:4,type:'Bow',special:'Pinning shot'}],
  ['staff','Silver focus','weapon','combat',20,{attack:29,speed:1.37,reach:3,type:'Staff',special:'Arc burst'}],
  ['greatsword','Starsteel greatsword','weapon','combat',34,{attack:48,speed:1.63,reach:1,type:'Greatsword',special:'Cleave'}],
  ['pyre','Pyrebrand','weapon','combat',49,{attack:48,speed:1.14,reach:2,type:'Sword',special:'Riposte'}],
  ['crownblade','Oath of the Crown','weapon','combat',65,{attack:65,speed:1.19,reach:2,type:'Sword',special:'Riposte'}],
  ['tunic','Trail tunic','armor','combat',1,{defence:2,hp:6}],
  ['leathercoat','Hunter leathers','armor','combat',4,{defence:5,hp:20}],
  ['chain','Iron chaincoat','armor','combat',13,{defence:12,hp:30}],
  ['vest','Mireweave mantle','armor','combat',26,{defence:14,hp:48}],
  ['plate','Starsteel plate','armor','combat',41,{defence:23,hp:58}],
  ['crownplate','Crown sentinel mail','armor','combat',60,{defence:34,hp:74}],
  ['bonering','Bone band','charm','crafting',1,{crit:7,healing:5}],
  ['silverring','Silverscale ring','charm','crafting',8,{crit:11,healing:9}],
  ['pearlcharm','Pearl amulet','charm','crafting',21,{crit:14,healing:13,defence:4}],
  ['crowncharm','Crown amulet','charm','crafting',38,{crit:18,healing:20,hp:22}]
];
for (const [skill,slot] of Object.entries(TOOLS)) {
  const names={axe:'Axe',pick:'Pickaxe',rod:'Rod',hoe:'Hoe',knife:'Knife'};
  for (const [prefix,label,level,power] of [['plain','Field',1,1],['bronze','Bronze',4,2],['iron','Iron',14,3],['star','Starsteel',31,4]]) {
    gear.push([prefix+slot,label+' '+names[slot],slot,skill,level,{tool:power}]);
  }
}
export const GEAR = Object.fromEntries(gear.map(([id,name,slot,skill,level,stats])=>[id,{id,name,slot,skill,level,stats}]));

export const SHOPS = {
  forge:{name:'Iron Bell Smithy',keeper:'Mara',glyph:'⚒',cost:220,fee:3,commission:8,need:{ironbar:4,boards:5},budget:12,description:'Metalwork, weapons, armor and tools.'},
  mill:{name:'Ash & Adze Sawmill',keeper:'Osric',glyph:'🪵',cost:180,fee:2,commission:7,need:{boards:8,stone:6},budget:9,description:'Milled boards and a steady timber trade.'},
  workshop:{name:'Silverhand Workshop',keeper:'Iona',glyph:'🪚',cost:200,fee:2,commission:8,need:{boards:6,bronze:4},budget:10,description:'Bows, jewelry and specialist equipment.'},
  kitchen:{name:'The Copper Ladle',keeper:'Bram',glyph:'🍲',cost:170,fee:2,commission:6,need:{stone:8,boards:5},budget:9,description:'Meals, fish and meat for travellers.'},
  apothecary:{name:'Stillwater Apothecary',keeper:'Kestrel',glyph:'⚗',cost:210,fee:3,commission:8,need:{silver:4,boards:5},budget:10,description:'Medicines, herbs and restorative tonics.'},
  general:{name:'The Lamplight Exchange',keeper:'Nell',glyph:'◈',cost:190,fee:2,commission:7,need:{stone:7,bronze:3},budget:11,description:'Materials, settlement supplies and spare equipment.'},
  furnishings:{name:'Hearthwood Furnishings',keeper:'Rowan',glyph:'⌂',cost:190,fee:2,commission:8,need:{boards:7,cloth:2},budget:8,description:'Household goods and trophies.'},
  hatchery:{name:'Moonnest Aviary',keeper:'Tamsin',glyph:'◉',cost:235,fee:2,commission:6,need:{hardboard:5,cloth:3},budget:10,description:'Hatching rooms, eggs and companion exchanges.'}
};
export const MAX_FEE = 8;
export const MAX_COMMISSION = 15;
export const TRADE_MAX = 100000;
export const EVENT_SECONDS = 6*60*60;
const gathering = [
 ['ashgrove','Splitrail Grove','woodcutting','wood',1,12,12,{ash:2},['resin',.10]],
 ['yewgrove','Yew Hollow','woodcutting','frost',6,19,26,{yew:2,ash:1},['resin',.17],2],
 ['fenbough','Drowned Boughs','woodcutting','fen',17,27,61,{yew:3,resin:1},['ironwood',.18],3],
 ['ironbough','Ironsong Stand','woodcutting','march',31,40,148,{ironwood:2,ash:2},['resin',.22],4],
 ['copperline','Copper Cut','mining','wood',1,13,12,{copper:2,stone:1},['silver',.08]],
 ['ironspine','Iron Spine','mining','frost',6,19,26,{iron:2,stone:2},['silver',.16],2],
 ['mirevault','Silver Underway','mining','fen',17,27,62,{silver:2,iron:1},['star',.14],3],
 ['starseam','Fallen Star Seam','mining','march',31,42,153,{star:2,stone:3},['ember',.13],4],
 ['brook','Milestone Brook','fishing','wood',1,14,12,{trout:2},['pearl',.07]],
 ['icepool','Frozen Run','fishing','frost',6,19,25,{trout:3,eel:1},['pearl',.12],2],
 ['reeds','Stillwater Reeds','fishing','fen',17,28,64,{eel:3,trout:1},['pearl',.22],3],
 ['starpond','The Mirror Pond','fishing','march',31,39,143,{crystalfin:2,eel:1},['pearl',.34],4],
 ['guildplot','Lantern Allotment','farming','town',1,14,12,{flax:2,thyme:1},['sunroot',.12]],
 ['shelter','Sheltered Terrace','farming','frost',6,20,28,{sunroot:2,flax:2},['thyme',.36],2],
 ['bogherb','Duskcap Island','farming','fen',17,28,65,{duskcap:2,thyme:2},['sunroot',.31],3],
 ['emberplot','Old Hearth Beds','farming','march',31,38,144,{duskcap:2,sunroot:2,flax:2},['resin',.23],4],
 ['harttrail','Hare & Hart Trail','hunting','wood',1,14,13,{hide:2,venison:1},['bone',.14]],
 ['ramtrack','Rime Ram Tracks','hunting','frost',6,20,28,{hide:2,bone:2},['claw',.16],2],
 ['miretrack','The Quiet Fens','hunting','fen',17,29,68,{hide:3,venison:2,bone:1},['claw',.23],3],
 ['sentineltrack','Cinderhart Tracks','hunting','march',31,39,150,{hide:4,claw:2,venison:2},['ember',.15],4],
 ['oldgrove','The First Root','woodcutting','march',60,45,315,{ironwood:4,ash:3,resin:2},['sigil',.07],4],
 ['sunkenmeteors','Sunken Meteors','mining','march',65,52,365,{star:4,silver:2,stone:5},['sigil',.07],4],
 ['nightcast','Midnight Cast','fishing','march',60,44,315,{crystalfin:4,pearl:1},['sigil',.05],4],
 ['crownterrace','Crown Terrace','farming','march',60,43,310,{duskcap:4,sunroot:4,flax:3},['ember',.15],4],
 ['longhunt','The Long Hunt','hunting','march',65,49,355,{hide:5,claw:3,bone:3},['sigil',.07],4]
];
export const GATHERING = Object.fromEntries(gathering.map(([id,name,skill,region,level,seconds,xp,gives,rare,tool=1])=>
 [id,{id,name,skill,region,level,seconds,xp,gives,rare,tool,kind:'gather',egg:{town:'grove',wood:'grove',frost:'crag',fen:'tide',march:'dusk'}[region]}]));

const recipes = [
 ['bronzehammer','smithing','forge',2,18,34,{bronze:3,boards:1},'bronzehammer'],
 ['ironhammer','smithing','forge',15,28,89,{ironbar:4,hardboard:2,leather:1},'ironhammer'],
 ['bronzebench','crafting','workshop',2,16,35,{bronze:2,boards:2},'bronzebench'],
 ['silverbench','crafting','workshop',15,26,91,{silver:3,ironbar:2,hardboard:2},'silverbench'],
 ['kettle','smithing','forge',2,16,39,{bronze:3,stone:1},'kettle'],
 ['fieldoven','smithing','forge',15,29,86,{ironbar:4,stone:3,hardboard:1},'fieldoven'],
 ['alembic','crafting','workshop',2,16,38,{bronze:2,stone:2},'alembic'],
 ['mireglass','crafting','workshop',15,28,96,{silver:2,pearl:1,hardboard:1,resin:1},'mireglass'],
 ['boards','crafting','mill',1,9,13,{ash:2},{boards:2}],
 ['hardboard','crafting','mill',8,16,30,{yew:2,ash:1},{hardboard:2}],
 ['heartwoodmill','crafting','mill',31,24,110,{ironwood:2,yew:1},{hardboard:4,resin:1}],
 ['cloth','crafting','workshop',1,9,12,{flax:2},{cloth:2}],
 ['leather','crafting','workshop',1,10,12,{hide:2,thyme:1},{leather:2}],
 ['bronze','smithing','forge',1,10,14,{copper:2,ash:1},{bronze:2}],
 ['ironbar','smithing','forge',6,15,26,{iron:2,ash:1},{ironbar:2}],
 ['starbar','smithing','forge',26,24,90,{star:2,iron:1,ash:1},{starbar:2}],
 ['bronzesword','smithing','forge',2,18,39,{bronze:2,boards:1},'bronzesword'],
 ['dagger','smithing','forge',5,20,51,{bronze:3,claw:1,leather:1},'dagger'],
 ['spear','smithing','forge',10,22,65,{ironbar:3,hardboard:1,leather:1},'spear'],
 ['bow','crafting','workshop',6,23,64,{yew:3,boards:1,flax:3},'bow'],
 ['staff','crafting','workshop',17,27,88,{silver:3,hardboard:2,pearl:1},'staff'],
 ['greatsword','smithing','forge',30,31,141,{starbar:3,ironwood:2,leather:2},'greatsword'],
 ['pyre','smithing','forge',42,44,260,{starbar:4,ember:3,ironwood:3},'pyre'],
 ['crownblade','smithing','forge',60,58,470,{starbar:6,sigil:2,ember:5,hardboard:4},'crownblade'],
 ['leathercoat','crafting','workshop',3,17,40,{leather:3,cloth:1},'leathercoat'],
 ['chain','smithing','forge',11,26,72,{ironbar:4,cloth:2},'chain'],
 ['vest','crafting','workshop',19,32,105,{leather:4,cloth:3,duskcap:2},'vest'],
 ['plate','smithing','forge',35,40,184,{starbar:4,leather:2,ember:1},'plate'],
 ['crownplate','smithing','forge',55,60,435,{starbar:7,sigil:2,cloth:4},'crownplate'],
 ['bonering','crafting','workshop',1,11,23,{bone:2,bronze:1},'bonering'],
 ['silverring','crafting','workshop',7,18,50,{silver:2,pearl:1},'silverring'],
 ['pearlcharm','crafting','workshop',18,29,91,{silver:3,pearl:2,bone:2},'pearlcharm'],
 ['crowncharm','crafting','workshop',33,41,175,{silver:4,pearl:3,sigil:1},'crowncharm'],
 ['trailmeal','cooking','kitchen',1,9,14,{trout:2,thyme:1},{trailmeal:2}],
 ['roast','cooking','kitchen',4,13,25,{venison:2,sunroot:1,ash:1},{roast:2}],
 ['eelmeal','cooking','kitchen',12,19,47,{eel:2,sunroot:2,thyme:1},{eelmeal:2}],
 ['banquet','cooking','kitchen',26,26,99,{crystalfin:2,sunroot:2,duskcap:1,ash:1},{banquet:2}],
 ['guildbanquet','cooking','kitchen',62,42,345,{crystalfin:4,eel:3,venison:4,thyme:3,ash:2},{banquet:6}],
 ['salve','alchemy','apothecary',1,11,15,{thyme:2,sunroot:1},{salve:2}],
 ['ward','alchemy','apothecary',5,15,30,{resin:1,bone:1,eel:1},{ward:2}],
 ['fury','alchemy','apothecary',15,21,60,{duskcap:2,claw:1,thyme:1},{fury:2}],
 ['elixir','alchemy','apothecary',28,29,112,{pearl:1,crystalfin:2,sunroot:2},{elixir:2}],
 ['archivist','alchemy','apothecary',63,42,360,{pearl:2,crystalfin:2,duskcap:2,sunroot:3},{elixir:4,fury:2}],
 ['stool','crafting','furnishings',1,11,21,{boards:3,bronze:1},{stool:1}],
 ['rug','crafting','furnishings',4,17,32,{cloth:3,hide:2},{rug:1}],
 ['lamp','crafting','furnishings',14,24,72,{ember:1,resin:2,bronze:1},{lamp:1}],
 ['rack','crafting','furnishings',9,20,62,{boards:3,claw:2,bone:2},{rack:1}],
 ['lodgechest','crafting','furnishings',19,27,102,{hardboard:3,silver:2,ironbar:1},{lodgechest:1}],
 ['standard','crafting','furnishings',39,42,220,{hardboard:3,cloth:3,sigil:1},{standard:1}]
];
for (const slot of Object.values(TOOLS)) {
  const artisan=['rod','knife'].includes(slot);
  const skill=artisan?'crafting':'smithing';
  const shop=artisan?'workshop':'forge';
  const accent=slot==='rod'?{flax:2}:slot==='knife'?{leather:1}:{};
  recipes.push(['bronze'+slot,skill,shop,2,15,36,{bronze:2,boards:1,...accent},'bronze'+slot],
    ['iron'+slot,skill,shop,9,21,64,{ironbar:2,hardboard:1,...accent},'iron'+slot],
    ['star'+slot,skill,shop,27,32,132,{starbar:2,ironwood:2,resin:1,...accent},'star'+slot]);
}
export const RECIPES = Object.fromEntries(recipes.map(([id,skill,shop,level,seconds,xp,requires,out])=>{
 const gear=typeof out==='string'?out:null;
 const gives=gear?{}:out;
 return [id,{id,name:gear?GEAR[gear].name:ITEMS[Object.keys(gives)[0]].name+(id==='heartwoodmill'?' · Bulk':id==='guildbanquet'||id==='archivist'?' · Batch':''),skill,shop,level,seconds,xp,requires,gives,gear,kind:'make',egg:{forge:'crag',kitchen:'tide',apothecary:'dusk'}[shop]||'grove'}];
}));

const enemies = [
 ['boar','Bramble Boar','wood',1,45,9,0,1.0,'charge',5,18,{hide:1},'leathercoat'],
 ['wisp','Hollow Wisp','wood',3,61,11,1,1.2,'cast',7,24,{resin:1},'bonering'],
 ['outlaw','Cairn Outlaw','wood',6,82,14,2,1.05,'duel',11,35,{claw:1},'bronzesword'],
 ['thornhart','The Thornhart','wood',10,160,22,3,1.2,'charge',22,98,{thorns:1,claw:2},'dagger',true],
 ['wolf','Rime Wolf','frost',7,83,14,2,.92,'pounce',11,34,{hide:2},'bronzesword'],
 ['delver','Hollow Delver','frost',12,112,18,5,1.25,'duel',15,51,{iron:2},'spear'],
 ['golem','Silverback Golem','frost',17,146,23,9,1.44,'quake',19,68,{silver:2},'chain'],
 ['graven','The Graven King','frost',21,272,31,11,1.44,'quake',38,195,{frostmark:1,ember:1},'silverring',true],
 ['moth','Mireglass Moth','fen',18,140,22,5,1.06,'cast',18,70,{duskcap:1},'bow'],
 ['serpent','Reed Serpent','fen',22,174,26,7,1.02,'pounce',23,91,{pearl:1},'staff'],
 ['knight','Drowned Knight','fen',26,224,32,12,1.32,'duel',29,130,{ember:1},'vest'],
 ['widow','The Lantern Widow','fen',31,392,43,15,1.5,'cast',53,318,{fenmark:1,ember:2},'pearlcharm',true],
 ['drake','Cinder Drake','march',32,250,34,13,1.28,'charge',32,148,{ember:1},'greatsword'],
 ['warden','Ashbound Warden','march',40,334,46,18,1.45,'quake',42,210,{ember:1,star:1},'plate'],
 ['shade','Crown Shade','march',50,415,55,22,1.25,'pounce',57,298,{sigil:1},'pyre'],
 ['crown','The Crown Revenant','march',60,798,69,29,1.46,'duel',110,620,{crownmark:1,sigil:2},'crownblade',true]
];
export const ENEMIES = Object.fromEntries(enemies.map(([id,name,region,level,hp,attack,defence,speed,pattern,gold,xp,drops,gear,boss=false],index)=>
 [id,{id,name,region,level,hp,attack,defence,speed,pattern,gold,xp,drops,gear,boss,index,kind:'combat',skill:'combat',seconds:38+index*1.5,egg:{wood:'grove',frost:'crag',fen:'tide',march:'dusk'}[region]}]));
export const ACTIVITIES = {gather:GATHERING,make:RECIPES,combat:ENEMIES};

export const QUESTS = [
 {id:'guild',name:'The Guild Ledger',npc:'Bram',detail:'Bring three ash logs and two copper ore to the quartermaster. They will reinforce the river posts.',items:{ash:3,copper:2},gold:35,xp:{woodcutting:25,mining:25},gives:{trailmeal:4}},
 {id:'bell',name:'Iron for the Bell',npc:'Mara',detail:'Smelt six bronze bars for the gate hinges. Bring four bars and one board to the smith.',items:{bronze:4,boards:1},stats:{made:6},gold:55,xp:{smithing:60},egg:'crag'},
 {id:'canteen',name:'The Long Road',npc:'Bram',detail:'The rangers leaving tomorrow need four meals and two linen bundles.',items:{trailmeal:4,cloth:2},gold:55,xp:{cooking:60},gives:{salve:3},after:'guild'},
 {id:'trail',name:'Tracks by the Milestone',npc:'Iona',detail:'Drive away three Bramble Boars and bring a hide back to the guild.',items:{hide:1},kills:{boar:3},gold:50,xp:{combat:58},egg:'grove'},
 {id:'window',name:'Light in the Window',npc:'Rowan',detail:'Place any decoration in your house. The guild will send a second furnishing for the room.',statHouse:1,gold:35,xp:{crafting:45},gives:{rug:1},after:'guild'},
 {id:'frostq',name:'The Mountain Charter',npc:'Mara',detail:'Defeat the Graven King and supply silver and iron bars to restore the pass.',items:{silver:4,ironbar:3},kills:{graven:1},gold:165,xp:{smithing:160,combat:140},egg:'crag',after:'bell'},
 {id:'oath',name:'Oath Under the Cairn',npc:'Iona',detail:'Defeat the Crown Revenant and return two Crown Sigils to the oathstone.',items:{sigil:2},kills:{crown:1},gold:450,xp:{smithing:420,combat:430},gives:{standard:1},egg:'dusk',after:'trail'}
];

export const EVENTS = [
 {name:'Bridgeworks',shop:'mill',detail:'Osric is repairing the north bridge. The guild buys timber and fieldstone.',items:{ash:9,stone:5},gold:40,bonus:'woodcutting',fund:6},
 {name:'Ranger Muster',shop:'kitchen',detail:'The watch is setting out before dawn. The kitchen is buying trail meals.',items:{trailmeal:4,trout:3},gold:49,bonus:'cooking',fund:8},
 {name:'Iron Order',shop:'forge',detail:'Mara needs fresh fittings after an armory inspection.',items:{bronze:5,copper:3},gold:51,bonus:'smithing',fund:8},
 {name:'Herbalist Caravan',shop:'apothecary',detail:'A caravan pays handsomely for restorative ingredients.',items:{thyme:5,sunroot:2},gold:44,bonus:'farming',fund:7},
 {name:'Lantern Festival',shop:'furnishings',detail:'Rowan is furnishing the festival hall with linen and boards.',items:{boards:6,cloth:4},gold:58,bonus:'crafting',fund:8},
 {name:'River Blessing',shop:'general',detail:'Nell is provisioning the river crews. Fish and hides are in demand.',items:{trout:6,hide:3},gold:43,bonus:'fishing',fund:7},
 {name:'Moonnest Survey',shop:'hatchery',detail:'Tamsin swaps a fresh egg for the aviary’s bedding and feed stock.',items:{flax:8,venison:2},gold:34,bonus:'hunting',egg:'grove',fund:7},
 {name:'Crownward Relief',shop:'workshop',detail:'The old road patrol trades coin for leather and metal.',items:{leather:4,ironbar:2},gold:65,bonus:'mining',fund:7}
];
export const SUPPLIES = {ash:3,copper:3,stone:2,trout:2,thyme:2,flax:2,hide:2,sunroot:1,trailmeal:3,stool:1};
export const VENDOR = {ash:3,copper:4,stone:2,trout:3,thyme:3,flax:3,hide:5,sunroot:5,trailmeal:9,salve:19,stool:23};
export const ACHIEVEMENTS = [
 ['Gatherer','Collect 500 resources.',p=>p.stats.gathered>=500],
 ['Guild artisan','Complete 200 production actions.',p=>p.stats.made>=200],
 ['Dawn defender','Defeat 100 enemies.',p=>p.stats.kills>=100],
 ['Oath keeper','Defeat all four bosses.',p=>Object.values(ENEMIES).filter(x=>x.boss).every(x=>p.kills[x.id]>0)],
 ['Lantern keeper','Hatch 25 companions.',p=>p.stats.hatches>=25],
 ['Wild heart','Earn 50 Karma from releases.',p=>p.karma>=50],
 ['Master of a craft','Reach level 99 in any skill.',(p,level)=>Object.values(p.xp).some(x=>level(x)>=99)],
 ['Alderwatch patron','Collect 1,000 gold from businesses.',p=>p.stats.revenue>=1000],
 ['Local hero','Complete every guild quest.',p=>QUESTS.every(q=>p.quests[q.id])]
];
export function eventAt(ms){const slot=Math.floor(ms/(EVENT_SECONDS*1000));return {...EVENTS[slot%EVENTS.length],slot,ends:(slot+1)*EVENT_SECONDS*1000};}
export function tradeShop(asset){
 if(asset.kind==='egg'||asset.kind==='pet') return 'hatchery';
 if(asset.kind==='gear') return ['weapon','armor','pick','axe','hoe','hammer','cookset'].includes(GEAR[asset.gear.base].slot)?'forge':'workshop';
 const x=ITEMS[asset.id];
 return x.decor?'furnishings':x.icon==='potion'?'apothecary':x.heal||x.icon==='fish'||x.icon==='food'?'kitchen':x.icon==='wood'?'mill':'general';
}
