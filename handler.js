import fs from 'fs';

// Inside your message processing loop:
const LIST_FILE = './list-messages.json';
if (fs.existsSync(LIST_FILE)) {
    let list = JSON.parse(fs.readFileSync(LIST_FILE));
    if (m.text && list[m.text]) {
        let item = list[m.text];
        if (item.isMedia) {
            await conn.sendMessage(m.chat, { 
                image: { url: item.url }, 
                caption: item.text 
            });
        } else {
            await conn.reply(m.chat, item.text, m);
        }
    }
}
