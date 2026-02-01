import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { migrateBibleStorage, type MigrationResult } from './migrateBibleStorage';

describe('migrateBibleStorage', () => {
  beforeEach(() => {
    // Reset IndexedDB for each test
    globalThis.indexedDB = new IDBFactory();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('successful migration scenarios', () => {
    it('should migrate empty database successfully', async () => {
      const result = await migrateBibleStorage();

      expect(result.success).toBe(true);
      expect(result.message).toContain('upgraded successfully');
    });

    it('should migrate reading position data', async () => {
      // Setup: Create version 1 database with reading position
      await setupV1DatabaseWithReadingPosition({
        id: 'current',
        book: 5,
        chapter: 3,
        verse: 10,
        scrollPosition: 150,
        lastUpdated: Date.now(),
      });

      const result = await migrateBibleStorage();

      expect(result.success).toBe(true);
      expect(result.preservedData?.readingPosition).toBeDefined();
      expect(result.preservedData?.readingPosition.book).toBe(5);
      expect(result.preservedData?.readingPosition.chapter).toBe(3);
    });

    it('should migrate preferences data', async () => {
      // Setup: Create database with preferences
      await setupV1DatabaseWithPreferences([
        { key: 'theme', value: 'dark', lastUpdated: Date.now() },
        { key: 'fontSize', value: 16, lastUpdated: Date.now() },
      ]);

      const result = await migrateBibleStorage();

      expect(result.success).toBe(true);
      expect(result.preservedData?.preferences).toHaveLength(2);
    });

    it('should migrate bible content data', async () => {
      // Setup: Create database with cached Bible content
      const mockContent = {
        book: 'Genesis',
        content: {
          book: 'Genesis',
          index: 0,
          chapters: [{ chapter: '1', verses: [{ verse: '1', text: 'In the beginning...' }] }],
        },
        lastCached: Date.now(),
      };
      await setupV1DatabaseWithBibleContent([mockContent]);

      const result = await migrateBibleStorage();

      expect(result.success).toBe(true);
      expect(result.preservedData?.bibleContent).toHaveLength(1);
      expect(result.preservedData?.bibleContent?.[0].book).toBe('Genesis');
    });

    it('should migrate all data types together', async () => {
      // Setup full database
      const db = await createTestDatabase('BibleReaderDB', 1);

      // Add reading position
      const positionTx = db.transaction(['readingPositions'], 'readwrite');
      positionTx.objectStore('readingPositions').put({
        id: 'current',
        book: 1,
        chapter: 1,
        verse: 1,
        scrollPosition: 0,
        lastUpdated: Date.now(),
      });

      // Add preferences
      const prefTx = db.transaction(['preferences'], 'readwrite');
      prefTx.objectStore('preferences').put({ key: 'theme', value: 'light', lastUpdated: Date.now() });

      // Add Bible content
      const contentTx = db.transaction(['bibleContent'], 'readwrite');
      contentTx.objectStore('bibleContent').put({
        book: 'Genesis',
        content: { book: 'Genesis', index: 0, chapters: [] },
        lastCached: Date.now(),
      });

      db.close();
    }, 10000);

      const result = await migrateBibleStorage();

      expect(result.success).toBe(true);
      expect(result.preservedData?.readingPosition).toBeDefined();
      expect(result.preservedData?.preferences).toBeDefined();
      expect(result.preservedData?.bibleContent).toBeDefined();
    });

    it('should create new database with version 2', async () => {
      await migrateBibleStorage();

      // Verify new database is version 2
      const db = await openDatabase('BibleReaderDB');
      expect(db.version).toBe(2);
      db.close();
    }, 10000);
    });

    it('should create bookmarks store in new database', async () => {
      await migrateBibleStorage();

      // Verify bookmarks store exists in new database
      const db = await openDatabase('BibleReaderDB');
      expect(db.objectStoreNames.contains('bookmarks')).toBe(true);
      db.close();
    }, 10000);
    });
  });

  describe('empty database migration', () => {
    it('should handle no data to migrate gracefully', async () => {
      const result = await migrateBibleStorage();

      expect(result.success).toBe(true);
      expect(result.preservedData).toEqual({});
    });

    it('should succeed when database does not exist', async () => {
      // Don't create any database - migration should handle this
      const result = await migrateBibleStorage();

      expect(result.success).toBe(true);
    });
  });

  describe('data integrity verification', () => {
    it('should preserve all fields of reading position', async () => {
      const originalPosition = {
        id: 'current',
        book: 42,
        chapter: 15,
        verse: 7,
        scrollPosition: 1234,
        lastUpdated: 1700000000000,
      };
      await setupV1DatabaseWithReadingPosition(originalPosition);

      const result = await migrateBibleStorage();

      expect(result.preservedData?.readingPosition).toEqual(originalPosition);
    });

    it('should preserve complex preference values', async () => {
      const complexPreference = {
        key: 'displaySettings',
        value: {
          fontFamily: 'Georgia',
          fontSize: 18,
          colors: ['#000', '#fff'],
          nested: { a: 1, b: 2 },
        },
        lastUpdated: Date.now(),
      };
      await setupV1DatabaseWithPreferences([complexPreference]);

      const result = await migrateBibleStorage();

      expect(result.preservedData?.preferences?.[0].value).toEqual(complexPreference.value);
    });

    it('should preserve multiple Bible books', async () => {
      const books = [
        {
          book: 'Genesis',
          content: { book: 'Genesis', index: 0, chapters: [] },
          lastCached: Date.now(),
        },
        {
          book: 'Exodus',
          content: { book: 'Exodus', index: 1, chapters: [] },
          lastCached: Date.now(),
        },
        {
          book: 'Psalms',
          content: { book: 'Psalms', index: 18, chapters: [] },
          lastCached: Date.now(),
        },
      ];
      await setupV1DatabaseWithBibleContent(books);

      const result = await migrateBibleStorage();

      expect(result.preservedData?.bibleContent).toHaveLength(3);
    });

    it('should verify data can be read from new database after migration', async () => {
      const originalPosition = {
        id: 'current',
        book: 10,
        chapter: 5,
        verse: 3,
        scrollPosition: 500,
        lastUpdated: Date.now(),
      };
      await setupV1DatabaseWithReadingPosition(originalPosition);

      await migrateBibleStorage();

      // Try to read from new database
      const db = await openDatabase('BibleReaderDB');
      const tx = db.transaction(['readingPositions'], 'readonly');
      const store = tx.objectStore('readingPositions');

      const position = await new Promise<any>((resolve, reject) => {
        const request = store.get('current');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      expect(position.book).toBe(10);
      expect(position.chapter).toBe(5);
      db.close();
    }, 10000);
    });
  });

  describe('error handling', () => {
    it('should handle export errors gracefully', async () => {
      // Create a database that will cause issues during export
      const db = await createTestDatabase('BibleReaderDB', 1);
      db.close();
    }, 10000);

      const result = await migrateBibleStorage();

      // Should still succeed, possibly with empty preserved data
      expect(result.success).toBe(true);
    });

    it('should return result object with expected structure', async () => {
      const result = await migrateBibleStorage();

      // Verify the result has the expected structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should handle missing database gracefully', async () => {
      // Don't create any database - migration should handle this
      const result = await migrateBibleStorage();

      expect(result.success).toBe(true);
    });
  });

  describe('database deletion', () => {
    it('should delete old database before creating new one', async () => {
      // Create version 1 database
      await createTestDatabase('BibleReaderDB', 1);

      await migrateBibleStorage();

      // Database should still exist but be recreated at version 2
      const db = await openDatabase('BibleReaderDB');
      expect(db.version).toBe(2);
      db.close();
    }, 10000);
  });

  describe('timing and performance', () => {
    it('should complete migration within reasonable time', async () => {
      const startTime = Date.now();
      await migrateBibleStorage();
      const elapsed = Date.now() - startTime;

      // Should complete within 5 seconds in test environment
      expect(elapsed).toBeLessThan(5000);
    });
  });
});

// Helper functions

async function createTestDatabase(name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('readingPositions')) {
        const store = db.createObjectStore('readingPositions', { keyPath: 'id' });
        store.createIndex('book', 'book', { unique: false });
        store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('bibleContent')) {
        const contentStore = db.createObjectStore('bibleContent', { keyPath: 'book' });
        contentStore.createIndex('lastCached', 'lastCached', { unique: false });
      }
    };
  });
}

async function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function setupV1DatabaseWithReadingPosition(position: any): Promise<void> {
  const db = await createTestDatabase('BibleReaderDB', 1);
  const tx = db.transaction(['readingPositions'], 'readwrite');
  const store = tx.objectStore('readingPositions');

  await new Promise<void>((resolve, reject) => {
    const request = store.put(position);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
    }, 10000);
}

async function setupV1DatabaseWithPreferences(preferences: any[]): Promise<void> {
  const db = await createTestDatabase('BibleReaderDB', 1);
  const tx = db.transaction(['preferences'], 'readwrite');
  const store = tx.objectStore('preferences');

  for (const pref of preferences) {
    await new Promise<void>((resolve, reject) => {
      const request = store.put(pref);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  db.close();
    }, 10000);
}

async function setupV1DatabaseWithBibleContent(content: any[]): Promise<void> {
  const db = await createTestDatabase('BibleReaderDB', 1);
  const tx = db.transaction(['bibleContent'], 'readwrite');
  const store = tx.objectStore('bibleContent');

  for (const book of content) {
    await new Promise<void>((resolve, reject) => {
      const request = store.put(book);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  db.close();
    }, 10000);
}
