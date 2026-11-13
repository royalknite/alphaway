import {
  TestFolder,
  TestItem,
  TestAttempt,
  QuestionCollection,
  AppSettings,
  ActiveExamState,
  Question
} from '../types';
import {
  SAMPLE_TEST_TXT_BIHAR_DAROGA,
  SAMPLE_TEST_TXT_RAILWAY,
  SAMPLE_TEST_TXT_SSC_CGL,
  parseQuestionsFromTxt
} from '../utils/txtParser';
import {
  TIME_SPEED_DISTANCE_TEST,
  TIME_SPEED_DISTANCE_QUESTIONS,
  TIME_SPEED_DISTANCE_RAW_TXT
} from '../utils/pdfExtractedQuestions';

const DB_NAME = 'AlphaWayPlatformDB';
const DB_VERSION = 1;

const STORES = {
  FOLDERS: 'folders',
  TESTS: 'tests',
  ATTEMPTS: 'attempts',
  COLLECTIONS: 'collections',
  SETTINGS: 'settings',
  ACTIVE_EXAM: 'active_exam'
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'en', // Default app language is English
  questionLanguage: 'en', // Default question preference (toggleable anytime to Hindi/English)
  defaultMode: 'exam',
  defaultDurationMinutes: 60,
  defaultMarksPerQuestion: 1,
  defaultNegativeMarking: 0.25,
  soundEnabled: true,
  confirmBeforeSubmit: true,
  autoSaveIntervalSeconds: 2,
  geminiApiKey: '',
  openaiApiKey: '',
  pdfAiProvider: 'gemini'
};

class AlphaWayDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDbAvailable: boolean = true;

  constructor() {
    this.initDb();
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isIndexedDbAvailable = false;
      return Promise.reject(new Error('IndexedDB not available'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.FOLDERS)) {
          const folderStore = db.createObjectStore(STORES.FOLDERS, { keyPath: 'id' });
          folderStore.createIndex('parentId', 'parentId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.TESTS)) {
          const testStore = db.createObjectStore(STORES.TESTS, { keyPath: 'id' });
          testStore.createIndex('folderId', 'folderId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.ATTEMPTS)) {
          const attemptStore = db.createObjectStore(STORES.ATTEMPTS, { keyPath: 'id' });
          attemptStore.createIndex('testId', 'testId', { unique: false });
          attemptStore.createIndex('submittedAt', 'submittedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.COLLECTIONS)) {
          db.createObjectStore(STORES.COLLECTIONS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.ACTIVE_EXAM)) {
          db.createObjectStore(STORES.ACTIVE_EXAM, { keyPath: 'testId' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (e) => {
        console.warn('IndexedDB failed to open, falling back to LocalStorage', e);
        this.isIndexedDbAvailable = false;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.initDb();
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // Generic Get All
  public async getAll<T>(storeName: string): Promise<T[]> {
    try {
      if (!this.isIndexedDbAvailable) {
        return this.getFromLocalStorage<T[]>(storeName) || [];
      }
      const store = await this.getStore(storeName, 'readonly');
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return this.getFromLocalStorage<T[]>(storeName) || [];
    }
  }

  // Generic Get by ID
  public async get<T>(storeName: string, key: string): Promise<T | null> {
    try {
      if (!this.isIndexedDbAvailable) {
        const list = this.getFromLocalStorage<T[]>(storeName) || [];
        return (list as unknown as Array<{ id: string }>).find(i => i.id === key) as unknown as T || null;
      }
      const store = await this.getStore(storeName, 'readonly');
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  // Generic Put (Add or Update)
  public async put<T extends { id: string }>(storeName: string, item: T): Promise<void> {
    try {
      if (this.isIndexedDbAvailable) {
        const store = await this.getStore(storeName, 'readwrite');
        await new Promise<void>((resolve, reject) => {
          const request = store.put(item);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    } catch (e) {
      console.warn('IDB put error, syncing to LocalStorage', e);
    }
    // Also sync to LocalStorage as instant backup
    this.saveItemToLocalStorage(storeName, item);
  }

  // Generic Delete
  public async delete(storeName: string, key: string): Promise<void> {
    try {
      if (this.isIndexedDbAvailable) {
        const store = await this.getStore(storeName, 'readwrite');
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    } catch (e) {
      console.warn('IDB delete error', e);
    }
    this.deleteItemFromLocalStorage(storeName, key);
  }

  // LocalStorage Helpers
  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(`alphaway_${key}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveItemToLocalStorage<T extends { id: string }>(storeName: string, item: T) {
    try {
      const list = this.getFromLocalStorage<T[]>(storeName) || [];
      const index = list.findIndex(i => i.id === item.id);
      if (index >= 0) {
        list[index] = item;
      } else {
        list.push(item);
      }
      localStorage.setItem(`alphaway_${storeName}`, JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }

  private deleteItemFromLocalStorage(storeName: string, key: string) {
    try {
      const list = this.getFromLocalStorage<Array<{ id: string }>>(storeName) || [];
      const updated = list.filter(i => i.id !== key);
      localStorage.setItem(`alphaway_${storeName}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage delete error', e);
    }
  }

  // ---------------- Specific Data Methods ----------------

  // Folders
  public async getFolders(): Promise<TestFolder[]> {
    const folders = await this.getAll<TestFolder>(STORES.FOLDERS);
    return folders.sort((a, b) => a.name.localeCompare(b.name));
  }

  public async saveFolder(folder: TestFolder): Promise<void> {
    await this.put(STORES.FOLDERS, folder);
  }

  public async deleteFolder(folderId: string): Promise<void> {
    await this.delete(STORES.FOLDERS, folderId);
  }

  // Tests
  public async getTests(): Promise<TestItem[]> {
    return this.getAll<TestItem>(STORES.TESTS);
  }

  public async getTest(id: string): Promise<TestItem | null> {
    return this.get<TestItem>(STORES.TESTS, id);
  }

  public async saveTest(test: TestItem): Promise<void> {
    await this.put(STORES.TESTS, test);
  }

  public async deleteTest(testId: string): Promise<void> {
    await this.delete(STORES.TESTS, testId);
  }

  // Attempts (Permanent History)
  public async getAttempts(): Promise<TestAttempt[]> {
    const list = await this.getAll<TestAttempt>(STORES.ATTEMPTS);
    return list.sort((a, b) => b.submittedAt - a.submittedAt);
  }

  public async getAttemptsByTestId(testId: string): Promise<TestAttempt[]> {
    const all = await this.getAttempts();
    return all.filter(a => a.testId === testId);
  }

  public async saveAttempt(attempt: TestAttempt): Promise<void> {
    await this.put(STORES.ATTEMPTS, attempt);

    // Update parent test statistics (bestScore, latestScore, totalAttempts, lastAttemptAt)
    const test = await this.getTest(attempt.testId);
    if (test) {
      const allTestAttempts = await this.getAttemptsByTestId(test.id);
      const scores = allTestAttempts.map(a => a.result.finalScore);
      test.totalAttempts = allTestAttempts.length;
      test.latestScore = attempt.result.finalScore;
      test.bestScore = Math.max(...scores, attempt.result.finalScore);
      test.lastAttemptAt = attempt.submittedAt;
      test.updatedAt = Date.now();
      await this.saveTest(test);
    }
  }

  public async deleteAttempt(attemptId: string): Promise<void> {
    await this.delete(STORES.ATTEMPTS, attemptId);
  }

  // Question Collections
  public async getCollections(): Promise<QuestionCollection[]> {
    return this.getAll<QuestionCollection>(STORES.COLLECTIONS);
  }

  public async saveCollection(collection: QuestionCollection): Promise<void> {
    await this.put(STORES.COLLECTIONS, collection);
  }

  public async deleteCollection(id: string): Promise<void> {
    await this.delete(STORES.COLLECTIONS, id);
  }

  // Settings
  public async getSettings(): Promise<AppSettings> {
    const item = await this.get<{ id: string; settings: AppSettings }>(STORES.SETTINGS, 'app_settings');
    const explicit = typeof window !== 'undefined' ? localStorage.getItem('alphaway_user_explicit_lang') : null;
    let base: AppSettings = { ...DEFAULT_SETTINGS };
    if (item && item.settings) {
      base = { ...DEFAULT_SETTINGS, ...item.settings };
    } else {
      const fromStorage = this.getFromLocalStorage<AppSettings>('settings');
      if (fromStorage) {
        base = { ...DEFAULT_SETTINGS, ...fromStorage };
      }
    }
    if (!explicit) {
      base.language = 'en';
    }
    return base;
  }

  public async saveSettings(settings: AppSettings): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem('alphaway_user_explicit_lang', 'true');
    }
    await this.put(STORES.SETTINGS, { id: 'app_settings', settings });
    localStorage.setItem('alphaway_settings', JSON.stringify(settings));
  }

  // Active Exam Resumption State
  public async getActiveExamState(): Promise<ActiveExamState | null> {
    try {
      const active = this.getFromLocalStorage<ActiveExamState>('current_active_exam');
      return active || null;
    } catch {
      return null;
    }
  }

  public async saveActiveExamState(state: ActiveExamState | null): Promise<void> {
    try {
      if (state) {
        localStorage.setItem('alphaway_current_active_exam', JSON.stringify(state));
      } else {
        localStorage.removeItem('alphaway_current_active_exam');
      }
    } catch (e) {
      console.warn('Failed to save active exam state', e);
    }
  }

  // Backup & Restore
  public async exportCompleteDatabase(): Promise<string> {
    const folders = await this.getFolders();
    const tests = await this.getTests();
    const attempts = await this.getAttempts();
    const collections = await this.getCollections();
    const settings = await this.getSettings();

    const backupObject = {
      app: 'AlphaWay Test Platform',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        folders,
        tests,
        attempts,
        collections,
        settings
      }
    };

    return JSON.stringify(backupObject, null, 2);
  }

  public async restoreDatabase(jsonString: string): Promise<{ success: boolean; message: string; count?: { folders: number; tests: number; attempts: number } }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.data) {
        return { success: false, message: 'अमान्य बैकअप फ़ाइल (Invalid backup file structure).' };
      }

      const { folders = [], tests = [], attempts = [], collections = [], settings } = parsed.data;

      // Restore folders
      for (const f of folders) {
        if (f.id && f.name) await this.saveFolder(f);
      }
      // Restore tests
      for (const t of tests) {
        if (t.id && t.title) await this.saveTest(t);
      }
      // Restore attempts
      for (const a of attempts) {
        if (a.id && a.testId) await this.put(STORES.ATTEMPTS, a);
      }
      // Restore collections
      for (const c of collections) {
        if (c.id && c.name) await this.saveCollection(c);
      }
      // Restore settings
      if (settings) {
        await this.saveSettings(settings);
      }

      return {
        success: true,
        message: 'डेटाबेस सफलतापूर्वक रीस्टोर हो गया (Database restored successfully)!',
        count: {
          folders: folders.length,
          tests: tests.length,
          attempts: attempts.length
        }
      };
    } catch (err: unknown) {
      return { success: false, message: `रीस्टोर विफल: ${err instanceof Error ? err.message : 'अज्ञात त्रुटि'}` };
    }
  }

  // Pre-seed default data if database is empty
  public async seedDefaultDataIfNeeded(): Promise<void> {
    const existingFolders = await this.getFolders();
    if (existingFolders.length > 0) return;

    // Create realistic folder hierarchy:
    // Root 1: Bihar Police
    const biharPoliceId = 'f_bihar_police';
    const darogaId = 'f_daroga';
    const constableId = 'f_constable';

    // Root 2: Railway
    const railwayId = 'f_railway';
    const groupDId = 'f_group_d';

    // Root 3: SSC
    const sscId = 'f_ssc';
    const cglId = 'f_cgl';

    const defaultFolders: TestFolder[] = [
      { id: biharPoliceId, name: 'Bihar Police', parentId: null, createdAt: Date.now(), updatedAt: Date.now(), color: '#2563eb' },
      { id: darogaId, name: 'Daroga', parentId: biharPoliceId, createdAt: Date.now(), updatedAt: Date.now(), color: '#1d4ed8' },
      { id: constableId, name: 'Constable', parentId: biharPoliceId, createdAt: Date.now(), updatedAt: Date.now(), color: '#3b82f6' },
      { id: railwayId, name: 'Railway', parentId: null, createdAt: Date.now(), updatedAt: Date.now(), color: '#059669' },
      { id: groupDId, name: 'Group D', parentId: railwayId, createdAt: Date.now(), updatedAt: Date.now(), color: '#10b981' },
      { id: sscId, name: 'SSC', parentId: null, createdAt: Date.now(), updatedAt: Date.now(), color: '#d97706' },
      { id: cglId, name: 'CGL', parentId: sscId, createdAt: Date.now(), updatedAt: Date.now(), color: '#f59e0b' }
    ];

    for (const f of defaultFolders) {
      await this.saveFolder(f);
    }

    // Parse questions for tests
    const parsedDaroga = parseQuestionsFromTxt(SAMPLE_TEST_TXT_BIHAR_DAROGA, 'बिहार दरोगा');
    const parsedRailway = parseQuestionsFromTxt(SAMPLE_TEST_TXT_RAILWAY, 'General Science');
    const parsedSSC = parseQuestionsFromTxt(SAMPLE_TEST_TXT_SSC_CGL, 'General Awareness');

    // Create Sample Tests
    const test1: TestItem = {
      id: 'test_daroga_01',
      folderId: darogaId,
      title: 'Chapter 01 Test - सामान्य अध्ययन व बिहार विशेष',
      description: 'बिहार दरोगा प्रारंभिक परीक्षा हेतु महत्वपूर्ण वस्तुनिष्ठ प्रश्न।',
      questions: parsedDaroga.questions,
      config: {
        durationMinutes: 15,
        marksPerQuestion: 2,
        negativeMarking: 0.5,
        passingPercentage: 40,
        shuffleQuestions: false,
        shuffleOptions: false,
        mode: 'exam',
        allowReview: true,
        instructions: 'सभी प्रश्नों को ध्यानपूर्वक पढ़ें। प्रत्येक सही उत्तर पर 2 अंक तथा गलत उत्तर पर 0.5 अंक काटे जाएंगे।'
      },
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now() - 86400000 * 3,
      totalAttempts: 0,
      originalTxt: SAMPLE_TEST_TXT_BIHAR_DAROGA
    };

    const test2: TestItem = {
      id: 'test_railway_groupd_01',
      folderId: groupDId,
      title: 'Science Test - भौतिकी एवं रसायन विज्ञान',
      description: 'रेलवे ग्रुप डी परीक्षा के लिए महत्वपूर्ण विज्ञान प्रश्न।',
      questions: parsedRailway.questions,
      config: {
        durationMinutes: 10,
        marksPerQuestion: 1,
        negativeMarking: 0.33,
        passingPercentage: 35,
        shuffleQuestions: false,
        shuffleOptions: false,
        mode: 'exam',
        allowReview: true,
        instructions: 'Railway Group D General Science standard mock practice test.'
      },
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
      totalAttempts: 0,
      originalTxt: SAMPLE_TEST_TXT_RAILWAY
    };

    const test3: TestItem = {
      id: 'test_ssc_cgl_01',
      folderId: cglId,
      title: 'General Awareness Test - Static GK & Polity',
      description: 'SSC CGL Tier 1 Mock Test with detailed explanations.',
      questions: parsedSSC.questions,
      config: {
        durationMinutes: 12,
        marksPerQuestion: 2,
        negativeMarking: 0.5,
        passingPercentage: 40,
        shuffleQuestions: false,
        shuffleOptions: false,
        mode: 'exam',
        allowReview: true,
        instructions: 'SSC CGL Tier-1 format. Mark carefully.'
      },
      createdAt: Date.now() - 86400000 * 1,
      updatedAt: Date.now() - 86400000 * 1,
      totalAttempts: 0,
      originalTxt: SAMPLE_TEST_TXT_SSC_CGL
    };

    await this.saveTest(test1);
    await this.saveTest(test2);
    await this.saveTest(test3);
    await this.saveTest(TIME_SPEED_DISTANCE_TEST);

    // Save initial question collections in the Question Bank
    await this.saveCollection({
      id: 'col_daroga',
      name: 'Bihar Daroga History & GK Collection',
      description: '5 high yield questions with detailed Hindi explanation',
      questions: parsedDaroga.questions,
      rawTxt: SAMPLE_TEST_TXT_BIHAR_DAROGA,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await this.saveCollection({
      id: 'col_railway',
      name: 'Railway General Science Collection',
      description: 'Standard physics and chemistry MCQs for railway recruitment',
      questions: parsedRailway.questions,
      rawTxt: SAMPLE_TEST_TXT_RAILWAY,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await this.saveCollection({
      id: 'col_time_speed_distance',
      name: 'Time Speed & Distance (Q-20) - PDF Collection',
      description: '20 Railway & SSC Math questions extracted directly from PDF with yellow highlight answers',
      questions: TIME_SPEED_DISTANCE_QUESTIONS,
      rawTxt: TIME_SPEED_DISTANCE_RAW_TXT,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  // Ensures that the PDF-extracted tests are always available even if database was seeded earlier
  public async ensurePdfTestExists(): Promise<void> {
    try {
      const existing = await this.get<TestItem>(STORES.TESTS, 'test_time_speed_distance_q20');
      if (!existing) {
        await this.saveTest(TIME_SPEED_DISTANCE_TEST);
      }
      const existingCol = await this.get<QuestionCollection>(STORES.COLLECTIONS, 'col_time_speed_distance');
      if (!existingCol) {
        await this.saveCollection({
          id: 'col_time_speed_distance',
          name: 'Time Speed & Distance (Q-20) - PDF Collection',
          description: '20 Railway & SSC Math questions extracted directly from PDF with yellow highlight answers',
          questions: TIME_SPEED_DISTANCE_QUESTIONS,
          rawTxt: TIME_SPEED_DISTANCE_RAW_TXT,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      // Cleanup any previously seeded reference tests per user request
      await this.delete(STORES.TESTS, 'test_rrb_alp_2026_cbt1');
      await this.delete(STORES.COLLECTIONS, 'col_rrb_alp_2026');
      await this.delete(STORES.TESTS, 'test_section_math_di');
      await this.delete(STORES.COLLECTIONS, 'col_section_math_di');
    } catch (err) {
      console.warn('Failed to ensure PDF test exists:', err);
    }
  }
}

export const db = new AlphaWayDatabase();
