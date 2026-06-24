// ╔══════════════════════════════════════════════════════════╗
// ║        ANAXAGORAS — V1  ·  Admin Menu Commands             ║
// ╚══════════════════════════════════════════════════════════╝

const config = require("../config/config");
const db = require("../config/database");

// ── Helper: resolve target jid from mention or plain number ───
function resolveTarget(msg, args) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned && mentioned.length > 0) return mentioned;
  if (args[0]) {
    const num = args[0].replace(/[^0-9]/g, "");
    return num ? [`${num}@s.whatsapp.net`] : [];
  }
  return [];
}

// ── add <number> ────────────────────────────────────────────────
async function cmdAdd(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const targets = resolveTarget(msg, args);
  if (!targets.length) return sock.sendMessage(jid, { text: "❌ Format: .add <nomor>" });

  try {
    await sock.groupParticipantsUpdate(jid, targets, "add");
    await sock.sendMessage(jid, { text: "✅ Member berhasil ditambahkan." });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal menambahkan member: ${err.message}` });
  }
}

// ── addadmin <@user/nomor> ───────────────────────────────────────
async function cmdAddAdmin(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const targets = resolveTarget(msg, args);
  if (!targets.length) return sock.sendMessage(jid, { text: "❌ Format: .addadmin @user / .addadmin <nomor>" });

  try {
    await sock.groupParticipantsUpdate(jid, targets, "promote");
    await sock.sendMessage(jid, { text: "✅ Berhasil dijadikan admin.", mentions: targets });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` });
  }
}

// ── kick <@user/nomor> ────────────────────────────────────────────
async function cmdKick(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const targets = resolveTarget(msg, args);
  if (!targets.length) return sock.sendMessage(jid, { text: "❌ Format: .kick @user / .kick <nomor>" });

  try {
    await sock.groupParticipantsUpdate(jid, targets, "remove");
    await sock.sendMessage(jid, { text: "✅ Member berhasil dikeluarkan." });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` });
  }
}

// ── del (reply to a message to delete it) ────────────────────────
async function cmdDel(sock, msg) {
  const jid = msg.key.remoteJid;
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.stanzaId) return sock.sendMessage(jid, { text: "❌ Reply pesan yang ingin dihapus dengan .del" });

  try {
    await sock.sendMessage(jid, {
      delete: { remoteJid: jid, fromMe: false, id: ctx.stanzaId, participant: ctx.participant },
    });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal hapus pesan: ${err.message}` });
  }
}

// ── hidetag / h <text> ────────────────────────────────────────────
async function cmdHidetag(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const text = args.join(" ") || "📢 Pemberitahuan";

  try {
    const metadata = await sock.groupMetadata(jid);
    const mentions = metadata.participants.map((p) => p.id);
    await sock.sendMessage(jid, { text, mentions });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` });
  }
}

// ── listadmin ──────────────────────────────────────────────────
async function cmdListAdmin(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    const metadata = await sock.groupMetadata(jid);
    const admins = metadata.participants.filter((p) => p.admin === "admin" || p.admin === "superadmin");
    if (!admins.length) return sock.sendMessage(jid, { text: "❌ Tidak ada admin terdeteksi." });

    const mentions = admins.map((a) => a.id);
    const text = "👑 *Daftar Admin Grup*\n\n" + admins.map((a) => `• @${a.id.split("@")[0]}`).join("\n");
    await sock.sendMessage(jid, { text, mentions });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` });
  }
}

// ── mute ──────────────────────────────────────────────────────────
async function cmdMute(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    await sock.groupSettingUpdate(jid, "announcement");
    await sock.sendMessage(jid, { text: "🔇 Grup dikunci. Hanya admin yang dapat mengirim pesan." });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` });
  }
}

// ── unmute ─────────────────────────────────────────────────────────
async function cmdUnmute(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    await sock.groupSettingUpdate(jid, "not_announcement");
    await sock.sendMessage(jid, { text: "🔊 Grup dibuka. Semua member dapat mengirim pesan." });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` });
  }
}

// ── linkgc ─────────────────────────────────────────────────────────
async function cmdLinkGc(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    const code = await sock.groupInviteCode(jid);
    await sock.sendMessage(jid, { text: `🔗 https://chat.whatsapp.com/${code}` });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` });
  }
}

// ── resetlinkgc ────────────────────────────────────────────────────
async function cmdResetLinkGc(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    const code = await sock.groupRevokeInvite(jid);
    await sock.sendMessage(jid, { text: `🔁 Link grup baru:\nhttps://chat.whatsapp.com/${code}` });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` });
  }
}

// ── setppgc (reply to image) ──────────────────────────────────────
async function cmdSetGroupPicture(sock, msg) {
  const jid = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted?.imageMessage) return sock.sendMessage(jid, { text: "❌ Reply gambar dengan caption .setppgc" });

  const { downloadMediaMessage } = require("@whiskeysockets/baileys");
  const ctx = msg.message.extendedTextMessage.contextInfo;
  const fakeMsg = { key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant }, message: quoted };

  try {
    const buffer = await downloadMediaMessage(fakeMsg, "buffer", {});
    await sock.updateProfilePicture(jid, buffer);
    await sock.sendMessage(jid, { text: "✅ Foto profil grup berhasil diubah." });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` });
  }
}

// ── setwelcome / setleft <message> (use @user for mention) ─────────
async function cmdSetWelcome(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const text = args.join(" ").trim();
  if (!text) return sock.sendMessage(jid, { text: "❌ Format: .setwelcome <pesan> (gunakan @user untuk mention)" });

  db.setGroup(jid, { welcomeMessage: text });
  await sock.sendMessage(jid, { text: `✅ Pesan welcome disimpan:\n\n${text}` });
}

async function cmdSetLeft(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const text = args.join(" ").trim();
  if (!text) return sock.sendMessage(jid, { text: "❌ Format: .setleft <pesan> (gunakan @user untuk mention)" });

  db.setGroup(jid, { leftMessage: text });
  await sock.sendMessage(jid, { text: `✅ Pesan left disimpan:\n\n${text}` });
}

// ── welcome on/off ───────────────────────────────────────────────
async function cmdWelcomeToggle(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const val = args[0]?.toLowerCase();
  if (!["on", "off"].includes(val)) return sock.sendMessage(jid, { text: "❌ Format: .welcome on / .welcome off" });

  db.setGroup(jid, { welcomeEnabled: val === "on" });
  await sock.sendMessage(jid, { text: `✅ Welcome message *${val.toUpperCase()}*.` });
}

// ── left on/off ──────────────────────────────────────────────────
async function cmdLeftToggle(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const val = args[0]?.toLowerCase();
  if (!["on", "off"].includes(val)) return sock.sendMessage(jid, { text: "❌ Format: .left on / .left off" });

  db.setGroup(jid, { leftEnabled: val === "on" });
  await sock.sendMessage(jid, { text: `✅ Left message *${val.toUpperCase()}*.` });
}

// ── teswelcome / tesleft ─────────────────────────────────────────
async function cmdTesWelcome(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || jid;
  const group = db.getGroup(jid);
  const template = group.welcomeMessage || config.defaults.welcomeMessage;
  const text = template.replace(/@user/g, `@${sender.split("@")[0]}`);
  await sock.sendMessage(jid, { text, mentions: [sender] });
}

async function cmdTesLeft(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || jid;
  const group = db.getGroup(jid);
  const template = group.leftMessage || config.defaults.leftMessage;
  const text = template.replace(/@user/g, `@${sender.split("@")[0]}`);
  await sock.sendMessage(jid, { text, mentions: [sender] });
}

// ── setopen / setclose <message> ─────────────────────────────────
async function cmdSetOpen(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const text = args.join(" ").trim();
  if (!text) return sock.sendMessage(jid, { text: "❌ Format: .setopen <pesan_toko_buka>" });
  db.setGroup(jid, { openMessage: text });
  await sock.sendMessage(jid, { text: `✅ Pesan open disimpan:\n\n${text}` });
}

async function cmdSetClose(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const text = args.join(" ").trim();
  if (!text) return sock.sendMessage(jid, { text: "❌ Format: .setclose <pesan_toko_tutup>" });
  db.setGroup(jid, { closeMessage: text });
  await sock.sendMessage(jid, { text: `✅ Pesan close disimpan:\n\n${text}` });
}

// ── setproses / setdone <message> ────────────────────────────────
async function cmdSetProses(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const text = args.join(" ").trim();
  if (!text) return sock.sendMessage(jid, { text: "❌ Format: .setproses <pesan_status_proses>" });
  db.setGroup(jid, { statusProses: text });
  await sock.sendMessage(jid, { text: `✅ Pesan proses disimpan:\n\n${text}` });
}

async function cmdSetDone(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const text = args.join(" ").trim();
  if (!text) return sock.sendMessage(jid, { text: "❌ Format: .setdone <pesan_status_done>" });
  db.setGroup(jid, { statusDone: text });
  await sock.sendMessage(jid, { text: `✅ Pesan done disimpan:\n\n${text}` });
}

module.exports = {
  cmdAdd,
  cmdAddAdmin,
  cmdKick,
  cmdDel,
  cmdHidetag,
  cmdListAdmin,
  cmdMute,
  cmdUnmute,
  cmdLinkGc,
  cmdResetLinkGc,
  cmdSetGroupPicture,
  cmdSetWelcome,
  cmdSetLeft,
  cmdWelcomeToggle,
  cmdLeftToggle,
  cmdTesWelcome,
  cmdTesLeft,
  cmdSetOpen,
  cmdSetClose,
  cmdSetProses,
  cmdSetDone,
};
