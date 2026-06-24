#!/data/data/com.termux/files/usr/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║       ANAXAGORAS — V1  ·  Termux Installer                 ║
# ╚══════════════════════════════════════════════════════════╝
# Run with: bash install-termux.sh

set -e

echo "📦 Updating Termux packages..."
pkg update -y && pkg upgrade -y

echo "📦 Installing Node.js LTS and git..."
pkg install -y nodejs-lts git

echo "🔓 Granting storage permission (allow the popup if it appears)..."
termux-setup-storage || true

echo "📦 Installing npm dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo "👉 Edit config/config.js to set your owner number and developer name."
echo "👉 Then run the bot with:  npm start"
echo "   (or: node index.js)"
echo ""
echo "💡 Tip: To keep the bot running after closing Termux, use:"
echo "   pkg install -y tmux  &&  tmux new -s anaxa  &&  npm start"
echo "   (detach with Ctrl+B then D, reattach later with: tmux attach -t anaxa)"
