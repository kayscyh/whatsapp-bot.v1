const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const LIST_FILE = './list-messages.json';
const SETTINGS_FILE = './list-settings.json';

const loadData = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
const saveData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

async function downloadMedia(msg) {
    try {
        let msgType = Object.keys(msg.message || {})[0];
        let mediaMessage = msg.message[msgType];
        let type = msgType.replace('Message', '');
        
        if (msgType === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo?.quotedMessage) {
            let quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            msgType = Object.keys(quotedMsg)[0];
            mediaMessage = quotedMsg[msgType];
            type = msgType.replace('Message', '');
        }

        if (type !== 'image') return null;

        const stream = await downloadContentFromMessage(mediaMessage, type);
        let buffer = Buffer.from([]);
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    } catch (e) {
        return null;
    }
}

async function cmdAddList(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let [key, ...res] = args.join(" ").split("@");
    key = key?.trim();
    let response = res.join("@").trim();
    
    let mediaBuffer = await downloadMedia(msg);
    let imgUrl = "";
    
    if (mediaBuffer) {
        const form = new FormData();
        form.append('image', mediaBuffer, 'image.jpg');
        try {
            let res = await axios.post(`https://api.imgbb.com/1/upload?key=2131a9e7ba72e1452797a3f57daf22f9`, form, { headers: form.getHeaders() });
            imgUrl = res.data.data.url;
        } catch (err) {
            return sock.sendMessage(jid, { text: "❌ Gagal upload gambar ke ImgBB." }, { quoted: msg });
        }
    }
    
    if (!key || (!response && !imgUrl)) return sock.sendMessage(jid, { text: "❌ Format: .addlist kunci@respon" }, { quoted: msg });
    
    let list = loadData(LIST_FILE);
    list[key] = { text: response, url: imgUrl, isMedia: !!imgUrl };
    saveData(LIST_FILE, list);
    
    return sock.sendMessage(jid, { text: `✅ Sukses menambahkan list: ${key}` }, { quoted: msg });
}

async function cmdDelList(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let key = args.join(" ").trim();
    let list = loadData(LIST_FILE);
    
    if (!list[key]) return sock.sendMessage(jid, { text: "❌ Key tidak ditemukan!" }, { quoted: msg });
    delete list[key];
    saveData(LIST_FILE, list);
    return sock.sendMessage(jid, { text: `✅ Sukses menghapus list: ${key}` }, { quoted: msg });
}

async function cmdUpdateList(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let [key, ...res] = args.join(" ").split("@");
    key = key?.trim();
    let response = res.join("@").trim();
    
    let list = loadData(LIST_FILE);
    if (!list[key]) return sock.sendMessage(jid, { text: "❌ Key tidak ditemukan!" }, { quoted: msg });

    let mediaBuffer = await downloadMedia(msg);
    let imgUrl = list[key].url; 
    
    if (mediaBuffer) {
        const form = new FormData();
        form.append('image', mediaBuffer, 'image.jpg');
        try {
            let res = await axios.post(`https://api.imgbb.com/1/upload?key=YOUR_IMGBB_API_KEY`, form, { headers: form.getHeaders() });
            imgUrl = res.data.data.url;
        } catch (err) {}
    }
    
    list[key] = { text: response || list[key].text, url: imgUrl, isMedia: !!imgUrl };
    saveData(LIST_FILE, list);
    return sock.sendMessage(jid, { text: `✅ Sukses update list: ${key}` }, { quoted: msg });
}

async function cmdRenameList(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let [oldKey, newKey] = args.join(" ").split("@");
    oldKey = oldKey?.trim();
    newKey = newKey?.trim();

    if (!oldKey || !newKey) return sock.sendMessage(jid, { text: "❌ Format: .renamelist namalama@namabaru" }, { quoted: msg });

    let list = loadData(LIST_FILE);
    if (!list[oldKey]) return sock.sendMessage(jid, { text: "❌ Key lama tidak ditemukan!" }, { quoted: msg });

    list[newKey] = list[oldKey];
    delete list[oldKey];
    saveData(LIST_FILE, list);

    return sock.sendMessage(jid, { text: `✅ Sukses merubah nama list ${oldKey} menjadi ${newKey}` }, { quoted: msg });
}

async function cmdSetList(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let input = args.join(" ");
    
    // Using # as the separator
    const SEPARATOR = "#"; 
    
    if (!input.includes(SEPARATOR)) {
        return sock.sendMessage(jid, { 
            text: `❌ Format salah. Gunakan: .setlist Header ${SEPARATOR} Footer\n\nContoh: .setlist 🛒 MENU KAMI # ✨ Silahkan pilih!` 
        }, { quoted: msg });
    }
    
    // Split using the # separator
    let parts = input.split(SEPARATOR);
    let head = parts[0];
    let foot = parts[1];
    
    let settings = loadData(SETTINGS_FILE);
    
    // Save without trimming to preserve your emojis and spacing
    settings.header = head;
    settings.footer = foot;
    
    saveData(SETTINGS_FILE, settings);
    
    return sock.sendMessage(jid, { 
        text: `✅ List template updated successfully!` 
    }, { quoted: msg });
}

async function cmdSetSymbol(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let settings = loadData(SETTINGS_FILE);
    
    // Join args and preserve original spaces instead of taking just args[0]
    let newSymbol = args.join(" ");
    if (!newSymbol) newSymbol = "•";
    
    settings.symbol = newSymbol;
    saveData(SETTINGS_FILE, settings);
    return sock.sendMessage(jid, { text: `✅ Symbol set to: '${settings.symbol}'` }, { quoted: msg });
}

async function cmdList(sock, msg) {
    const jid = msg.key.remoteJid;
    let list = loadData(LIST_FILE);
    let settings = loadData(SETTINGS_FILE);
    settings.symbol = settings.symbol || "•";
    settings.header = settings.header || "This is the list :";
    settings.footer = settings.footer || "There you go!";

    let keys = Object.keys(list);
    if (keys.length === 0) return sock.sendMessage(jid, { text: "List masih kosong." }, { quoted: msg });
    let items = keys.map(k => `${settings.symbol} ${k}`).join('\n');
    return sock.sendMessage(jid, { text: `${settings.header}\n${items}\n${settings.footer}` }, { quoted: msg });
}

async function cmdResetList(sock, msg) {
    const jid = msg.key.remoteJid;
    saveData(LIST_FILE, {});
    return sock.sendMessage(jid, { text: "✅ Semua list telah dihapus (Reset)." }, { quoted: msg });
}

async function cmdOpen(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.groupSettingUpdate(jid, 'not_announcement');
    return sock.sendMessage(jid, { text: "✅ Grup telah dibuka, semua anggota dapat mengirim pesan." }, { quoted: msg });
}

async function cmdClose(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.groupSettingUpdate(jid, 'announcement');
    return sock.sendMessage(jid, { text: "✅ Grup telah ditutup, hanya admin yang dapat mengirim pesan." }, { quoted: msg });
}

async function cmdProses(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let note = args.join(" ") || "Pesanan sedang diproses...";
    return sock.sendMessage(jid, { text: `⏳ *PROSES*\n\nCatatan: ${note}` }, { quoted: msg });
}

async function cmdDone(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let note = args.join(" ") || "Terima kasih!";
    return sock.sendMessage(jid, { text: `✅ *DONE*\n\nPesanan telah selesai.\nCatatan: ${note}` }, { quoted: msg });
}

module.exports = {
    cmdAddList,
    cmdDelList,
    cmdUpdateList,
    cmdRenameList,
    cmdSetList,
    cmdSetSymbol,
    cmdList,
    cmdResetList,
    cmdOpen,
    cmdClose,
    cmdProses,
    cmdDone
};
