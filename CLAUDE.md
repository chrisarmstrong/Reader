# CLAUDE.md

## Project Overview

**KJV Bible Reader** — an offline-first Progressive Web App for reading the King James Version Bible. Built with Next.js 15 (App Router), React 18, TypeScript, and Mantine UI. All 66 books are bundled as static JSON. User data (reading position, bookmarks, notes) persists client-side via IndexedDB. There is no backend server — the app is fully self-contained after initial load.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.7 (strict mode)
- **UI Library**: Mantine v8 + Tabler Icons
- **Animation**: motion/react
- **Virtualization**: react-virtuoso
- **Testing**: Vitest + Testing Library + happy-dom + fake-indexeddb
- **Storage**: IndexedDB (primary), localStorage (fallback)
- **Audio**: Web Speech API (SpeechSynthesis)
- **Offline**: Service Worker + PWA manifest

## Quick Reference Commands

```bash
# Development
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (next/core-web-vitals config)

# Testing
npm test             # Run tests in watch mode
npm run test:run     # Run tests once (CI-friendly)
npm run test:ui      # Run with Vitest UI
npm run test:coverage # Generate coverage report

# Data scripts (rarely needed)
npm run convert-crossrefs   # Convert cross-reference CSV to JSON
npm run add-paragraphs      # Extract paragraph/poetry markers from OSIS XML
```

## Project Structure

```
Reader/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (MantineProvider, ServiceWorker, fonts)
│   ├── page.tsx                # Home route → renders <Main />
│   ├── [slug]/page.tsx         # Dynamic book route (e.g. /genesis)
│   ├── kjv/[slug]/page.tsx     # KJV book route (e.g. /kjv/genesis)
│   ├── settings/page.tsx       # Settings page
│   ├── update/page.tsx         # Database migration page
│   ├── api/hello/route.ts      # Health check endpoint
│   ├── ServiceWorkerProvider.tsx
│   ├── loading.tsx / not-found.tsx
│   └── */loading.tsx           # Per-route loading states
├── components/                 # React components (all client components)
│   ├── Main/                   # App orchestrator (state, navigation, audio)
│   ├── Reader/                 # Bible text rendering, scroll tracking
│   ├── NavBar/                 # Bottom navigation bar
│   ├── Contents/               # Book picker drawer
│   ├── search/                 # Full-text search modal
│   ├── Bookmarks/              # Bookmarks modal
│   ├── VerseDetails/           # Verse detail drawer (bookmark, note, share)
│   ├── Settings/               # Preferences UI
│   └── DatabaseMigration/      # Migration/update UI
├── utils/                      # Utilities, hooks, storage
│   ├── BibleStorage.ts         # IndexedDB wrapper (10 object stores)
│   ├── Books.ts                # Imports all 66 book JSON files
│   ├── seedBibleData.ts        # Background indexing (search index, cross-refs)
│   ├── useReadingPosition.ts   # Reading position persistence hook
│   ├── useAudioPlayer.ts       # Speech synthesis hook
│   ├── useBibleSeed.ts         # Background seeding hook
│   ├── getCrossRefs.ts         # Cross-reference lookup
│   ├── selectVoice.ts          # Voice selection priority logic
│   ├── scrollToVerse.ts        # DOM scroll helper
│   ├── Debounce.ts             # Generic debounce utility
│   └── migrateBibleStorage.ts  # DB migration logic
├── types/
│   ├── bible.ts                # All TypeScript interfaces (Book, Chapter, Verse, etc.)
│   └── css.d.ts                # CSS module declarations
├── data/
│   ├── kjv/                    # 66 book JSON files (~5.6 MB total)
│   ├── crossRefs.json          # Cross-reference data
│   └── redLetterVerses.json    # Words of Jesus markers
├── styles/
│   ├── styles.css              # Global CSS
│   └── globalStyles.js         # Styled-components globals (legacy)
├── scripts/                    # Build-time data processing scripts
│   ├── addParagraphBreaks.mjs  # OSIS XML → paragraph/poetry markers
│   └── convertCrossRefs.mjs    # CSV → JSON cross-references
└── public/
    ├── manifest.json           # PWA manifest ("Holy Bible")
    ├── sw.js                   # Service worker (generated)
    └── fonts/                  # Custom "Family" font (WOFF2)
```

## Architecture & Data Flow

### Component Tree

```
layout.tsx (MantineProvider + ServiceWorkerProvider)
└── page.tsx | [slug]/page.tsx
    └── Main (orchestrator — manages state, hooks, callbacks)
        ├── NavBar (bottom bar: menu, play, bookmarks, search)
        ├── Reader (chapter/verse rendering, IntersectionObserver scroll tracking)
        │   └── VerseDetails (Mantine Drawer: bookmark, note, share, cross-refs)
        ├── Search (Mantine Modal: indexed + brute-force full-text search)
        ├── Bookmarks (virtualized list with scope filtering)
        └── Contents (book picker drawer with stagger animations)
```

### Data Flow

```
Static JSON (data/kjv/*.json) → imported at build time via Books.ts
    → passed as props: Main → Reader → DOM
    → background seeding on first load → IndexedDB (verses, searchIndex, crossRefs)
    → queried at runtime by Search, VerseDetails, Bookmarks
```

### Storage Architecture

IndexedDB database (`BibleStorage`, version 6) with 10 object stores:
- `readingPositions` — current book/chapter/verse/scroll
- `preferences` — user settings (red letter, playback speed)
- `bibleContent` — cached book data
- `bookmarks` — user bookmarks with notes
- `notes` — verse annotations
- `verses` — individual verse records (for search)
- `searchIndex` — inverted word index
- `crossReferences` — verse cross-references
- `chapters` — chapter metadata (psalm superscriptions)
- `redLetterVerses` — words of Jesus marking data

## Key Conventions

### Component Patterns

- **All components are client components** (`"use client"`) — required for IndexedDB, scroll tracking, audio, and interactivity
- **Folder-per-component**: `ComponentName/index.tsx` + `ComponentName.module.css`
- **CSS Modules** for scoped styling (not styled-components despite legacy config)
- **Memoization**: `React.memo()` on NavBar, Reader, and Search to prevent unnecessary re-renders
- **Event handling**: Components use `onPointerUp` instead of `onClick` for better touch/pointer support
- **Virtualization**: Large lists (search results, bookmarks) use `react-virtuoso`

### State Management

- No external state library — uses React `useState`, `useRef`, `useCallback`
- `Main` is the single orchestrator; child components receive props + callbacks
- Persistent state via IndexedDB (`BibleStorage`) with localStorage fallback
- URL state: hash (`#chapter:verse`) and query params (`?highlight=`) for navigation
- Session storage: search keyword persistence

### TypeScript

- Strict mode enabled
- All domain types in `types/bible.ts` (Book, Chapter, Verse, ReadingPosition, Bookmark, etc.)
- Path aliases configured: `@/*`, `@/components/*`, `@/utils/*`, `@/styles/*`
- Chapter/verse fields are `string` in the domain model (parsed to `number` where needed)

### Routing

- Next.js App Router with static generation (`generateStaticParams`)
- Book slugs: lowercase, hyphens for spaces (e.g., `1-samuel`, `song-of-solomon`)
- Routes: `/` (home), `/[slug]` (book), `/kjv/[slug]` (KJV book), `/settings`, `/update`
- Slug generation pattern: `book.book.toLowerCase().replace(/\s+/g, "-")`

## Testing

### Setup

- **Framework**: Vitest with `happy-dom` environment
- **Auto-imports**: `describe`, `it`, `expect`, `vi` are globals (no import needed)
- **IndexedDB**: Automatically mocked via `fake-indexeddb/auto` in `vitest.setup.ts`
- **Mocks reset**: `vi.clearAllMocks()` runs after each test via setup file

### Test File Location

Tests live alongside source files:
```
utils/BibleStorage.ts       → utils/BibleStorage.test.ts
utils/Debounce.ts            → utils/Debounce.test.ts
components/search/index.tsx  → components/search/index.test.tsx
```

### Existing Test Suites (8 files)

| File | Covers |
|------|--------|
| `utils/BibleStorage.test.ts` | IndexedDB CRUD, all 10 stores |
| `utils/seedBibleData.test.ts` | Background indexing, tokenization |
| `utils/getCrossRefs.test.ts` | Cross-reference parsing/lookup |
| `utils/useAudioPlayer.test.ts` | Speech synthesis hook |
| `utils/useReadingPosition.test.ts` | Position persistence, fallback |
| `utils/Debounce.test.ts` | Debounce utility |
| `utils/migrateBibleStorage.test.ts` | Database migration |
| `components/search/index.test.tsx` | Search UI, scoping, edge cases |

### Writing Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Feature', () => {
  beforeEach(() => {
    // setup
  });

  it('should handle the expected case', () => {
    // Arrange → Act → Assert
  });
});
```

For components, use Testing Library:
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

For hooks, use `renderHook`:
```typescript
import { renderHook, waitFor } from '@testing-library/react';
```

### Common Mocks

- **next/link**: Mock as simple `<a>` wrapper
- **react-virtuoso**: Mock to render all items inline
- **BibleStorage**: Mock specific methods with `vi.mock()`
- **Web Speech API**: Stub via `vi.stubGlobal('speechSynthesis', ...)`
- **Timers**: Use `vi.useFakeTimers()` / `vi.useRealTimers()`

### Coverage Targets

- Critical paths (BibleStorage, migration, search): 90%+
- Utilities: 90%+
- Components: 60-70%
- Overall: 70-80%

## Gotchas & Important Notes

1. **`next.config.js` has stale references** to `styled-components` and `react-window` — neither is used. The project uses CSS Modules and `react-virtuoso` instead.
2. **`@types/react-window`** is in devDependencies but `react-window` is not a dependency — this is unused.
3. **Bible data is eagerly loaded** — `Books.ts` statically imports all 66 JSON files (~5.6 MB). This is loaded into memory on every page.
4. **The seed version** (`SEED_VERSION = 6` in `seedBibleData.ts`) must be incremented when Bible data format changes to trigger re-indexing.
5. **Service Worker** is only registered in production (skipped on localhost). The `sw.js` file is in `.gitignore` — it's generated at build time.
6. **Red letter verses** (words of Jesus) are toggled via a preference stored in IndexedDB. The CSS is dynamically injected into the DOM by the Reader component.
7. **Migration page** (`/update`) uses a separate DB version (2) vs the main app (version 6) — this can cause schema conflicts.
8. **ESLint** extends `next/core-web-vitals` only. No Prettier is configured.
9. **Package manager**: Both `package-lock.json` and `yarn.lock` exist. CodeSandbox uses `yarn`; scripts use `npm`.
