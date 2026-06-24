// ╔══════════════════════════════════════════════════════════╗
// ║        ANAXAGORAS — V1  ·  Command Router                  ║
// ╚══════════════════════════════════════════════════════════╝

const config = require("../config/config");
const { isGroup, isOwner, isGroupAdmin } = require("./permissions");
const { isSewaActive } = require("../config/database");

const { handleAllMenu } = require("./menu");
const owner = require("./ownerCommands");
const admin = require("./adminCommands");
const store = require("./storeCommands");
const { cmdAntilink, cmdAntilinkKick } = require("./antilink");

// ── Command classification ───────────────────────────────────
const OWNER_ONLY = new Set([
  "ping", "backup", "joingc", "addsewa", "listsewa", "delsewa",
  "leftnosewa", "upswgc", "upsw", "delsw", "uptesti", "creategrup",
  "setppbot", "setbot",
]);

const ADMIN_ONLY = new Set([
  "add", "addadmin", "antilink", "antilinkkick", "del", "hidetag", "h",
  "kick", "listadmin", "mute", "unmute", "linkgc", "resetlinkgc",
  "setwelcome", "setleft", "welcome", "left", "teswelcome", "tesleft",
  "setopen", "setclose", "setproses", "setdone", "setppgc",
  "addlist", "dellist", "updatelist", "renamelist", "open", "close",
  "proses", "done", "setlist", "resetlist", "setsymbol",
]);

// ── Extract message text ─────────────────────────────────────
function getMsgText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ""
  ).trim();
}

// ── Main router ───────────────────────────────────────────────
async function handleCommand(sock, msg) {
  const text = getMsgText(msg);
  const prefix = config.prefix;
  if (!text.startsWith(prefix)) return;

  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || jid;
  const body = text.slice(prefix.length).trim();
  const [command, ...args] = body.split(" ");
  const cmd = command.toLowerCase();

  const senderIsOwner = isOwner(sender);

  // ── Permission gating ───────────────────────────────────────
  if (OWNER_ONLY.has(cmd) && !senderIsOwner) {
    return sock.sendMessage(jid, { text: "❌ Khusus owner bot." });
  }

  if (ADMIN_ONLY.has(cmd)) {
    if (!isGroup(jid)) {
      return sock.sendMessage(jid, { text: "❌ Command ini hanya bisa digunakan di dalam grup." });
    }
    const senderIsGroupAdmin = await isGroupAdmin(sock, jid, sender);
    if (!senderIsOwner && !senderIsGroupAdmin) {
      return sock.sendMessage(jid, { text: "❌ Command ini khusus admin grup." });
    }
    if (!senderIsOwner && !isSewaActive(jid)) {
      return sock.sendMessage(jid, {
        text: "⚠️ Sewa bot untuk grup ini belum aktif / sudah habis. Hubungi owner untuk memperpanjang.",
      });
    }
  }

  switch (cmd) {
    // ── Menu ───────────────────────────────────────────
    case "allmenu":
      return handleAllMenu(sock, msg);

    // ── Owner ──────────────────────────────────────────
    case "ping": return owner.cmdPing(sock, msg);
    case "backup": return owner.cmdBackup(sock, msg);
    case "joingc": return owner.cmdJoinGc(sock, msg, args);
    case "addsewa": return owner.cmdAddSewa(sock, msg, args);
    case "listsewa": return owner.cmdListSewa(sock, msg);
    case "delsewa": return owner.cmdDelSewa(sock, msg, args);
    case "leftnosewa": return owner.cmdLeftNoSewa(sock, msg);
    case "upswgc": return owner.cmdUploadStatusToGroup(sock, msg, args);
    case "upsw": return owner.cmdUploadStatus(sock, msg, args);
    case "delsw": return owner.cmdDeleteStatus(sock, msg);
    case "uptesti": return owner.cmdUploadTestimonial(sock, msg);
    case "creategrup": return owner.cmdCreateGroup(sock, msg, args);
    case "setppbot": return owner.cmdSetBotPicture(sock, msg);
    case "setbot": return owner.cmdSetBotName(sock, msg, args);

    // ── Admin: group management ─────────────────────────
    case "add": return admin.cmdAdd(sock, msg, args);
    case "addadmin": return admin.cmdAddAdmin(sock, msg, args);
    case "del": return admin.cmdDel(sock, msg);
    case "hidetag":
    case "h": return admin.cmdHidetag(sock, msg, args);
    case "kick": return admin.cmdKick(sock, msg, args);
    case "listadmin": return admin.cmdListAdmin(sock, msg);
    case "mute": return admin.cmdMute(sock, msg);
    case "unmute": return admin.cmdUnmute(sock, msg);
    case "linkgc": return admin.cmdLinkGc(sock, msg);
    case "resetlinkgc": return admin.cmdResetLinkGc(sock, msg);
    case "setppgc": return admin.cmdSetGroupPicture(sock, msg);

    // ── Admin: antilink ──────────────────────────────────
    case "antilink": return cmdAntilink(sock, msg, args);
    case "antilinkkick": return cmdAntilinkKick(sock, msg, args);

    // ── Admin: welcome / left ────────────────────────────
    case "setwelcome": return admin.cmdSetWelcome(sock, msg, args);
    case "setleft": return admin.cmdSetLeft(sock, msg, args);
    case "welcome": return admin.cmdWelcomeToggle(sock, msg, args);
    case "left": return admin.cmdLeftToggle(sock, msg, args);
    case "teswelcome": return admin.cmdTesWelcome(sock, msg);
    case "tesleft": return admin.cmdTesLeft(sock, msg);

    // ── Admin: open/close & proses/done message setters ──
    case "setopen": return admin.cmdSetOpen(sock, msg, args);
    case "setclose": return admin.cmdSetClose(sock, msg, args);
    case "setproses": return admin.cmdSetProses(sock, msg, args);
    case "setdone": return admin.cmdSetDone(sock, msg, args);

    // ── Store ──────────────────────────────────────────────
    case "addlist": return store.cmdAddList(sock, msg, args);
    case "dellist": return store.cmdDelList(sock, msg, args);
    case "updatelist": return store.cmdUpdateList(sock, msg, args);
    case "renamelist": return store.cmdRenameList(sock, msg, args);
    case "setlist": return store.cmdSetList(sock, msg, args);
    case "resetlist": return store.cmdResetList(sock, msg);
    case "setsymbol": return store.cmdSetSymbol(sock, msg, args);
    case "open": return store.cmdOpen(sock, msg);
    case "close": return store.cmdClose(sock, msg);
    case "proses": return store.cmdProses(sock, msg, args);
    case "done": return store.cmdDone(sock, msg, args);

    default:
      break; // unknown command — silently ignore
  }
}

module.exports = { handleCommand };
