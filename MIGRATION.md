# 🚀 Guide Migration Capacitor - Passage en Natif iOS/Android

Ce document explique comment migrer l'application web actuelle vers des apps natives iOS et Android via Capacitor.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Installation Capacitor](#installation-capacitor)
3. [Installation Plugins Natifs](#installation-plugins-natifs)
4. [Remplacement Services](#remplacement-services)
5. [Configuration Native](#configuration-native)
6. [Build & Déploiement](#build--déploiement)
7. [Tests](#tests)

---

## Prérequis

### macOS (pour iOS)
- **Xcode 14+** installé depuis App Store
- **CocoaPods** installé : `sudo gem install cocoapods`
- Compte développeur Apple (gratuit pour tests, payant pour distribution)

### Windows/Linux/macOS (pour Android)
- **Android Studio** installé avec SDK
- **Java JDK 11+** configuré
- Variables d'environnement : `ANDROID_HOME`, `JAVA_HOME`

### Node.js
- **Node 18+** et **npm** ou **yarn**

---

## Installation Capacitor

### 1. Cloner le projet depuis GitHub

```bash
# Via le bouton "Export to GitHub" de Lovable
git clone <VOTRE_REPO_GIT>
cd <NOM_PROJET>
npm install
```

### 2. Installer Capacitor Core + CLI

```bash
npm install @capacitor/core @capacitor/cli
```

### 3. Initialiser Capacitor

```bash
npx cap init
```

**Répondre aux questions :**
- **App name:** QuizMaster (ou votre nom)
- **App package ID:** `app.lovable.9965c0f1006a4159b9df121526abeab2`
- **Web asset directory:** `dist` (Vite par défaut)

Cela crée `capacitor.config.ts` à la racine.

### 4. Configuration hot-reload (développement)

Éditer `capacitor.config.ts` :

```typescript
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.9965c0f1006a4159b9df121526abeab2',
  appName: 'QuizMaster',
  webDir: 'dist',
  
  // 🔥 Hot reload depuis sandbox Lovable (développement uniquement)
  server: {
    url: 'https://9965c0f1-006a-4159-b9df-121526abeab2.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  
  // Configuration iOS
  ios: {
    contentInset: 'automatic',
  },
  
  // Configuration Android
  android: {
    allowMixedContent: true,
  },
};

export default config;
```

⚠️ **Important :** Commenter `server` avant build de production !

### 5. Ajouter plateformes natives

```bash
# iOS (macOS uniquement)
npx cap add ios

# Android
npx cap add android
```

Cela crée :
- `ios/` - Projet Xcode complet
- `android/` - Projet Android Studio complet

---

## Installation Plugins Natifs

### 1. Text-to-Speech (TTS natif)

```bash
npm install @capacitor-community/text-to-speech
```

### 2. Speech Recognition (STT natif)

```bash
npm install @capacitor-community/speech-recognition
```

### 3. Haptics (vibrations)

```bash
npm install @capacitor/haptics
```

### 4. Local Notifications (rappels)

```bash
npm install @capacitor/local-notifications
```

### 5. App (lifecycle natif)

```bash
npm install @capacitor/app
```

### 6. Preferences (stockage clé-valeur natif)

```bash
npm install @capacitor/preferences
```

### Synchroniser plugins

```bash
npx cap sync
```

---

## Remplacement Services

### 1. Activer détection native

**Fichier :** `src/services/platform/PlatformDetector.ts`

```typescript
// ✅ Décommenter cette ligne :
import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => {
  // ✅ Décommenter cette ligne :
  return Capacitor.isNativePlatform();
  
  // ❌ Supprimer :
  // return false;
};

// Faire de même pour isIOS(), isAndroid(), getPlatform()
```

### 2. Activer Audio natif

**Fichier :** `src/services/audio/NativeAudioService.ts`

```typescript
// ✅ Décommenter cette ligne :
import { TextToSpeech } from '@capacitor-community/text-to-speech';

async speak(text: string, options?: TTSOptions): Promise<void> {
  // ✅ Décommenter ce bloc :
  try {
    this.speaking = true;
    
    await TextToSpeech.speak({
      text,
      lang: options?.language || 'fr-FR',
      rate: options?.rate || 0.85,
      pitch: options?.pitch || 1.0,
      volume: options?.volume || 1.0,
      category: 'playback', // Audio en arrière-plan
    });
    
    this.speaking = false;
  } catch (error) {
    this.speaking = false;
    throw new Error(`Native TTS error: ${error}`);
  }
  
  // ❌ Supprimer le fallback web
}
```

Faire de même pour `stopSpeaking()`, `isAvailable()`, `getVoices()`.

### 3. (Optionnel) Capacitor Storage

Si vous voulez remplacer IndexedDB par Capacitor Preferences :

```bash
npm install @capacitor/preferences
```

Créer `src/services/storage/CapacitorStorageService.ts` en implémentant `IStorageService`.

---

## Configuration Native

### iOS (Xcode)

#### 1. Ouvrir le projet

```bash
npx cap open ios
```

#### 2. Configurer permissions

**Fichier :** `ios/App/App/Info.plist`

Ajouter **avant** `</dict>` :

```xml
<!-- Reconnaissance vocale -->
<key>NSSpeechRecognitionUsageDescription</key>
<string>Pour répondre aux quiz par la voix pendant la conduite</string>

<!-- Microphone -->
<key>NSMicrophoneUsageDescription</key>
<string>Pour la reconnaissance vocale des réponses</string>

<!-- Audio en arrière-plan -->
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

#### 3. Configurer identité

Dans Xcode :
1. Sélectionner `App` (racine projet)
2. Onglet **Signing & Capabilities**
3. Team : sélectionner votre compte Apple
4. Bundle Identifier : `app.lovable.9965c0f1006a4159b9df121526abeab2`

#### 4. Build

**Simulateur :**
```bash
npx cap run ios
```

**Device physique :**
1. Brancher iPhone
2. Xcode > Product > Destination > Votre iPhone
3. Xcode > Product > Run (⌘R)

---

### Android (Android Studio)

#### 1. Ouvrir le projet

```bash
npx cap open android
```

#### 2. Configurer permissions

**Fichier :** `android/app/src/main/AndroidManifest.xml`

Ajouter **avant** `<application>` :

```xml
<!-- Reconnaissance vocale -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Vibrations -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Internet (pour dev uniquement, optionnel en prod) -->
<uses-permission android:name="android.permission.INTERNET" />
```

#### 3. Configurer package

**Fichier :** `android/app/build.gradle`

Vérifier :
```gradle
android {
    namespace "app.lovable.9965c0f1006a4159b9df121526abeab2"
    compileSdk 34
    
    defaultConfig {
        applicationId "app.lovable.9965c0f1006a4159b9df121526abeab2"
        minSdk 22  // Android 5.1+
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }
}
```

#### 4. Build

**Émulateur :**
1. Android Studio > AVD Manager
2. Créer/lancer un émulateur Android 13+
3. Terminal :
```bash
npx cap run android
```

**Device physique :**
1. Activer **Mode développeur** sur téléphone
2. Activer **Débogage USB**
3. Brancher via USB
4. Terminal :
```bash
npx cap run android
```

---

## Build & Déploiement

### Production iOS

#### 1. Préparer build web

```bash
# Supprimer server.url dans capacitor.config.ts
npm run build
npx cap sync ios
```

#### 2. Archive Xcode

1. Xcode > Product > Scheme > **Any iOS Device (arm64)**
2. Product > Archive
3. Window > Organizer
4. Distribute App > **App Store Connect**
5. Suivre assistant (signing, upload)

#### 3. App Store Connect

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Créer nouvelle app
3. Remplir métadonnées (screenshots, description)
4. Submit for Review

⏱️ Review : 24-48h généralement

---

### Production Android

#### 1. Préparer build web

```bash
npm run build
npx cap sync android
```

#### 2. Générer keystore (première fois)

```bash
cd android
keytool -genkey -v -keystore quizmaster.keystore -alias quizmaster -keyalg RSA -keysize 2048 -validity 10000
```

Sauvegarder **mot de passe** et **keystore** !

#### 3. Configurer signing

**Fichier :** `android/app/build.gradle`

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('../quizmaster.keystore')
            storePassword 'VOTRE_MOT_DE_PASSE'
            keyAlias 'quizmaster'
            keyPassword 'VOTRE_MOT_DE_PASSE'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### 4. Build APK/AAB

```bash
cd android
./gradlew assembleRelease  # APK
./gradlew bundleRelease    # AAB (pour Play Store)
```

Fichiers générés :
- APK : `android/app/build/outputs/apk/release/app-release.apk`
- AAB : `android/app/build/outputs/bundle/release/app-release.aab`

#### 5. Google Play Console

1. [play.google.com/console](https://play.google.com/console)
2. Créer nouvelle app
3. Upload AAB
4. Remplir métadonnées (screenshots, description)
5. Submit for Review

⏱️ Review : quelques heures à 7 jours

---

## Tests

### Tester audio natif

```typescript
// Dans composant React
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const testNativeTTS = async () => {
  try {
    await TextToSpeech.speak({
      text: 'Ceci est un test audio natif',
      lang: 'fr-FR',
      rate: 1.0,
    });
    console.log('✅ TTS natif fonctionne !');
  } catch (error) {
    console.error('❌ Erreur TTS:', error);
  }
};
```

### Tester plateforme

```typescript
import { Capacitor } from '@capacitor/core';

console.log('Platform:', Capacitor.getPlatform()); // 'ios', 'android', 'web'
console.log('Is native:', Capacitor.isNativePlatform());
```

### Logs natifs

**iOS :**
- Xcode > View > Debug Area > Show Debug Area
- Console affiche logs `console.log()`

**Android :**
- Android Studio > Logcat
- Filtrer par package : `app.lovable.9965c0f1006a4159b9df121526abeab2`

---

## Checklist Migration

- [ ] Capacitor installé et initialisé
- [ ] Plateformes iOS/Android ajoutées
- [ ] Plugins natifs installés
- [ ] `PlatformDetector.ts` décommenté
- [ ] `NativeAudioService.ts` décommenté
- [ ] Permissions iOS configurées (Info.plist)
- [ ] Permissions Android configurées (AndroidManifest.xml)
- [ ] Tests TTS natif OK sur device
- [ ] Audio en arrière-plan OK (mode voiture)
- [ ] Build production iOS OK
- [ ] Build production Android OK
- [ ] App Store submission complétée
- [ ] Google Play submission complétée

---

## 🆘 Problèmes courants

### "Command not found: npx cap"
```bash
npm install -g @capacitor/cli
```

### iOS : "No development team selected"
→ Xcode > Signing & Capabilities > Team > Sélectionner compte Apple

### Android : "SDK location not found"
→ Créer `android/local.properties` :
```
sdk.dir=/Users/VOTRE_NOM/Library/Android/sdk
```

### TTS ne fonctionne pas en natif
→ Vérifier permissions dans Info.plist (iOS) ou AndroidManifest.xml

### Hot reload ne fonctionne pas
→ Vérifier que `server.url` dans `capacitor.config.ts` pointe vers URL Lovable

---

## 📚 Ressources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Text-to-Speech Plugin](https://github.com/capacitor-community/text-to-speech)
- [iOS Developer](https://developer.apple.com)
- [Android Developer](https://developer.android.com)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

---

**🎉 Votre app est maintenant native iOS/Android avec audio offline !**
