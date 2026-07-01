const fs = require('fs');
const archiver = require('archiver');

let handler = async (m, { conn }) => {
    if (!m.isOwner) return m.reply("Fitur ini hanya untuk owner!");

    m.reply("⏳ Sedang mengompres file sistem...");

    const output = fs.createWriteStream('./backup.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
        await conn.sendMessage(m.chat, { 
            document: { url: './backup.zip' }, 
            fileName: 'full_backup.zip',
            caption: '✅ Backup lengkap berhasil dibuat!' 
        }, { quoted: m });
        fs.unlinkSync('./backup.zip');
    });

    archive.pipe(output);

    // EXPLICITLY add the directories you want
    archive.directory('./plugins/', 'plugins');
    archive.directory('./features/', 'features');
    archive.directory('./config/', 'config');
    archive.file('./index.js', { name: 'index.js' });
    archive.file('./package.json', { name: 'package.json' });
    archive.file('./list-messages.json', { name: 'list-messages.json' });
    archive.file('./list-settings.json', { name: 'list-settings.json' });

    // The directories above will NOT include node_modules or .npm 
    // because we didn't add them. 
    
    archive.finalize();
};

handler.command = ["backup"];
module.exports = {
    cmdBackup: handler
};
