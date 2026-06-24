const fs = require("fs");
const path = require("path");
const config = require("../config/config");
const db = require("../config/database");

async function cmdPing(sock, msg) {
  const jid = msg.key.remoteJid;
  const start = Date.now();
  const sent = await sock.sendMessage(jid, { text: "🏓 Pong..." });
  const latency = Date.now() - start;
  await sock.sendMessage(jid, { text: `🏓 Pong! ${latency}ms` }, { quoted: sent });
}

async function cmdBackup(sock, msg) {
  const jid = msg.key.remoteJid;
  const dbPath = path.join(__dirname, "..", config.databaseFile.replace(/^\.\//, ""));
  if (!fs.existsSync(dbPath)) return sock.sendMessage(jid, { text: "❌ Database tidak ditemukan." });

  await sock.sendMessage(jid, {
    document: fs.readFileSync(dbPath),
    fileName: `anaxa-backup-${Date.now()}.json`,
    mimetype: "application/json",
    caption: "📦 Backup database berhasil dibuat.",
  });
}

async function cmdJoinGc(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const link = args[0];
  if (!link) return sock.sendMessage(jid, { text: "❌ Format: .joingc <link_grup>" });

  const match = link.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
  const code = match ? match[1] : link;

  try {
    await sock.groupAcceptInvite(code);
    await sock.sendMessage(jid, { text: "✅ Berhasil join ke grup." });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal join grup: ${err.message}` });
  }
}

async function cmdAddSewa(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const isGroupCtx = jid.endsWith("@g.us");
  let targetJid = isGroupCtx ? jid : args.find((a) => a.includes("@g.us"));
  let days = args.find((a) => /^\d+$/.test(a));
  days = days ? parseInt(days, 10) : config.defaultSewaDays;

  if (!targetJid) {
    return sock.sendMessage(jid, {
      text: "❌ Jalankan di dalam grup, atau format: .addsewa <groupJid> <jumlah_hari>",
    });
  }

  const now = Date.now();
  const existing = db.getSewa(targetJid);
  const base = existing && new Date(existing.expiresAt).getTime() > now ? new Date(existing.expiresAt).getTime() : now;
  const expiresAt = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

  db.setSewa(targetJid, { activatedAt: new Date().toISOString(), expiresAt });
  await sock.sendMessage(jid, {
    text: `✅ Sewa grup berhasil diaktifkan/diperpanjang.\n📅 Berlaku sampai: ${new Date(expiresAt).toLocaleString("id-ID")}`,
  });
}

async function cmdListSewa(sock, msg) {
  const jid = msg.key.remoteJid;
  const sewaData = db.listSewa();
  const entries = Object.entries(sewaData);

  if (!entries.length) return sock.sendMessage(jid, { text: "📋 Belum ada grup yang disewa." });

  let text = "📋 *Daftar Sewa Grup*\n\n";
  for (const [gJid, entry] of entries) {
    const active = new Date(entry.expiresAt).getTime() > Date.now();
    text += `• ${gJid}\n   Status: ${active ? "🟢 Aktif" : "🔴 Expired"}\n   Berakhir: ${new Date(entry.expiresAt).toLocaleString("id-ID")}\n\n`;
  }
  await sock.sendMessage(jid, { text: text.trim() });
}

async function cmdDelSewa(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const targetJid = jid.endsWith("@g.us") ? jid : args[0];
  if (!targetJid) return sock.sendMessage(jid, { text: "❌ Format: .delsewa <groupJid> (atau jalankan di dalam grup)" });

  db.delSewa(targetJid);
  await sock.sendMessage(jid, { text: `🗑️ Sewa untuk grup ${targetJid} berhasil dihapus.` });
}

async function cmdLeftNoSewa(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    const allGroups = await sock.groupFetchAllParticipating();
    const groupJids = Object.keys(allGroups);
    let leftCount = 0;

    for (const gJid of groupJids) {
      if (!db.isSewaActive(gJid)) {
        await sock.groupLeave(gJid);
        leftCount++;
      }
    }
    await sock.sendMessage(jid, { text: `✅ Bot keluar dari ${leftCount} grup yang tidak/sudah tidak disewa.` });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` });
  }
}

async function cmdUploadStatus(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
    return sock.sendMessage(jid, { text: "❌ Reply gambar/video yang ingin diupload ke status dengan caption .upsw" });
  }

  const { downloadMediaMessage } = require("@whiskeysockets/baileys");
  const quotedKey = msg.message.extendedTextMessage.contextInfo;
  const fakeMsg = { key: { remoteJid: jid, id: quotedKey.stanzaId, participant: quotedKey.participant }, message: quoted };

  try {
    const buffer = await downloadMediaMessage(fakeMsg, "buffer", {});
    const isVideo = !!quoted.videoMessage;
    const caption = args.join(" ") || "";

    const sent = await sock.sendMessage("status@broadcast", isVideo
      ? { video: buffer, caption }
      : { image: buffer, caption });

    db.setLastStatusKey(sent.key);
    await sock.sendMessage(jid, { text: "✅ Berhasil diupload ke status WhatsApp bot." });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal upload status: ${err.message}` });
  }
}

async function cmdUploadStatusToGroup(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
    return sock.sendMessage(jid, { text: "❌ Reply gambar/video yang ingin diupload dengan caption .upswgc" });
  }

  const { downloadMediaMessage } = require("@whiskeysockets/baileys");
  const quotedKey = msg.message.extendedTextMessage.contextInfo;
  const fakeMsg = { key: { remoteJid: jid, id: quotedKey.stanzaId, participant: quotedKey.participant }, message: quoted };

  try {
    const buffer = await downloadMediaMessage(fakeMsg, "buffer", {});
    const isVideo = !!quoted.videoMessage;
    const caption = args.join(" ") || "";

    const sent = await sock.sendMessage("status@broadcast", isVideo
      ? { video: buffer, caption }
      : { image: buffer, caption });
    db.setLastStatusKey(sent.key);

    await sock.sendMessage(jid, isVideo ? { video: buffer, caption } : { image: buffer, caption });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` });
  }
}

async function cmdDeleteStatus(sock, msg) {
  const jid = msg.key.remoteJid;
  const key = db.getLastStatusKey();
  if (!key) return sock.sendMessage(jid, { text: "❌ Tidak ada status yang tercatat untuk dihapus." });

  try {
    await sock.sendMessage("status@broadcast", { delete: key });
    db.setLastStatusKey(null);
    await sock.sendMessage(jid, { text: "✅ Status berhasil dihapus." });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal hapus status: ${err.message}` });
  }
}

async function cmdUploadTestimonial(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  
  if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
    return sock.sendMessage(jid, { text: "❌ Reply gambar/video testimoni dengan caption .uptesti" });
  }

  if (!config.testiChannelJid) {
    return sock.sendMessage(jid, { text: "❌ Channel testi belum di-set di config.js!" });
  }

  const { downloadMediaMessage } = require("@whiskeysockets/baileys");
  const ctx = msg.message.extendedTextMessage.contextInfo;
  const fakeMsg = { key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant }, message: quoted };

  try {
    const buffer = await downloadMediaMessage(fakeMsg, "buffer", {});
    const isVideo = !!quoted.videoMessage;
    
    let caption = args.join(" ");
    if (!caption) {
      caption = isVideo ? (quoted.videoMessage.caption || "") : (quoted.imageMessage.caption || "");
    }

    await sock.sendMessage(config.testiChannelJid, isVideo 
      ? { video: buffer, caption } 
      : { image: buffer, caption }
    );
    
    await sock.sendMessage(jid, { text: "✅ Testimoni berhasil dikirim ke channel." });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal kirim testimoni: ${err.message}` });
  }
}

async function cmdCreateGroup(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const parts = args.join(" ").split("|").map((p) => p.trim());
  const title = parts[0];
  if (!title) return sock.sendMessage(jid, { text: "❌ Format: .creategrup <judul> | <no1>,<no2>,..." });

  const numbers = (parts[1] || "").split(",").map((n) => n.trim().replace(/[^0-9]/g, "")).filter(Boolean);
  const participants = numbers.map((n) => `${n}@s.whatsapp.net`);

  try {
    const group = await sock.groupCreate(title, participants);
    await sock.sendMessage(jid, { text: `✅ Grup *${title}* berhasil dibuat.\nID: ${group.id}` });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal buat grup: ${err.message}` });
  }
}

async function cmdSetBotPicture(sock, msg) {
  const jid = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted?.imageMessage) return sock.sendMessage(jid, { text: "❌ Reply gambar dengan caption .setppbot" });

  const { downloadMediaMessage } = require("@whiskeysockets/baileys");
  const ctx = msg.message.extendedTextMessage.contextInfo;
  const fakeMsg = { key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant }, message: quoted };

  try {
    const buffer = await downloadMediaMessage(fakeMsg, "buffer", {});
    await sock.updateProfilePicture(sock.user.id, buffer);
    await sock.sendMessage(jid, { text: "✅ Foto profil bot berhasil diubah." });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Gagal ubah foto profil: ${err.message}` });
  }
}

async function cmdSetBotResponse(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const text = args.join(" ").trim();
  
  if (!text) return sock.sendMessage(jid, { text: "❌ Format: .setbot <pesan_balasan_baru>" });

  db.setBotResponse(text);
  await sock.sendMessage(jid, { text: `✅ Balasan bot berhasil diubah menjadi:\n\n"${text}"` });
}

module.exports = {
  cmdPing,
  cmdBackup,
  cmdJoinGc,
  cmdAddSewa,
  cmdListSewa,
  cmdDelSewa,
  cmdLeftNoSewa,
  cmdUploadStatus,
  cmdUploadStatusToGroup,
  cmdDeleteStatus,
  cmdUploadTestimonial,
  cmdCreateGroup,
  cmdSetBotPicture,
  cmdSetBotResponse,
};
