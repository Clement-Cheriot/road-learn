# 🏗️ Architecture Technique - QuizMaster

Documentation de l'architecture abstraite permettant une migration web → natif sans refonte.

---

## 🎯 Philosophie

**Développement web (Lovable) + Architecture native-ready (Capacitor)**

- ✅ Développement rapide en web (itération, tests)
- ✅ Migration native sans réécriture (juste adaptation APIs)
- ✅ Code unique, plateformes multiples
- ✅ Services abstraits via interfaces TypeScript

---

## 📦 Stack Technique

### Phase 1 - Développement Web (actuel)

| Technologie | Usage |
|-------------|-------|
| **React 18** | UI components |
| **TypeScript 5** | Type safety strict |
| **Vite** | Build rapide, HMR |
| **Tailwind CSS** | Styling (design system) |
| **Zustand** | State management léger |
| **React Router** | Navigation |
| **IndexedDB** | Stockage offline massif (50MB+) |
| **Web Speech API** | TTS/STT (dev uniquement, offline impossible) |

### Phase 2 - Migration Capacitor (production)

| Plugin | Remplace | Avantage natif |
|--------|----------|----------------|
| **@capacitor/core** | - | Bridge React → natif |
| **@capacitor/ios** | - | Plateforme iOS |
| **@capacitor/android** | - | Plateforme Android |
| **@capacitor-community/text-to-speech** | Web Speech API | **100% offline**, voix système (Siri/Google) |
| **@capacitor-community/speech-recognition** | Web Speech API | **100% offline**, reconnaissance native |
| **@capacitor/haptics** | - | Vibrations natives |
| **@capacitor/local-notifications** | - | Rappels streak (push local) |
| **@capacitor/app** | - | Lifecycle natif (background) |
| **@capacitor/preferences** | IndexedDB (optionnel) | Stockage natif optimisé |

---

## 🔧 Pattern d'Abstraction : Services

### Principe

**1 interface commune → N implémentations (web, iOS, Android)**

```typescript
// Interface (contrat commun)
export interface IAudioService {
  speak(text: string, options?: TTSOptions): Promise<void>;
  stopSpeaking(): Promise<void>;
  isAvailable(): Promise<boolean>;
}

// Implémentation web (dev)
export class WebAudioService implements IAudioService { ... }

// Implémentation native (prod)
export class NativeAudioService implements IAudioService { ... }

// Factory : switch automatique
export const createAudioService = (): IAudioService => {
  return isNativeApp() 
    ? new NativeAudioService()  // iOS/Android
    : new WebAudioService();     // Browser
};
```

### Avantages

✅ **Code composant inchangé** : `const audio = createAudioService();`  
✅ **Tests web** : WebAudioService pendant développement  
✅ **Production natif** : NativeAudioService après migration  
✅ **Type-safe** : Interface garantit compatibilité  
✅ **Maintenance** : Un seul point d'entrée (factory)  

---

## 📂 Structure Dossiers

```
src/
├── services/                       # 🎯 COEUR DE L'ARCHITECTURE
│   ├── audio/
│   │   ├── AudioService.interface.ts      # Interface commune
│   │   ├── WebAudioService.ts             # Impl. web (Web Speech API)
│   │   ├── NativeAudioService.ts          # Impl. native (Capacitor TTS)
│   │   └── AudioServiceFactory.ts         # Factory pattern
│   │
│   ├── speech/                            # (futur : reconnaissance vocale)
│   │   ├── SpeechService.interface.ts
│   │   ├── WebSpeechService.ts
│   │   └── NativeSpeechService.ts
│   │
│   ├── storage/
│   │   ├── StorageService.interface.ts
│   │   ├── IndexedDBService.ts            # Web (actuel)
│   │   └── CapacitorStorageService.ts     # Natif (optionnel)
│   │
│   └── platform/
│       └── PlatformDetector.ts            # Détecte web vs iOS vs Android
│
├── features/                       # Features modulaires
│   └── quiz/
│       ├── components/
│       ├── hooks/
│       ├── stores/
│       └── QuizEngine.tsx
│
├── stores/                         # Zustand stores
│   ├── useQuizStore.ts
│   └── useUserStore.ts
│
├── pages/                          # Pages React Router
│   ├── Index.tsx
│   ├── Quiz.tsx
│   ├── Results.tsx
│   ├── Scores.tsx
│   └── Settings.tsx
│
├── components/                     # UI réutilisables
│   └── ui/                         # shadcn/ui
│
├── types/                          # Types TypeScript
│   └── quiz.types.ts
│
├── config/                         # Configuration
│   └── audio.config.ts
│
└── data/                           # Données statiques (POC)
    └── questions.json              # 15 questions exemple
```

---

## 🔊 Service Audio : Cas d'Usage Détaillé

### Interface Commune

```typescript
// src/services/audio/AudioService.interface.ts
export interface IAudioService {
  speak(text: string, options?: TTSOptions): Promise<void>;
  stopSpeaking(): Promise<void>;
  isAvailable(): Promise<boolean>;
  getVoices(): Promise<Voice[]>;
  isSpeaking(): boolean;
}
```

### Implémentation Web (WebAudioService)

```typescript
// src/services/audio/WebAudioService.ts
export class WebAudioService implements IAudioService {
  private synth: SpeechSynthesis;

  async speak(text: string, options?: TTSOptions): Promise<void> {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options?.language || 'fr-FR';
    utterance.rate = options?.rate || 0.85;
    this.synth.speak(utterance);
  }
  
  // ⚠️ LIMITATION : Web Speech API ne fonctionne PAS offline
  // Nécessite connexion internet pour synthèse vocale
}
```

### Implémentation Native (NativeAudioService)

```typescript
// src/services/audio/NativeAudioService.ts
import { TextToSpeech } from '@capacitor-community/text-to-speech';

export class NativeAudioService implements IAudioService {
  async speak(text: string, options?: TTSOptions): Promise<void> {
    await TextToSpeech.speak({
      text,
      lang: options?.language || 'fr-FR',
      rate: options?.rate || 0.85,
      pitch: 1.0,
      volume: 1.0,
      category: 'playback', // ✅ Audio en arrière-plan (voiture)
    });
  }
  
  // ✅ AVANTAGES :
  // - 100% offline (voix système embarquées)
  // - Voix naturelles (Siri iOS, Google Android)
  // - Audio en arrière-plan (mode voiture)
  // - Performance optimale
}
```

### Factory Pattern

```typescript
// src/services/audio/AudioServiceFactory.ts
import { isNativeApp } from '../platform/PlatformDetector';

export const createAudioService = (): IAudioService => {
  if (isNativeApp()) {
    return new NativeAudioService(); // iOS/Android
  }
  return new WebAudioService(); // Browser
};
```

### Utilisation dans Composants

```typescript
// src/pages/Quiz.tsx
import { createAudioService } from '@/services/audio/AudioServiceFactory';

export const Quiz = () => {
  const [audioService] = useState(() => createAudioService());
  
  const speakQuestion = async (text: string) => {
    // Le composant ne sait pas s'il utilise Web ou Native !
    await audioService.speak(text, { rate: 0.9 });
  };
  
  // ...
};
```

---

## 💾 Stockage Offline : IndexedDB

### Pourquoi IndexedDB (pas localStorage) ?

| Feature | localStorage | IndexedDB |
|---------|-------------|-----------|
| **Limite** | 5-10 MB | 50 MB - plusieurs GB |
| **Structure** | Clé-valeur simple | Base de données relationnelle |
| **Indexes** | ❌ Non | ✅ Oui (requêtes rapides) |
| **Asynchrone** | ❌ Bloquant | ✅ Non-bloquant |
| **Usage** | Settings | Questions, scores, assets |

### Stratégie Stockage

```
Questions (2000)  :  2-3 MB JSON
Profil utilisateur:  ~100-500 KB
Assets UI         :  ~1-2 MB (cache)
Configuration     :  ~10 KB

TOTAL             :  ~5-10 MB ✅ Parfaitement gérable en IndexedDB
```

### Architecture IndexedDB

```typescript
// src/services/storage/IndexedDBService.ts
const STORES = {
  questions: 'questions',        // Questions avec index par catégorie
  userProgress: 'userProgress',  // Progression XP/niveaux
  quizResults: 'quizResults',    // Historique résultats
  settings: 'settings',          // Préférences utilisateur
};

export class IndexedDBService implements IStorageService {
  private db: IDBDatabase;

  async init(): Promise<void> {
    // Création schéma avec indexes
  }

  async saveQuestions(questions: Question[]): Promise<void> {
    // Stockage massif (2000 questions = ~2-3 MB)
  }

  async getQuestionsByCategory(category: string): Promise<Question[]> {
    // Requête rapide via index
  }

  // ...
}
```

### Synchronisation Online/Offline

```typescript
// Sync périodique (quand online)
if (navigator.onLine) {
  // Fetch nouvelles questions depuis API
  const newQuestions = await fetch('/api/questions/latest');
  
  // Stocker en local
  await storage.saveQuestions(newQuestions);
  
  // Upload progression utilisateur
  await fetch('/api/user/progress', { 
    body: JSON.stringify(userProgress) 
  });
}
```

---

## 🎨 Design System : Tokens Sémantiques

### Principe

**Jamais de couleurs directes** (`text-white`, `bg-blue-500`) **→ Toujours via tokens**

```typescript
// ❌ INTERDIT
<Button className="text-white bg-blue-500">

// ✅ CORRECT
<Button variant="primary">
```

### Configuration

**index.css** (définitions HSL uniquement) :
```css
:root {
  --primary: 195 85% 48%;           /* Cyan énergique */
  --success: 145 65% 48%;           /* Vert validation */
  --accent: 25 95% 58%;             /* Orange gamification */
  
  --gradient-primary: linear-gradient(135deg, hsl(195 85% 48%), hsl(195 85% 65%));
  --shadow-primary: 0 10px 40px -10px hsl(195 85% 48% / 0.3);
}
```

**tailwind.config.ts** (mapping tokens) :
```typescript
colors: {
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
    glow: "hsl(var(--primary-glow))",
  },
},
backgroundImage: {
  'gradient-primary': 'var(--gradient-primary)',
},
```

**Utilisation** :
```tsx
<div className="bg-primary text-primary-foreground">
<div className="bg-gradient-primary shadow-primary">
```

---

## 🔄 Flux de Données : Zustand

### Architecture State

```typescript
// stores/useQuizStore.ts
interface QuizStore {
  currentSession: QuizSession | null;
  currentQuestion: Question | null;
  answers: UserAnswer[];
  timeRemaining: number;
  
  startSession: (session: QuizSession) => void;
  submitAnswer: (answer: UserAnswer) => void;
  nextQuestion: () => void;
}

// stores/useUserStore.ts
interface UserStore {
  progress: UserProgress | null;
  
  updateXP: (xp: number) => void;
  updateCategoryStats: (category: Category, correct: boolean) => void;
}
```

### Flow Quiz

```
1. Index.tsx
   ↓ startQuiz(category)
   
2. Quiz.tsx
   ↓ createStorageService().getQuestionsByCategory()
   ↓ useQuizStore().startSession(session)
   
3. Quiz Engine
   ↓ speakQuestion() via createAudioService()
   ↓ User sélectionne réponse
   ↓ useQuizStore().submitAnswer()
   ↓ useUserStore().updateXP() + updateCategoryStats()
   
4. Results.tsx
   ↓ createStorageService().saveQuizResult()
   ↓ Display score + stats
```

---

## 🚗 Mode Voiture : Audio Background

### Configuration iOS

**Info.plist** :
```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

**capacitor.config.ts** :
```typescript
plugins: {
  TextToSpeech: {
    category: 'playback', // Active audio en arrière-plan
  },
},
```

### Configuration Audio

```typescript
// src/config/audio.config.ts
export const AUDIO_CONFIG = {
  carMode: {
    rate: 0.75,                  // Plus lent (conduite + bruit)
    pauseAfterQuestion: 2000,    // 2s pause avant options
    pauseBetweenOptions: 1000,   // 1s entre options
    repeatOnError: true,         // Répéter si pas compris
  },
};
```

---

## 📊 Types TypeScript : Contrat Strict

```typescript
// src/types/quiz.types.ts
export type QuestionType = 'duo' | 'carre' | 'cash';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Category = 'histoire' | 'geographie' | 'sciences';

export interface Question {
  id: string;
  type: QuestionType;
  category: Category;
  difficulty: Difficulty;
  question: string;
  options: QuestionOption[];
  explanation?: string;
  points: number;
  timeLimit: number;
}

export interface QuizSession {
  id: string;
  category: Category;
  questions: Question[];
  score: number;
  maxScore: number;
  isComplete: boolean;
}

// ...
```

**Avantages** :
- ✅ Autocomplétion IDE
- ✅ Détection erreurs compile-time
- ✅ Refactoring safe
- ✅ Documentation auto

---

## 🧪 Tests Recommandés

### 1. Tests Unitaires (Services)

```typescript
// __tests__/services/WebAudioService.test.ts
describe('WebAudioService', () => {
  it('should speak text', async () => {
    const service = new WebAudioService();
    await service.speak('Hello');
    expect(service.isSpeaking()).toBe(true);
  });
});
```

### 2. Tests E2E (Playwright/Cypress)

```typescript
// e2e/quiz.spec.ts
test('should complete quiz', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Histoire');
  await page.click('text=1789');
  await expect(page.locator('text=Bravo')).toBeVisible();
});
```

### 3. Tests Natifs (Xcode/Android)

- **iOS** : XCTest (UI tests)
- **Android** : Espresso (UI tests)

---

## 🎯 Checklist Production

### Code Quality
- [ ] TypeScript strict mode activé
- [ ] ESLint no warnings
- [ ] Tests unitaires >70% coverage
- [ ] Tests E2E critiques OK

### Performance
- [ ] Lighthouse score >90
- [ ] Bundle size <500 KB (gzipped)
- [ ] IndexedDB <10 MB (2000 questions)
- [ ] TTS latency <200ms

### Native
- [ ] TTS offline 100% fonctionnel
- [ ] Audio background OK (mode voiture)
- [ ] Notifications locales (streaks)
- [ ] Permissions iOS/Android configurées

### Distribution
- [ ] iOS App Store submission
- [ ] Google Play Store submission
- [ ] Privacy policy rédigée
- [ ] Terms of service rédigés

---

## 📚 Ressources

- **Capacitor** : [capacitorjs.com](https://capacitorjs.com)
- **Zustand** : [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand)
- **IndexedDB** : [developer.mozilla.org/IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- **Web Speech API** : [developer.mozilla.org/Web_Speech_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

**🎉 Architecture robuste, testable et évolutive !**
