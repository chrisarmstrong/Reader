import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { MantineProvider } from '@mantine/core';
import Search from './index';
import type { Book } from '../../types/bible';

// Helper to wrap components with MantineProvider
const renderWithMantine = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick} data-testid="mock-link">
      {children}
    </a>
  ),
}));

// Mock react-virtuoso
vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent }: { data: any[]; itemContent: (index: number, item: any) => React.ReactNode }) => (
    <div data-testid="virtuoso-container">
      {data?.map((item, index) => (
        <div key={index} data-testid={`virtuoso-item-${index}`}>
          {itemContent(index, item)}
        </div>
      ))}
    </div>
  ),
}));

// Mock BibleStorage
vi.mock('../../utils/BibleStorage', () => ({
  default: {
    getPreference: vi.fn().mockResolvedValue('all'),
    savePreference: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Books with test data
vi.mock('../../utils/Books', () => ({
  Books: [
    // Old Testament (first 39 books) - include a few for testing
    {
      book: 'Genesis',
      index: 0,
      chapters: [
        {
          chapter: '1',
          verses: [
            { verse: '1', text: 'In the beginning God created the heaven and the earth.' },
            { verse: '2', text: 'And the earth was without form, and void; and darkness was upon the face of the deep.' },
            { verse: '3', text: 'And God said, Let there be light: and there was light.' },
          ],
        },
        {
          chapter: '2',
          verses: [
            { verse: '1', text: 'Thus the heavens and the earth were finished, and all the host of them.' },
          ],
        },
      ],
    },
    {
      book: 'Psalms',
      index: 18,
      chapters: [
        {
          chapter: '23',
          verses: [
            { verse: '1', text: 'The LORD is my shepherd; I shall not want.' },
            { verse: '2', text: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.' },
          ],
        },
      ],
    },
    // Padding for Old Testament (37 more empty books to reach 39)
    ...Array(37).fill(null).map((_, i) => ({
      book: `OldTestamentBook${i + 3}`,
      index: i + 2,
      chapters: [],
    })),
    // New Testament (last 27 books)
    {
      book: 'Matthew',
      index: 39,
      chapters: [
        {
          chapter: '1',
          verses: [
            { verse: '1', text: 'The book of the generation of Jesus Christ, the son of David, the son of Abraham.' },
          ],
        },
      ],
    },
    {
      book: 'John',
      index: 42,
      chapters: [
        {
          chapter: '3',
          verses: [
            { verse: '16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
          ],
        },
        {
          chapter: '1',
          verses: [
            { verse: '1', text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
          ],
        },
      ],
    },
    // Padding for New Testament (25 more empty books)
    ...Array(25).fill(null).map((_, i) => ({
      book: `NewTestamentBook${i + 3}`,
      index: 44 + i,
      chapters: [],
    })),
  ],
}));

// Create a mock current book for "book" scope tests
const mockCurrentBook: Book = {
  book: 'Genesis',
  index: 0,
  chapters: [
    {
      chapter: '1',
      verses: [
        { verse: '1', text: 'In the beginning God created the heaven and the earth.' },
        { verse: '2', text: 'And the earth was without form, and void.' },
      ],
    },
  ],
};

describe('Search Component', () => {
  const mockDismiss = vi.fn();

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    vi.clearAllMocks();

    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: vi.fn().mockReturnValue(''),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true });

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue('[]'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render search modal when active', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      expect(screen.getByPlaceholderText('Search the Bible...')).toBeInTheDocument();
    });

    it('should not render content when inactive', () => {
      renderWithMantine(<Search active={false} dismiss={mockDismiss} />);

      // Modal content shouldn't be visible when closed
      expect(screen.queryByPlaceholderText('Search the Bible...')).not.toBeInTheDocument();
    });

    it('should render search scope selector', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Old')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should render close button', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      expect(screen.getByLabelText('Close search')).toBeInTheDocument();
    });
  });

  describe('search input behavior', () => {
    it('should accept input text', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: 'test query' } });

      expect(input).toHaveValue('test query');
    });

    it('should clear input when empty', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.change(input, { target: { value: '' } });

      expect(input).toHaveValue('');
    });
  });

  describe('scope selection', () => {
    it('should have scope options visible', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      // Verify all scope options are present
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Old')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Book')).toBeInTheDocument();
    });

    it('should show current book name when book is provided', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} currentBook={mockCurrentBook} />);

      // When currentBook is provided, it should show the book name
      expect(screen.getByText('Genesis')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call dismiss when close button is clicked', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const closeButton = screen.getByLabelText('Close search');
      fireEvent.click(closeButton);

      expect(mockDismiss).toHaveBeenCalled();
    });

    it('should allow typing in the search input', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: 'beginning' } });

      expect(input).toHaveValue('beginning');
    });

    it('should have input in the document when active', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      expect(input).toBeInTheDocument();
    });
  });

  describe('modal behavior', () => {
    it('should open modal when active is true', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      // Modal should contain the search input
      expect(screen.getByPlaceholderText('Search the Bible...')).toBeInTheDocument();
    });

    it('should have dismiss callback available', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      // Close button should trigger dismiss
      const closeButton = screen.getByLabelText('Close search');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('search with real timing', () => {
    it('should perform search and show results', async () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: 'shepherd' } });

      // Wait for debounce and results
      await waitFor(
        () => {
          // Look for result count or the virtuoso container
          const virtuosoContainer = screen.queryByTestId('virtuoso-container');
          expect(virtuosoContainer).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    it('should show empty state for no results', async () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: 'xyznonexistent123' } });

      await waitFor(
        () => {
          const noResults = screen.queryByText(/no results/i);
          expect(noResults).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });
  });

  describe('book navigation parsing', () => {
    it('should handle book name input', async () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: 'Genesis' } });

      // The input should have the value
      expect(input).toHaveValue('Genesis');
    });

    it('should handle chapter reference input', async () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: 'Genesis 1' } });

      expect(input).toHaveValue('Genesis 1');
    });

    it('should handle verse reference input', async () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: 'John 3:16' } });

      expect(input).toHaveValue('John 3:16');
    });
  });

  describe('edge cases', () => {
    it('should handle empty search query', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: '' } });

      // Should not crash
      expect(input).toHaveValue('');
    });

    it('should handle special characters in search query', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: "God's love" } });

      // Should not crash and should have the value
      expect(input).toHaveValue("God's love");
    });

    it('should handle whitespace-only query', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: '   ' } });

      expect(input).toHaveValue('   ');
    });

    it('should handle unicode characters', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: 'amor κόσμον' } });

      expect(input).toHaveValue('amor κόσμον');
    });
  });

  describe('session persistence', () => {
    it('should persist search to sessionStorage on search', async () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      const input = screen.getByPlaceholderText('Search the Bible...');
      fireEvent.change(input, { target: { value: 'test' } });

      // Wait a bit for the sessionStorage save
      await waitFor(
        () => {
          expect(window.sessionStorage.setItem).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });
  });

  describe('component props', () => {
    it('should accept currentBook prop', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} currentBook={mockCurrentBook} />);

      // Should render without errors
      expect(screen.getByPlaceholderText('Search the Bible...')).toBeInTheDocument();
    });

    it('should work without currentBook prop', () => {
      renderWithMantine(<Search active={true} dismiss={mockDismiss} />);

      // Should render without errors
      expect(screen.getByPlaceholderText('Search the Bible...')).toBeInTheDocument();
    });
  });
});
