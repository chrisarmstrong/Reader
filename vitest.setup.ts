import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
