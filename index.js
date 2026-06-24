// ╔══════════════════════════════════════════════════════════╗
// ║                ANAXAGORAS — V1                              ║
// ║         WhatsApp Bot · Termux-Compatible Build              ║
// ║         Built with @whiskeysockets/baileys                  ║
// ╚══════════════════════════════════════════════════════════╝

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const readline = require("readline");
const config = require("./config/config");
const { handleCommand } = require("./features/commandRouter");
const { handleGroupJoin, handleGroupLeave } = require("./features/welcomeWatcher");
const { watchAntilink } = require("./features/antilink");

// ── Ensure required folders/files exist ───────────────────────
if (!fs.existsSync(config.sessionFolder)) fs.mkdirSync(config.sessionFolder, { recursive: true });
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
}

// ── Main bot bootstrap ─────────────────────────────────────────
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionFolder);

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: !config.usePairingCode,
    auth: state,
    browser: [config.botName, "Chrome", "1.0.0"],
  });

  // ── Pairing code login (alternative to QR — handy on Termux) ──
  if (config.usePairingCode && !state.creds.registered) {
    let phone = config.pairingPhoneNumber;
    if (!phone) phone = await ask("📱 Masukkan nomor WhatsApp bot (contoh 6281234567890): ");
    phone = phone.replace(/[^0-9]/g, "");
    const code = await sock.requestPairingCode(phone);
    console.log(`\n🔑 Pairing Code: ${code}\nMasukkan kode ini di WhatsApp > Linked Devices > Link with phone number.\n`);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log(`\n✅ ${config.botName} ${config.botVersion} connected successfully!`);
      console.log(`📌 Prefix: ${config.prefix}`);
      console.log(`📋 Type ${config.prefix}allmenu to see all commands\n`);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`⚠️  Connection closed (code: ${code}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) startBot();
      else console.log("🔒 Logged out. Delete the session folder and restart to log in again.");
    }
  });

  // ── Incoming messages ──────────────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;
      if (isJidBroadcast(msg.key.remoteJid)) continue;

      try {
        await watchAntilink(sock, msg);   // passive watcher, runs on every message
        await handleCommand(sock, msg);   // prefix-based command dispatch
      } catch (err) {
        console.error("❌ Message handling error:", err.message);
      }
    }
  });

  // ── Group participant updates (welcome/left) ────────────────────
  sock.ev.on("group-participants.update", async (update) => {
    try {
      if (update.action === "add") await handleGroupJoin(sock, update);
      if (update.action === "remove") await handleGroupLeave(sock, update);
    } catch (err) {
      console.error("❌ Group event error:", err.message);
    }
  });

  return sock;
}

// ── Boot ────────────────────────────────────────────────────────
startBot().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
