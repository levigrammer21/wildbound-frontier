# Cairn & Crown · 1.1.0

Cairn & Crown is a mobile-first fantasy RPG for one ranger or a small group. Explore Alderwatch Valley, train ten skills, earn and customize equipment, and make a living through trade, contracts, or owning a permanent establishment. All ten skills can reach level 99 and keep recording lifetime experience.

[Play Cairn & Crown](https://levigrammer21.github.io/cairn-and-crown/)

## Start playing

1. Open Alderwatch. Choose **Create account** if it is your first Firebase login, or **Sign in** if you already have an email/password account in this project. For a new or previously unverified address, tap **Send verification email**, open the link in your inbox, then tap **I verified my email**.
2. Create your ranger and step into Alderwatch. On a phone, tap the ground or use the arrow pad to walk. On a keyboard, use WASD or the arrow keys and press **E** near a landmark to interact. The **Atlas** can guide you to landmarks and trail exits.
3. Walk into the **Rangers’ Guild** for your first quests. Follow the north road to **Brackenwood**. Approach a resource to start work or approach a monster to challenge it or assign an idle hunt. You can assign one activity at a time.
4. Fight on the same map. Your ranger attacks automatically within the equipped weapon’s reach. Move out of highlighted tiles or use **Guard**, **Dodge**, your weapon’s special, and consumables. The **1–4** keys use guard, dodge, special, and the first available healing food.
5. Bring eggs to **Moonnest Aviary** or the **Rangers’ Guild**. Open **Pack → Companions** to inspect, equip, or manage companions. Your equipped companion follows you and provides passive buffs. To display a companion, enter your house and use the decorating station.
6. Walk to the **Market stall** to sell items or send gifts. Parcels and proceeds arrive at the **Postbox**. The **Neighbourhood board** is where you can inspect other rangers and visit their houses. Walk to the **Town bank** to move equipment and supplies into storage.

An assigned activity can reconcile up to 12 hours at a time. Production pays only for completed actions, and it stops if materials or gold run out. Idle hunts spend your available healing supplies and retreat on defeat. If you reopen an unfinished active fight, the encounter restarts from its saved setup. To pursue a different task, collect and stop your current assignment. The help text on activities includes required levels, tools and resources.

A forge's production price is quoted when the session begins. The quoted proprietor keeps their share for that session, including when ownership later changes. An establishment that charges for crafting has a slower, free guild alternative. At a market purchase, the buyer pays the displayed price, the seller gets the balance after the posted commission, and the shop owner earns the commission. NPC trade settles once per elapsed six-hour window up to 12 windows and includes a finite budget per shop. Every ranger can fulfill one town commission per window. Contracts also boost experience in one profession while they run.

## Publish from a phone

### 1. Upload the static site

1. Extract the complete game archive in Android Files or iPhone Files for a fresh install. If your game is already live, use the same repository and upload the updated game files.
2. Open your repository on GitHub. If the upload or settings controls are hidden, choose **Desktop site** in Chrome or **Request Desktop Website** in Safari.
3. Use **Add file → Upload files**. Upload the extracted root files to the repository root, then **Commit changes** to **main**. Keep the files that came inside **img** together. If the phone picker cannot upload a folder, use **Add file → Create new file** to create **img/.gitkeep**, commit it, open that folder, then use **Add file → Upload files** for the image assets. If the picker hides **.nojekyll**, use **Add file → Create new file**, name it **.nojekyll**, put a single blank line in it, and commit it at the root.
4. Go to the repository’s **Settings → Pages**. Select **Deploy from a branch**, branch **main**, folder **/ (root)**, and tap **Save**. The Pages screen will show the published address after the build completes. The GitHub Free workflow uses a public source repository. Verified email/password accounts can enter the shared world.
5. Open the site over HTTPS. You should see **Cairn & Crown** and a **v1.1.0** marker. The game runs directly from root-level files and uses the Firebase Web SDK from Google’s CDN.

[GitHub Pages publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

### 2. Check your existing Firebase Authentication settings

1. Open the [Cairn and Crown Firebase project](https://console.firebase.google.com/project/everfall-d0cf7/overview) and keep the existing project. The ZIP’s **config.js** contains the supplied Firebase web-app configuration.
2. In **Authentication → Sign-in method**, verify **Email/Password** is enabled. Turn on **Email/Password** and tap **Save** if needed.
3. In **Authentication → Settings → Authorized domains**, check for your Pages hostname. For a typical personal site it is **YOUR-USERNAME.github.io**. Add just the hostname if absent. Pages repository paths are outside the hostname.
4. If needed, request the desktop version of the Firebase Console on your phone to show the complete navigation.

[Firebase password authentication](https://firebase.google.com/docs/auth/web/password-auth)

### 3. Merge the Firestore rules

1. Open [Firestore Database](https://console.firebase.google.com/project/everfall-d0cf7/firestore), select **(default)**, and open **Rules**. Copy the entire currently published rules file and save a backup in a note.
2. In a second tab, open **rules-setup.html** at the end of your hosted game address. Paste the current rules into **Current published rules**. Tap **Prepare merged rules** and verify that matches for your other games are present in the output.
3. Tap **Copy merged rules**, return to the Firebase Rules editor, paste the merged rules there, and tap **Publish**. The helper runs in the page and adds or updates the marked Cairn match inside the existing database match. If your custom rules use version 1 or multiple database matches, review the project rules first. The full addition is marked **CAIRN BEGIN** through **CAIRN END** in **firestore.rules** and belongs inside the active documents match. For an existing unmarked Cairn match, replace just that match and keep the surrounding rules.
4. If your project has an overlapping broad allow on **gameNamespaces** or a recursive wildcard covering every path, review that wildcard before opening the shared world. Firestore combines overlapping allows.

The game stores data under **gameNamespaces/cairnCrownV1**. The module is designed to be added alongside rules for other games in the project.

[Firestore rule structure](https://firebase.google.com/docs/firestore/security/rules-structure)

### 4. Add the Firestore indexes

Go to **Firestore Database → Indexes → Manual → Add index**. Create each row if an equivalent index is missing, and wait for the status to become **Enabled**.

| Collection ID | First field | Second field | Query scope |
|---|---|---|---|
| market | state · Ascending | stamp · Descending | Collection |
| entries | state · Ascending | stamp · Descending | Collection |
| pets | owner · Ascending | state · Ascending | Collection |

The same definitions are included in **firestore.indexes.json**. The pets query also orders by the implicit document ID.

[Firestore index management](https://firebase.google.com/docs/firestore/query-data/indexing)

### 5. Enter the world

On the Pages site, sign in with your email and password. Verify your email if prompted, then create your ranger or continue your existing save. Share the game link with anyone you want to play with. Each player signs in with their own account.

An existing 1.0.1 deployment can publish these files over the current build. Version 1.1.0 uses the same Firebase configuration, rules, indexes, and save format.

## Build and verification

Run **node tests.mjs** inside the extracted directory for the standalone engine tests. Serve the directory with a static HTTP server to preview the art and interface. The source includes documentation of the economy in **DESIGN.md** and the executed checks in **TESTING.md**.

The world is designed for a small group. Real-time combat results and personal progression run on clients, while shared item reservations, shop deeds, fees, and ownership use Firestore transactions. One equipped pet has passive buffs. Companion and auction lists load in pages of 24. The current release supports individual real-time encounters, asynchronous trade and gifts, and real-time updates to shared economy views. Player movement and encounters are local. The economy, gifts, profiles, house visits, and progression are shared through Firebase.
