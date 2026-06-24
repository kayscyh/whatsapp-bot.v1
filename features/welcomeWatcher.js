// ╔══════════════════════════════════════════════════════════╗
// ║   ANAXAGORAS — V1  ·  Welcome/Left Group Event Watcher     ║
// ╚══════════════════════════════════════════════════════════╝
// Fires automatically on group-participants.update (join/leave).
// The .setwelcome / .setleft / .welcome on/off / .left on/off /
// .teswelcome / .tesleft COMMANDS live in adminCommands.js —
// this file only handles the live join/leave events.

const config = require("../config/config");
const db = require("../config/database");

async function handleGroupJoin(sock, update) {
  const { id, participants } = update;
  const group = db.getGroup(id);
  if (!group.welcomeEnabled) return;

  const template = group.welcomeMessage || config.defaults.welcomeMessage;
  for (const user of participants) {
    const text = template.replace(/@user/g, `@${user.split("@")[0]}`);
    await sock.sendMessage(id, { text, mentions: [user] });
  }
}

async function handleGroupLeave(sock, update) {
  const { id, participants } = update;
  const group = db.getGroup(id);
  if (!group.leftEnabled) return;

  const template = group.leftMessage || config.defaults.leftMessage;
  for (const user of participants) {
    const text = template.replace(/@user/g, `@${user.split("@")[0]}`);
    await sock.sendMessage(id, { text, mentions: [user] });
  }
}

module.exports = { handleGroupJoin, handleGroupLeave };
