// ╔══════════════════════════════════════════════════════════╗
// ║          ANAXAGORAS — V1  ·  Configuration                ║
// ╚══════════════════════════════════════════════════════════╝

module.exports = {
  // ── Bot Identity ─────────────────────────────────────────
  botName: "ANAXAGORAS",
  botVersion: "V1",
  developer: "Anaxa Dev",          // shown as @developer in allmenu
  prefix: ".",                      // command prefix, e.g. .allmenu

  // Owner numbers WITHOUT "+" and WITHOUT "@s.whatsapp.net"
  // e.g. "6281234567890"
  ownerNumbers: ["628xxxxxxxxxx"],

  // ── Login Method ─────────────────────────────────────────
  // QR code works fine in Termux as long as the terminal font
  // renders unicode blocks. If you prefer logging in by phone
  // number instead of scanning a QR, set usePairingCode: true
  // and fill in pairingPhoneNumber below.
  usePairingCode: false,
  pairingPhoneNumber: "",          // e.g. "6281234567890" (no +)

  // ── Session / Data Paths ─────────────────────────────────
  sessionFolder: "./session",
  databaseFile: "./data/database.json",

  // ── All Menu Picture ─────────────────────────────────────
  // Path to an image shown with the allmenu command.
  // Set to null or "" to send allmenu as text only (no image).
  allMenuPicture: "./assets/allmenu.jpg",

  // ── Store Defaults ───────────────────────────────────────
  storeSymbol: "⪩ˋ",

  // ── Sewa (Rental) System ─────────────────────────────────
  defaultSewaDays: 30,

  // ── Default fallback messages (per-group messages override these) ─
  defaults: {
    welcomeMessage: "「 𝗦𝗖𝗢𝗩𝗗𝗤 」\nSelamat datang @user di grup ini! 👋",
    leftMessage: "「 𝗦𝗖𝗢𝗦𝗦 」\n@user telah meninggalkan grup. 👋",
    openMessage: "🟢 Toko sekarang *BUKA*! Silahkan order~",
    closeMessage: "🔴 Toko sekarang *TUTUP*. Terima kasih sudah mampir!",
    statusProses: "🔄 Pesanan kamu sedang *diproses*...",
    statusDone: "✅ Pesanan kamu sudah *selesai* dan siap!",
  },
};
