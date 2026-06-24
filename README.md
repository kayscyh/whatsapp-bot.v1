# ANAXAGORAS — V1

A modular WhatsApp bot built with [Baileys](https://github.com/WhiskeySockets/Baileys). No native/compiled dependencies — runs cleanly on Termux, VPS, or any Node.js 18+ environment.

## Project Structure

```
anaxa-v1/
├── index.js                   # Entry point — connection, event listeners
├── config/
│   ├── config.js              # Bot identity, owner numbers, defaults
│   ├── database.js            # JSON-based persistent storage
├── features/
│   ├── permissions.js         # owner / admin / sewa checks
│   ├── menu.js                 # .allmenu command + template renderer
│   ├── ownerCommands.js        # Owner-only commands
│   ├── adminCommands.js        # Group-admin commands
│   ├── storeCommands.js        # Store/list commands
│   ├── antilink.js             # antilink toggle + message watcher
│   ├── welcomeWatcher.js       # join/leave event handler
│   └── commandRouter.js       # Dispatches commands + permission gating
├── data/
│   └── database.json          # auto-created on first run
├── assets/
│   └── allmenu.jpg             # optional — picture shown with .allmenu
└── session/                   # auto-created — WhatsApp login session
```

## Setup (any platform)

```bash
npm install
npm start
```

On first run, scan the QR code shown in the terminal with WhatsApp → Linked Devices.

## Setup on Termux

```bash
bash install-termux.sh
npm start
```

The installer:
- Updates Termux packages
- Installs `nodejs-lts` and `git`
- Runs `npm install`

**Keeping it running in the background:**
```bash
pkg install -y tmux
tmux new -s anaxa
npm start
# detach: Ctrl+B then D
# reattach later: tmux attach -t anaxa
```

**Login without scanning a QR code (pairing code):**
Edit `config/config.js`:
```js
usePairingCode: true,
pairingPhoneNumber: "6281234567890", // your bot's WhatsApp number, no +
```
On startup the terminal will print a pairing code — enter it in WhatsApp under *Linked Devices → Link with phone number*.

## Configuration

Edit `config/config.js`:
- `ownerNumbers` — your number(s), no `+`, no `@s.whatsapp.net`
- `developer` — shown in the `@developer` placeholder in `.allmenu`
- `prefix` — command prefix (default `.`)
- `allMenuPicture` — path to an image shown with `.allmenu`; set to `""` or `null` for text-only
- `defaultSewaDays` — default rental length used by `.addsewa` when no day count is given

## Permission Model

- **Owner commands** (ping, backup, joingc, addsewa, listsewa, delsewa, leftnosewa, upsw, upswgc, delsw, uptesti, creategrup, setppbot, setbot) — usable only by numbers listed in `ownerNumbers`.
- **Admin commands** (group management, antilink, welcome/left, store/list management, open/close, proses/done) — usable by group admins or the owner, **and only in groups with an active "sewa" (rental) entry** added via `.addsewa`. The owner is exempt from the sewa check.
- `.allmenu` is open to everyone.

## Notes on a few commands

A handful of command names in your spec didn't have an explicit description, so here's what was implemented — adjust the code in `features/ownerCommands.js` if you intended something different:
- `upsw` — reply to an image/video with `.upsw <caption>` to post it to the bot's WhatsApp Status.
- `upswgc` — same as `upsw`, but also sends the same media into the current chat/group.
- `delsw` — deletes the most recently posted status.
- `uptesti` — reply to any message with `.uptesti` to save it into the testimonials list (`data/database.json`).
- `setbot` — updates the bot's WhatsApp profile name.

## Disclaimer

Automating a personal WhatsApp account this way is against WhatsApp's Terms of Service and accounts can be banned. Use a secondary/test number, not your primary one.
