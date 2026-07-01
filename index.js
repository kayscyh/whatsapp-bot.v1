const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const readline = require("readline");
const config = require("./config/config");
const { handleCommand } = require("./features/commandRouter");

// Helper to ask for phone number in terminal
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  // Ask for phone number if not registered
  let phone = config.pairingPhoneNumber;
  if (config.usePairingCode && !state.creds.registered) {
    if (!phone) phone = await ask("📱 Masukkan nomor WhatsApp bot (contoh 6281234567890): ");
    phone = phone.replace(/[^0-9]/g, "");
  }

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: !config.usePairingCode,
    auth: state,
    browser: Browsers.ubuntu("Chrome"),
  });

  // Request the pairing code
  if (config.usePairingCode && !state.creds.registered) {
    console.log("⏳ Menghubungkan ke server WhatsApp untuk mengambil kode...");
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phone);
        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`\n🔑 Pairing Code: ${formattedCode}\nMasukkan kode ini di WhatsApp > Linked Devices > Link with phone number.\n`);
      } catch (err) {
        console.error("\n❌ Gagal request pairing code:", err.message);
      }
    }, 3000);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    if (update.connection === "open") console.log("✅ Bot connected successfully!");
    if (update.connection === "close") {
      const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== 401;
      if (shouldReconnect) startBot();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      
      // LID-Safe Owner Check
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const senderNumber = senderJid.split("@")[0].replace(/[^0-9]/g, "");
      const isOwner = config.ownerNumbers.includes(senderNumber);

      try {
        await handleCommand(sock, msg, isOwner);
      } catch (err) {
        console.error("❌ Error processing message:", err.message);
      }
    }
  });
}

startBot().catch(err => console.error(err));
