/**
 * The data layer: filtering, day grouping, day totals.
 *
 * Rules implemented here, all from the spec:
 *   feeModel rule 1        — a fixture with parentId is never a top-level row
 *   feeModel rule 5        — type 'Fee' matches standalone fees, payments with a
 *                            child fee, and conversions carrying a fee
 *   countsInDayTotal       — only settled money contributes to a day total
 *   groupHeaderExtra       — totals are per currency, never converted
 *   groupHeaderExtra.narrowing — one leg must pass the account scope and the
 *                            currency filter together; rows and totals share it
 *   fxModel.listRow        — target amount primary and positive, source negative
 */
import {
  type Fixture,
  accountOptions,
  childFeeTotal,
  childrenOf,
  hasThirdParty,
  isConversion,
  statusById,
  titleOf,
  topLevelFixtures,
  NOW,
} from '../spec/spec.ts';
import { dayKey, magnitude, signedMoney } from './format.ts';
import { noteOf } from './notes.ts';
import { DAY_TOTAL_SEPARATOR } from '../spec/copy.ts';
import type { Query } from './url.ts';

/** The figure in the row's trailing slot: for conversions, the credited target. */
export function primaryAmount(tx: Fixture): { value: number; currency: string } {
  if (isConversion(tx)) {
    return { value: tx.targetAmount ?? 0, currency: tx.targetCurrency ?? '' };
  }
  return { value: tx.amount ?? 0, currency: tx.currency ?? '' };
}

/** The magnitude used by the amount filter and by search. */
function amountMagnitude(tx: Fixture): number {
  return Math.abs(isConversion(tx) ? (tx.sourceAmount ?? 0) : (tx.amount ?? 0));
}

/** feeModel rule 5 — what the type filter's 'fee' option matches. */
function carriesFee(tx: Fixture): boolean {
  if (tx.type === 'fee') return true;
  if (childFeeTotal(tx) !== null) return true;
  return isConversion(tx) && (tx.fee ?? 0) > 0;
}

function matchesType(tx: Fixture, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((typeId) => (typeId === 'fee' ? carriesFee(tx) : tx.type === typeId));
}

function matchesSearch(tx: Fixture, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  // search.scope: counterparty name, note, payment reference, transaction ID, amount
  const haystack = [
    titleOf(tx),
    tx.reference ?? '',
    noteOf(tx),
    magnitude(amountMagnitude(tx)),
    String(amountMagnitude(tx)),
  ];
  if (haystack.some((field) => field.toLowerCase().includes(needle))) return true;
  // search.idMatch — a pasted transaction ID, whatever its case, with or
  // without its hyphens. Compared on letters and digits only.
  const bare = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
  const needleBare = bare(needle);
  // A child fee's ID finds the payment it belongs to (feeModel: never its own row).
  const ids = [tx.displayId, ...childrenOf(tx).map((child) => child.displayId)];
  return needleBare.length >= 4 && ids.some((id) => bare(id).includes(needleBare));
}

function presetStart(preset: string): Date | null {
  const now = NOW;
  const days = (n: number) => new Date(now.getTime() - n * 86_400_000);
  // Matched against filters.date.presets — the strings are the spec's.
  if (/7 days$/i.test(preset)) return days(7);
  if (/30 days$/i.test(preset)) return days(30);
  if (/3 months$/i.test(preset)) return days(90);
  if (/this month/i.test(preset)) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return null;
}

function matchesDate(tx: Fixture, query: Query): boolean {
  const created = new Date(tx.createdAt);
  // An explicit range always wins; "Custom" carries no range of its own.
  if (query.dateFrom && created < new Date(`${query.dateFrom}T00:00:00Z`)) return false;
  if (query.dateTo && created > new Date(`${query.dateTo}T23:59:59Z`)) return false;
  if (!query.date) return true;
  const start = presetStart(query.date);
  if (!start) return true;
  return created >= start;
}

/** What the view narrows to: the account scope and the currency filter. */
interface Narrowing {
  scope: string | null;
  currencies: string[];
}

/**
 * A movement on one of the user's accounts. A conversion has two — its
 * source leg and its target leg; every other transaction has one.
 */
interface Leg {
  account: string | undefined;
  currency: string;
  value: number;
}

function legsOf(tx: Fixture): Leg[] {
  if (isConversion(tx)) {
    return [
      { account: tx.account, currency: tx.sourceCurrency ?? '', value: tx.sourceAmount ?? 0 },
      { account: tx.targetAccount, currency: tx.targetCurrency ?? '', value: tx.targetAmount ?? 0 },
    ];
  }
  return [{ account: tx.account, currency: tx.currency ?? '', value: tx.amount ?? 0 }];
}

/**
 * listBehaviour.groupHeaderExtra.narrowing — one leg must satisfy every
 * active constraint on its own. Different legs satisfying different
 * constraints is not a match. The same test decides the rows and the totals,
 * so the two can never disagree.
 */
function legPasses(leg: Leg, narrow: Narrowing): boolean {
  if (narrow.scope && leg.account !== narrow.scope) return false;
  if (narrow.currencies.length && !narrow.currencies.includes(leg.currency)) return false;
  return true;
}

function narrowedIn(tx: Fixture, narrow: Narrowing): boolean {
  return legsOf(tx).some((leg) => legPasses(leg, narrow));
}

/** {total} of the result count: the transactions within the selected account (scope). */
export function scopedTotal(scope: string | null): number {
  return topLevelFixtures.filter((tx) => narrowedIn(tx, { scope, currencies: [] })).length;
}

export function applyFilters(query: Query): Fixture[] {
  return topLevelFixtures.filter((tx) => {
    if (!narrowedIn(tx, { scope: query.scope, currencies: query.currency })) return false;
    if (query.status.length && !query.status.includes(tx.status)) return false;
    if (!matchesType(tx, query.type)) return false;
    // filters.counterparty — a recipient or sender; a conversion or an
    // account-level fee has none, so no value of this filter matches one.
    if (query.counterparty && !(hasThirdParty(tx) && titleOf(tx) === query.counterparty)) return false;
    const value = amountMagnitude(tx);
    if (query.amountMin && value < Number(query.amountMin)) return false;
    if (query.amountMax && value > Number(query.amountMax)) return false;
    if (!matchesDate(tx, query)) return false;
    if (query.q && !matchesSearch(tx, query.q)) return false;
    return true;
  });
}

const CURRENCY_ORDER = accountOptions.map((account) => account.currency);

function currencyRank(currency: string): number {
  const index = CURRENCY_ORDER.indexOf(currency);
  return index === -1 ? CURRENCY_ORDER.length : index;
}

export interface DayGroup {
  key: string;
  rows: Fixture[];
  /** null when no transaction that day counts — groupHeaderExtra.emptyCase. */
  total: string | null;
}

/**
 * Per-currency day total. Unnarrowed, a conversion contributes twice: the debit
 * in the source currency and the credit in the target currency. Narrowed, a
 * leg counts only if it passes every active constraint itself (legPasses) —
 * the test that put its row on screen. No conversion is performed.
 */
function dayTotal(rows: Fixture[], narrow: Narrowing): string | null {
  const totals = new Map<string, number>();
  for (const tx of rows) {
    if (!statusById.get(tx.status)?.countsInDayTotal) continue;
    for (const leg of legsOf(tx)) {
      if (!legPasses(leg, narrow)) continue;
      totals.set(leg.currency, (totals.get(leg.currency) ?? 0) + leg.value);
    }
  }

  if (totals.size === 0) return null;
  // Within a header, currencies follow accounts[] (EUR, GBP, USD) — the order
  // expectedDayTotals is written in. Insertion order would depend on where a
  // fixture happens to sit in the file.
  return [...totals.entries()]
    .sort(([a], [b]) => currencyRank(a) - currencyRank(b))
    .map(([currency, value]) => signedMoney(value, currency))
    .join(DAY_TOTAL_SEPARATOR);
}

export function groupByDay(
  rows: Fixture[],
  narrow: Narrowing = { scope: null, currencies: [] },
): DayGroup[] {
  const groups = new Map<string, Fixture[]>();
  for (const tx of rows) {
    const key = dayKey(tx.createdAt);
    const bucket = groups.get(key);
    if (bucket) bucket.push(tx);
    else groups.set(key, [tx]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, dayRows]) => ({
      key,
      rows: [...dayRows].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      total: dayTotal(dayRows, narrow),
    }));
}
