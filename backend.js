import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, setPersistence, browserLocalPersistence, inMemoryPersistence
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import {
  getFirestore, doc, collection, query, where, limit, onSnapshot, runTransaction, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';
import { firebaseConfig, namespace } from './config.js';
import { JOBS, REGIONS, pendingWork, randomSeed } from './world.js';

const app = initializeApp(firebaseConfig, namespace);
const auth = getAuth(app);
const db = getFirestore(app);
const root = doc(db, 'gameNamespaces', namespace);
const ref = (type, id) => doc(root, type, id);

export async function observeAuth(callback) {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    await setPersistence(auth, inMemoryPersistence);
  }
  return onAuthStateChanged(auth, callback);
}
export async function emailAuth(mode, email, password) {
  if (mode === 'reset') return sendPasswordResetEmail(auth, email);
  if (mode === 'create') return createUserWithEmailAndPassword(auth, email, password);
  return signInWithEmailAndPassword(auth, email, password);
}
export const logout = () => signOut(auth);
export const watchWallet = (uid, change, error) => onSnapshot(ref('wallets', uid), snap => change(snap.data()), error);
export const watchProfile = (uid, change, error) => onSnapshot(ref('profiles', uid), snap => change(snap.data()), error);
export const watchShop = (id, change, error) => onSnapshot(ref('shops', id), snap => change(snap.data()), error);
export const watchRoom = (id, change, error) => onSnapshot(ref('rooms', id), { includeMetadataChanges: true },
  snap => { if (!snap.metadata.hasPendingWrites) change(snap.data()); }, error);
export const watchOwnListing = (uid, change, error) => onSnapshot(ref('listings', uid), snap => change(snap.data()), error);
export const watchListings = (change, error) => onSnapshot(
  query(collection(root, 'listings'), where('state', '==', 'open'), limit(30)),
  snap => change(snap.docs.map(item => item.data())), error);

export async function onboard(uid, displayName) {
  const seed = randomSeed();
  return runTransaction(db, async tx => {
    const wallet = ref('wallets', uid);
    const profile = ref('profiles', uid);
    const [w, p] = await Promise.all([tx.get(wallet), tx.get(profile)]);
    if (!w.exists()) tx.set(wallet, {
      name: displayName, gold: 75, ore: 8, gear: 0, xp: 0, job: 'mine', tick: serverTimestamp(), last: ''
    });
    if (!p.exists()) tx.set(profile, { seed, active: 0, progress: 0, wins: 0, discovery: 1, trails: [-1, -1, -1], journal: [], updated: serverTimestamp() });
  });
}

export function saveAdventure(uid, run, pick) {
  return runTransaction(db, async tx => {
    const path = ref('profiles', uid);
    const snap = await tx.get(path);
    const current = snap.data();
    if (!current) throw new Error('Create your ranger profile first.');
    const patch = { ...current, updated: serverTimestamp() };
    if (Number.isInteger(pick) && pick >= 0 && pick < current.discovery) patch.active = pick;
    if (run && !current.journal.some(item => item.id === run.id)) {
      patch.journal = [run, ...current.journal].slice(0, 36);
      if (run.win) {
        patch.trails = [...current.trails];
        patch.trails[run.region] = Math.max(patch.trails[run.region], run.tier);
        patch.wins = Math.min(100000, current.wins + 1);
        if (run.tier === 2 && current.progress === run.region) patch.progress += 1;
        patch.discovery = Math.min(12, 1 + Math.floor(patch.wins / 2));
      }
    }
    tx.set(path, patch);
  });
}

export async function economy(uid, kind, options = {}) {
  const shopId = options.shop ?? 'pinefall';
  const target = options.target ?? '-';
  const n = options.number ?? 0;
  const receipt = doc(collection(root, 'receipts'));
  const actorRef = ref('wallets', uid);
  const shopRef = ref('shops', shopId);
  const listingRef = ref('listings', kind === 'buy' ? target : uid);
  return runTransaction(db, async tx => {
    const [actorSnap, shopSnap, listingSnap] = await Promise.all([
      tx.get(actorRef),
      ['claim','terms','transfer','craft','sell','buy'].includes(kind) ? tx.get(shopRef) : null,
      ['list','cancel','buy'].includes(kind) ? tx.get(listingRef) : null
    ]);
    const shop = shopSnap?.data();
    const listing = listingSnap?.data();
    const actor = actorSnap.data();
    if (!actor) throw new Error('Create your ranger profile first.');
    const require = (okay, message) => { if (!okay) throw new Error(message); };
    const walletChanges = new Map();
    let shopChange;
    let listingChange;
    let batches = n;

    function adjust(user, gold, ore, gear) {
      const delta = walletChanges.get(user) ?? { gold: 0, ore: 0, gear: 0 };
      delta.gold += gold;
      delta.ore += ore;
      delta.gear += gear;
      walletChanges.set(user, delta);
    }

    switch (kind) {
      case 'gather': {
        batches = pendingWork(actor);
        if (!batches) return 0;
        break;
      }
      case 'assign':
        if (actor.job === target) return 0;
        require(Boolean(JOBS[target]), 'Choose a job.');
        break;
      case 'claim':
        require(!shop, 'The deed has already been claimed.');
        adjust(uid, -REGIONS.find(region => region.id === shopId).cost, 0, 0);
        shopChange = { owner: uid, craftFee: 3, saleFee: 2, price: 0 };
        break;
      case 'terms':
        require(shop?.owner === uid, 'Only the current owner can set the terms.');
        shopChange = { ...shop, craftFee: options.craftFee, saleFee: options.saleFee, price: options.price };
        break;
      case 'transfer':
        require(shop && shop.owner === target && uid !== target && shop.price > 0 && shop.price === n,
          'The deed or asking price changed. Review the current listing.');
        adjust(uid, -shop.price, 0, 0);
        adjust(target, shop.price, 0, 0);
        shopChange = { ...shop, owner: uid, price: 0 };
        break;
      case 'craft':
      case 'sell': {
        const craft = kind === 'craft';
        const fee = shop && shop.owner !== uid ? shop[craft ? 'craftFee' : 'saleFee'] : 0;
        require(fee === n, 'The shop fee changed. Review the current terms.');
        adjust(uid, (craft ? 0 : 12) - fee, craft ? -2 : 0, craft ? 1 : -1);
        if (fee) adjust(shop.owner, fee, 0, 0);
        break;
      }
      case 'list':
        require(Number.isInteger(n) && n >= 9 && n <= 2000, 'Set a price from 9 to 2,000 gold.');
        require(listing?.state !== 'open', 'You already have an open listing. Cancel it before listing again.');
        adjust(uid, 0, 0, -1);
        listingChange = { seller: uid, shop: shopId, price: n, state: 'open' };
        break;
      case 'cancel':
        require(listing?.state === 'open', 'That listing has already closed.');
        adjust(uid, 0, 0, 1);
        listingChange = { ...listing, state: 'canceled' };
        break;
      case 'buy': {
        require(uid !== target && listing?.state === 'open' && listing.price === n && listing.shop === shopId,
          'The item moved or its price changed. Refresh the listing.');
        const fee = shop && shop.owner !== target ? shop.saleFee : 0;
        adjust(uid, -n, 0, 1);
        adjust(target, n - fee, 0, 0);
        if (fee) adjust(shop.owner, fee, 0, 0);
        listingChange = { ...listing, state: 'sold' };
        break;
      }
      default:
        throw new Error('Unknown frontier action.');
    }

    const snapshot = new Map([[uid, actor]]);
    await Promise.all([...walletChanges.keys()].filter(user => user !== uid).map(async user => {
      const other = await tx.get(ref('wallets', user));
      snapshot.set(user, other.data());
    }));
    for (const [user, delta] of walletChanges) {
      const before = snapshot.get(user);
      require(before, 'An account in this transaction is unavailable.');
      const next = { gold: before.gold + delta.gold, ore: before.ore + delta.ore, gear: before.gear + delta.gear };
      require(next.gold >= 0 && next.ore >= 0 && next.gear >= 0, 'You need more gold, ore, or gear to do that.');
      tx.update(ref('wallets', user), { ...next, last: receipt.id });
    }
    if (kind === 'gather') {
      tx.update(actorRef, {
        gold: actor.gold + (actor.job === 'scout' ? 3 * batches : 0),
        ore: actor.ore + (actor.job === 'mine' ? 2 * batches : actor.job === 'forage' ? batches : 0),
        xp: actor.xp + (actor.job === 'forage' ? 2 : 1) * batches,
        tick: batches === 24 ? serverTimestamp() : new Timestamp(actor.tick.seconds + batches * JOBS[actor.job].time, actor.tick.nanoseconds),
        last: receipt.id
      });
    }
    if (kind === 'assign') tx.update(actorRef, { job: target, tick: serverTimestamp(), last: receipt.id });
    if (shopChange) tx.set(shopRef, { ...shopChange, last: receipt.id });
    if (listingChange) tx.set(listingRef, { ...listingChange, last: receipt.id });
    tx.set(receipt, { a: uid, k: kind, s: shopId, t: target, n: batches, at: serverTimestamp() });
    return kind === 'gather' ? batches : 1;
  });
}

export async function createRoom(uid, plan) {
  const id = [...crypto.getRandomValues(new Uint8Array(6))].map(v => v.toString(16).padStart(2, '0')).join('');
  const path = ref('rooms', id);
  await runTransaction(db, async tx => {
    if ((await tx.get(path)).exists()) throw new Error('A room code collided. Generate a new invitation.');
    tx.set(path, { host: uid, hostPlan: plan, guest: '', guestPlan: {}, started: null,
      hostScore: 0, guestScore: 0, hostRally: null, guestRally: null, created: serverTimestamp() });
  });
  return id;
}
export function joinRoom(uid, id, plan) {
  return runTransaction(db, async tx => {
    const path = ref('rooms', id);
    const room = (await tx.get(path)).data();
    if (!room) throw new Error('No expedition has that invite code.');
    if (room.host === uid || room.guest === uid) return;
    if (room.guest) throw new Error('That expedition already has two rangers.');
    tx.update(path, { guest: uid, guestPlan: plan, started: serverTimestamp() });
  });
}
export function reportRaid(uid, id, score) {
  return runTransaction(db, async tx => {
    const path = ref('rooms', id);
    const room = (await tx.get(path)).data();
    if (!room || (room.host !== uid && room.guest !== uid)) throw new Error('You are no longer connected to that expedition.');
    const field = room.host === uid ? 'hostScore' : 'guestScore';
    if (score > room[field]) tx.update(path, { [field]: Math.min(200, score) });
  });
}

export function rallyRaid(uid, id) {
  return runTransaction(db, async tx => {
    const path = ref('rooms', id);
    const room = (await tx.get(path)).data();
    if (!room || (room.host !== uid && room.guest !== uid)) throw new Error('This expedition is unavailable.');
    const field = room.host === uid ? 'hostRally' : 'guestRally';
    if (!room[field]) tx.update(path, { [field]: serverTimestamp() });
  });
}
