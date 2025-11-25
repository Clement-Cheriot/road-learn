# 🛠️ Scripts Utilitaires RoadLearn

Ce dossier contient des scripts pour automatiser les tâches de développement.

## 📜 Scripts disponibles

### `download-piper-model.sh`
Télécharge et installe le modèle Piper TTS (fr_FR-siwis-medium).

**Usage :**
```bash
cd /Users/clementcheriot/Documents/GitHub/road-learn
./scripts/download-piper-model.sh
```

**Ce qu'il fait :**
1. Télécharge le modèle ONNX (~40MB) depuis HuggingFace
2. Télécharge le fichier de configuration JSON
3. Place les fichiers dans :
   - `public/assets/models/piper/` (web)
   - `ios/App/App/Resources/models/piper/` (iOS)
   - `android/app/src/main/assets/models/piper/` (Android)

**Après exécution :**
- Ajouter `Resources/models/piper` à Xcode (voir doc)
- Lancer `npm run build && npx cap sync`

---

## 🔜 Scripts à venir

- `generate-questions.sh` : Génération batch de questions via Claude API
- `generate-audio.sh` : Génération batch d'audio via Kyutai/Piper
- `deploy-ios.sh` : Build et upload TestFlight
- `deploy-android.sh` : Build et upload Play Store

---

## 📖 Documentation

Voir `docs/PIPER_TTS_INTEGRATION.md` pour plus de détails sur l'intégration Piper TTS.
