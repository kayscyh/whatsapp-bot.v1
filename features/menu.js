// ╔══════════════════════════════════════════════════════════╗
// ║          ANAXAGORAS — V1  ·  All Menu Feature              ║
// ╚══════════════════════════════════════════════════════════╝
//
// The header line ("ANAXAGORAS — V1", "bot is active", "date & time",
// "developer", "ALL MENU BOT") is rendered in Mathematical Sans-Bold
// Unicode. Rather than hand-typing those glyphs (high-codepoint
// surrogate pairs are extremely easy to mistype/garble), we convert
// plain ASCII -> Sans-Bold programmatically. This guarantees the
// output is always valid, correctly-encoded text.

const fs = require("fs");
const config = require("../config/config");
const { isOwner } = require("./permissions");

// ── ASCII → Mathematical Sans-Serif Bold converter ───────────
function boldSans(str) {
  return str
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d5d4 + (code - 65)); // A-Z
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d5ee + (code - 97)); // a-z
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ec + (code - 48)); // 0-9
      return ch;
    })
    .join("");
}

// ── Date formatting (Indonesian) ─────────────────────────────
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// ── Static menu body (plain text, copied verbatim) ───────────
const OWNER_MENU = `
╭──〔  Owner Menu  〕•••
│⪩ˋ  ping
│⪩ˋ  backup
│⪩ˋ  joingc
│⪩ˋ  addsewa
│⪩ˋ  listsewa
│⪩ˋ  delsewa
│⪩ˋ  leftnosewa
│⪩ˋ  upswgc
│⪩ˋ  upsw
│⪩ˋ  delsw
│⪩ˋ  uptesti
│⪩ˋ  creategrup
│⪩ˋ  setppbot
│⪩ˋ  setbot
╰──────────── •••`.trim();

const ADMIN_MENU = `
╭───〔 Admin Menu 〕•••
│⪩ˋ  add
│⪩ˋ  addadmin
│⪩ˋ  antilink
│⪩ˋ  antilinkkick
│⪩ˋ  del
│⪩ˋ  hidetag (h)
│⪩ˋ  kick
│⪩ˋ  listadmin
│⪩ˋ  mute
│⪩ˋ  unmute
│⪩ˋ  linkgc
│⪩ˋ  resetlinkgc
│⪩ˋ  setwelcome / setleft
│⪩ˋ  welcome on/off
│⪩ˋ  left on/off
│⪩ˋ  teswelcome / tesleft
│⪩ˋ  setopen / setclose
│⪩ˋ  setproses / setdone
│⪩ˋ  setppgc
╰──────────── •••`.trim();

const STORE_MENU = `
╭─── 〔 Store Menu 〕•••
│⪩ˋ  addlist
│⪩ˋ  dellist
│⪩ˋ  updatelist
│⪩ˋ  renamelist
│⪩ˋ  open / close
│⪩ˋ  proses / done
│⪩ˋ  setlist
│⪩ˋ  resetlist
│⪩ˋ  setsymbol
╰──────────── •••`.trim();

// ── Build the full menu text ──────────────────────────────────
function buildMenu(senderJid, senderIsOwner) {
  const now = new Date();
  const day = DAYS[now.getDay()];
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  const senderNumber = senderJid.split("@")[0].split(":")[0];
  const role = senderIsOwner ? "Owner" : "User";

  const header = [
    boldSans(`${config.botName} `) + "— " + boldSans(config.botVersion),
    `「 ${boldSans("bot is active")} — @${senderNumber} as ${role} 」`,
    `「」${boldSans("date & time")}  ::  ${day} ${month} ${year}`,
    `「」${boldSans("developer")}  ::  ${config.developer}`,
    `──── ${boldSans("ALL MENU BOT")} ───── •••`,
  ].join("\n");

  return [header, OWNER_MENU, ADMIN_MENU, STORE_MENU].join("\n\n");
}

// ── Command handler: .allmenu ──────────────────────────────────
async function handleAllMenu(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderIsOwner = isOwner(sender);

  const caption = buildMenu(sender, senderIsOwner);
  const picPath = config.allMenuPicture;
  const hasPic = picPath && fs.existsSync(picPath);

  if (hasPic) {
    const image = fs.readFileSync(picPath);
    await sock.sendMessage(jid, {
      image,
      caption,
      mimetype: "image/jpeg",
      mentions: [sender],
    });
  } else {
    await sock.sendMessage(jid, { text: caption, mentions: [sender] });
  }
}

module.exports = { handleAllMenu, buildMenu, boldSans };
