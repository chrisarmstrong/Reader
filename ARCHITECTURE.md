# Architectural Analysis & Improvement Proposals

**Project**: KJV Bible Reader PWA
**Stack**: Next.js 15 (App Router), React 18, TypeScript 5.7, Mantine UI, IndexedDB, Vitest
**Date**: March 2026

---

## 1. Current Architecture Overview

### High-Level Summary

This is an **offline-first Progressive Web App** for reading the King James Version Bible. All 66 books are bundled as static JSON at build time. User data (reading position, bookmarks, notes) persists client-side via IndexedDB with localStorage fallback. There is no backend server — the app is fully self-contained after initial load.

### Component Tree

```
app/layout.tsx (MantineProvider + ServiceWorkerProvider)
└── app/page.tsx | app/[slug]/page.tsx
    └── Main (orchestrator)
        ├── NavBar (navigation controls, audio toggle)
        ├── Reader (chapter/verse rendering, scroll tracking)
        │   └── VerseDetails (Mantine Drawer: bookmark, note, share, cross-refs)
        ├── Search (Mantine Modal: full-text indexed search)
        ├── Bookmarks (virtualized list, scoped filtering)
        └── Contents (book picker, settings, random book)
```

### Data Flow

```
Static JSON (data/kjv/*.json)
    ↓ imported at build time
Books.ts (all 66 books in memory)
    ↓ passed as props
Main → Reader → DOM rendering
    ↓ background seeding on first load
IndexedDB (verses, searchIndex, crossReferences, redLetterVerses)
    ↓ queried at runtime
Search, VerseDetails, Bookmarks
```

### Key Metrics

| Metric | Value |
|--------|-------|
| Source files (non-test) | ~20 |
| Test files | 8 (3,133 lines total) |
| Total source lines | ~4,500 |
| Static data (KJV JSON) | ~5.6 MB |
| Cross-references JSON | ~5.6 MB |
| IndexedDB stores | 10 |
| External dependencies | 12 runtime, 8 dev |

---

## 2. Strengths

1. **Offline-first architecture** — Service worker + IndexedDB seeding makes the app fully functional offline after first load.

2. **Well-typed domain model** — `types/bible.ts` provides clean, comprehensive TypeScript interfaces covering all domain objects.

3. **Solid testing foundation** — 8 test suites with ~3,100 lines cover utilities, hooks, storage, and search. Tests use proper mocking (fake-indexeddb, happy-dom).

4. **Performance-conscious design** — Virtualized lists (`react-virtuoso`), memoized components, chunked IndexedDB seeding with `yieldToBrowser()`, IntersectionObserver for scroll tracking, CSS injection for styling (red letters, bookmarks) instead of per-render JS checks.

5. **Progressive enhancement** — Graceful fallback chain: IndexedDB → localStorage. Web Speech API detected and degraded when unavailable.

6. **Clean separation of concerns** — Types, utilities, hooks, and components are in separate directories. Custom hooks encapsulate state + persistence logic.

---

## 3. Architectural Issues

### 3.1 `BibleStorage` is a God Class (743 lines, 27+ methods)

**Problem**: A single class handles all 10 IndexedDB object stores — reading positions, preferences, bookmarks, notes, verses, search index, cross-references, chapters, red letter verses, and bible content caching. This violates the Single Responsibility Principle and makes the class difficult to maintain, test, or extend.

**Impact**: Any change to one store's logic risks regressions in others. The test file is 832 lines and growing. Adding a new store (e.g., highlights, reading plans) means touching this one monolithic file.

**Proposal**: Split into domain-specific storage modules that share a common IndexedDB connection manager:

```
utils/storage/
├── connection.ts          # DB init, version management, shared connection
├── readingPosition.ts     # save/get reading position
├── preferences.ts         # save/get preferences
├── bookmarks.ts           # CRUD bookmarks
├── notes.ts               # CRUD notes
├── verseStore.ts          # put/get verses, verse count
├── searchIndex.ts         # put/get search index entries
├── crossReferences.ts     # put/get cross-references
├── chapters.ts            # put/get chapter metadata
├── redLetterVerses.ts     # put/get red letter data
└── index.ts               # re-exports for backward compatibility
```

The `connection.ts` module would own the singleton `IDBDatabase` instance and the `onupgradeneeded` schema definition. Each domain module would import the connection and operate on its own store(s).

### 3.2 `Books.ts` Eagerly Imports the Entire Bible (~5.6 MB)

**Problem**: `Books.ts` statically imports all 66 JSON files. Since this module is imported by `Main`, `Search`, `Contents`, `Bookmarks`, and the `[slug]` page — the entire KJV text is loaded into memory on every page load, even if the user only reads one book.

**Impact**: The full ~5.6 MB of Bible JSON is included in the JavaScript bundle. On mobile devices with constrained memory, this is wasteful. Initial page load is slower than necessary.

**Proposal**: Use **dynamic imports** with Next.js `import()` to load books on demand:

```typescript
// utils/BookLoader.ts
const BOOK_SLUGS = ['genesis', 'exodus', ...]; // lightweight metadata only

export async function loadBook(slug: string): Promise<Book> {
  const module = await import(`../data/kjv/${slugToFilename(slug)}.json`);
  return module.default;
}
```

Keep a lightweight `BookMetadata[]` array (just names, indexes, chapter counts) for the Contents and Search scope filtering — no verse text needed for those. Only load the full book data when the user navigates to it. The seeding process already handles loading all books lazily via dynamic import — extend that pattern to the reading path.

### 3.3 `Search` Component Mixes Algorithms with UI (558 lines)

**Problem**: The Search component contains the `indexedSearch()` algorithm (keyword tokenization, set intersection, scope filtering), the `getResults()` brute-force fallback, the `getBookResults()` navigation parser, and the entire rendering tree with Mantine components — all in one file.

**Impact**: The search algorithm can't be tested without rendering the component. Changes to the search UI require touching the same file as algorithmic changes. The brute-force `getResults()` iterates over the entire in-memory `Books` array, coupling it to the eagerly-loaded data.

**Proposal**: Extract search logic into `utils/search.ts`:

```typescript
// utils/search.ts
export async function indexedSearch(keyword: string, scope: SearchScope, currentBook?: Book): Promise<SearchResult[]>;
export function bruteForceSearch(keyword: string, scope: SearchScope, books: Book[], currentBook?: Book): SearchResult[];
export function parseBookReference(keyword: string, books: BookMetadata[]): BookNavResult[];
```

The component becomes a pure view: it calls the search functions and renders results. Algorithms become independently testable.

### 3.4 `Main` Component Manages Too Much State

**Problem**: `Main` (256 lines) manages 7 state variables, 4 custom hooks, and 10+ callback handlers. It acts as the sole orchestrator for navigation, search, bookmarks, reading position, audio, chapter content extraction, and page title updates.

**Impact**: Adding any new feature (e.g., highlighting, reading plans, themes) means adding more state to this component. It's becoming a "smart component" bottleneck.

**Proposal**: Introduce a **React Context** for shared app state, or use a lightweight state manager:

```typescript
// context/ReaderContext.tsx
interface ReaderState {
  currentBook: Book;
  visibleChapter: number | null;
  searchVisible: boolean;
  bookmarksVisible: boolean;
  contentsVisible: boolean;
}

// Each feature panel manages its own visibility via context
// Main becomes a thin composition layer
```

Alternatively, extract the modal/panel state into a `useAppPanels()` hook that manages which panel is open, since only one should be open at a time (search, bookmarks, or contents).

### 3.5 Excessive Console Logging in Production Code

**Problem**: `BibleStorage.ts` contains 20+ `console.log`/`console.error` statements. `VerseDetails.tsx` and `Bookmarks.tsx` also have debug logging. These run in production.

**Impact**: Console pollution, minor performance cost, potential information leakage.

**Proposal**: Remove all debug `console.log` statements. Keep only `console.error` for genuine error conditions, or introduce a lightweight logger that is no-op in production:

```typescript
const log = process.env.NODE_ENV === 'development' ? console.log : () => {};
```

### 3.6 `migrateBibleStorage.ts` Hardcodes Version 2 While DB is at Version 6

**Problem**: The migration helper creates a new database at version 2, but the actual `BibleStorage` class uses version 6. If a user runs the migration from the `/update` page, they'll create a version 2 database that immediately gets upgraded to version 6 when `BibleStorage.init()` runs — potentially causing conflicts or double schema creation.

**Impact**: The migration page may silently fail or create an inconsistent state. The migration export also only exports 3 stores (readingPositions, preferences, bibleContent) but version 6 has 10 stores.

**Proposal**: The migration logic should delegate to `BibleStorage.init()` for schema creation rather than maintaining its own parallel schema definition. Alternatively, if the migration feature is no longer needed (since `onupgradeneeded` handles schema evolution), remove it or replace it with a simple "Clear all data" reset button.

### 3.7 No CI/CD Pipeline

**Problem**: No GitHub Actions workflow, no automated test runs on commits or PRs.

**Impact**: Regressions can be introduced without detection. Coverage thresholds aren't enforced. The build isn't validated automatically.

**Proposal**: Add a minimal GitHub Actions workflow:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run test:run
      - run: npm run build
```

### 3.8 No Prettier / Code Formatting Standard

**Problem**: No `.prettierrc` or formatting configuration. Code style varies across files (indentation, quote style, trailing commas).

**Impact**: Inconsistent code style increases cognitive load during review and makes diffs noisier.

**Proposal**: Add Prettier with the project's existing style conventions:

```json
{
  "useTabs": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "printWidth": 90
}
```

### 3.9 `next.config.js` References Unused Libraries

**Problem**: The Next.js config enables `styledComponents` SWC transform and optimizes imports for `react-window` and `styled-components` — but neither `styled-components` nor `react-window` are in `package.json`. The project uses CSS Modules and `react-virtuoso` instead.

**Impact**: Dead configuration. Potentially confusing for new contributors.

**Proposal**: Remove the stale config entries:

```javascript
const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: {
    optimizePackageImports: ["@mantine/core", "@tabler/icons-react"],
  },
};
```

### 3.10 `@types/react-window` in devDependencies But react-window Not Used

**Problem**: `@types/react-window` is listed in devDependencies but `react-window` is not in dependencies. The project uses `react-virtuoso` for list virtualization.

**Impact**: Unnecessary dependency.

**Proposal**: Remove `@types/react-window` from `package.json`.

### 3.11 Book Slug Generation is Duplicated

**Problem**: The expression `book.book.toLowerCase().replace(/\s+/g, "-")` for generating URL slugs appears in at least 6 different files: Contents, Bookmarks, VerseDetails, Search, the `[slug]` page, and `handleRandomBook`.

**Impact**: If the slug format ever changes (e.g., adding a version prefix), all 6 locations need updating.

**Proposal**: Extract to a single utility:

```typescript
// utils/slugify.ts
export function bookSlug(bookName: string): string {
  return bookName.toLowerCase().replace(/\s+/g, "-");
}
```

### 3.12 Mixed Type Representations for Chapter/Verse

**Problem**: `Chapter.chapter` and `Verse.verse` are typed as `string` in the domain model, but many components call `parseInt()` on them for comparisons and URL hash parsing. `ReadingPosition.chapter` and `.verse` are `number`. This creates constant string↔number conversion throughout the codebase.

**Impact**: Cognitive overhead, potential for bugs (e.g., `parseInt("01")` vs `"01"`), and unnecessary conversions in hot paths like the IntersectionObserver callback.

**Proposal**: Standardize on `number` for chapter and verse throughout the domain model. The JSON data files already use numeric-looking strings, but they can be parsed once at load time or via a TypeScript type assertion.

---

## 4. Improvement Priority Matrix

| # | Issue | Effort | Impact | Priority |
|---|-------|--------|--------|----------|
| 3.1 | Split BibleStorage god class | Medium | High | **P1** |
| 3.2 | Lazy-load book data | Medium | High | **P1** |
| 3.5 | Remove console logging | Low | Medium | **P1** |
| 3.7 | Add CI/CD pipeline | Low | High | **P1** |
| 3.9 | Clean stale next.config | Low | Low | **P1** |
| 3.10 | Remove unused @types/react-window | Low | Low | **P1** |
| 3.11 | Extract slug utility | Low | Medium | **P1** |
| 3.3 | Extract search algorithms | Medium | Medium | **P2** |
| 3.4 | Reduce Main state complexity | Medium | Medium | **P2** |
| 3.8 | Add Prettier config | Low | Medium | **P2** |
| 3.12 | Standardize chapter/verse types | High | Medium | **P2** |
| 3.6 | Fix/remove migration helper | Low | Low | **P3** |

---

## 5. Proposed Target Architecture

### Directory Structure (After Refactoring)

```
utils/
├── storage/
│   ├── connection.ts           # Shared IDBDatabase singleton
│   ├── readingPosition.ts
│   ├── preferences.ts
│   ├── bookmarks.ts
│   ├── notes.ts
│   ├── verseStore.ts
│   ├── searchIndex.ts
│   ├── crossReferences.ts
│   ├── chapters.ts
│   ├── redLetterVerses.ts
│   └── index.ts
├── search.ts                   # Search algorithms (extracted from component)
├── bookLoader.ts               # Dynamic book loading
├── slugify.ts                  # URL slug generation
├── scrollToVerse.ts
├── Debounce.ts
├── getCrossRefs.ts
├── seedBibleData.ts
├── useBibleSeed.ts
├── useReadingPosition.ts
├── useAudioPlayer.ts
└── useAppPanels.ts             # Panel visibility state

context/
└── ReaderContext.tsx            # Shared reader state (optional)

data/
├── bookMetadata.json           # Lightweight: names, indexes, chapter counts only
├── kjv/                        # Full book data (loaded on demand)
├── crossRefs.json
└── redLetterVerses.json
```

### Data Loading Strategy

```
Initial load:
  bookMetadata.json (tiny) → Contents, Search scope

On navigate to /[slug]:
  import(`data/kjv/${book}.json`) → Reader rendering

Background (first visit):
  seedBibleData() → IndexedDB (verses, searchIndex, crossRefs, redLetters)

Search queries:
  IndexedDB searchIndex → fast indexed lookup
  Fallback: lazy-loaded books → brute force (only if index not ready)
```

---

## 6. Testing Recommendations

### Missing Coverage Areas

1. **Reader component** — No tests for scroll tracking, IntersectionObserver, CSS injection, or hash navigation. This is the most complex component.

2. **Contents component** — No tests for book selection, animation, random book, or red letter toggle.

3. **NavBar component** — No tests for button interactions or chapter display.

4. **VerseDetails component** — No tests for bookmark toggle, note save/load, cross-reference display, share functionality.

5. **Bookmarks component** — No tests for scope filtering, virtualized list, or bookmark removal.

### Recommended Test Additions (by priority)

| Component/Util | Why | Lines |
|----------------|-----|-------|
| Reader | Core rendering, scroll tracking is complex | ~300 |
| VerseDetails | CRUD operations, user-facing interactions | ~200 |
| Bookmarks | Filtering logic, data display | ~150 |
| Contents | Navigation, settings toggle | ~100 |
| Integration: Search → IndexedDB | End-to-end search flow | ~150 |

### Shared Test Utilities

Extract common test setup to reduce duplication across 8 test files:

```typescript
// test/helpers.ts
export function createFreshIndexedDB(): void;
export function seedTestBible(books?: Partial<Book>[]): Promise<void>;
export function createMockSpeechSynthesis(): MockSpeechSynthesis;
```

---

## 7. Performance Observations

### Current Bottlenecks

1. **Bundle size** — All 66 books (~5.6 MB JSON) plus cross-references (~5.6 MB) are bundled. With Next.js code splitting, individual book pages should only load their book, but `Books.ts` imports everything eagerly.

2. **Initial IndexedDB seeding** — Processing 31,000+ verses and building an inverted index on first load takes several seconds. The chunked yielding strategy mitigates UI jank but doesn't reduce total time.

3. **IntersectionObserver in Reader** — Observes every `<p class="verse">` element. For books like Psalms (2,461 verses), that's ~2,500 observed elements.

### Recommendations

- **Lazy book loading** (see 3.2) would reduce initial bundle from ~11 MB to <1 MB.
- **Web Worker for seeding** — Move `seedBibleData()` to a Web Worker so it doesn't compete with the main thread at all.
- **Paginate long books** — For books with 50+ chapters (Isaiah, Psalms, Jeremiah), consider rendering only the current chapter range and loading adjacent chapters on scroll. This would dramatically reduce DOM nodes and IntersectionObserver overhead.
