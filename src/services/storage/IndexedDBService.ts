/**
 * Implémentation IndexedDB pour stockage offline massif (web)
 * Capacité : 50 MB - plusieurs GB selon navigateur
 * Idéal pour stocker milliers de questions + métadonnées
 */

import type { IStorageService } from './StorageService.interface';
import type { Question, QuizResult, UserProgress } from '@/types/quiz.types';

const DB_NAME = 'QuizAppDB';
const DB_VERSION = 1;

const STORES = {
  questions: 'questions',
  userProgress: 'userProgress',
  quizResults: 'quizResults',
  settings: 'settings',
} as const;

export class IndexedDBService implements IStorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store questions avec indexes
        if (!db.objectStoreNames.contains(STORES.questions)) {
          const questionStore = db.createObjectStore(STORES.questions, {
            keyPath: 'id',
          });
          questionStore.createIndex('category', 'category', { unique: false });
          questionStore.createIndex('difficulty', 'difficulty', {
            unique: false,
          });
          questionStore.createIndex('type', 'type', { unique: false });
        }

        // Store progression utilisateur
        if (!db.objectStoreNames.contains(STORES.userProgress)) {
          db.createObjectStore(STORES.userProgress, { keyPath: 'userId' });
        }

        // Store résultats de quiz
        if (!db.objectStoreNames.contains(STORES.quizResults)) {
          const resultsStore = db.createObjectStore(STORES.quizResults, {
            keyPath: 'sessionId',
            autoIncrement: false,
          });
          resultsStore.createIndex('completedAt', 'completedAt', {
            unique: false,
          });
          resultsStore.createIndex('category', 'category', { unique: false });
        }

        // Store settings
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'key' });
        }

        console.log('🔧 IndexedDB schema created/upgraded');
      };
    });
  }

  private ensureDB(): void {
    if (!this.db) {
      throw new Error('IndexedDB not initialized. Call init() first.');
    }
  }

  async saveQuestions(questions: Question[]): Promise<void> {
    this.ensureDB();
    const transaction = this.db!.transaction([STORES.questions], 'readwrite');
    const store = transaction.objectStore(STORES.questions);

    const promises = questions.map((question) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(question);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log(`✅ Saved ${questions.length} questions to IndexedDB`);
  }

  async getQuestions(): Promise<Question[]> {
    this.ensureDB();
    const transaction = this.db!.transaction([STORES.questions], 'readonly');
    const store = transaction.objectStore(STORES.questions);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getQuestionsByCategory(category: string): Promise<Question[]> {
    this.ensureDB();
    const transaction = this.db!.transaction([STORES.questions], 'readonly');
    const store = transaction.objectStore(STORES.questions);
    const index = store.index('category');

    return new Promise((resolve, reject) => {
      const request = index.getAll(category);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getQuestionById(id: string): Promise<Question | null> {
    this.ensureDB();
    const transaction = this.db!.transaction([STORES.questions], 'readonly');
    const store = transaction.objectStore(STORES.questions);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveUserProgress(progress: UserProgress): Promise<void> {
    this.ensureDB();
    const transaction = this.db!.transaction(
      [STORES.userProgress],
      'readwrite'
    );
    const store = transaction.objectStore(STORES.userProgress);

    return new Promise((resolve, reject) => {
      const request = store.put(progress);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserProgress(): Promise<UserProgress | null> {
    this.ensureDB();
    const transaction = this.db!.transaction([STORES.userProgress], 'readonly');
    const store = transaction.objectStore(STORES.userProgress);

    return new Promise((resolve, reject) => {
      // Récupère le premier (et unique) profil utilisateur
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result;
        resolve(results.length > 0 ? results[0] : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveQuizResult(result: QuizResult): Promise<void> {
    this.ensureDB();
    const transaction = this.db!.transaction([STORES.quizResults], 'readwrite');
    const store = transaction.objectStore(STORES.quizResults);

    return new Promise((resolve, reject) => {
      const request = store.put(result);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getQuizResults(limit: number = 10): Promise<QuizResult[]> {
    this.ensureDB();
    const transaction = this.db!.transaction([STORES.quizResults], 'readonly');
    const store = transaction.objectStore(STORES.quizResults);
    const index = store.index('completedAt');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // Tri décroissant
      const results: QuizResult[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveSetting(key: string, value: any): Promise<void> {
    this.ensureDB();
    const transaction = this.db!.transaction([STORES.settings], 'readwrite');
    const store = transaction.objectStore(STORES.settings);

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSetting(key: string): Promise<any> {
    this.ensureDB();
    const transaction = this.db!.transaction([STORES.settings], 'readonly');
    const store = transaction.objectStore(STORES.settings);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    this.ensureDB();
    const transaction = this.db!.transaction(
      [
        STORES.questions,
        STORES.userProgress,
        STORES.quizResults,
        STORES.settings,
      ],
      'readwrite'
    );

    const promises = Object.values(STORES).map((storeName) => {
      return new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(storeName).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log('🗑️ IndexedDB cleared');
  }

  async getStorageSize(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return 0;
    }

    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
}
