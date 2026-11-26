# Cairn & Crown 1.0.1 verification

## Passed engine suite

Run **node tests.mjs** from the release folder. The suite validates the resource acquisition and usage graph, skill mastery and tool requirements, idempotent elapsed work and its 12-hour cap, production inputs and fees, idle combat defeat and food consumption, active positioning, wind-ups, guard, specials, consumables, victory and defeat, inventory banking, quest rewards and the rotating commission calendar.

The generator rolled 25,000 pets. It produced 24,977 distinct trait signatures and 23 repeated candidates. The shared hatch transaction reserves a signature before accepting the pet, and the rules reject changes to an existing reservation. The sample included all four body families and all ten buff types. It contained 595 pets with three buffs and 2,813 with rare accessories. Chromium rendered 512 candidates in the raster check and no two distinct signatures in that sample painted identical images. A 96-pet contact sheet was inspected for compatibility and presentation.

## Passed Firebase Emulator Suite

The release uses the same Firebase SDK APIs exercised here. The emulator used an isolated project ID and the combined rules for Everfall saves, Wildbound Frontier, and Cairn & Crown. Independent authenticated contexts confirmed:

- Verified email/password accounts can create characters on an empty database. Anonymous, unverified and other-provider sessions are denied. Player saves and mailboxes are isolated.
- Two devices concurrently claiming the same idle session cannot claim the same work twice. World and NPC trading windows reconcile once. All saves remain independent.
- A proprietor collects fees for another player's completed offline actions at the locked quote. Simultaneous customers accrue both payments. Self-production charges no fee. Shop upgrades, sales commissions, deed transfer, and payout to a former proprietor preserve the tested gold totals.
- One buyer wins a simultaneous listing purchase. A third-party forge owner received 5 gold of a 50-gold equipment sale, the seller received 45 and the buyer spent 50. Gold and items cannot be collected twice by replaying the normal transaction.
- Hatching, signature reservation, equipping, renaming, moving a display, gifting, selling, and releasing for Karma preserve the companion's traits and history.
- The existing Everfall rules still accept an owner revision and deny unrelated reads and skipped revisions. The separate Wildbound namespace remains addressable under its own rules.

## Passed browser gameplay

Chromium was exercised at phone widths of 360, 390, and 430 pixels and inspected at a desktop width of 1440 pixels. The game was served as static files and connected to the Authentication and Firestore emulators. Three testers created separate accounts, verified their addresses, and created characters on an empty database. Browser runs also covered real-time player movement through a telegraphed attack, a weapon special and saved combat result, placing a furnishing, visiting the other character's house, gifting to an offline recipient, collecting mail, restoring sign-in, signing out and back in, and settling elapsed work after a reload. The browser rules helper returned the supplied legacy rules with the Cairn match inserted. A fresh solo ranger earned the 220-gold smithy price through ordinary fights and quest rewards and bought the business without gifts or developer grants.

## Hosted checks still required

Use your deployed Pages URL to confirm the domain and verification emails, the published merged rules, and the production Firestore composite index status. Sign in with two verified email/password accounts, make a small trade at the market, and open the other player's house. These checks belong to your cloud deployment. The verification above used a separate emulator and did not publish or modify the live project.

## Release boundaries

Combat runs as individual local encounters. The browser reports the result in one settlement transaction. Reopening in the middle of combat restarts the saved encounter setup. Idle catch-up is bounded to 12 hours, shared NPC trade settles at most 12 windows at a time, and private trading is designed for a trusted small group. Combat results and personal progression are client-simulated. Production concurrency, shared ownership, and asset escrow use Firestore transactions and scoped access rules.
