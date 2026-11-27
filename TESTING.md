# Cairn & Crown 1.1.0 verification

## Game logic

Run `node --test tests.mjs` from the game directory. The suite passed these checks.

- Every listed resource has a use and essential recipes have an acquisition path.
- Every service, resource site, enemy, trail gate, and house station is reachable from its map entrance. Routes respect collision, including buildings and water.
- Combat checks movement, weapon range, telegraphed cells, sidestepping, guarding, healing, cooldowns, victories, and defeat.
- Progression checks skill unlocks, offline action budgets, fee accounting, material consumption, and idle combat stopping conditions.
- Additional checks cover quests, banking, rotating commissions, pet trait generation, and a 25,000-roll pet sample.

## Browser gameplay

Chromium passed the following routes using two separately authenticated characters and the Firebase Auth and Firestore emulators.

- Registered and verified both accounts, created characters, and entered the world directly.
- Walked using the direction pad and taps on a 390 × 844 touch viewport, and the keyboard on a 1280 × 800 desktop viewport.
- Navigated to the guild, delivered a quest, bought supplies at the exchange, and started production at the smithy.
- Followed a trail from Alderwatch to Brackenwood, started a gathering assignment at the grove, reloaded, and collected elapsed rewards.
- Fought the Bramble Boar on the exploration map, reacted to a charge, and retrieved the saved combat report.
- Entered a house, placed a furnishing, and visited the same house from the other account.

## Firestore transactions

The emulator regression suite also passed onboarding without invitation fixtures, verified login and save isolation, concurrent customers, quoted fees, owner self-use, marketplace and mailbox races, deed transfers, NPC demand deduplication, pet hatches and ownership, gifts, sales, release for Karma, combat settlement, and compatibility beside separate Everfall and Wildbound rules.

## Live environment

The browser gameplay and transaction tests used isolated emulators. Production sign-in and purchases with the owners’ real accounts were outside those checks. Movement coordinates and combat frame simulation are local. Shared progress, economic transactions, and house visits use Firestore.
