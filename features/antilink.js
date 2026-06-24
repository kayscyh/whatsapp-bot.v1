// ╔══════════════════════════════════════════════════════════╗
// ║        ANAXAGORAS — V1  ·  Antilink Feature                ║
// ╚══════════════════════════════════════════════════════════╝

const db = require("../config/database");

const LINK_REGEX = /chat\.whatsapp\.com\/[A-Za-z0-9]+/i;

// ── antilink on/off ──────────────────────────────────────────────
async function cmdAntilink(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const val = args[0]?.toLowerCase();
  if (!["on", "off"].includes(val)) return sock.sendMessage(jid, { text: "❌ Format: .antilink on / .antilink off" });

  db.setGroup(jid, { antilink: val === "on", antilinkKick: val === "on" ? db.getGroup(jid).antilinkKick : false });
  await sock.sendMessage(jid, { text: `✅ Antilink (hapus pesan) *${val.toUpperCase()}*.` });
}

// ── antilinkkick on/off ──────────────────────────────────────────
async function cmdAntilinkKick(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const val = args[0]?.toLowerCase();
  if (!["on", "off"].includes(val)) return sock.sendMessage(jid, { text: "❌ Format: .antilinkkick on / .antilinkkick off" });

  db.setGroup(jid, { antilinkKick: val === "on", antilink: val === "on" ? true : db.getGroup(jid).antilink });
  await sock.sendMessage(jid, { text: `✅ Antilink + kick *${val.toUpperCase()}*.` });
}

// ── Watcher: scans every group message for invite links ──────────
async function watchAntilink(sock, msg) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith("@g.us")) return;
  if (msg.key.fromMe) return;

  const group = db.getGroup(jid);
  if (!group.antilink && !group.antilinkKick) return;

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    "";

  if (!LINK_REGEX.test(text)) return;

  const sender = msg.key.participant || msg.key.remoteJid;

  // Don't action group admins/owner posting their own group's link
  try {
    const metadata = await sock.groupMetadata(jid);
    const participant = metadata.participants.find((p) => p.id === sender);
    if (participant && (participant.admin === "admin" || participant.admin === "superadmin")) return;
  } catch {
    /* ignore */
  }

  // Delete the offending message
  try {
    await sock.sendMessage(jid, {
      delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: sender },
    });
  } catch {
    /* ignore delete failure */
  }

  if (group.antilinkKick) {
    try {
      await sock.groupParticipantsUpdate(jid, [sender], "remove");
      await sock.sendMessage(jid, { text: `🚫 @${sender.split("@")[0]} dikeluarkan karena mengirim link grup lain.`, mentions: [sender] });
    } catch {
      /* ignore kick failure */
    }
  } else {
    await sock.sendMessage(jid, { text: `🚫 @${sender.split("@")[0]}, link grup tidak diperbolehkan di sini.`, mentions: [sender] });
  }
}

module.exports = { cmdAntilink, cmdAntilinkKick, watchAntilink };
