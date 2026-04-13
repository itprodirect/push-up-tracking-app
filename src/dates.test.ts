import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chartTickFormatter,
  chartTooltipLabel,
  formatHeaderDate,
  formatHistoryDate,
  parseKey,
  todayKey,
} from './dates';

describe('todayKey', () => {
  it('returns YYYY-MM-DD for a given date', () => {
    expect(todayKey(new Date(2026, 3, 13))).toBe('2026-04-13'); // April = month 3
  });

  it('zero-pads single-digit months and days', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('returns the current local date when called with no argument', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 4, 10, 30));
    expect(todayKey()).toBe('2026-07-04');
    vi.useRealTimers();
  });
});

describe('parseKey', () => {
  it('is the inverse of todayKey', () => {
    const d = new Date(2026, 3, 13);
    expect(todayKey(parseKey(todayKey(d)))).toBe('2026-04-13');
  });

  it('parses into a Date with correct year/month/day', () => {
    const d = parseKey('2024-12-31');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(31);
  });
});

describe('formatHeaderDate / formatHistoryDate', () => {
  it('includes the year so cross-year comparisons are unambiguous', () => {
    const formatted = formatHeaderDate(new Date(2024, 3, 13));
    expect(formatted).toMatch(/2024/);
  });

  it('formatHistoryDate includes the year for a key', () => {
    expect(formatHistoryDate('2025-06-01')).toMatch(/2025/);
  });
});

describe('chartTickFormatter', () => {
  it('short range (7D) shows weekday + day, no year', () => {
    const fmt = chartTickFormatter(7);
    const label = fmt('2026-04-13');
    expect(label).not.toMatch(/26/); // no year
    expect(label).toMatch(/\d+/); // has the day number
  });

  it('medium range (30D) shows month + day', () => {
    const fmt = chartTickFormatter(30);
    const label = fmt('2026-04-13');
    expect(label).toMatch(/Apr/);
  });

  it("long range (365D) shows month + short year like Apr '26", () => {
    const fmt = chartTickFormatter(365);
    expect(fmt('2026-04-13')).toBe("Apr '26");
  });

  it('all-time range uses same long format', () => {
    const fmt = chartTickFormatter('all');
    expect(fmt('2024-12-01')).toBe("Dec '24");
  });
});

describe('chartTooltipLabel', () => {
  it('always includes year in full history format', () => {
    expect(chartTooltipLabel('2023-01-15')).toMatch(/2023/);
  });
});

// Tests above use fake timers only where needed; make sure any leftover is reset.
beforeEach(() => vi.useRealTimers());
afterEach(() => vi.useRealTimers());
