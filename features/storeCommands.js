// ╔══════════════════════════════════════════════════════════╗
// ║        ANAXAGORAS — V1  ·  Store Menu Commands              ║
// ╚══════════════════════════════════════════════════════════╝

const config = require("../config/config");
const db = require("../config/database");

// ── Helper: format a list for display ───────────────────────────
function formatList(jid, name, list) {
  const group = db.getGroup(jid);
  const symbol = group.symbol || config.storeSymbol;
  let text = `╭─── 〔 ${name} 〕•••\n`;
  list.items.forEach((item, i) => {
    text += `│${symbol}  ${i + 1}. ${item.name} — ${item.price}\n`;
  });
  text += `╰──────────── •••`;
  return text;
}

// ── addlist <name> | <item,harga> | ... ──────────────────────────
async function cmdAddList(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const parts = args.join(" ").split("|").map((p) => p.trim());
  const name = parts[0];
  if (!name || parts.length < 2) return sock.sendMessage(jid, { text: "❌ Format: .addlist <nama_list> | <item,harga> | ..." });

  const items = parts.slice(1).map((p) => {
    const [itemName, price] = p.split(",").map((x) => x.trim());
    return { name: itemName || "-", price: price || "0" };
  }).filter((i) => i.name !== "-");

  const group = db.getGroup(jid);
  if (group.lists[name]) return sock.sendMessage(jid, { text: `❌ List *${name}* sudah ada. Gunakan .updatelist untuk memperbarui.` });

  group.lists[name] = { items };
  db.setGroup(jid, { lists: group.lists });
  await sock.sendMessage(jid, { text: `✅ List *${name}* berhasil dibuat!\n\n${formatList(jid, name, group.lists[name])}` });
}

// ── dellist <name> ────────────────────────────────────────────────
async function cmdDelList(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const name = args.join(" ").trim();
  if (!name) return sock.sendMessage(jid, { text: "❌ Format: .dellist <nama_list>" });

  const group = db.getGroup(jid);
  if (!group.lists[name]) return sock.sendMessage(jid, { text: `❌ List *${name}* tidak ditemukan.` });

  delete group.lists[name];
  db.setGroup(jid, { lists: group.lists });
  await sock.sendMessage(jid, { text: `🗑️ List *${name}* berhasil dihapus.` });
}

// ── updatelist <name> | <item,harga> | ... ──────────────────────────
async function cmdUpdateList(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const parts = args.join(" ").split("|").map((p) => p.trim());
  const name = parts[0];
  if (!name || parts.length < 2) return sock.sendMessage(jid, { text: "❌ Format: .updatelist <nama_list> | <item,harga> | ..." });

  const group = db.getGroup(jid);
  if (!group.lists[name]) return sock.sendMessage(jid, { text: `❌ List *${name}* tidak ditemukan.` });

  const items = parts.slice(1).map((p) => {
    const [itemName, price] = p.split(",").map((x) => x.trim());
    return { name: itemName || "-", price: price || "0" };
  }).filter((i) => i.name !== "-");

  group.lists[name].items = items;
  db.setGroup(jid, { lists: group.lists });
  await sock.sendMessage(jid, { text: `✅ List *${name}* berhasil diperbarui!\n\n${formatList(jid, name, group.lists[name])}` });
}

// ── renamelist <oldName> | <newName> ─────────────────────────────────
async function cmdRenameList(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const parts = args.join(" ").split("|").map((p) => p.trim());
  if (parts.length < 2) return sock.sendMessage(jid, { text: "❌ Format: .renamelist <nama_lama> | <nama_baru>" });

  const [oldName, newName] = parts;
  const group = db.getGroup(jid);
  if (!group.lists[oldName]) return sock.sendMessage(jid, { text: `❌ List *${oldName}* tidak ditemukan.` });
  if (group.lists[newName]) return sock.sendMessage(jid, { text: `❌ List *${newName}* sudah ada.` });

  group.lists[newName] = group.lists[oldName];
  delete group.lists[oldName];
  db.setGroup(jid, { lists: group.lists });
  await sock.sendMessage(jid, { text: `✅ List *${oldName}* diubah menjadi *${newName}*.` });
}

// ── setlist [name] ────────────────────────────────────────────────────
async function cmdSetList(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const name = args.join(" ").trim();
  const group = db.getGroup(jid);

  if (!name) {
    const keys = Object.keys(group.lists);
    if (!keys.length) return sock.sendMessage(jid, { text: "❌ Belum ada list yang dibuat." });
    const allLists = keys.map((k) => formatList(jid, k, group.lists[k])).join("\n\n");
    return sock.sendMessage(jid, { text: allLists });
  }

  if (!group.lists[name]) return sock.sendMessage(jid, { text: `❌ List *${name}* tidak ditemukan.` });
  await sock.sendMessage(jid, { text: formatList(jid, name, group.lists[name]) });
}

// ── resetlist ──────────────────────────────────────────────────────────
async function cmdResetList(sock, msg) {
  const jid = msg.key.remoteJid;
  db.setGroup(jid, { lists: {} });
  await sock.sendMessage(jid, { text: "🗑️ Semua list berhasil direset." });
}

// ── setsymbol <symbol> ──────────────────────────────────────────────────
async function cmdSetSymbol(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const symbol = args[0];
  if (!symbol) return sock.sendMessage(jid, { text: "❌ Format: .setsymbol <simbol>" });

  db.setGroup(jid, { symbol });
  await sock.sendMessage(jid, { text: `✅ Simbol list diubah ke: ${symbol}` });
}

// ── open / close ─────────────────────────────────────────────────────────
async function cmdOpen(sock, msg) {
  const jid = msg.key.remoteJid;
  const group = db.getGroup(jid);
  db.setGroup(jid, { isOpen: true });
  await sock.sendMessage(jid, { text: group.openMessage || config.defaults.openMessage });
}

async function cmdClose(sock, msg) {
  const jid = msg.key.remoteJid;
  const group = db.getGroup(jid);
  db.setGroup(jid, { isOpen: false });
  await sock.sendMessage(jid, { text: group.closeMessage || config.defaults.closeMessage });
}

// ── proses / done <@user/nomor> ───────────────────────────────────────────
function resolveTarget(msg, args) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned && mentioned.length > 0) return mentioned[0];
  if (args[0]) {
    const num = args[0].replace(/[^0-9]/g, "");
    return num ? `${num}@s.whatsapp.net` : null;
  }
  return null;
}

async function cmdProses(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const group = db.getGroup(jid);
  const text = group.statusProses || config.defaults.statusProses;
  const target = resolveTarget(msg, args);

  if (target) await sock.sendMessage(jid, { text: `@${target.split("@")[0]} ${text}`, mentions: [target] });
  else await sock.sendMessage(jid, { text });
}

async function cmdDone(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const group = db.getGroup(jid);
  const text = group.statusDone || config.defaults.statusDone;
  const target = resolveTarget(msg, args);

  if (target) await sock.sendMessage(jid, { text: `@${target.split("@")[0]} ${text}`, mentions: [target] });
  else await sock.sendMessage(jid, { text });
}

module.exports = {
  cmdAddList,
  cmdDelList,
  cmdUpdateList,
  cmdRenameList,
  cmdSetList,
  cmdResetList,
  cmdSetSymbol,
  cmdOpen,
  cmdClose,
  cmdProses,
  cmdDone,
};
