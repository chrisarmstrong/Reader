# Test Implementation Brief

## Context

This is a Next.js 15 Bible Reader PWA application with the following stack:
- **Framework:** Next.js 15 with React 18 & TypeScript
- **UI:** Mantine Core v8
- **Testing:** Vitest with Testing Library (already set up)

## Current Status

✅ **Testing infrastructure is fully configured:**
- Vitest v1.6.1 with React plugin
- @testing-library/react, @testing-library/jest-dom
- fake-indexeddb for database mocking
- happy-dom for DOM environment
- Test scripts: `npm test`, `npm run test:run`, `npm run test:coverage`
- Configuration files: `vitest.config.ts`, `vitest.setup.ts`, `tsconfig.vitest.json`
- Example test: `utils/Debounce.test.ts` (7 passing tests)

## Your Task

Write comprehensive test suites for the **HIGH PRIORITY** areas listed below. These are the most critical parts of the application with complex logic and high risk of bugs.

---

## HIGH PRIORITY TEST AREAS

### 1. BibleStorage.ts (utils/BibleStorage.ts) - 377 lines
**Risk Level:** CRITICAL - Core database layer

**Test Coverage Needed:**
- Database initialization and upgrade paths
- Reading position CRUD operations
  - `savePosition()` - Save current reading position
  - `getPosition()` - Retrieve reading position
- Bookmark CRUD operations
  - `saveBookmark()` - Create bookmarks
  - `getBookmarks()` - Retrieve all bookmarks
  - `deleteBookmark()` - Delete specific bookmark
- Preference storage operations
  - `savePreference()` - Save user preferences
  - `getPreference()` - Retrieve preferences
- Bible content caching operations
- Error handling scenarios:
  - Database blocked
  - Timeout errors
  - Version upgrade failures
- Edge cases:
  - Concurrent access
  - Quota exceeded
  - Missing data

**Key Methods to Test:**
```typescript
class BibleStorage {
  savePosition(book: number, chapter: number, verse: number, scrollPosition: number): Promise<void>
  getPosition(): Promise<Position | null>
  saveBookmark(bookmark: Bookmark): Promise<void>
  getBookmarks(): Promise<Bookmark[]>
  deleteBookmark(id: string): Promise<void>
  savePreference(key: string, value: any): Promise<void>
  getPreference(key: string): Promise<any>
  saveBibleContent(content: BibleContent): Promise<void>
  getBibleContent(): Promise<BibleContent | null>
}
```

**Testing Notes:**
- fake-indexeddb is already configured in vitest.setup.ts
- Test both success and failure paths
- Verify data persistence across operations

---

### 2. migrateBibleStorage.ts (utils/migrateBibleStorage.ts) - 366 lines
**Risk Level:** CRITICAL - Data migration with loss risk

**Test Coverage Needed:**
- Successful migration scenarios:
  - Migrate reading positions
  - Migrate bookmarks
  - Migrate preferences
  - Migrate Bible content
- Empty database migration (no data to migrate)
- Corrupted data handling
- Timeout scenarios
- Database blocked scenarios
- Export functionality
- Import functionality
- Database deletion and recreation
- Data integrity verification after migration

**Key Functions to Test:**
```typescript
export async function migrateBibleStorage(): Promise<MigrationResult>
export async function exportData(): Promise<ExportedData>
export async function importData(data: ExportedData): Promise<void>
```

**Testing Notes:**
- Mock setTimeout/clearTimeout for timeout tests
- Verify no data loss during migration
- Test rollback scenarios if migration fails mid-process

---

### 3. Search Component (components/search/index.tsx) - 445 lines
**Risk Level:** HIGH - Complex search algorithm

**Test Coverage Needed:**
- Search algorithm functionality:
  - Single keyword search
  - Multi-keyword search (AND logic)
  - Case-insensitive matching
  - Partial word matching
- Scope filtering:
  - Search all books
  - Search specific book
  - Search Old Testament only
  - Search New Testament only
- Book navigation parsing:
  - "Genesis 1:1" → Navigate to verse
  - "John 3:16" → Navigate to verse
  - Invalid formats → Handle gracefully
- Search results rendering
- Performance with large result sets
- Edge cases:
  - Empty search query
  - Special characters in query
  - Unicode text search
  - No results found

**Component Interface:**
```typescript
interface SearchProps {
  onNavigate: (book: number, chapter: number, verse: number) => void;
  bibleContent: BibleContent;
}
```

**Testing Notes:**
- Use Testing Library for component tests
- Mock bible content data for predictable tests
- Test user interactions (typing, clicking results)
- Verify onNavigate callback is called correctly

---

### 4. useAudioPlayer.ts (utils/useAudioPlayer.ts) - 250 lines
**Risk Level:** HIGH - Web Speech API integration

**Test Coverage Needed:**
- Voice selection algorithm:
  - Prefer en-US voices
  - Fallback to other English voices
  - Handle no voices available
- Playback functionality:
  - Play single verse
  - Play multiple verses in sequence
  - Queue management
- Playback controls:
  - Play/pause toggle
  - Stop playback
  - Skip to next verse
- State management:
  - isPlaying state updates
  - currentVerse tracking
- Error handling:
  - Speech synthesis not supported
  - Voice loading failures
  - Playback interruptions

**Hook Interface:**
```typescript
const {
  isPlaying,
  currentVerse,
  play,
  pause,
  stop,
  playVerse,
  playVerses
} = useAudioPlayer();
```

**Testing Notes:**
- Mock window.speechSynthesis API
- Use renderHook from @testing-library/react
- Test voice selection priority logic
- Verify cleanup on unmount

---

### 5. useReadingPosition.ts (utils/useReadingPosition.ts) - 217 lines
**Risk Level:** HIGH - Critical persistence with fallback

**Test Coverage Needed:**
- IndexedDB persistence:
  - Save reading position to IndexedDB
  - Retrieve position from IndexedDB
  - Update position on scroll (debounced)
- localStorage fallback:
  - Fallback when IndexedDB fails
  - Read from localStorage
  - Write to localStorage
- Migration logic:
  - Migrate from localStorage to IndexedDB
  - Handle old storage format
- Scroll position debouncing:
  - Debounce updates properly
  - Don't lose position data
- Edge cases:
  - Both storage methods unavailable
  - Corrupted data in storage
  - Invalid position values

**Hook Interface:**
```typescript
const {
  currentPosition,
  savePosition,
  loadPosition
} = useReadingPosition();
```

**Testing Notes:**
- Mock both IndexedDB and localStorage
- Test debounce timing with vi.useFakeTimers()
- Verify fallback chain works correctly
- Test migration from old to new format

---

## Testing Guidelines

### File Naming
Place test files alongside source files:
- `utils/BibleStorage.ts` → `utils/BibleStorage.test.ts`
- `components/search/index.tsx` → `components/search/index.test.tsx`

### Test Structure
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ComponentOrFunction', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('specific functionality', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle error case', () => {
      // Test error scenarios
    });
  });
});
```

### Mocking Examples

**Mock IndexedDB (already auto-mocked):**
```typescript
import { describe, it, expect } from 'vitest';
import BibleStorage from './BibleStorage';

describe('BibleStorage', () => {
  it('should save and retrieve data', async () => {
    const storage = new BibleStorage();
    await storage.savePosition(1, 1, 1, 0);
    const position = await storage.getPosition();
    expect(position).toEqual({ book: 1, chapter: 1, verse: 1, scrollPosition: 0 });
  });
});
```

**Mock Timers:**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('should debounce calls', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 1000);

  debounced();
  debounced();

  vi.advanceTimersByTime(1000);
  expect(fn).toHaveBeenCalledTimes(1);
});
```

**Mock Web APIs:**
```typescript
const mockSpeechSynthesis = {
  getVoices: vi.fn(() => []),
  speak: vi.fn(),
  cancel: vi.fn()
};

beforeEach(() => {
  vi.stubGlobal('speechSynthesis', mockSpeechSynthesis);
});
```

**Mock React Hooks:**
```typescript
import { renderHook, waitFor } from '@testing-library/react';

it('should update state', async () => {
  const { result } = renderHook(() => useCustomHook());

  result.current.updateValue('new');

  await waitFor(() => {
    expect(result.current.value).toBe('new');
  });
});
```

## Coverage Goals

- **Overall target:** 70-80%
- **These critical areas:** Aim for 90%+ coverage
- **Focus on:** Business logic, error handling, edge cases
- **Don't over-test:** UI rendering details, simple getters/setters

## Running Tests

```bash
# Watch mode (auto-run on changes)
npm test

# Run once
npm run test:run

# Coverage report
npm run test:coverage
```

## Success Criteria

✅ All test suites pass
✅ No TypeScript errors
✅ Coverage reports generated
✅ Tests cover success paths
✅ Tests cover error handling
✅ Tests cover edge cases
✅ Tests are maintainable and well-documented

## Additional Context

- See `TESTING.md` for detailed testing guide
- See `utils/Debounce.test.ts` for example test structure
- All Vitest globals (describe, it, expect, vi) are available
- IndexedDB is automatically mocked via fake-indexeddb

---

## Skill: Expert Test Writer

You are an expert at writing comprehensive, maintainable tests. When writing tests:

1. **Test behavior, not implementation** - Focus on what the code does, not how it does it
2. **Use descriptive test names** - "should save bookmark when valid data provided"
3. **Follow AAA pattern** - Arrange, Act, Assert
4. **Test happy path first** - Then error cases, then edge cases
5. **Mock external dependencies** - APIs, timers, storage, etc.
6. **Keep tests isolated** - Each test should be independent
7. **Don't test framework code** - Focus on business logic
8. **Write clear assertions** - Use specific matchers (toEqual, toContain, etc.)
9. **Test one thing per test** - Small, focused tests are better
10. **Clean up after tests** - Reset mocks, clear timers, restore state

**Your testing philosophy:**
- Tests should serve as documentation
- Tests should catch regressions
- Tests should be fast and reliable
- Tests should be easy to understand and maintain
- Good test names eliminate need for comments

**Common patterns you use:**
- beforeEach/afterEach for setup/cleanup
- describe blocks for grouping related tests
- vi.fn() for mock functions
- vi.useFakeTimers() for time-based tests
- renderHook() for custom hooks
- render() + screen for components
- waitFor() for async operations

Now write comprehensive test suites for the 5 high-priority areas above.
