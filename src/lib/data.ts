/**
 * The data layer: filtering, day grouping, day totals.
 *
 * Rules implemented here, all from the spec:
 *   feeModel rule 1        — a fixture with parentId is never a top-level row
 *   feeModel rule 5        — type 'Fee' matches standalone fees, payments with a
 *                            child fee, and conversions carrying a fee
 *   countsInDayTotal       — only settled money contributes to a day total
 *   groupHeaderExtra       — totals are per currency, never converted
 *   fxModel.listRow        — target amount primary and positive, source negative
 */
import {
  type Fixture,
  accountOptions,
  childFeeTotal,
  childrenOf,
  currenciesOf,
  isConversion,
  statusById,
  titleOf,
  topLevelFixtures,
  NOW,
} from '../spec/spec.ts';
import { magnitude } from './format.ts';
import { noteOf } from './notes.ts';
import { dayKey, signedMoney } from './format.ts';
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

/** Every account a transaction moves through. */
function accountsOf(tx: Fixture): string[] {
  return [tx.account, tx.targetAccount].filter(Boolean) as string[];
}

/** The one account value (accountScope / filters.account). null is 'All accounts'. */
function inScope(tx: Fixture, scope: string | null): boolean {
  return !scope || accountsOf(tx).includes(scope);
}

/** {total} of the result count: the transactions within the selected account (scope). */
export function scopedTotal(scope: string | null): number {
  return topLevelFixtures.filter((tx) => inScope(tx, scope)).length;
}

export function applyFilters(query: Query): Fixture[] {
  return topLevelFixtures.filter((tx) => {
    if (!inScope(tx, query.scope)) return false;
    if (query.status.length && !query.status.includes(tx.status)) return false;
    if (query.currency.length && !currenciesOf(tx).some((c) => query.currency.includes(c))) {
      return false;
    }
    if (!matchesType(tx, query.type)) return false;
    if (query.counterparty && titleOf(tx) !== query.counterparty) return false;
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
 * in the source currency and the credit in the target currency.
 * groupHeaderExtra.narrowing — one rule for the account scope and the currency
 * filter: a movement counts only if it passed through the scoped account and
 * is in a selected currency, so a conversion contributes only the legs that
 * pass both. No conversion is performed.
 */
function dayTotal(rows: Fixture[], narrow: Narrowing): string | null {
  const totals = new Map<string, number>();
  const add = (account: string | undefined, currency: string, value: number) => {
    if (narrow.scope && account !== narrow.scope) return;
    if (narrow.currencies.length && !narrow.currencies.includes(currency)) return;
    totals.set(currency, (totals.get(currency) ?? 0) + value);
  };

  for (const tx of rows) {
    if (!statusById.get(tx.status)?.countsInDayTotal) continue;
    if (isConversion(tx)) {
      add(tx.account, tx.sourceCurrency ?? '', tx.sourceAmount ?? 0);
      add(tx.targetAccount, tx.targetCurrency ?? '', tx.targetAmount ?? 0);
    } else {
      add(tx.account, tx.currency ?? '', tx.amount ?? 0);
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

/** What the view narrows day totals to: the account scope and the currency filter. */
interface Narrowing {
  scope: string | null;
  currencies: string[];
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
