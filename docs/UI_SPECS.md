# 🎨 RoadLearn - Specs UI (Prochaine session)

## Objectif
Refonte complète de la page Index.tsx (hub principal) et harmonisation UI.

## Page Index.tsx - Hub Principal

### Contraintes
- **Tout visible sans scroll** sur iPhone (pas de défilement)
- **Boutons assez gros** (touch-friendly pour conduite)
- **Reste compact** (titres, textes secondaires plus petits)

### Layout cible
```
┌─────────────────────────────┐
│ [Logo] RoadLearn            │  ← Même ligne, compact
├─────────────────────────────┤
│                             │
│  🎲 Quiz Mixte              │  ← Bouton principal
│                             │
│  📚 Catégories :            │
│  • Histoire                 │
│  • Géographie               │  ← Liste compacte
│  • Sciences                 │  (pas de gros rectangles)
│  • Culture Générale         │
│  • Bac                      │
│  • Code de la route         │
│                             │
│  ⚙️ Paramètres              │  ← Petit en bas
└─────────────────────────────┘
```

### À supprimer
- Bouton "Test VAD" et son code associé
- Slogan "Apprends en t'amusant"
- Layout en grille de gros rectangles

### À modifier
- Logo + Titre sur même ligne (horizontal)
- Catégories en liste verticale compacte
- Conserver taille boutons touch-friendly

## Flow Quiz Mixte (nouveau)

### Comportement actuel
Quiz Mixte → Lance directement un quiz mélangé

### Comportement cible
```
Quiz Mixte → Page sélection niveau → Quiz avec questions mixtes du niveau choisi
```

Niveaux : 1 à 6 (comme les autres catégories)
Questions : Mélange de toutes catégories pour le niveau sélectionné

## Page LevelSelect.tsx

### À harmoniser
- Même style compact que Index.tsx
- Niveaux en liste ou grille compacte
- Indication progression (étoiles/score par niveau)

## Fichiers à modifier

1. `src/pages/Index.tsx` - Refonte complète
2. `src/pages/LevelSelect.tsx` - Harmonisation style
3. `src/stores/useQuizStore.ts` - Support Quiz Mixte avec niveaux
4. Supprimer code VAD si présent

## Palette couleurs existante
- `bg-quiz-dark` : Fond sombre
- `bg-quiz-card` : Cards
- `border-quiz-border` : Bordures
- Gradients : `from-quiz-dark to-black`
