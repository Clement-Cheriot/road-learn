#!/bin/bash

# Script de téléchargement des modèles Sherpa-ONNX pour Road Learn
# TTS français + STT français + VAD

echo "📦 Téléchargement des modèles Sherpa-ONNX..."

# Créer le dossier des modèles
mkdir -p public/models
cd public/models

echo ""
echo "🎤 1/3 - Téléchargement modèle TTS français (Piper - Voix féminine siwis)"
curl -L -O https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-fr_FR-siwis-medium.tar.bz2
tar xf vits-piper-fr_FR-siwis-medium.tar.bz2
rm vits-piper-fr_FR-siwis-medium.tar.bz2
echo "✅ Modèle TTS téléchargé"

echo ""
echo "🎧 2/3 - Téléchargement modèle STT français (Zipformer)"
curl -L -O https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-fr-2023-04-14.tar.bz2
tar xf sherpa-onnx-streaming-zipformer-fr-2023-04-14.tar.bz2
rm sherpa-onnx-streaming-zipformer-fr-2023-04-14.tar.bz2
echo "✅ Modèle STT téléchargé"

echo ""
echo "📻 3/3 - Téléchargement modèle VAD (Silero)"
curl -L -O https://github.com/k2-fsa/sherpa-onnx/releases/download/vad-models/silero_vad.onnx
echo "✅ Modèle VAD téléchargé"

echo ""
echo "🎉 Tous les modèles sont téléchargés !"
echo ""
echo "📂 Modèles disponibles :"
ls -lh

echo ""
echo "📊 Taille totale :"
du -sh .

cd ../..
