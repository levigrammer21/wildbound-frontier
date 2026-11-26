import { REGIONS, JOBS, TACTICS, Encounter, makePet, petSeed, randomSeed, worldAt, pendingWork } from './world.js';
import { portrait } from './creatures.js';

const el = id => document.getElementById(id);
const $ = selector => document.querySelector(selector);
const views = ['frontier', 'menagerie', 'town', 'company'];
const create = (tag, attrs = {}, ...children) => {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') element.className = value;
    else if (key === 'disabled') element.disabled = value;
    else element.setAttribute(key, value);
  }
  element.append(...children);
  return element;
};
const action = (label, click, { style = 'quiet', disabled = false } = {}) =>
  createButton(label, click, style, disabled);
function createButton(label, click, style, disabled) {
  const button = create('button', { type: 'button', class: 'button ' + style, disabled }, label);
  button.addEventListener('click', click);
  return button;
}
const node = (id, ...children) => el(id).replaceChildren(...children);
const p = (value, cls = 'note') => create('p', { class: cls }, value);
const title = value => create('h2', {}, value);
function readStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Session still works. */ }
}
const preview = readStore('wildbound-preview', null) ?? {
  seed: randomSeed(), active: 0, progress: 0, wins: 0, discovery: 1, trails: [-1, -1, -1], journal: []
};
const state = {
  view: 'frontier', user: null, profile: null, wallet: null, subscriptions: [], viewSubs: [],
  shops: new Map(), listings: [], myListing: null, shopSub: null, shopId: REGIONS[0].id, roomId: '', room: null,
  fight: null, fighting: false, busy: false, tactic: 'strike', online: navigator.onLine
};
let backend;
let dbLoading;
let effectTimeout;
let statusTimeout;
let animation;
let queueBusy = false;
let queueFallback = [];

function profile() { return state.profile ?? preview; }
function currentPet() { const save = profile(); return makePet(petSeed(save.seed, save.active)); }
function hasProfile() { return Boolean(state.user && state.profile && state.wallet); }
function secondsText(value) {
  const seconds = Math.max(0, Math.ceil(value));
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
function explain(error) {
  if (error.code === 'permission-denied') return 'Firebase denied this action. Check the game rules, your session, or the current job timer.';
  if (error.code === 'unavailable') return 'Firebase is temporarily unavailable. Reconnect and retry.';
  if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') return 'Check your email and password.';
  if (error.code === 'auth/email-already-in-use') return 'That email already has a Firebase account. Sign in or reset the password.';
  if (error.code === 'auth/weak-password') return 'Choose a stronger password with at least six characters.';
  if (error.code === 'auth/too-many-requests') return 'Too many attempts. Wait before trying again.';
  if (error.code === 'auth/network-request-failed') return 'Can’t reach Firebase. Check your connection and retry.';
  return error.message || 'Something went wrong. Please retry.';
}
function notice(message, error = false) {
  clearTimeout(statusTimeout);
  const item = el('app-status');
  item.textContent = message;
  item.hidden = !message;
  item.classList.toggle('error', error);
  if (message) statusTimeout = setTimeout(() => { item.hidden = true; }, 8500);
}
function db() {
  if (!dbLoading) {
    dbLoading = import('./backend.js').then(module => {
      backend = module;
      return backend.observeAuth(changeAuth).then(() => module);
    }).catch(error => {
      dbLoading = undefined;
      throw error;
    });
  }
  return dbLoading;
}
function showAccount() {
  el('auth-form').hidden = !!state.user;
  el('profile-form').hidden = !state.user || hasProfile();
  el('account-panel').hidden = !hasProfile();
  el('account-email').textContent = state.user?.email ?? '';
  if (!el('account-dialog').open) el('account-dialog').showModal();
}
function updateHeader() {
  const balance = el('ranger-balance');
  balance.hidden = !state.wallet;
  balance.textContent = state.wallet ? '◈ ' + state.wallet.gold.toLocaleString() : '';
  el('account-open').textContent = state.user ? 'Account' : 'Sign in';
}
function cleanup(subs) { while (subs.length) subs.pop()(); }
function changeAuth(user) {
  const oldId = state.user?.uid;
  cleanup(state.subscriptions);
  cleanup(state.viewSubs);
  state.user = user;
  state.wallet = null;
  state.profile = null;
  state.shops.clear();
  state.listings = [];
  state.myListing = null;
  state.shopSub?.();
  state.shopSub = null;
  state.room = null;
  if (oldId && oldId !== user?.uid) state.roomId = '';
  updateHeader();
  updateView();
  if (!user) return;
  if (!state.roomId) {
    const remembered = readStore('wildbound-company-' + user.uid, '');
    if (/^[a-f0-9]{12}$/.test(remembered)) state.roomId = remembered;
  }
  const error = err => notice(explain(err), true);
  state.subscriptions.push(backend.watchWallet(user.uid, wallet => {
    state.wallet = wallet || null;
    updateHeader();
    updateView();
  }, error));
  state.subscriptions.push(backend.watchProfile(user.uid, save => {
    const wasReady = hasProfile();
    state.profile = save || null;
    if (hasProfile() && !wasReady && el('account-dialog').open && !el('profile-form').hidden) el('account-dialog').close();
    updateView();
    if (save) flushQueue();
  }, error));
  watchCurrentView();
}
function updateView() {
  if (el('account-dialog').open) showAccount();
  render();
}
function watchCurrentView() {
  cleanup(state.viewSubs);
  state.shopSub?.();
  state.shopSub = null;
  if (!state.user || !backend) return;
  const error = err => notice(explain(err), true);
  if (state.view === 'town') {
    watchTownShop();
    state.viewSubs.push(backend.watchOwnListing(state.user.uid, listing => {
      state.myListing = listing?.state === 'open' ? listing : null;
      renderTown();
    }, error));
    state.viewSubs.push(backend.watchListings(list => {
      state.listings = list;
      renderTown();
    }, error));
  }
  if (state.view === 'company' && state.roomId) {
    state.viewSubs.push(backend.watchRoom(state.roomId, room => {
      state.room = room ?? null;
      if (state.fighting) applyAllyRally();
      renderCompany();
    }, error));
  }
}
function watchTownShop() {
  state.shopSub?.();
  const id = state.shopId;
  state.shopSub = backend.watchShop(id, shop => {
    state.shops.set(id, shop ?? null);
    renderTown();
  }, error => notice(explain(error), true));
}
function navigate(view, writeHash = true) {
  if (!views.includes(view)) return;
  const previous = state.view;
  state.view = view;
  for (const v of views) el('view-' + v).hidden = v !== view;
  document.querySelectorAll('.tabs [data-view]').forEach(control => {
    if (control.dataset.view === view) control.setAttribute('aria-current', 'page');
    else control.removeAttribute('aria-current');
  });
  if (previous !== view) {
    window.scrollTo(0, 0);
    watchCurrentView();
  }
  if (writeHash) {
    const suffix = view === 'company' && state.roomId ? '-' + state.roomId : '';
    history.replaceState(null, '', '#' + view + suffix);
  }
  render();
}
function setHashView() {
  const hash = location.hash.slice(1);
  if (/^company-[a-f0-9]{12}$/.test(hash)) {
    const changed = state.roomId !== hash.slice(8);
    state.roomId = hash.slice(8);
    if (changed) state.room = null;
    const alreadyOpen = state.view === 'company';
    navigate('company', false);
    if (alreadyOpen && changed) watchCurrentView();
    return;
  }
  navigate(views.includes(hash) ? hash : 'frontier', false);
}
function render() {
  if (state.view === 'frontier') renderFrontier();
  if (state.view === 'menagerie') renderMenagerie();
  if (state.view === 'town') renderTown();
  if (state.view === 'company') renderCompany();
}
function renderEvent() {
  const event = worldAt(Date.now());
  node('world-event', create('strong', {}, event.name), create('span', {}, event.description),
    create('span', { 'aria-label': 'Time until the world event changes' }, secondsText((event.ends - Date.now()) / 1000)));
}
function petDetails(pet) {
  return create('div', { class: 'pet-info' }, create('h3', {}, pet.name),
    p(pet.rarity + ' ' + pet.family + ' · ' + pet.role), p(pet.pattern + ' · ' + pet.note),
    create('div', { class: 'pet-stats' }, 'Power ' + pet.power, 'Heart ' + pet.heart, 'Speed ' + pet.speed));
}
function renderFrontier() {
  renderEvent();
  const progress = profile().progress;
  el('map-counter').textContent = Math.min(progress + 1, 3) + ' / 3 open';
  node('region-list', ...REGIONS.map((region, index) => {
    const row = create('button', { class: 'region-row', disabled: index > progress },
      create('span', { class: 'region-icon', style: 'color:' + region.color, 'aria-hidden': 'true' }, region.motif),
      create('span', {}, create('strong', {}, region.name), create('small', {}, region.detail)),
      create('span', { class: 'gate' }, index < progress ? 'Cleared' : index === progress ? 'Explore →' : 'Locked'));
    row.addEventListener('click', () => expeditions(index));
    return row;
  }));
  const pet = currentPet();
  node('featured-pet', create('div', { class: 'pet-display' }, create('div', { class: 'portrait' }, portrait(pet)), petDetails(pet)));
}
function renderMenagerie() {
  const save = profile();
  el('pet-counter').textContent = save.discovery + ' / 12 discovered';
  const cards = Array.from({ length: save.discovery }, (_, index) => {
    const pet = makePet(petSeed(save.seed, index));
    return create('article', { class: 'panel pet-card' },
      create('div', { class: 'portrait' }, portrait(pet)), petDetails(pet),
      action(index === save.active ? 'Active companion' : 'Make active', () => choosePet(index), { disabled: index === save.active }));
  });
  node('creature-list', ...cards);
  const journal = save.journal ?? [];
  node('journal-list', ...(journal.length ? journal.slice(0, 10).map(entry =>
    create('li', {}, (entry.win ? 'Victory' : 'Retreated') + ' · ' + REGIONS[entry.region]?.foes[entry.tier]))
    : [create('li', {}, 'Your first field report appears after an expedition.')]));
}
async function choosePet(index) {
  if (!state.user) {
    preview.active = index;
    saveStore('wildbound-preview', preview);
    renderMenagerie();
    return;
  }
  try { await backend.saveAdventure(state.user.uid, null, index); }
  catch (error) { notice(explain(error), true); }
}
function expeditions(regionIndex) {
  const region = REGIONS[regionIndex];
  const save = profile();
  if (regionIndex > save.progress) return;
  const highest = save.trails?.[regionIndex] ?? -1;
  el('expedition-title').textContent = region.name;
  el('expedition-description').textContent = region.detail;
  node('expedition-list', ...region.foes.map((foe, tier) => {
    const unlock = regionIndex < save.progress || tier <= highest + 1;
    const button = create('button', { class: 'button quiet choice', type: 'button', disabled: !unlock },
      create('span', {}, foe, create('small', {}, ['Trail encounter', 'Deep wilds', 'Regional boss'][tier])),
      create('span', {}, unlock ? 'Enter →' : 'Locked'));
    button.addEventListener('click', () => {
      el('expedition-dialog').close();
      startFight(regionIndex, tier);
    });
    return button;
  }));
  el('expedition-dialog').showModal();
}
function syncGuest(run) {
  preview.journal = [run, ...preview.journal].slice(0, 36);
  if (run.win) {
    preview.trails ??= [-1, -1, -1];
    preview.trails[run.region] = Math.max(preview.trails[run.region], run.tier);
    preview.wins += 1;
    preview.discovery = Math.min(12, 1 + Math.floor(preview.wins / 2));
    if (run.tier === 2 && run.region === preview.progress) preview.progress += 1;
  }
  saveStore('wildbound-preview', preview);
}
function loadQueue(uid) {
  const stored = readStore('wildbound-pending-' + uid, []);
  return [...new Map([...stored, ...queueFallback.filter(item => item.uid === uid)].map(item => [item.id, item])).values()];
}
function queueRun(uid, run) {
  queueFallback = [...queueFallback, { ...run, uid }];
  saveStore('wildbound-pending-' + uid, loadQueue(uid));
  flushQueue();
}
async function flushQueue() {
  const uid = state.user?.uid;
  if (!uid || !state.profile || queueBusy || !state.online) return;
  queueBusy = true;
  try {
    for (const run of loadQueue(uid)) {
      if (state.user?.uid !== uid) break;
      const { uid: _owner, ...entry } = run;
      await backend.saveAdventure(uid, entry);
      queueFallback = queueFallback.filter(item => item.id !== run.id);
      saveStore('wildbound-pending-' + uid, readStore('wildbound-pending-' + uid, []).filter(item => item.id !== run.id));
    }
  } catch (error) {
    notice('Adventure progress is queued on this device. ' + explain(error), true);
  } finally {
    queueBusy = false;
  }
}

function gatePanel(message) {
  const label = state.user ? 'Create ranger profile' : 'Sign in or create account';
  return create('section', { class: 'panel' }, p(message),
    action(label, showAccount, { style: 'primary' }));
}
function numberField(label, name, value, min, max) {
  return create('label', {}, label, create('input', { type: 'number', name, min, max, value, step: 1, required: '' }));
}
function operation(kind, options, success) {
  if (!hasProfile() || state.busy) return;
  if (!state.online) { notice('Reconnect to change the shared frontier.', true); return; }
  const uid = state.user.uid;
  state.busy = true;
  backend.economy(uid, kind, options).then(result => {
    if (state.user?.uid !== uid) return;
    notice(typeof success === 'function' ? success(result) : success);
  }).catch(error => notice(explain(error), true)).finally(() => {
    state.busy = false;
    if (state.view === 'town') renderTown();
  });
}
function renderTown() {
  if (state.view !== 'town') return;
  if (!hasProfile()) {
    node('town-content', gatePanel('A ranger account is required for shared gold, shops, and trading.'));
    return;
  }
  const wallet = state.wallet;
  const uid = state.user.uid;
  const shopId = state.shopId;
  const region = REGIONS.find(item => item.id === shopId);
  const loaded = state.shops.has(shopId);
  const shop = state.shops.get(shopId);
  const owner = shop?.owner === uid;
  const craftFee = shop && !owner ? shop.craftFee : 0;
  const saleFee = shop && !owner ? shop.saleFee : 0;
  const blocked = !state.online || state.busy;
  const picks = REGIONS.map(item => {
    const button = action(item.shop, () => {
      state.shopId = item.id;
      watchTownShop();
      renderTown();
    });
    button.setAttribute('aria-pressed', item.id === shopId);
    return button;
  });
  const work = create('section', { class: 'panel' }, title('Work contracts'),
    p('Active · ' + JOBS[wallet.job].name + ' · ' + JOBS[wallet.job].yield),
    create('p', { id: 'work-clock', class: 'note', role: 'status' }),
    action('Collect work', () => operation('gather', {}, count =>
      count ? 'Collected ' + count + ' work ' + (count === 1 ? 'batch.' : 'batches.') : 'Your next work batch is still underway.'),
      { style: 'primary', disabled: blocked }));
  work.lastChild.id = 'collect-work';
  const choices = create('div', { class: 'chip-line' });
  for (const [job, details] of Object.entries(JOBS)) {
    choices.append(action(details.name, () => {
      if (pendingWork(wallet)) {
        notice('Collect the completed work before switching jobs.', true);
        return;
      }
      operation('assign', { target: job }, 'Assigned to ' + details.name.toLowerCase() + '.');
    }, { disabled: blocked || wallet.job === job }));
  }
  work.append(choices);
  const bag = create('section', { class: 'panel' }, title('Ranger supplies'),
    create('div', { class: 'chip-line' }, ...[
      [wallet.gold, 'Gold'], [wallet.ore, 'Ore'], [wallet.gear, 'Trail gear'], [wallet.xp, 'Skill XP']
    ].map(([amount, name]) => create('span', { class: 'tag' }, amount.toLocaleString() + ' ' + name))),
    p('The first three pieces of trail gear in your supplies increase strike and heavy attack damage.'));
  const forge = create('section', { class: 'panel' }, title(region.shop), create('div', { class: 'chip-line' }, ...picks));
  if (!loaded) forge.append(p('Checking the deed and shop terms…'));
  if (loaded) {
    forge.append(p(shop ? (owner ? 'You own this shop.' : 'Owned by another ranger.') : 'The deed is unclaimed. Craft and sell here without a shop fee.'));
    const choices = create('div', { class: 'button-row' },
      action('Craft gear · 2 ore' + (craftFee ? ' + ' + craftFee + ' gold' : ''), () =>
        operation('craft', { shop: shopId, number: craftFee }, 'Crafted one piece of trail gear.'),
      { disabled: blocked || wallet.ore < 2 || wallet.gold < craftFee }),
      action('Sell gear · +' + (12 - saleFee) + ' gold', () =>
        operation('sell', { shop: shopId, number: saleFee }, 'Sold one piece of trail gear.'),
      { disabled: blocked || wallet.gear < 1 }));
    if (!shop) choices.append(action('Claim deed · ' + region.cost + ' gold', () =>
      operation('claim', { shop: shopId }, 'You own ' + region.shop + '.'),
    { style: 'primary', disabled: blocked || wallet.gold < region.cost }));
    if (shop?.price > 0 && !owner) choices.append(action('Buy deed · ' + shop.price + ' gold', () =>
      operation('transfer', { shop: shopId, target: shop.owner, number: shop.price }, 'You own ' + region.shop + '.'),
    { style: 'primary', disabled: blocked || wallet.gold < shop.price }));
    forge.append(choices);
    if (owner) {
      const form = create('form', { class: 'inline-form' },
        numberField('Craft fee (gold)', 'craftFee', shop.craftFee, 0, 15),
        numberField('Sale cut (gold)', 'saleFee', shop.saleFee, 0, 8),
        numberField('Deed price (0 keeps deed)', 'price', shop.price, 0, 2000),
        create('button', { type: 'submit', class: 'button quiet', disabled: blocked }, 'Save terms'));
      form.addEventListener('submit', event => {
        event.preventDefault();
        const fields = new FormData(form);
        operation('terms', { shop: shopId, craftFee: +fields.get('craftFee'), saleFee: +fields.get('saleFee'),
          price: +fields.get('price') }, 'Shop terms updated.');
      });
      forge.append(form);
    }
  }
  const market = create('section', { class: 'panel town-spaced' }, title('Ranger market'),
    p('List one piece of gear at the selected forge. Its owner receives the sale cut when a buyer checks out.'));
  const myListing = state.myListing ?? state.listings.find(item => item.seller === uid);
  if (!myListing) {
    const listing = create('form', { class: 'inline-form' },
      numberField('Asking price (gold)', 'price', 18, 9, 2000),
      create('button', { type: 'submit', class: 'button quiet', disabled: blocked || wallet.gear < 1 }, 'List gear'));
    listing.addEventListener('submit', event => {
      event.preventDefault();
      operation('list', { shop: shopId, number: +new FormData(listing).get('price') }, 'One piece of gear listed.');
    });
    market.append(listing);
  }
  const listed = state.listings.filter(item => item.seller !== uid);
  if (myListing) listed.unshift(myListing);
  const listings = listed.map(item => {
    const mine = item.seller === uid;
    const home = REGIONS.find(entry => entry.id === item.shop);
    return create('li', { class: 'choice' },
      create('span', {}, 'Trail gear · ' + item.price + ' gold', create('small', {}, home.shop)),
      action(mine ? 'Cancel listing' : 'Buy', () => {
        if (mine) operation('cancel', {}, 'Listing canceled. Gear returned.');
        else operation('buy', { shop: item.shop, number: item.price, target: item.seller }, 'Bought one piece of trail gear.');
      }, { disabled: blocked || (!mine && wallet.gold < item.price) }));
  });
  if (state.listings.length === 30) market.append(p('Showing up to 30 open offers.'));
  market.append(create('ul', { class: 'clean-list' },
    ...(listings.length ? listings : [create('li', {}, 'No gear is listed yet.')])));
  node('town-content', create('div', { class: 'two-col' }, work, bag), forge, market);
  townClock();
}
function townClock() {
  const wallet = state.wallet;
  const clock = el('work-clock');
  if (!wallet || !clock) return;
  const count = pendingWork(wallet);
  const tick = wallet.tick?.toMillis() ?? Date.now();
  const interval = JOBS[wallet.job].time * 1000;
  const next = tick + (count + 1) * interval;
  const text = count === 24 ? '24 batches ready · storage full' :
    count + ' ready · next batch in ' + secondsText((next - Date.now()) / 1000);
  if (clock.textContent !== text) clock.textContent = text;
  el('collect-work').disabled = !count || state.busy || !state.online;
}

function currentPlan() {
  return { name: state.wallet.name, seed: currentPet().seed, tactic: state.tactic };
}
function enterRoom(id) {
  state.room = null;
  state.roomId = id;
  saveStore('wildbound-company-' + state.user.uid, id);
  navigate('company');
  watchCurrentView();
}
function renderCompany() {
  if (state.view !== 'company') return;
  if (!hasProfile()) {
    node('company-content', gatePanel('Sign in to open, join, or resume a two-ranger expedition.'));
    return;
  }
  const panel = create('section', { class: 'panel' });
  const room = state.room;
  const inRoom = room && [room.host, room.guest].includes(state.user.uid);
  if (!inRoom) {
    const form = create('form', { class: 'inline-form' },
      create('label', {}, 'Invite code', create('input', { name: 'code', placeholder: '12-character code',
        value: state.roomId, minlength: 12, maxlength: 12, autocapitalize: 'off', autocomplete: 'off', required: '' })),
      create('button', { type: 'submit', class: 'button quiet', disabled: !state.online }, 'Join or resume'));
    const stance = create('select', { 'aria-label': 'Ally tactic' }, ...Object.entries(TACTICS).map(([id, item]) =>
      create('option', { value: id }, item.name + ' · ' + item.info)));
    stance.value = state.tactic;
    stance.addEventListener('change', () => { state.tactic = stance.value; });
    form.addEventListener('submit', event => {
      event.preventDefault();
      companyAction(async () => {
        const id = String(new FormData(form).get('code')).trim().toLowerCase();
        if (!/^[a-f0-9]{12}$/.test(id)) throw new Error('Use the 12-character invite code.');
        await backend.joinRoom(state.user.uid, id, currentPlan());
        enterRoom(id);
      });
    });
    panel.append(title('Expedition board'), p('Choose the support your companion gives the other ranger.'),
      stance, create('div', { class: 'chip-line' }, action('Open expedition', () =>
        companyAction(async () => enterRoom(await backend.createRoom(state.user.uid, currentPlan()))),
      { style: 'primary', disabled: !state.online })), form);
  } else {
    const host = state.user.uid === room.host;
    const scores = room.hostScore + room.guestScore;
    const won = scores >= 290;
    panel.append(title(won ? 'Rift Sentinel defeated' : 'Rift Sentinel expedition'),
      p(room.guest ? scores + ' / 290 company damage · Best score from each ranger counts. Deal 65 damage to rally your ally.' :
        'Send this invite code to your second ranger. The encounter opens when they join.'));
    const invite = create('div', { class: 'chip-line' }, create('span', { class: 'tag' }, state.roomId),
      action('Copy invite link', async () => {
        try {
          await navigator.clipboard.writeText(new URL('#company-' + state.roomId, location.href).href);
          notice('Invite link copied.');
        } catch { notice('Share this invite code · ' + state.roomId); }
      }));
    const team = create('ul', { class: 'clean-list' }, create('li', {}, room.hostPlan.name + ' · ' + room.hostScore),
      create('li', {}, room.guestPlan?.name ? room.guestPlan.name + ' · ' + room.guestScore : 'Waiting for a second ranger'));
    panel.append(invite, team);
    const controls = create('div', { class: 'chip-line' });
    if (room.guest && !won) {
      const start = action('Fight the Sentinel', () => {
        if (Date.now() < (room.started?.toMillis() ?? Infinity) + 5000) return;
        startFight(0, 0, { id: state.roomId, ally: host ? room.guestPlan : room.hostPlan,
          ranger: host ? room.hostPlan : room.guestPlan });
      }, { style: 'primary' });
      start.id = 'raid-start';
      controls.append(start, create('span', { id: 'raid-countdown', class: 'tag', hidden: '' }));
    }
    controls.append(action('Back to expedition board', () => {
      state.roomId = '';
      state.room = null;
      saveStore('wildbound-company-' + state.user.uid, '');
      navigate('company');
      watchCurrentView();
    }));
    panel.append(controls);
  }
  node('company-content', panel);
  raidClock();
}
function raidClock() {
  const display = el('raid-countdown');
  if (!display) return;
  const left = (state.room?.started?.toMillis() ?? Date.now() + 60000) + 5000 - Date.now();
  display.hidden = left <= 0;
  display.textContent = 'Opens in ' + secondsText(left / 1000);
  el('raid-start').disabled = left > 0 || !state.online;
}
async function companyAction(call) {
  if (state.busy || !hasProfile()) return;
  state.busy = true;
  try { await call(); } catch (error) { notice(explain(error), true); }
  finally { state.busy = false; }
}

function put(id, value) {
  if (el(id).textContent !== value) el(id).textContent = value;
}
function startFight(region, tier, raid = null) {
  if (state.fighting || (state.user && !hasProfile())) {
    if (!state.fighting) showAccount();
    return;
  }
  const pet = raid ? makePet(raid.ranger.seed) : currentPet();
  const weather = worldAt(Date.now(), region);
  const foe = raid ? 'Rift Sentinel' : REGIONS[region].foes[tier];
  const enemy = makePet(15420 + region * 19 + tier * 31 + (raid ? 210 : 0));
  Object.assign(enemy, { family: foe, pattern: 'Wild', hue: raid ? 311 : [28, 6, 268][region], size: 20 });
  state.fight = {
    engine: new Encounter({ pet, region, tier, gear: state.wallet?.gear ?? 0, weather: weather.effect, tactic: raid?.ally.tactic, raid }),
    uid: state.user?.uid, previous: performance.now(), raid, foe, rallied: false, aided: false
  };
  state.fighting = true;
  put('battle-title', foe);
  put('battle-area', raid ? 'Company expedition' : REGIONS[region].name + ' · ' + weather.name);
  put('battle-pet', pet.name);
  put('foe-name', foe);
  node('battle-pet-portrait', portrait(pet));
  node('battle-enemy', portrait(enemy, true));
  el('battle-result').hidden = true;
  el('combat-actions').hidden = false;
  put('combat-effect', '');
  el('battle-field').className = 'battle-field';
  el('battle-dialog').showModal();
  drawBattle();
  animation = requestAnimationFrame(frame);
}
function frame(now) {
  const battle = state.fight;
  if (!battle || !state.fighting) return;
  const delta = Math.min((now - battle.previous) / 1000, .15);
  battle.previous = now;
  if (!document.hidden) battle.engine.advance(delta);
  if (battle.raid && battle.engine.dealt >= 65 && !battle.rallied) {
    battle.rallied = true;
    backend.rallyRaid(battle.uid, battle.raid.id).catch(() => {});
  }
  if (battle.raid && !battle.aided) applyAllyRally();
  drawBattle();
  if (battle.engine.done) {
    finishFight();
    return;
  }
  animation = requestAnimationFrame(frame);
}
function applyAllyRally() {
  const battle = state.fight;
  if (!battle?.raid || battle.aided || !state.room) return;
  const allySignal = state.room.host === battle.uid ? state.room.guestRally : state.room.hostRally;
  if (!allySignal || battle.engine.time < 1) return;
  battle.aided = true;
  const engine = battle.engine;
  engine.hp = Math.min(engine.maxHp, engine.hp + 22);
  engine.energy = Math.min(100, engine.energy + 30);
  engine.emit('guard', battle.raid.ally.name + ' rallied you');
}
function drawBattle() {
  const { engine } = state.fight;
  el('health-fill').style.width = 100 * engine.hp / engine.maxHp + '%';
  el('foe-fill').style.width = 100 * engine.foe / engine.maxFoe + '%';
  put('health-text', engine.hp + ' / ' + engine.maxHp + ' HP');
  put('foe-health', engine.foe + ' / ' + engine.maxFoe + ' HP');
  put('battle-stamina', 'Stamina ' + Math.floor(engine.energy));
  put('battle-clock', secondsText(engine.seconds - engine.time));
  const timeToHit = engine.nextHit - engine.time;
  put('battle-tell', engine.done ? '' : timeToHit <= engine.windup ?
    (engine.phase % 3 === 2 ? 'Heavy incoming!' : 'Incoming strike!') : 'Watch for the wind-up');
  const lock = engine.time - engine.spent < .34;
  const costs = { strike: 20, heavy: 38, guard: 15, dodge: 21, pet: 0 };
  document.querySelectorAll('[data-action]').forEach(button => {
    const action = button.dataset.action;
    const cooldown = action === 'pet' ? Math.ceil(engine.petAt - engine.time) : 0;
    button.disabled = lock || !!engine.done || engine.energy < costs[action] || cooldown > 0;
    if (action === 'pet') {
      const label = { flare: 'Companion · Flare', bloom: 'Companion · Mend', ward: 'Companion · Ward' }[engine.pet.move];
      button.textContent = cooldown > 0 ? label + ' · ' + cooldown + 's' : label;
    }
  });
  const effect = engine.event;
  if (effect) {
    engine.event = null;
    const field = el('battle-field');
    field.className = 'battle-field';
    void field.offsetWidth;
    field.classList.add(effect.kind);
    put('combat-effect', effect.label);
    clearTimeout(effectTimeout);
    effectTimeout = setTimeout(() => put('combat-effect', ''), 600);
  }
}
function battleAct(action) {
  if (!state.fighting) return;
  state.fight.engine.act(action);
  drawBattle();
  if (state.fight.engine.done) finishFight();
}
function finishFight() {
  if (!state.fighting) return;
  const battle = state.fight;
  state.fighting = false;
  cancelAnimationFrame(animation);
  el('combat-actions').hidden = true;
  const result = el('battle-result');
  result.hidden = false;
  const win = battle.engine.done === 'won';
  if (battle.raid) {
    const score = Math.min(200, battle.engine.dealt);
    result.textContent = 'You dealt ' + score + ' company damage. Saving your best score…';
    backend.reportRaid(battle.uid, battle.raid.id, score).then(() => {
      if (state.fight === battle) result.textContent = 'Recorded ' + score + ' damage. Your best score counts toward the Sentinel.';
    }).catch(error => {
      if (state.fight === battle) {
        result.textContent = 'Your score could not be saved. ' + explain(error);
        const retry = action('Retry score', async () => {
          try {
            await backend.reportRaid(battle.uid, battle.raid.id, score);
            if (state.fight === battle) result.textContent = 'Recorded ' + score + ' damage.';
          } catch (err) { if (state.fight === battle) retry.textContent = explain(err) + ' Retry'; }
        });
        result.append(' ', retry);
      }
    });
    return;
  }
  const run = { id: crypto.randomUUID(), region: battle.engine.region, tier: battle.engine.tier, win,
    date: Date.now(), time: Math.round(battle.engine.time * 1000) };
  const next = win ? (profile().wins + 1) : profile().wins;
  result.textContent = win ? (next % 2 === 0 && next <= 22 ? 'Victory. A wildborn companion is waiting in your menagerie.' :
    'Victory. Your field report is ready.') : 'You retreated. Watch the wind-up to time your guard or dodge.';
  if (battle.uid) queueRun(battle.uid, run);
  else syncGuest(run);
  render();
}
function endBattle() {
  state.fighting = false;
  state.fight = null;
  cancelAnimationFrame(animation);
  clearTimeout(effectTimeout);
}

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', event => { event.preventDefault(); navigate(button.dataset.view); });
}
for (const button of document.querySelectorAll('[data-close]')) {
  button.addEventListener('click', () => el(button.dataset.close).close());
}
for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('click', () => battleAct(button.dataset.action));
}
document.addEventListener('keydown', event => {
  const actions = { '1': 'strike', '2': 'heavy', '3': 'guard', '4': 'dodge', '5': 'pet' };
  if (el('battle-dialog').open && !event.repeat && actions[event.key]) battleAct(actions[event.key]);
});
el('first-expedition').addEventListener('click', () => expeditions(Math.min(profile().progress, 2)));
el('account-open').addEventListener('click', showAccount);
el('battle-exit').addEventListener('click', () => el('battle-dialog').close());
el('battle-dialog').addEventListener('close', endBattle);
el('auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const mode = event.submitter?.value ?? 'login';
  const result = el('auth-status');
  result.textContent = 'Connecting…';
  try {
    const api = await db();
    await api.emailAuth(mode, String(values.get('email')).trim(), String(values.get('password')));
    form.elements.password.value = '';
    result.textContent = '';
  } catch (error) { result.textContent = explain(error); }
});
el('password-reset').addEventListener('click', async () => {
  const form = el('auth-form');
  const email = form.elements.email;
  if (!email.reportValidity()) return;
  const result = el('auth-status');
  result.textContent = 'Sending…';
  try {
    await (await db()).emailAuth('reset', email.value.trim());
    result.textContent = 'Check your inbox for a password reset link.';
  } catch (error) { result.textContent = explain(error); }
});
el('profile-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements.ranger.value.trim();
  const result = el('profile-status');
  if (name.length < 2 || name.length > 24) {
    result.textContent = 'Enter a name with 2–24 characters.';
    return;
  }
  result.textContent = 'Creating ranger…';
  try {
    if (state.user) await backend.onboard(state.user.uid, name);
    if (el('account-dialog').open) el('account-dialog').close();
    result.textContent = '';
  } catch (error) { result.textContent = explain(error); }
});
el('logout').addEventListener('click', () =>
  backend.logout().then(() => el('account-dialog').close()).catch(error => notice(explain(error), true)));
window.addEventListener('online', () => { state.online = true; db().then(flushQueue).catch(() => {}); render(); });
window.addEventListener('offline', () => { state.online = false; render(); });
window.addEventListener('focus', flushQueue);
window.addEventListener('hashchange', setHashView);
setHashView();
db().catch(() => {});
setInterval(() => {
  if (state.view === 'frontier' && !document.hidden) renderEvent();
  if (state.view === 'town') townClock();
  if (state.view === 'company') raidClock();
}, 1000);
