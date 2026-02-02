import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioPlayer } from './useAudioPlayer';
import type { Book } from '../types/bible';

// Mock scrollToVerse
vi.mock('./scrollToVerse', () => ({
  scrollToVerse: vi.fn(),
}));

// Create mock speech synthesis
const createMockSpeechSynthesis = (
  voices: SpeechSynthesisVoice[] = []
) => {
  const listeners: { [key: string]: Function[] } = {};

  return {
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    speaking: false,
    paused: false,
    pending: false,
    addEventListener: vi.fn((event: string, handler: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(h => h !== handler);
      }
    }),
    dispatchEvent: vi.fn((event: Event) => {
      if (listeners[event.type]) {
        listeners[event.type].forEach(h => h(event));
      }
      return true;
    }),
    onvoiceschanged: null,
  };
};

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  lang: string = 'en-US';
  rate: number = 1;
  pitch: number = 1;
  volume: number = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onstart: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

// Create mock voices
const createMockVoice = (name: string, lang: string): SpeechSynthesisVoice => ({
  name,
  lang,
  voiceURI: name,
  localService: true,
  default: false,
});

const mockVoices: SpeechSynthesisVoice[] = [
  createMockVoice('Google US English', 'en-US'),
  createMockVoice('Microsoft David', 'en-US'),
];

// Mock book data
const mockBook: Book = {
  book: 'Genesis',
  index: 0,
  chapters: [
    {
      chapter: '1',
      verses: [
        { verse: '1', text: 'In the beginning God created the heaven and the earth.' },
        { verse: '2', text: 'And the earth was without form, and void.' },
        { verse: '3', text: 'And God said, Let there be light.' },
      ],
    },
    {
      chapter: '2',
      verses: [
        { verse: '1', text: 'Thus the heavens and the earth were finished.' },
      ],
    },
  ],
};

describe('useAudioPlayer', () => {
  let mockSpeechSynthesis: ReturnType<typeof createMockSpeechSynthesis>;

  beforeEach(() => {
    mockSpeechSynthesis = createMockSpeechSynthesis(mockVoices);
    vi.stubGlobal('speechSynthesis', mockSpeechSynthesis);
    vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with isPlaying as false', () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));
      expect(result.current.isPlaying).toBe(false);
    });

    it('should detect speech synthesis support', () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));
      expect(result.current.isSupported).toBe(true);
    });

    it('should initialize with currentVerseId as null', () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));
      expect(result.current.currentVerseId).toBeNull();
    });

    it('should return isSupported as false when speechSynthesis is not available', () => {
      vi.stubGlobal('speechSynthesis', undefined);
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));
      expect(result.current.isSupported).toBe(false);
    });

    it('should return all expected properties', () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      expect(result.current).toHaveProperty('isPlaying');
      expect(result.current).toHaveProperty('isSupported');
      expect(result.current).toHaveProperty('currentVerseId');
      expect(result.current).toHaveProperty('play');
      expect(result.current).toHaveProperty('pause');
      expect(result.current).toHaveProperty('togglePlayPause');
    });

    it('should have function types for play, pause, togglePlayPause', () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      expect(typeof result.current.play).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.togglePlayPause).toBe('function');
    });
  });

  describe('hook behavior', () => {
    it('should handle undefined book gracefully', () => {
      const { result } = renderHook(() => useAudioPlayer({ book: undefined }));

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentVerseId).toBeNull();
    });

    it('should handle book with no chapters gracefully', () => {
      const emptyBook: Book = {
        book: 'Empty',
        index: 0,
        chapters: [],
      };

      const { result } = renderHook(() => useAudioPlayer({ book: emptyBook }));

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isSupported).toBe(true);
    });

    it('should cancel speech on unmount', () => {
      const { unmount } = renderHook(() => useAudioPlayer({ book: mockBook }));

      unmount();

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  describe('voice selection logic', () => {
    it('should call getVoices on initialization', () => {
      renderHook(() => useAudioPlayer({ book: mockBook }));

      expect(mockSpeechSynthesis.getVoices).toHaveBeenCalled();
    });

    it('should add voiceschanged event listener', () => {
      renderHook(() => useAudioPlayer({ book: mockBook }));

      expect(mockSpeechSynthesis.addEventListener).toHaveBeenCalledWith(
        'voiceschanged',
        expect.any(Function)
      );
    });

    it('should remove voiceschanged event listener on unmount', () => {
      const { unmount } = renderHook(() => useAudioPlayer({ book: mockBook }));

      unmount();

      expect(mockSpeechSynthesis.removeEventListener).toHaveBeenCalledWith(
        'voiceschanged',
        expect.any(Function)
      );
    });
  });

  describe('play function behavior', () => {
    it('should be callable with chapter number', async () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      // The play function should not throw when called
      await act(async () => {
        await result.current.play(1);
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('should be callable with chapter and verse', async () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      await act(async () => {
        await result.current.play(1, 2);
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.currentVerseId).toBe('1:2');
    });
  });

  describe('pause function behavior', () => {
    it('should reset state when pause is called', async () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      await act(async () => {
        await result.current.play(1);
      });

      await act(async () => {
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentVerseId).toBeNull();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  describe('togglePlayPause function behavior', () => {
    it('should start playing when not playing', async () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      expect(result.current.isPlaying).toBe(false);

      await act(async () => {
        await result.current.togglePlayPause(1);
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('should stop playing when already playing', async () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      await act(async () => {
        await result.current.play(1);
      });

      expect(result.current.isPlaying).toBe(true);

      await act(async () => {
        result.current.togglePlayPause(1);
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('verse queue behavior', () => {
    it('should advance to next verse when onend is triggered', async () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      await act(async () => {
        await result.current.play(1, 1);
      });

      const utterance = mockSpeechSynthesis.speak.mock.calls[0][0];

      await act(async () => {
        utterance.onend?.();
      });

      expect(result.current.currentVerseId).toBe('1:2');
    });

    it('should stop playing when last verse ends', async () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      await act(async () => {
        await result.current.play(1, 3);
      });

      const utterance = mockSpeechSynthesis.speak.mock.calls[0][0];

      await act(async () => {
        utterance.onend?.();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should continue on error', async () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      await act(async () => {
        await result.current.play(1, 1);
      });

      const utterance = mockSpeechSynthesis.speak.mock.calls[0][0];

      await act(async () => {
        utterance.onerror?.();
      });

      // Should advance despite error
      expect(result.current.currentVerseId).toBe('1:2');
    });
  });

  describe('speechSynthesis interactions', () => {
    it('should call speak with utterance', async () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      await act(async () => {
        await result.current.play(1, 1);
      });

      expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(
        expect.any(MockSpeechSynthesisUtterance)
      );
    });

    it('should create utterance with verse text', async () => {
      const { result } = renderHook(() => useAudioPlayer({ book: mockBook }));

      await act(async () => {
        await result.current.play(1, 1);
      });

      const utterance = mockSpeechSynthesis.speak.mock.calls[0][0];
      expect(utterance.text).toBe('In the beginning God created the heaven and the earth.');
    });
  });
});
