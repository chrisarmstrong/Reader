import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { Book } from '../types/bible';

// Mock the cross-reference JSON to avoid loading the full 5.6 MB file in tests
vi.mock('../data/crossRefs.json', () => ({
  default: {
    'Genesis-1:1': ['John-1:1', 'Hebrews-11:3'],
    'John-1:1': ['Genesis-1:1'],
  },
}));

let seedBibleData: typeof import('./seedBibleData').seedBibleData;
let isSeedingNeeded: typeof import('./seedBibleData').isSeedingNeeded;
let BibleStorage: typeof import('./BibleStorage').default;

const mockBooks: Book[] = [
  {
    book: 'Genesis',
    index: 0,
    chapters: [
      {
        chapter: '1',
        verses: [
          { verse: '1', text: 'In the beginning God created the heaven and the earth.' },
          { verse: '2', text: 'And the earth was without form, and void.' },
          { verse: '3', text: 'And God said, Let there be light: and there was light.' },
        ],
      },
      {
        chapter: '2',
        verses: [
          { verse: '1', text: 'Thus the heavens and the earth were finished.' },
        ],
      },
    ],
  },
  {
    book: 'John',
    index: 42,
    chapters: [
      {
        chapter: '1',
        verses: [
          { verse: '1', text: 'In the beginning was the Word, and the Word was with God.' },
        ],
      },
    ],
  },
];

describe('seedBibleData', () => {
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    vi.resetModules();

    const storageModule = await import('./BibleStorage');
    BibleStorage = storageModule.default;

    const seedModule = await import('./seedBibleData');
    seedBibleData = seedModule.seedBibleData;
    isSeedingNeeded = seedModule.isSeedingNeeded;
  });

  describe('isSeedingNeeded()', () => {
    it('should return true when no seed version is stored', async () => {
      const needed = await isSeedingNeeded();
      expect(needed).toBe(true);
    });

    it('should return false after seeding completes', async () => {
      await seedBibleData(mockBooks);

      const needed = await isSeedingNeeded();
      expect(needed).toBe(false);
    });
  });

  describe('seedBibleData()', () => {
    it('should seed all verses into IndexedDB', async () => {
      await seedBibleData(mockBooks);

      const count = await BibleStorage.getVerseCount();
      // 3 verses in Genesis ch1 + 1 in Genesis ch2 + 1 in John ch1 = 5
      expect(count).toBe(5);
    });

    it('should store verses with correct structure', async () => {
      await seedBibleData(mockBooks);

      const verses = await BibleStorage.getVersesByIds(['Genesis-1:1']);
      expect(verses).toHaveLength(1);
      expect(verses[0]).toEqual({
        id: 'Genesis-1:1',
        book: 'Genesis',
        bookIndex: 0,
        chapter: '1',
        verse: '1',
        text: 'In the beginning God created the heaven and the earth.',
      });
    });

    it('should build a search index', async () => {
      await seedBibleData(mockBooks);

      const entry = await BibleStorage.getSearchIndexEntry('beginning');
      expect(entry).not.toBeNull();
      // "beginning" appears in Genesis 1:1 and John 1:1
      expect(entry!.refs).toContain('Genesis-1:1');
      expect(entry!.refs).toContain('John-1:1');
    });

    it('should index words case-insensitively', async () => {
      await seedBibleData(mockBooks);

      // "God" appears as "god" in the index
      const entry = await BibleStorage.getSearchIndexEntry('god');
      expect(entry).not.toBeNull();
      expect(entry!.refs.length).toBeGreaterThan(0);
    });

    it('should not index single-character words', async () => {
      await seedBibleData(mockBooks);

      // Single-char words like "a" should not be indexed
      const entry = await BibleStorage.getSearchIndexEntry('a');
      expect(entry).toBeNull();
    });

    it('should call progress callback', async () => {
      const onProgress = vi.fn();
      await seedBibleData(mockBooks, onProgress);

      // Should have been called at least twice: seeding + done
      expect(onProgress).toHaveBeenCalled();

      // Last call should be "done"
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
      expect(lastCall.status).toBe('done');
      expect(lastCall.booksProcessed).toBe(mockBooks.length);
      expect(lastCall.totalBooks).toBe(mockBooks.length);
    });

    it('should set seed version preference after completion', async () => {
      await seedBibleData(mockBooks);

      const version = await BibleStorage.getPreference('seedVersion');
      expect(version).toBe(2);
    });

    it('should skip seeding on subsequent calls if version matches', async () => {
      await seedBibleData(mockBooks);

      const needed = await isSeedingNeeded();
      expect(needed).toBe(false);
    });
  });
});
