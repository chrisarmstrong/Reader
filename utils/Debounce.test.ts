import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import debounce from './Debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should only execute once when called multiple times rapidly', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should reset the timer when called again before delay expires', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    vi.advanceTimersByTime(50);

    debouncedFn(); // Reset timer
    vi.advanceTimersByTime(50);

    expect(mockFn).not.toHaveBeenCalled(); // Still waiting for 50ms more

    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to the debounced function', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('arg1', 'arg2', 123);
    vi.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should use the latest arguments when called multiple times', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('first');
    debouncedFn('second');
    debouncedFn('third');

    vi.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('third');
  });

  it('should preserve context when called as a method', () => {
    const mockFn = vi.fn(function(this: any) {
      return this.value;
    });
    const debouncedFn = debounce(mockFn, 100);

    const context = { value: 42, method: debouncedFn };
    context.method();

    vi.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should allow multiple executions if enough time passes', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);

    debouncedFn();
    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
