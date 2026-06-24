#!/bin/bash
echo "🧹 Cleaning up..."
rm -rf node_modules package-lock.json session .cache
npm cache clean --force

echo "📦 Reinstalling..."
npm install

echo "🔄 Updating Baileys..."
npm install @whiskeysockets/baileys@latest

echo "✅ Done! Run 'npm start' to start fresh"
