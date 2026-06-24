// ╔══════════════════════════════════════════════════════════╗
// ║         ANAXAGORAS — V1  ·  Database Helper                ║
// ╚══════════════════════════════════════════════════════════╝
// Plain JSON file storage — no native modules, Termux-safe.

const fs = require("fs");
const path = require("path");
const config = require("./config");

const DB_PATH = path.join(__dirname, "..", config.databaseFile.replace(/^\.\//, ""));

const DEFAULT_DB = {
  groups: {},        // per-group settings (welcome, antilink, lists, store, etc.)
  sewa: {},           // rental/subscription registry { [groupJid]: { activatedAt, expiresAt } }
  testimonials: [],   // uptesti entries
  status: {           // tracks last status@broadcast message for delsw
    lastKey: null,
  },
};

const DEFAULT_GROUP = {
  welcomeEnabled: false,
  leftEnabled: false,
  welcomeMessage: null,   // null = use config.defaults.welcomeMessage
  leftMessage: null,
  antilink: false,
  antilinkKick: false,
  muted: false,
  isOpen: true,
  openMessage: null,
  closeMessage: null,
  statusProses: null,
  statusDone: null,
  symbol: null,           // null = use config.storeSymbol
  lists: {},              // { listName: { items: [{name, price}] } }
};

function ensureDbFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

function readDB() {
  ensureDbFile();
  try {
    const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    return { ...DEFAULT_DB, ...raw };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function writeDB(db) {
  ensureDbFile();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ── Group helpers ─────────────────────────────────────────────
function getGroup(jid) {
  const db = readDB();
  if (!db.groups[jid]) {
    db.groups[jid] = JSON.parse(JSON.stringify(DEFAULT_GROUP));
    writeDB(db);
  }
  return { ...DEFAULT_GROUP, ...db.groups[jid] };
}

function setGroup(jid, partialData) {
  const db = readDB();
  const current = db.groups[jid] || JSON.parse(JSON.stringify(DEFAULT_GROUP));
  db.groups[jid] = { ...current, ...partialData };
  writeDB(db);
  return db.groups[jid];
}

// ── Sewa helpers ──────────────────────────────────────────────
function getSewa(jid) {
  const db = readDB();
  return db.sewa[jid] || null;
}

function setSewa(jid, entry) {
  const db = readDB();
  db.sewa[jid] = entry;
  writeDB(db);
}

function delSewa(jid) {
  const db = readDB();
  delete db.sewa[jid];
  writeDB(db);
}

function listSewa() {
  const db = readDB();
  return db.sewa;
}

function isSewaActive(jid) {
  const entry = getSewa(jid);
  if (!entry) return false;
  return new Date(entry.expiresAt).getTime() > Date.now();
}

// ── Testimonial helpers ───────────────────────────────────────
function addTestimonial(entry) {
  const db = readDB();
  db.testimonials.push(entry);
  writeDB(db);
}

function getTestimonials() {
  return readDB().testimonials;
}

// ── Status (story) helpers ────────────────────────────────────
function setLastStatusKey(key) {
  const db = readDB();
  db.status.lastKey = key;
  writeDB(db);
}

function getLastStatusKey() {
  return readDB().status.lastKey;
}

module.exports = {
  readDB,
  writeDB,
  getGroup,
  setGroup,
  getSewa,
  setSewa,
  delSewa,
  listSewa,
  isSewaActive,
  addTestimonial,
  getTestimonials,
  setLastStatusKey,
  getLastStatusKey,
};
