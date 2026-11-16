/**
 * Money and date formatting. All dates are computed in UTC against meta.now so
 * the rendered output is deterministic — see meta.nowNote.
 */
import { NOW, spec } from '../spec/spec.ts';
import { DAY_TODAY, DAY_YESTERDAY } from '../spec/copy.ts';

const LOCALE = spec.meta.locale;

/** The minus sign the spec uses in expectedDayTotals (U+2212), not a hyphen. */
const MINUS = '−';

const decimal = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * The spec writes dates day-first ('12 November', per listBehaviour.grouping),
 * so the day and month are composed rather than taken from a locale pattern —
 * 'en' would render 'November 12'.
 */
const monthName = new Intl.DateTimeFormat(LOCALE, { month: 'long', timeZone: 'UTC' });

function dayFirst(d: Date, withYear: boolean): string {
  const base = `${d.getUTCDate()} ${monthName.format(d)}`;
  return withYear ? `${base} ${d.getUTCFullYear()}` : base;
}

const timeOfDay = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

/** Unsigned magnitude: "2,007.40". */
export function magnitude(value: number): string {
  return decimal.format(Math.abs(value));
}

/** Unsigned, with the currency code: "2,007.40 EUR". */
export function money(value: number, currency: string): string {
  return `${magnitude(value)} ${currency}`;
}

/** Explicitly signed, with the currency code: "+4,250.00 EUR", "−890.00 EUR". */
export function signedMoney(value: number, currency: string): string {
  const sign = value < 0 ? MINUS : '+';
  return `${sign}${magnitude(value)} ${currency}`;
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** 'Today', 'Yesterday', or '12 November' — relative to meta.now, in UTC. */
export function dayHeading(key: string): string {
  const nowKey = NOW.toISOString().slice(0, 10);
  const yesterday = new Date(NOW.getTime() - 86_400_000).toISOString().slice(0, 10);
  if (key === nowKey) return DAY_TODAY;
  if (key === yesterday) return DAY_YESTERDAY;
  return dayFirst(new Date(`${key}T00:00:00Z`), false);
}

/** "09:12" — the row meta line's time element. */
export function time(iso: string): string {
  return timeOfDay.format(new Date(iso));
}

/** "12 November 2026, 11:06" — timeline steps and helper copy. */
export function dateTime(iso: string): string {
  const d = new Date(iso);
  return `${dayFirst(d, true)}, ${timeOfDay.format(d)}`;
}

/** "12 November 2026" */
export function date(iso: string): string {
  return dayFirst(new Date(iso), true);
}

export function rate(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}
