# Cairn & Crown implementation design

A multiplayer fantasy RPG set around the town of Alderwatch. The illustrated map connects Brackenwood, Frostvein, Mirefen, and the Ashen March. Amber light, deep green and slate, and pixel characters tie the town, wilderness, combat, pets, and houses together.

## Release scope

One classless ranger per account, ten skills with a level 99 cap and retained XP, four wilderness regions with sixteen encounters including four bosses, eight permanent businesses, introductory quests, rotating commissions, a tile house, and a shared player market. Basic equipment and a supply stipend start each ranger independently. Shared bosses and borrowed characters are optional and outside the core release.

## Resource dependencies

| Source | Outputs | Uses |
|---|---|---|
| Woodcutting | Ash, yew, ironwood, resin | Boards, handles, bows, furniture, ward potions, upgrades |
| Mining | Copper, iron, silver, star ore, stone | Smelting, equipment, jewelry and construction |
| Fishing | Trout, eel, crystalfin, pearl | Food, tonics, jewelry and commissions |
| Farming | Flax, thyme, sunroot, duskcap | Fabric, tools, food, tonics, house lighting |
| Hunting | Hide, venison, bone | Armor, meals, amulets and tonics |
| Combat | Claws, ember cores, sigils, rare gear and trophies | Late weapons, armor, trophies and commissions |
| Smithing | Bars, weapons, armor, tools | Equipment, trading and recurring commissions |
| Crafting | Boards, clothing, bows, accessories, furniture, tools | Skill yield, combat builds, housing and business upgrades |
| Cooking | Meals | Active and idle combat, town commissions |
| Alchemy | Healing, ward and fury tonics | Emergency healing and temporary combat effects |

Timed activities have a skill unlock, equipment where applicable, repeatable XP, and chances for eggs and discoveries. Advanced equipment has individual rolled effects. Tool tiers accelerate gathering, while hammers, carving kits, cooksets, and retorts reduce workshop time and can conserve inputs. XP uses a quadratic plus cubic curve, which gives quick early unlocks and long-term mastery.

## Engines and economy

- The simulator snapshots relevant equipment, active pet buffs, and the production quote. It settles at a Firestore timestamp, bounds catch-up to 12 hours, validates each action, and rolls deterministically from the activity cursor. Offline combat tracks health and food. Active combat uses the same stats with movement, reach, telegraphs, guards, dodges, and specials.
- Eggs are weighted by source. Hatching rolls compatible silhouettes, palettes, patterns, eyes, tails, and accessories. A Firestore transaction permanently reserves the canonical visual signature. Passive buffs roll independently and one pet may be active. Global records retain ownership, original hatch date, egg source, and provenance after transfers and release.
- Eight permanent businesses begin under NPC ownership. Idle sessions lock the displayed fee and beneficiary. Production spends gold and inputs per action. Marketplace purchases divide existing gold between seller and establishment. Shop NPC credits draw from fixed budgets per six-hour window. Prices, fees, and upgrade costs are displayed before commitment.
- The dedicated cairnCrownV1 namespace is a sibling of existing game data. Firebase Authentication uses email and password with verified email ownership. Verified email/password accounts can join directly. Player saves are private. Community profiles and houses serve visits. Listings and gifts use escrow. Seller and proprietor payments go to addressed parcels, which avoids cross-account writes to personal saves.
- Multi-device clock reconciliation, finite document sizes, visual-signature collisions, and Firestore rules compatibility are the primary technical risks. Activity cursors use revisioned transactions. Unique pets and signatures have individual documents, equipment and house footprints are bounded, and market and parcel views use limited pages.
- Engine and emulator tests cover long offline gaps, stopped production, escrow, unique hatches, concurrent ownership operations, and multiple identities. Mobile browser tests cover responsive navigation, account flow, real-time combat and decorating.
