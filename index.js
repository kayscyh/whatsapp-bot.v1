const { execSync } = require("child_process");
const requiredModules = ["cheerio", "jimp", "link-preview-js", "audio-decode"];

for (const mod of requiredModules) {
  try {
    require.resolve(mod);
  } catch (e) {
    console.log(`\n📦 Auto-installing missing dependency: ${mod}...`);
    execSync(`npm install ${mod} --legacy-peer-deps`, { stdio: "inherit" });
    console.log(`✅ ${mod} installed successfully!\n`);
  }
}

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

if (!fs.existsSync(config.sessionFolder)) fs.mkdirSync(config.sessionFolder, { recursive: true });
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
}

async function startBot() {
  // MUST HAVE: Fetch version and load the session state
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionFolder);

  // MUST HAVE: Ask for phone number
  let phone = config.pairingPhoneNumber;
  if (config.usePairingCode && !state.creds.registered) {
    if (!phone) phone = await ask("📱 Masukkan nomor WhatsApp bot (contoh 6281234567890): ");
    phone = phone.replace(/[^0-9]/g, "");
  }

  // Create the socket connection
const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: !config.usePairingCode,
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    // ADD THESE:
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 10000,
    maxRetries: 5,
});
  // Request the Official pairing code
  if (config.usePairingCode && !state.creds.registered) {
    console.log("⏳ Menghubungkan ke server WhatsApp untuk mengambil kode...");
    setTimeout(async () => {
      try {
        // ONLY pass phone. WhatsApp generates the code securely.
        const code = await sock.requestPairingCode(phone);
        console.log(`\n🔑 Pairing Code: ${code}\nMasukkan kode ini di WhatsApp > Linked Devices > Link with phone number.\n`);
      } catch (err) {
        console.error("\n❌ Gagal request pairing code:", err.message);
      }
    }, 3000);
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

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;
      if (isJidBroadcast(msg.key.remoteJid)) continue;

      try {
        await watchAntilink(sock, msg);
        await handleCommand(sock, msg);
      } catch (err) {
        console.error("❌ Message handling error:", err.message);
      }
    }
  });

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

startBot().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
