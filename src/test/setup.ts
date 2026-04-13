import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Reset DOM + localStorage between tests so each one starts from a clean slate.
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// Recharts uses ResizeObserver; jsdom doesn't ship one.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Recharts logs a warning when its ResponsiveContainer has 0 width/height,
// which always happens under jsdom (no real layout). Silence just that line
// so real warnings stay visible.
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === 'string' && first.includes('width(0) and height(0) of chart')) {
    return;
  }
  originalWarn(...args);
};
