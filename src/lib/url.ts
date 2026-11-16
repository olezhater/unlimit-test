/**
 * Routing without a router. Two shapes:
 *   /states                     — the index page
 *   /?state=…&tx=…&<filters>    — everything else
 *
 * Every state in the spec is reachable by typing its route, and opening or
 * closing the details panel writes to the URL.
 */
import { spec, stateById } from '../spec/spec.ts';

type ForcedState = 'empty' | 'loading' | 'error';

export interface Query {
  state: ForcedState | null;
  tx: string | null;
  /**
   * The one account value (accountScope.oneValue, filters.account.note): set
   * by the dropdown beside the title or the drawer's Account field, written to
   * the URL as ?account=. null is 'All accounts'.
   */
  scope: string | null;
  /* Prototype scaffolding — prototypeAffordances, never product state. */
  chrome: 'off' | null;
  frame: number | null;
  grey: boolean;
  status: string[];
  currency: string[];
  type: string[];
  counterparty: string | null;
  amountMin: string | null;
  amountMax: string | null;
  date: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  q: string | null;
}


const MULTI_PARAMS = ['status', 'currency', 'type'] as const;

function validAccount(id: string | null | undefined): string | null {
  return id && spec.accounts.some((a) => a.id === id) ? id : null;
}

const INDEX_ROUTE = stateById.get('states_index')?.route ?? '/states';

export function isIndexPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === INDEX_ROUTE.replace(/\/+$/, '');
}

export const indexRoute = INDEX_ROUTE;

function list(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw.split(',').map((v) => v.trim()).filter(Boolean);
}

export function parseQuery(search: string): Query {
  const p = new URLSearchParams(search);
  const forced = p.get('state');
  const frame = Number(p.get('frame'));
  return {
    state: forced === 'empty' || forced === 'loading' || forced === 'error' ? forced : null,
    tx: p.get('tx'),
    // ?account= is the one account value; ?scope= is read as an alias so
    // links shared before the two became one still land on the same view.
    scope: validAccount(p.get('account')?.split(',')[0]) ?? validAccount(p.get('scope')),
    chrome: p.get('chrome') === 'off' ? 'off' : null,
    frame: PROTOTYPE_WIDTHS.includes(frame) ? frame : null,
    grey: p.get('grey') === '1',
    status: list(p, 'status'),
    currency: list(p, 'currency'),
    type: list(p, 'type'),
    // "All" is the resting state of both, never a constraint.
    counterparty: p.get('counterparty') === COUNTERPARTY_ALL ? null : p.get('counterparty'),
    amountMin: normaliseAmount(p.get('amountMin')),
    amountMax: normaliseAmount(p.get('amountMax')),
    // Only a preset that is itself a range: never All (no constraint), never
    // Custom (it names no range), never an unknown word — each of those would
    // leave the radio group with nothing selected and a chip that filters nothing.
    date: datePreset(p.get('date')),
    dateFrom: p.get('dateFrom'),
    dateTo: p.get('dateTo'),
    q: p.get('q'),
  };
}

export function serializeQuery(q: Query): string {
  const p = new URLSearchParams();
  if (q.state) p.set('state', q.state);
  if (q.scope) p.set('account', q.scope);
  for (const key of MULTI_PARAMS) {
    if (q[key].length) p.set(key, q[key].join(','));
  }
  if (q.counterparty) p.set('counterparty', q.counterparty);
  if (q.amountMin) p.set('amountMin', q.amountMin);
  if (q.amountMax) p.set('amountMax', q.amountMax);
  if (q.date) p.set('date', q.date);
  if (q.dateFrom) p.set('dateFrom', q.dateFrom);
  if (q.dateTo) p.set('dateTo', q.dateTo);
  if (q.q) p.set('q', q.q);
  if (q.tx) p.set('tx', q.tx);
  appendPrototype(p, q);
  const s = p.toString();
  return s ? `/?${s}` : '/';
}

/**
 * True when a filter or search is active — the account excluded: it is scope,
 * not a filter (accountScope.scopeNotFilter). Drives the chips row, Clear all,
 * the result count and the rule beneath the toolbar.
 */
export function hasFilters(q: Query): boolean {
  return (
    MULTI_PARAMS.some((key) => q[key].length > 0) ||
    Boolean(q.counterparty || q.amountMin || q.amountMax || q.date || q.dateFrom || q.dateTo || q.q)
  );
}

export function clearedFilters(q: Query): Query {
  return {
    ...q,
    status: [],
    currency: [],
    type: [],
    scope: null,
    counterparty: null,
    amountMin: null,
    amountMax: null,
    date: null,
    dateFrom: null,
    dateTo: null,
    q: null,
  };
}

/** prototypeAffordances.widths — the only frame widths the chrome offers. */
const PROTOTYPE_WIDTHS: number[] = spec.prototypeAffordances.widths;

function appendPrototype(p: URLSearchParams, q: Pick<Query, 'chrome' | 'frame' | 'grey'>) {
  if (q.frame) p.set('frame', String(q.frame));
  if (q.grey) p.set('grey', '1');
  if (q.chrome) p.set('chrome', q.chrome);
}

/**
 * Carry the prototype parameters onto a route that does not set them. Without
 * this a link from /states, or any in-app navigation, would silently drop
 * ?chrome=off and bring the scaffolding back into a capture.
 */
export function withPrototypeParams(route: string, currentSearch: string): string {
  const current = parseQuery(currentSearch);
  const [pathname, search = ''] = route.split('?');
  const p = new URLSearchParams(search);
  const keep = {
    chrome: p.has('chrome') ? null : current.chrome,
    frame: p.has('frame') ? null : current.frame,
    grey: p.has('grey') ? false : current.grey,
  };
  appendPrototype(p, keep);
  const s = p.toString();
  return s ? `${pathname}?${s}` : pathname;
}

export const DATE_PRESETS = spec.filters.find((f) => f.id === 'date')?.presets ?? [];

/** filters.date.default — "All": no date constraint, no chip, the resting state. */
export const DATE_ALL = spec.filters.find((f) => f.id === 'date')?.default ?? '';

function datePreset(value: string | null): string | null {
  if (!value || value === DATE_ALL || value === DATE_CUSTOM) return null;
  return DATE_PRESETS.includes(value) ? value : null;
}

/** filters.counterparty.all — "All": no counterparty constraint, no chip. */
export const COUNTERPARTY_ALL = spec.filters.find((f) => f.id === 'counterparty')?.all ?? '';

/**
 * An amount as typed: '.' or ',' as the decimal separator (filters.amount
 * .inputNote). Returns the normalised number string, or null when the text is
 * not a number.
 */
export function normaliseAmount(text: string | null): string | null {
  if (!text) return null;
  const value = text.trim().replace(',', '.');
  return /^\d+(\.\d*)?$|^\.\d+$/.test(value) ? value : null;
}

/**
 * The last preset is the open-ended one ("Custom"): it names no range of its
 * own, so selecting it reveals the two bounds instead of filtering by itself.
 * Taken by position so the word is never restated in code.
 */
export const DATE_CUSTOM = DATE_PRESETS[DATE_PRESETS.length - 1] ?? '';
