import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

// Must mock BibleStorage before importing the hook
vi.mock('./BibleStorage', () => ({
  default: {
    getReadingPosition: vi.fn(),
    saveReadingPosition: vi.fn(),
    cacheBibleBook: vi.fn(),
    getCachedBibleBook: vi.fn(),
  },
}));

// Mock Books
vi.mock('./Books', () => ({
  Books: [
    { book: 'Genesis', index: 0, chapters: [] },
    { book: 'Exodus', index: 1, chapters: [] },
    { book: 'John', index: 42, chapters: [] },
  ],
}));

import { useReadingPosition, useBibleContent } from './useReadingPosition';
import BibleStorage from './BibleStorage';
import type { Book } from '../types/bible';

describe('useReadingPosition', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Reset IndexedDB
    globalThis.indexedDB = new IDBFactory();

    // Mock localStorage
    localStorageMock = {};
    const localStorageImpl = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageImpl });

    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

    // Reset mocks
    vi.clearAllMocks();
    vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(null);
    vi.mocked(BibleStorage.saveReadingPosition).mockResolvedValue({
      id: 'current',
      book: 0,
      chapter: 1,
      verse: 1,
      scrollPosition: 0,
      lastUpdated: Date.now(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with loading state true', () => {
      const { result } = renderHook(() => useReadingPosition());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
    });

    it('should set loading to false after position is loaded', async () => {
      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should return null position when no saved position exists', async () => {
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(null);

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentPosition).toBeNull();
    });
  });

  describe('IndexedDB persistence', () => {
    it('should retrieve position from IndexedDB', async () => {
      const savedPosition = {
        id: 'current',
        book: 5,
        chapter: 3,
        verse: 10,
        scrollPosition: 150,
        lastUpdated: Date.now(),
      };
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(savedPosition);

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.currentPosition).toEqual(savedPosition);
      });
    });

    it('should save position to IndexedDB', async () => {
      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.savePosition(5, 3, 10, 150);
      });

      expect(BibleStorage.saveReadingPosition).toHaveBeenCalledWith(5, 3, 10, 150);
    });

    it('should update currentPosition after save', async () => {
      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.savePosition(5, 3, 10, 150);
      });

      expect(result.current.currentPosition).toEqual({
        book: 5,
        chapter: 3,
        verse: 10,
        scrollPosition: 150,
        lastUpdated: expect.any(Number),
      });
    });
  });

  describe('localStorage fallback', () => {
    it('should fallback to localStorage when IndexedDB returns null', async () => {
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(null);
      localStorageMock['lastPosition'] = JSON.stringify({
        book: 10,
        chapter: 5,
        verse: 3,
      });

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.currentPosition?.book).toBe(10);
        expect(result.current.currentPosition?.chapter).toBe(5);
      });
    });

    it('should migrate localStorage data to IndexedDB', async () => {
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(null);
      localStorageMock['lastPosition'] = JSON.stringify({
        book: 10,
        chapter: 5,
        verse: 3,
      });

      renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(BibleStorage.saveReadingPosition).toHaveBeenCalledWith(10, 5, 3, 0);
      });
    });

    it('should use default verse 1 when verse is missing in localStorage', async () => {
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(null);
      localStorageMock['lastPosition'] = JSON.stringify({
        book: 10,
        chapter: 5,
        // No verse specified
      });

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.currentPosition?.verse).toBe(1);
      });
    });

    it('should fallback to localStorage when IndexedDB fails', async () => {
      vi.mocked(BibleStorage.getReadingPosition).mockRejectedValue(
        new Error('IndexedDB error')
      );
      localStorageMock['lastPosition'] = JSON.stringify({
        book: 15,
        chapter: 8,
        verse: 5,
      });

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.currentPosition?.book).toBe(15);
      });
    });

    it('should always save to localStorage as backup', async () => {
      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.savePosition(5, 3, 10, 150);
      });

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'lastPosition',
        JSON.stringify({ book: 5, chapter: 3, verse: 10 })
      );
    });
  });

  describe('savePosition', () => {
    it('should accept book as number', async () => {
      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.savePosition(5, 3, 10, 150);
      });

      expect(BibleStorage.saveReadingPosition).toHaveBeenCalledWith(5, 3, 10, 150);
    });

    it('should accept book as string and convert to index', async () => {
      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.savePosition('Genesis', 1, 1, 0);
      });

      expect(BibleStorage.saveReadingPosition).toHaveBeenCalledWith(0, 1, 1, 0);
    });

    it('should use default values for verse and scrollPosition', async () => {
      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.savePosition(5, 3);
      });

      expect(BibleStorage.saveReadingPosition).toHaveBeenCalledWith(5, 3, 1, 0);
    });

    it('should return the saved position', async () => {
      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let returnedPosition;
      await act(async () => {
        returnedPosition = await result.current.savePosition(5, 3, 10, 150);
      });

      expect(returnedPosition).toEqual({
        book: 5,
        chapter: 3,
        verse: 10,
        scrollPosition: 150,
        lastUpdated: expect.any(Number),
      });
    });

    it('should handle IndexedDB save failure gracefully', async () => {
      vi.mocked(BibleStorage.saveReadingPosition).mockRejectedValue(
        new Error('IndexedDB error')
      );
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.savePosition(5, 3, 10, 150);
      });

      // Should still save to localStorage
      expect(window.localStorage.setItem).toHaveBeenCalled();
      // Should log warning
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('IndexedDB save failed'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle localStorage save failure gracefully', async () => {
      vi.mocked(window.localStorage.setItem).mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.savePosition(5, 3, 10, 150);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('localStorage save failed'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('saveScrollPosition (debounced)', () => {
    it('should debounce scroll position updates', async () => {
      vi.useFakeTimers();

      const savedPosition = {
        id: 'current',
        book: 5,
        chapter: 3,
        verse: 1,
        scrollPosition: 0,
        lastUpdated: Date.now(),
      };
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(savedPosition);

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Make multiple rapid calls
      act(() => {
        result.current.saveScrollPosition(100);
        result.current.saveScrollPosition(200);
        result.current.saveScrollPosition(300);
      });

      // Should not have called save yet
      expect(BibleStorage.saveReadingPosition).toHaveBeenCalledTimes(0);

      // Advance past debounce delay
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      // Should only call once with the last value
      expect(BibleStorage.saveReadingPosition).toHaveBeenCalledTimes(1);
      expect(BibleStorage.saveReadingPosition).toHaveBeenCalledWith(5, 3, 1, 300);

      vi.useRealTimers();
    });

    it('should not save if currentPosition is null', async () => {
      vi.useFakeTimers();
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(null);

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.saveScrollPosition(100);
      });

      vi.advanceTimersByTime(1100);

      expect(BibleStorage.saveReadingPosition).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('saveCurrentScrollPosition', () => {
    it('should save current window.scrollY immediately', async () => {
      const savedPosition = {
        id: 'current',
        book: 5,
        chapter: 3,
        verse: 1,
        scrollPosition: 0,
        lastUpdated: Date.now(),
      };
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(savedPosition);

      Object.defineProperty(window, 'scrollY', { value: 500, writable: true });

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveCurrentScrollPosition();
      });

      expect(BibleStorage.saveReadingPosition).toHaveBeenCalledWith(5, 3, 1, 500);
    });

    it('should not save if currentPosition is null', async () => {
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(null);

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveCurrentScrollPosition();
      });

      expect(BibleStorage.saveReadingPosition).not.toHaveBeenCalled();
    });
  });

  describe('visibility change handling', () => {
    it('should save position when page becomes hidden', async () => {
      const savedPosition = {
        id: 'current',
        book: 5,
        chapter: 3,
        verse: 1,
        scrollPosition: 0,
        lastUpdated: Date.now(),
      };
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(savedPosition);

      Object.defineProperty(window, 'scrollY', { value: 750, writable: true });

      renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(BibleStorage.getReadingPosition).toHaveBeenCalled();
      });

      // Simulate visibility change to hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(BibleStorage.saveReadingPosition).toHaveBeenCalled();
      });
    });

    it('should not save when page becomes visible', async () => {
      const savedPosition = {
        id: 'current',
        book: 5,
        chapter: 3,
        verse: 1,
        scrollPosition: 0,
        lastUpdated: Date.now(),
      };
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(savedPosition);

      renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(BibleStorage.getReadingPosition).toHaveBeenCalled();
      });

      // Clear mock to track new calls
      vi.mocked(BibleStorage.saveReadingPosition).mockClear();

      // Simulate visibility change to visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Should not save on visible
      expect(BibleStorage.saveReadingPosition).not.toHaveBeenCalled();
    });
  });

  describe('beforeunload handling', () => {
    it('should save position before page unload', async () => {
      const savedPosition = {
        id: 'current',
        book: 5,
        chapter: 3,
        verse: 1,
        scrollPosition: 0,
        lastUpdated: Date.now(),
      };
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(savedPosition);

      Object.defineProperty(window, 'scrollY', { value: 1000, writable: true });

      renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(BibleStorage.getReadingPosition).toHaveBeenCalled();
      });

      act(() => {
        window.dispatchEvent(new Event('beforeunload'));
      });

      await waitFor(() => {
        expect(BibleStorage.saveReadingPosition).toHaveBeenCalled();
      });
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', async () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(addEventListenerSpy).toHaveBeenCalledWith(
          'visibilitychange',
          expect.any(Function)
        );
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle corrupted localStorage data', async () => {
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(null);
      localStorageMock['lastPosition'] = 'invalid json{';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should handle gracefully and not crash
      expect(result.current.currentPosition).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should handle both storage methods failing', async () => {
      vi.mocked(BibleStorage.getReadingPosition).mockRejectedValue(
        new Error('IndexedDB error')
      );
      vi.mocked(window.localStorage.getItem).mockImplementation(() => {
        throw new Error('localStorage error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentPosition).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle zero values in position', async () => {
      const savedPosition = {
        id: 'current',
        book: 0,
        chapter: 0,
        verse: 0,
        scrollPosition: 0,
        lastUpdated: Date.now(),
      };
      vi.mocked(BibleStorage.getReadingPosition).mockResolvedValue(savedPosition);

      const { result } = renderHook(() => useReadingPosition());

      await waitFor(() => {
        expect(result.current.currentPosition?.book).toBe(0);
        expect(result.current.currentPosition?.chapter).toBe(0);
      });
    });
  });
});

describe('useBibleContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(BibleStorage.cacheBibleBook).mockResolvedValue({
      book: 'Genesis',
      content: { book: 'Genesis', index: 0, chapters: [] },
      lastCached: Date.now(),
    });
    vi.mocked(BibleStorage.getCachedBibleBook).mockResolvedValue(null);
  });

  describe('cacheBibleBook', () => {
    it('should cache Bible book to storage', async () => {
      const { result } = renderHook(() => useBibleContent());

      const mockBook: Book = {
        book: 'Genesis',
        index: 0,
        chapters: [{ chapter: '1', verses: [{ verse: '1', text: 'In the beginning...' }] }],
      };

      await act(async () => {
        await result.current.cacheBibleBook('Genesis', mockBook);
      });

      expect(BibleStorage.cacheBibleBook).toHaveBeenCalledWith('Genesis', mockBook);
    });

    it('should handle cache errors gracefully', async () => {
      vi.mocked(BibleStorage.cacheBibleBook).mockRejectedValue(
        new Error('Storage error')
      );
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useBibleContent());

      const mockBook: Book = {
        book: 'Genesis',
        index: 0,
        chapters: [],
      };

      await act(async () => {
        await result.current.cacheBibleBook('Genesis', mockBook);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not cache Bible content'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getCachedBibleBook', () => {
    it('should retrieve cached Bible book', async () => {
      const cachedBook: Book = {
        book: 'Genesis',
        index: 0,
        chapters: [{ chapter: '1', verses: [{ verse: '1', text: 'Test' }] }],
      };
      vi.mocked(BibleStorage.getCachedBibleBook).mockResolvedValue(cachedBook);

      const { result } = renderHook(() => useBibleContent());

      let retrievedBook;
      await act(async () => {
        retrievedBook = await result.current.getCachedBibleBook('Genesis');
      });

      expect(retrievedBook).toEqual(cachedBook);
    });

    it('should return null when book is not cached', async () => {
      vi.mocked(BibleStorage.getCachedBibleBook).mockResolvedValue(null);

      const { result } = renderHook(() => useBibleContent());

      let retrievedBook;
      await act(async () => {
        retrievedBook = await result.current.getCachedBibleBook('NonExistent');
      });

      expect(retrievedBook).toBeNull();
    });

    it('should handle retrieval errors gracefully', async () => {
      vi.mocked(BibleStorage.getCachedBibleBook).mockRejectedValue(
        new Error('Storage error')
      );
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useBibleContent());

      let retrievedBook;
      await act(async () => {
        retrievedBook = await result.current.getCachedBibleBook('Genesis');
      });

      expect(retrievedBook).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not get cached Bible content'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
