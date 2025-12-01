# 📊 RoadLearn - État des lieux (01/12/2024)

## ✅ TERMINÉ

### Audio/TTS
- [x] Migration Piper → Kokoro TTS (StyleTTS2, voix ff_siwis)
- [x] Plugin Swift natif avec cache thread-safe
- [x] Session audio persistante (délai PLAY→START éliminé)
- [x] ~110 corrections phonétiques (noms anglais, chiffres romains, liaisons)
- [x] Outils CLI : phonetic-tester.cjs, test-all-corrections.cjs
- [x] Lab Prosodie avec champ test libre + affichage phonétique

### Architecture
- [x] Mode "talkie-walkie" (micro OFF pendant TTS, ON après)
- [x] AudioManager singleton centralisé
- [x] GlobalVoiceController pour navigation vocale
- [x] Quiz.tsx avec cycle vocal complet

### Bugs Kokoro documentés
- [x] "commencé" → "démarré" (workaround)
- [x] Troncation consonnes finales (padding)
- [x] Mots anglais (corrections phonétiques)

## 🔄 EN COURS

### UI - Prochaine session
- [ ] Refonte Index.tsx (hub sans scroll)
- [ ] Supprimer Test VAD
- [ ] Logo + Titre même ligne
- [ ] Catégories en liste compacte
- [ ] Quiz Mixte → Page niveaux → Quiz

## 📁 DOCUMENTS À UPLOADER

Dans le projet Claude, uploader :
1. `docs/ARCHITECTURE.md` - Architecture technique
2. `docs/UI_SPECS.md` - Specs UI prochaine session  
3. `docs/INSTRUCTIONS_CLAUDE.md` - Instructions workflow

## 🎯 PROCHAINES ÉTAPES

1. **UI Hub** : Refonte Index.tsx selon specs
2. **Quiz Mixte** : Ajouter sélection niveau avant quiz
3. **Harmonisation** : LevelSelect.tsx même style
4. **Nettoyage** : Supprimer code VAD inutilisé
