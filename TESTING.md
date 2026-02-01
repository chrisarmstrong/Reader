# Testing Guide

This document provides guidance on writing and running tests for the Bible Reader application.

## Overview

The project uses the following testing stack:

- **[Vitest](https://vitest.dev/)** - Fast unit test framework
- **[Testing Library](https://testing-library.com/)** - React component testing utilities
- **[happy-dom](https://github.com/capricorn86/happy-dom)** - Lightweight DOM implementation
- **[fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB)** - IndexedDB mock for testing database operations

## Running Tests

### Available Commands

```bash
# Run tests in watch mode (re-runs on file changes)
npm test

# Run tests once and exit
npm run test:run

# Run tests with UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Writing Tests

### File Naming Convention

Test files should be placed alongside the source files they test:

- `utils/Debounce.ts` → `utils/Debounce.test.ts`
- `components/Reader/index.tsx` → `components/Reader/index.test.tsx`

### Basic Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';
import { functionToTest } from './yourFile';

describe('functionToTest', () => {
  it('should do something specific', () => {
    const result = functionToTest('input');
    expect(result).toBe('expected output');
  });
});
```

### Testing Utilities

For utility functions like `Debounce.ts`, use standard Vitest functions:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('utility function', () => {
  beforeEach(() => {
    // Setup code that runs before each test
    vi.useFakeTimers();
  });

  it('should work correctly', () => {
    // Your test here
  });
});
```

### Testing React Components

For React components, use Testing Library:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YourComponent from './YourComponent';

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<YourComponent />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Testing IndexedDB Operations

For files that use IndexedDB (like `BibleStorage.ts`), the setup automatically includes `fake-indexeddb`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import BibleStorage from './BibleStorage';

describe('BibleStorage', () => {
  let storage: BibleStorage;

  beforeEach(() => {
    // IndexedDB is automatically mocked by fake-indexeddb
    storage = new BibleStorage();
  });

  it('should save and retrieve data', async () => {
    await storage.savePosition({ book: 1, chapter: 1, verse: 1 });
    const position = await storage.getPosition();
    expect(position).toEqual({ book: 1, chapter: 1, verse: 1 });
  });
});
```

### Testing Hooks

For custom React hooks, use Testing Library's hook utilities:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useYourHook } from './useYourHook';

describe('useYourHook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useYourHook());
    expect(result.current.value).toBe(initialValue);
  });

  it('should update state', async () => {
    const { result } = renderHook(() => useYourHook());

    result.current.updateValue('new value');

    await waitFor(() => {
      expect(result.current.value).toBe('new value');
    });
  });
});
```

## Mocking

### Mocking Functions

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
mockFn.mockResolvedValue('async mocked value');
```

### Mocking Modules

```typescript
vi.mock('./module', () => ({
  functionName: vi.fn(() => 'mocked result'),
}));
```

### Mocking Timers

```typescript
import { beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('should handle delayed operations', () => {
  const callback = vi.fn();
  setTimeout(callback, 1000);

  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
});
```

## Testing Best Practices

### 1. Test Behavior, Not Implementation

Focus on what the code does, not how it does it:

```typescript
// Good - tests behavior
it('should display user name after login', async () => {
  render(<App />);
  await user.type(screen.getByLabelText('Username'), 'John');
  await user.click(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByText('Welcome, John')).toBeInTheDocument();
});

// Bad - tests implementation details
it('should call setState with username', () => {
  const { result } = renderHook(() => useAuth());
  result.current.setUsername('John');
  expect(mockSetState).toHaveBeenCalledWith('John');
});
```

### 2. Keep Tests Isolated

Each test should be independent and not rely on other tests:

```typescript
describe('Counter', () => {
  beforeEach(() => {
    // Reset state before each test
    localStorage.clear();
  });

  it('should start at 0', () => {
    // Test in isolation
  });
});
```

### 3. Use Descriptive Test Names

Test names should clearly describe what they test:

```typescript
// Good
it('should display error message when username is empty', () => {});

// Bad
it('should work', () => {});
```

### 4. Arrange-Act-Assert Pattern

Structure tests with clear sections:

```typescript
it('should save bookmark', async () => {
  // Arrange - Set up test data
  const bookmark = { book: 1, chapter: 1, verse: 1, text: 'Test' };

  // Act - Perform the action
  await storage.saveBookmark(bookmark);

  // Assert - Verify the result
  const bookmarks = await storage.getBookmarks();
  expect(bookmarks).toContainEqual(bookmark);
});
```

## Coverage Goals

Target coverage levels:

- **Overall:** 70-80%
- **Critical paths** (BibleStorage, migrations, search): 100%
- **Utilities:** 90%+
- **Components:** 60-70%

View coverage report:

```bash
npm run test:coverage
```

Open `coverage/index.html` in a browser to see detailed coverage.

## Continuous Integration

Tests should be run on every commit. The CI pipeline should:

1. Run all tests: `npm run test:run`
2. Generate coverage: `npm run test:coverage`
3. Fail if critical tests fail
4. Report coverage metrics

## Next Steps

### Priority Areas for Testing

1. **High Priority:**
   - `utils/BibleStorage.ts` - Database operations
   - `utils/migrateBibleStorage.ts` - Data migration
   - `components/search/index.tsx` - Search functionality

2. **Medium Priority:**
   - `utils/useAudioPlayer.ts` - Audio playback
   - `utils/useReadingPosition.ts` - Position tracking
   - `components/Reader/index.tsx` - Main reader

3. **Low Priority:**
   - `utils/scrollToVerse.ts` - Scroll helper
   - Simple components

See the main test coverage analysis for detailed recommendations.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library - React](https://testing-library.com/react)
- [Testing Library - User Interactions](https://testing-library.com/docs/user-event/intro)
- [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB)
