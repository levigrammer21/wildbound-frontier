# Wildbound Frontier

[Play Wildbound Frontier](https://levigrammer21.github.io/wildbound-frontier/) · [GitHub repository](https://github.com/levigrammer21/wildbound-frontier)

Wildbound Frontier is a mobile-first creature RPG. Clear three regions, find up to 12 procedurally generated companions per ranger, and use timing, stamina, and your companion’s ability to fight. Town work accumulates while you’re away. Rangers can earn gold, claim a forge, set its fees, sell or trade gear, and buy a deed from another ranger. Company expeditions let two rangers fight in parallel or in separate sessions. Each contributes their best result to the same objective and can rally the other ranger after dealing 65 damage.

## Play on a phone

1. Open the game and tap **Start expedition** to try solo combat. The preview saves to this browser.
2. Tap **Sign in** to use a Firebase email/password account. Use **Create account** if you need one. Existing passwords from the same Firebase project still work. Choose a ranger display name when prompted.
3. In **Town**, collect work and select a forge. Craft gear for 2 ore. Player-owned forges can charge a craft fee and take a fixed gold cut on gear sales. The first three pieces of gear in your bag boost your attacks.
4. In **Company**, choose your ally tactic and open an expedition. Send the other player the invitation link or 12-character code. Once both rangers join, either can take on the encounter. Both scores remain with the invitation after you leave.

You can use keys **1–5** for combat on a keyboard. Your browser runs the encounter. Ranger accounts save the field report to Firestore and queue it locally when disconnected.

## Publish or update on GitHub Pages

1. Download and extract the ZIP using Android Files or the iPhone Files app. Keep the contents of the extracted archive at the repository root. Keep `pinefall.webp` inside `img`.
2. Open [the repository](https://github.com/levigrammer21/wildbound-frontier) in your mobile browser. If **Add file** or **Settings** is hidden, turn on **Desktop site** in Chrome or **Request Desktop Website** in Safari.
3. Use **Add file → Upload files** for the root files and commit to `main`. Open the repository’s `img` folder before uploading `pinefall.webp`. On a fresh repository where the folder is missing, use a file tool that uploads the extracted tree, or first create an empty `img/.gitkeep` with **Add file → Create new file** and then upload the image inside `img`. If your file picker hides empty and dot-prefixed files, create an empty file called `.nojekyll` at the repository root using **Add file → Create new file**.
4. Open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, **main**, and **/ (root)**. Tap **Save**. The Pages screen links to the site once GitHub finishes publishing.

The ZIP can run as a static site with no build step. To try it from a computer before publishing, change to the extracted directory and run `python3 -m http.server 8000`. Open `http://localhost:8000`. The Firebase SDK is loaded from Google’s CDN.

[GitHub Pages setup documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-site)

## Firebase settings for this repository

1. Open the [existing Everfall project](https://console.firebase.google.com/project/everfall-d0cf7/overview). The app already uses its web configuration from `config.js`. Use the project’s `(default)` Firestore database.
2. Under **Authentication → Sign-in method**, confirm **Email/Password** is enabled. The passwordless email-link option is unnecessary.
3. Under **Authentication → Settings → Authorized domains**, confirm `levigrammer21.github.io` appears. If deploying to another domain, add the new hostname without a path. Use desktop view on a phone if the console hides these tabs.
4. Open **Firestore Database → Rules**. Copy the currently published rules as a backup. Open `firestore.rules` from the ZIP and copy the block from the `WILDBOUND BEGIN` comment through the `WILDBOUND END` comment. Paste it inside the existing `match /databases/{database}/documents { … }` block as a sibling of the existing `match /everfallSaves/{uid}` block. Keep the existing version line, wrapper, and Everfall match. Then tap **Publish**. This merge matters on a shared Firebase project.
5. Open the live game, sign in, and create a ranger. From two separate accounts, craft an item, list it, buy it, then confirm the seller and forge owner receive their shares. Open a Company expedition and join from the other account. Complete a fight together, then return later with either account and confirm that the room retained its scores.

New documents live under `gameNamespaces/wildboundFrontierV1`. The existing `everfallSaves` match continues to serve legacy saves. No Firebase Storage bucket, Cloud Functions, scheduled jobs, paid services, or additional indexes are required. Firestore listeners are scoped to the active screen. Timed work settles in one transaction using Firestore server time, with a cap of 24 batches per claim.

[Firebase email/password documentation](https://firebase.google.com/docs/auth/web/password-auth) · [Firestore transaction rules](https://firebase.google.com/docs/firestore/security/rules-conditions#access_other_documents)

## What the backend validates

Wallet changes require an atomic receipt that verifies the gold, ore, gear, deed, and listing changes together. Only email/password-authenticated rangers can access the game collections. Ranger profiles are owner-only. Wallet names and balances can be read by signed-in rangers who know the wallet ID. Company data is available to signed-in rangers with the room code. Public trades and deeds carry no account email.

Solo combat outcomes and Company scores come from the browser. Firestore verifies which ranger may update a score, when it can be posted, and its bounds. It has no trusted combat simulator, and these results never mint shared gold. Firebase quotas and abuse controls apply to the entire existing project.
