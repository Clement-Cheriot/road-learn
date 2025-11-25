#!/bin/bash

# 🎙️ Script de téléchargement du modèle Piper TTS
# Usage : ./scripts/download-piper-model.sh

set -e

echo "🎙️ Téléchargement du modèle Piper TTS pour RoadLearn"
echo ""

# URLs des fichiers
MODEL_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx"
CONFIG_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json"

# Dossiers de destination
PUBLIC_DIR="public/assets/models/piper"
IOS_DIR="ios/App/App/Resources/models/piper"
ANDROID_DIR="android/app/src/main/assets/models/piper"

# Créer les dossiers
echo "📁 Création des dossiers..."
mkdir -p "$PUBLIC_DIR"
mkdir -p "$IOS_DIR"
mkdir -p "$ANDROID_DIR"

# Télécharger le modèle
echo ""
echo "📥 Téléchargement du modèle ONNX (~40MB)..."
curl -L --progress-bar "$MODEL_URL" -o "$PUBLIC_DIR/fr_FR-siwis-medium.onnx"

echo ""
echo "📥 Téléchargement de la configuration JSON..."
curl -L --progress-bar "$CONFIG_URL" -o "$PUBLIC_DIR/fr_FR-siwis-medium.onnx.json"

# Vérifier la taille du modèle
MODEL_SIZE=$(du -h "$PUBLIC_DIR/fr_FR-siwis-medium.onnx" | cut -f1)
echo ""
echo "✅ Modèle téléchargé : $MODEL_SIZE"

# Copier dans les assets natifs
echo ""
echo "📋 Copie dans les assets iOS..."
cp "$PUBLIC_DIR"/* "$IOS_DIR/"

echo "📋 Copie dans les assets Android..."
cp "$PUBLIC_DIR"/* "$ANDROID_DIR/"

echo ""
echo "✅ Installation terminée !"
echo ""
echo "⚠️  Actions requises :"
echo "   1. iOS : Ajouter Resources/models/piper à Xcode"
echo "      → npx cap open ios"
echo "      → Clic droit sur 'App' → Add Files to 'App'"
echo "      → Sélectionner Resources/models/piper"
echo "      → Cocher 'Create folder references'"
echo ""
echo "   2. Rebuild & Sync :"
echo "      → npm run build"
echo "      → npx cap sync"
echo ""
echo "🎯 Documentation : docs/PIPER_TTS_INTEGRATION.md"
