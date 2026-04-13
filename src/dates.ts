// Shared date helpers. All keys are YYYY-MM-DD in local time.

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Full header format, always with year: "Mon, Apr 13, 2026" */
export function formatHeaderDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** History row format: "Mon, Apr 13, 2026" — year always shown so cross-year comparison is unambiguous. */
export function formatHistoryDate(key: string): string {
  return formatHeaderDate(parseKey(key));
}

/** Chart tick formatter that adapts to the selected range. */
export function chartTickFormatter(range: number | 'all') {
  return (v: string): string => {
    const d = parseKey(v);
    // Short ranges: weekday + day
    if (typeof range === 'number' && range <= 14) {
      return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    }
    // Medium: month + day
    if (typeof range === 'number' && range <= 90) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    // Long (1Y+): month + 2-digit year, e.g. Apr '26
    const mo = d.toLocaleDateString(undefined, { month: 'short' });
    const yy = String(d.getFullYear()).slice(-2);
    return `${mo} '${yy}`;
  };
}

/** Tooltip label for chart — always includes year. */
export function chartTooltipLabel(key: string): string {
  return formatHistoryDate(key);
}
