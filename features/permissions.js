// ╔══════════════════════════════════════════════════════════╗
// ║         ANAXAGORAS — V1  ·  Permissions Helper             ║
// ╚══════════════════════════════════════════════════════════╝

const config = require("../config/config");
const db = require("../config/database");

function isGroup(jid) {
  return jid.endsWith("@g.us");
}

function isOwner(senderJid) {
  const number = senderJid.split("@")[0].split(":")[0];
  return config.ownerNumbers.includes(number);
}

async function isGroupAdmin(sock, groupJid, senderJid) {
  try {
    const metadata = await sock.groupMetadata(groupJid);
    const participant = metadata.participants.find((p) => p.id === senderJid);
    return !!participant && (participant.admin === "admin" || participant.admin === "superadmin");
  } catch {
    return false;
  }
}

async function isBotAdmin(sock, groupJid) {
  try {
    const metadata = await sock.groupMetadata(groupJid);
    const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
    const participant = metadata.participants.find((p) => p.id.split(":")[0] === botJid.split("@")[0] + "");
    // Fallback: match by number prefix since bot jid format can include device id
    const botNumber = sock.user.id.split(":")[0].split("@")[0];
    const found = metadata.participants.find((p) => p.id.split("@")[0].split(":")[0] === botNumber);
    return !!found && (found.admin === "admin" || found.admin === "superadmin");
  } catch {
    return false;
  }
}

function isSewaActive(groupJid) {
  return db.isSewaActive(groupJid);
}

module.exports = { isGroup, isOwner, isGroupAdmin, isBotAdmin, isSewaActive };
