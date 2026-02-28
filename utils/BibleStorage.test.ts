import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

// We need to reset the IndexedDB between tests
// Import BibleStorage fresh for each test
let BibleStorage: typeof import('./BibleStorage').default;

describe('BibleStorage', () => {
  beforeEach(async () => {
    // Reset IndexedDB for each test
    globalThis.indexedDB = new IDBFactory();

    // Clear module cache and reimport
    vi.resetModules();
    const module = await import('./BibleStorage');
    BibleStorage = module.default;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('init()', () => {
    it('should initialize database successfully', async () => {
      const db = await BibleStorage.init();

      expect(db).toBeDefined();
      expect(db.name).toBe('BibleReaderDB');
      expect(db.version).toBe(4);
    });

    it('should create all required object stores', async () => {
      const db = await BibleStorage.init();

      expect(db.objectStoreNames.contains('readingPositions')).toBe(true);
      expect(db.objectStoreNames.contains('preferences')).toBe(true);
      expect(db.objectStoreNames.contains('bibleContent')).toBe(true);
      expect(db.objectStoreNames.contains('bookmarks')).toBe(true);
      expect(db.objectStoreNames.contains('notes')).toBe(true);
      expect(db.objectStoreNames.contains('verses')).toBe(true);
      expect(db.objectStoreNames.contains('searchIndex')).toBe(true);
    });

    it('should return existing database on subsequent calls', async () => {
      const db1 = await BibleStorage.init();
      const db2 = await BibleStorage.init();

      expect(db1).toBe(db2);
    });
  });

  describe('saveReadingPosition()', () => {
    it('should save reading position with all parameters', async () => {
      const position = await BibleStorage.saveReadingPosition(5, 3, 10, 150);

      expect(position).toEqual({
        id: 'current',
        book: 5,
        chapter: 3,
        verse: 10,
        scrollPosition: 150,
        lastUpdated: expect.any(Number),
      });
    });

    it('should use default values for verse and scrollPosition', async () => {
      const position = await BibleStorage.saveReadingPosition(1, 1);

      expect(position.verse).toBe(1);
      expect(position.scrollPosition).toBe(0);
    });

    it('should overwrite previous position', async () => {
      await BibleStorage.saveReadingPosition(1, 1, 1, 0);
      await BibleStorage.saveReadingPosition(10, 5, 20, 500);

      const position = await BibleStorage.getReadingPosition();

      expect(position?.book).toBe(10);
      expect(position?.chapter).toBe(5);
      expect(position?.verse).toBe(20);
      expect(position?.scrollPosition).toBe(500);
    });

    it('should include lastUpdated timestamp', async () => {
      const before = Date.now();
      const position = await BibleStorage.saveReadingPosition(1, 1, 1, 0);
      const after = Date.now();

      expect(position.lastUpdated).toBeGreaterThanOrEqual(before);
      expect(position.lastUpdated).toBeLessThanOrEqual(after);
    });
  });

  describe('getReadingPosition()', () => {
    it('should return null when no position is saved', async () => {
      const position = await BibleStorage.getReadingPosition();

      expect(position).toBeNull();
    });

    it('should retrieve saved reading position', async () => {
      await BibleStorage.saveReadingPosition(3, 14, 5, 200);

      const position = await BibleStorage.getReadingPosition();

      expect(position).toEqual({
        id: 'current',
        book: 3,
        chapter: 14,
        verse: 5,
        scrollPosition: 200,
        lastUpdated: expect.any(Number),
      });
    });

    it('should return the most recently saved position', async () => {
      await BibleStorage.saveReadingPosition(1, 1, 1, 0);
      await BibleStorage.saveReadingPosition(2, 2, 2, 100);
      await BibleStorage.saveReadingPosition(3, 3, 3, 200);

      const position = await BibleStorage.getReadingPosition();

      expect(position?.book).toBe(3);
      expect(position?.chapter).toBe(3);
      expect(position?.verse).toBe(3);
    });
  });

  describe('savePreference()', () => {
    it('should save a string preference', async () => {
      const pref = await BibleStorage.savePreference('theme', 'dark');

      expect(pref).toEqual({
        key: 'theme',
        value: 'dark',
        lastUpdated: expect.any(Number),
      });
    });

    it('should save a numeric preference', async () => {
      const pref = await BibleStorage.savePreference('fontSize', 16);

      expect(pref.value).toBe(16);
    });

    it('should save a boolean preference', async () => {
      const pref = await BibleStorage.savePreference('showVerseNumbers', true);

      expect(pref.value).toBe(true);
    });

    it('should save an object preference', async () => {
      const value = { fontFamily: 'Georgia', fontSize: 18, lineHeight: 1.6 };
      const pref = await BibleStorage.savePreference('displaySettings', value);

      expect(pref.value).toEqual(value);
    });

    it('should save an array preference', async () => {
      const value = ['Genesis', 'Psalms', 'John'];
      const pref = await BibleStorage.savePreference('favoriteBooks', value);

      expect(pref.value).toEqual(value);
    });

    it('should overwrite existing preference with same key', async () => {
      await BibleStorage.savePreference('theme', 'light');
      await BibleStorage.savePreference('theme', 'dark');

      const value = await BibleStorage.getPreference('theme');

      expect(value).toBe('dark');
    });
  });

  describe('getPreference()', () => {
    it('should return default value when preference does not exist', async () => {
      const value = await BibleStorage.getPreference('nonexistent', 'default');

      expect(value).toBe('default');
    });

    it('should return null as default when no default provided', async () => {
      const value = await BibleStorage.getPreference('nonexistent');

      expect(value).toBeNull();
    });

    it('should retrieve saved preference', async () => {
      await BibleStorage.savePreference('fontSize', 18);

      const value = await BibleStorage.getPreference('fontSize');

      expect(value).toBe(18);
    });

    it('should retrieve complex object preference', async () => {
      const settings = { a: 1, b: 'test', c: [1, 2, 3] };
      await BibleStorage.savePreference('settings', settings);

      const value = await BibleStorage.getPreference('settings');

      expect(value).toEqual(settings);
    });
  });

  describe('cacheBibleBook()', () => {
    const mockBook = {
      book: 'Genesis',
      index: 0,
      chapters: [
        {
          chapter: '1',
          verses: [
            { verse: '1', text: 'In the beginning...' },
            { verse: '2', text: 'And the earth was...' },
          ],
        },
      ],
    };

    it('should cache a Bible book', async () => {
      const result = await BibleStorage.cacheBibleBook('Genesis', mockBook);

      expect(result).toEqual({
        book: 'Genesis',
        content: mockBook,
        lastCached: expect.any(Number),
      });
    });

    it('should include lastCached timestamp', async () => {
      const before = Date.now();
      const result = await BibleStorage.cacheBibleBook('Genesis', mockBook);
      const after = Date.now();

      expect(result.lastCached).toBeGreaterThanOrEqual(before);
      expect(result.lastCached).toBeLessThanOrEqual(after);
    });

    it('should update cached book when called again', async () => {
      await BibleStorage.cacheBibleBook('Genesis', mockBook);

      const updatedBook = { ...mockBook, chapters: [] };
      await BibleStorage.cacheBibleBook('Genesis', updatedBook);

      const cached = await BibleStorage.getCachedBibleBook('Genesis');

      expect(cached?.chapters).toEqual([]);
    });
  });

  describe('getCachedBibleBook()', () => {
    const mockBook = {
      book: 'Genesis',
      index: 0,
      chapters: [
        {
          chapter: '1',
          verses: [{ verse: '1', text: 'Test verse' }],
        },
      ],
    };

    it('should return null when book is not cached', async () => {
      const result = await BibleStorage.getCachedBibleBook('NonExistent');

      expect(result).toBeNull();
    });

    it('should retrieve cached Bible book', async () => {
      await BibleStorage.cacheBibleBook('Genesis', mockBook);

      const result = await BibleStorage.getCachedBibleBook('Genesis');

      expect(result).toEqual(mockBook);
    });

    it('should retrieve correct book when multiple books are cached', async () => {
      const exodus = { ...mockBook, book: 'Exodus', index: 1 };
      await BibleStorage.cacheBibleBook('Genesis', mockBook);
      await BibleStorage.cacheBibleBook('Exodus', exodus);

      const genesisResult = await BibleStorage.getCachedBibleBook('Genesis');
      const exodusResult = await BibleStorage.getCachedBibleBook('Exodus');

      expect(genesisResult?.book).toBe('Genesis');
      expect(exodusResult?.book).toBe('Exodus');
    });
  });

  describe('addBookmark()', () => {
    it('should add a bookmark with all fields', async () => {
      const bookmark = await BibleStorage.addBookmark(
        'Genesis',
        '1',
        '1',
        'In the beginning God created the heaven and the earth.',
        'My first bookmark'
      );

      expect(bookmark).toEqual({
        id: 'Genesis-1:1',
        book: 'Genesis',
        chapter: '1',
        verse: '1',
        text: 'In the beginning God created the heaven and the earth.',
        createdAt: expect.any(Number),
        note: 'My first bookmark',
      });
    });

    it('should add a bookmark without a note', async () => {
      const bookmark = await BibleStorage.addBookmark(
        'John',
        '3',
        '16',
        'For God so loved the world...'
      );

      expect(bookmark.note).toBeUndefined();
    });

    it('should generate correct bookmark ID', async () => {
      const bookmark = await BibleStorage.addBookmark(
        'Psalms',
        '23',
        '1',
        'The LORD is my shepherd; I shall not want.'
      );

      expect(bookmark.id).toBe('Psalms-23:1');
    });

    it('should include createdAt timestamp', async () => {
      const before = Date.now();
      const bookmark = await BibleStorage.addBookmark(
        'Genesis',
        '1',
        '1',
        'In the beginning...'
      );
      const after = Date.now();

      expect(bookmark.createdAt).toBeGreaterThanOrEqual(before);
      expect(bookmark.createdAt).toBeLessThanOrEqual(after);
    });

    it('should update existing bookmark with same verse', async () => {
      await BibleStorage.addBookmark('Genesis', '1', '1', 'Original text');
      await BibleStorage.addBookmark('Genesis', '1', '1', 'Updated text', 'New note');

      const bookmark = await BibleStorage.getBookmark('Genesis-1:1');

      expect(bookmark?.text).toBe('Updated text');
      expect(bookmark?.note).toBe('New note');
    });
  });

  describe('removeBookmark()', () => {
    it('should remove an existing bookmark', async () => {
      await BibleStorage.addBookmark('Genesis', '1', '1', 'Test text');

      await BibleStorage.removeBookmark('Genesis-1:1');

      const bookmark = await BibleStorage.getBookmark('Genesis-1:1');
      expect(bookmark).toBeNull();
    });

    it('should not throw when removing non-existent bookmark', async () => {
      await expect(
        BibleStorage.removeBookmark('NonExistent-1:1')
      ).resolves.not.toThrow();
    });

    it('should only remove the specified bookmark', async () => {
      await BibleStorage.addBookmark('Genesis', '1', '1', 'Text 1');
      await BibleStorage.addBookmark('Genesis', '1', '2', 'Text 2');

      await BibleStorage.removeBookmark('Genesis-1:1');

      const bookmark1 = await BibleStorage.getBookmark('Genesis-1:1');
      const bookmark2 = await BibleStorage.getBookmark('Genesis-1:2');

      expect(bookmark1).toBeNull();
      expect(bookmark2).not.toBeNull();
    });
  });

  describe('getBookmark()', () => {
    it('should return null for non-existent bookmark', async () => {
      const bookmark = await BibleStorage.getBookmark('NonExistent-1:1');

      expect(bookmark).toBeNull();
    });

    it('should retrieve existing bookmark by ID', async () => {
      await BibleStorage.addBookmark('Genesis', '1', '1', 'Test text', 'Test note');

      const bookmark = await BibleStorage.getBookmark('Genesis-1:1');

      expect(bookmark).toEqual({
        id: 'Genesis-1:1',
        book: 'Genesis',
        chapter: '1',
        verse: '1',
        text: 'Test text',
        note: 'Test note',
        createdAt: expect.any(Number),
      });
    });
  });

  describe('getAllBookmarks()', () => {
    it('should return empty array when no bookmarks exist', async () => {
      const bookmarks = await BibleStorage.getAllBookmarks();

      expect(bookmarks).toEqual([]);
    });

    it('should return all saved bookmarks', async () => {
      await BibleStorage.addBookmark('Genesis', '1', '1', 'Text 1');
      await BibleStorage.addBookmark('John', '3', '16', 'Text 2');
      await BibleStorage.addBookmark('Psalms', '23', '1', 'Text 3');

      const bookmarks = await BibleStorage.getAllBookmarks();

      expect(bookmarks).toHaveLength(3);
    });

    it('should return bookmarks sorted by createdAt (most recent first)', async () => {
      // Add bookmarks with small delays to ensure different timestamps
      await BibleStorage.addBookmark('Genesis', '1', '1', 'Text 1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await BibleStorage.addBookmark('John', '3', '16', 'Text 2');
      await new Promise(resolve => setTimeout(resolve, 10));
      await BibleStorage.addBookmark('Psalms', '23', '1', 'Text 3');

      const bookmarks = await BibleStorage.getAllBookmarks();

      // Most recent first (Psalms was added last)
      expect(bookmarks[0].book).toBe('Psalms');
      expect(bookmarks[2].book).toBe('Genesis');
    });
  });

  describe('isBookmarked()', () => {
    it('should return false when verse is not bookmarked', async () => {
      const result = await BibleStorage.isBookmarked('Genesis', '1', '1');

      expect(result).toBe(false);
    });

    it('should return true when verse is bookmarked', async () => {
      await BibleStorage.addBookmark('Genesis', '1', '1', 'Test text');

      const result = await BibleStorage.isBookmarked('Genesis', '1', '1');

      expect(result).toBe(true);
    });

    it('should return false after bookmark is removed', async () => {
      await BibleStorage.addBookmark('Genesis', '1', '1', 'Test text');
      await BibleStorage.removeBookmark('Genesis-1:1');

      const result = await BibleStorage.isBookmarked('Genesis', '1', '1');

      expect(result).toBe(false);
    });
  });

  describe('clearAll()', () => {
    it('should clear all reading positions', async () => {
      await BibleStorage.saveReadingPosition(1, 1, 1, 0);

      await BibleStorage.clearAll();

      const position = await BibleStorage.getReadingPosition();
      expect(position).toBeNull();
    });

    it('should clear all preferences', async () => {
      await BibleStorage.savePreference('theme', 'dark');
      await BibleStorage.savePreference('fontSize', 16);

      await BibleStorage.clearAll();

      const theme = await BibleStorage.getPreference('theme');
      const fontSize = await BibleStorage.getPreference('fontSize');
      expect(theme).toBeNull();
      expect(fontSize).toBeNull();
    });

    it('should clear all cached Bible content', async () => {
      const mockBook = {
        book: 'Genesis',
        index: 0,
        chapters: [],
      };
      await BibleStorage.cacheBibleBook('Genesis', mockBook);

      await BibleStorage.clearAll();

      const cached = await BibleStorage.getCachedBibleBook('Genesis');
      expect(cached).toBeNull();
    });

    it('should not affect bookmarks store', async () => {
      // Note: clearAll() only clears readingPositions, preferences, bibleContent
      // Not bookmarks - verify this behavior
      await BibleStorage.addBookmark('Genesis', '1', '1', 'Test');

      await BibleStorage.clearAll();

      // Bookmarks should still exist (based on the implementation)
      const bookmarks = await BibleStorage.getAllBookmarks();
      expect(bookmarks).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle database open timeout gracefully', async () => {
      vi.useFakeTimers();

      // Mock indexedDB.open to never resolve
      const originalOpen = indexedDB.open;
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        const request = originalOpen.call(indexedDB, 'NeverResolve', 1);
        // Don't trigger success or error events
        request.onsuccess = null;
        request.onerror = null;
        return request;
      });

      // Reset module to get fresh instance
      vi.resetModules();
      const module = await import('./BibleStorage');
      const freshStorage = module.default;

      const initPromise = freshStorage.init();

      // Advance time past timeout
      vi.advanceTimersByTime(6000);

      await expect(initPromise).rejects.toThrow('Database open timeout');

      vi.useRealTimers();
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple simultaneous reads', async () => {
      await BibleStorage.saveReadingPosition(1, 1, 1, 0);
      await BibleStorage.savePreference('test', 'value');

      const [position, pref] = await Promise.all([
        BibleStorage.getReadingPosition(),
        BibleStorage.getPreference('test'),
      ]);

      expect(position?.book).toBe(1);
      expect(pref).toBe('value');
    });

    it('should handle rapid sequential writes', async () => {
      const writes = [];
      for (let i = 0; i < 10; i++) {
        writes.push(BibleStorage.savePreference(`key${i}`, `value${i}`));
      }

      await Promise.all(writes);

      const value5 = await BibleStorage.getPreference('key5');
      expect(value5).toBe('value5');
    });
  });

  describe('addNote()', () => {
    it('should add a note with all fields', async () => {
      const note = await BibleStorage.addNote('Genesis', '1', '1', 'My note');

      expect(note).toEqual({
        id: expect.any(String),
        book: 'Genesis',
        chapter: '1',
        verse: '1',
        content: 'My note',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it('should generate unique IDs for each note', async () => {
      const note1 = await BibleStorage.addNote('Genesis', '1', '1', 'Note 1');
      const note2 = await BibleStorage.addNote('Genesis', '1', '1', 'Note 2');

      expect(note1.id).not.toBe(note2.id);
    });

    it('should set createdAt and updatedAt to the same value initially', async () => {
      const note = await BibleStorage.addNote('Genesis', '1', '1', 'My note');

      expect(note.createdAt).toBe(note.updatedAt);
    });
  });

  describe('getNotesForVerse()', () => {
    it('should return empty array when no notes exist', async () => {
      const notes = await BibleStorage.getNotesForVerse('Genesis', '1', '1');

      expect(notes).toEqual([]);
    });

    it('should return notes for a specific verse', async () => {
      await BibleStorage.addNote('Genesis', '1', '1', 'Note for Gen 1:1');
      await BibleStorage.addNote('Genesis', '1', '2', 'Note for Gen 1:2');

      const notes = await BibleStorage.getNotesForVerse('Genesis', '1', '1');

      expect(notes).toHaveLength(1);
      expect(notes[0].content).toBe('Note for Gen 1:1');
    });

    it('should return multiple notes for the same verse', async () => {
      await BibleStorage.addNote('Genesis', '1', '1', 'First note');
      await new Promise(resolve => setTimeout(resolve, 10));
      await BibleStorage.addNote('Genesis', '1', '1', 'Second note');

      const notes = await BibleStorage.getNotesForVerse('Genesis', '1', '1');

      expect(notes).toHaveLength(2);
    });

    it('should return notes sorted by updatedAt descending', async () => {
      await BibleStorage.addNote('Genesis', '1', '1', 'Older note');
      await new Promise(resolve => setTimeout(resolve, 10));
      await BibleStorage.addNote('Genesis', '1', '1', 'Newer note');

      const notes = await BibleStorage.getNotesForVerse('Genesis', '1', '1');

      expect(notes[0].content).toBe('Newer note');
      expect(notes[1].content).toBe('Older note');
    });
  });

  describe('updateNote()', () => {
    it('should update note content', async () => {
      const note = await BibleStorage.addNote('Genesis', '1', '1', 'Original');

      const updated = await BibleStorage.updateNote(note.id, 'Updated');

      expect(updated.content).toBe('Updated');
    });

    it('should update the updatedAt timestamp', async () => {
      const note = await BibleStorage.addNote('Genesis', '1', '1', 'Original');
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await BibleStorage.updateNote(note.id, 'Updated');

      expect(updated.updatedAt).toBeGreaterThan(note.updatedAt);
      expect(updated.createdAt).toBe(note.createdAt);
    });

    it('should throw when note does not exist', async () => {
      await expect(
        BibleStorage.updateNote('nonexistent-id', 'content')
      ).rejects.toThrow('Note not found');
    });
  });

  describe('deleteNote()', () => {
    it('should delete an existing note', async () => {
      const note = await BibleStorage.addNote('Genesis', '1', '1', 'To delete');

      await BibleStorage.deleteNote(note.id);

      const notes = await BibleStorage.getNotesForVerse('Genesis', '1', '1');
      expect(notes).toHaveLength(0);
    });

    it('should only delete the specified note', async () => {
      const note1 = await BibleStorage.addNote('Genesis', '1', '1', 'Keep');
      const note2 = await BibleStorage.addNote('Genesis', '1', '1', 'Delete');

      await BibleStorage.deleteNote(note2.id);

      const notes = await BibleStorage.getNotesForVerse('Genesis', '1', '1');
      expect(notes).toHaveLength(1);
      expect(notes[0].content).toBe('Keep');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string preference value', async () => {
      await BibleStorage.savePreference('emptyString', '');

      const value = await BibleStorage.getPreference('emptyString');

      expect(value).toBe('');
    });

    it('should handle null preference value', async () => {
      await BibleStorage.savePreference('nullValue', null);

      const value = await BibleStorage.getPreference('nullValue');

      expect(value).toBeNull();
    });

    it('should handle undefined preference value', async () => {
      await BibleStorage.savePreference('undefinedValue', undefined);

      const value = await BibleStorage.getPreference('undefinedValue');

      expect(value).toBeUndefined();
    });

    it('should handle very large scroll position values', async () => {
      await BibleStorage.saveReadingPosition(1, 1, 1, 999999999);

      const position = await BibleStorage.getReadingPosition();

      expect(position?.scrollPosition).toBe(999999999);
    });

    it('should handle special characters in bookmark text', async () => {
      const specialText = '<script>alert("xss")</script> & "quotes" \'apostrophes\'';
      await BibleStorage.addBookmark('Genesis', '1', '1', specialText);

      const bookmark = await BibleStorage.getBookmark('Genesis-1:1');

      expect(bookmark?.text).toBe(specialText);
    });

    it('should handle unicode in bookmark note', async () => {
      const unicodeNote = '📖 希伯來書 Ελληνικά العربية';
      await BibleStorage.addBookmark('Genesis', '1', '1', 'Test', unicodeNote);

      const bookmark = await BibleStorage.getBookmark('Genesis-1:1');

      expect(bookmark?.note).toBe(unicodeNote);
    });

    it('should handle zero values in reading position', async () => {
      await BibleStorage.saveReadingPosition(0, 0, 0, 0);

      const position = await BibleStorage.getReadingPosition();

      expect(position?.book).toBe(0);
      expect(position?.chapter).toBe(0);
      expect(position?.verse).toBe(0);
      expect(position?.scrollPosition).toBe(0);
    });
  });

  describe('putVerses()', () => {
    it('should store verse records', async () => {
      const verses = [
        { id: 'Genesis-1:1', book: 'Genesis', bookIndex: 0, chapter: '1', verse: '1', text: 'In the beginning...' },
        { id: 'Genesis-1:2', book: 'Genesis', bookIndex: 0, chapter: '1', verse: '2', text: 'And the earth was...' },
      ];

      await BibleStorage.putVerses(verses);

      const results = await BibleStorage.getVersesByIds(['Genesis-1:1', 'Genesis-1:2']);
      expect(results).toHaveLength(2);
      expect(results[0].text).toBe('In the beginning...');
    });
  });

  describe('putSearchIndexEntries()', () => {
    it('should store search index entries', async () => {
      const entries = [
        { word: 'beginning', refs: ['Genesis-1:1', 'John-1:1'] },
        { word: 'earth', refs: ['Genesis-1:1', 'Genesis-1:2'] },
      ];

      await BibleStorage.putSearchIndexEntries(entries);

      const result = await BibleStorage.getSearchIndexEntry('beginning');
      expect(result).not.toBeNull();
      expect(result!.refs).toEqual(['Genesis-1:1', 'John-1:1']);
    });
  });

  describe('getSearchIndexEntry()', () => {
    it('should return null for non-existent word', async () => {
      const result = await BibleStorage.getSearchIndexEntry('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getVersesByIds()', () => {
    it('should return only existing verses', async () => {
      const verses = [
        { id: 'Genesis-1:1', book: 'Genesis', bookIndex: 0, chapter: '1', verse: '1', text: 'Test' },
      ];
      await BibleStorage.putVerses(verses);

      const results = await BibleStorage.getVersesByIds(['Genesis-1:1', 'NonExistent-1:1']);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('Genesis-1:1');
    });

    it('should return empty array for no matching IDs', async () => {
      const results = await BibleStorage.getVersesByIds(['NonExistent-1:1']);
      expect(results).toHaveLength(0);
    });
  });

  describe('getVerseCount()', () => {
    it('should return 0 when no verses stored', async () => {
      const count = await BibleStorage.getVerseCount();
      expect(count).toBe(0);
    });

    it('should return correct count after storing verses', async () => {
      const verses = [
        { id: 'Genesis-1:1', book: 'Genesis', bookIndex: 0, chapter: '1', verse: '1', text: 'Test 1' },
        { id: 'Genesis-1:2', book: 'Genesis', bookIndex: 0, chapter: '1', verse: '2', text: 'Test 2' },
        { id: 'Genesis-1:3', book: 'Genesis', bookIndex: 0, chapter: '1', verse: '3', text: 'Test 3' },
      ];
      await BibleStorage.putVerses(verses);

      const count = await BibleStorage.getVerseCount();
      expect(count).toBe(3);
    });
  });
});
