/**
 * logos.cache — the OUTCOME of each logo lookup, persisted across sessions.
 *
 * What is stored: per domain, whether the logo resolved, when that was
 * checked and against which request configuration — `{ ok, at, sig }`, sig a
 * short hash of the URL template and client id. No image data: the bytes stay in
 * the browser's HTTP cache, which hits because the request URL for a merchant
 * is stable (logos.urlTemplate has no size or cache-busting parameter).
 *
 * Rules (spec logos.cache):
 *   - one versioned localStorage key, so a future shape change never reads
 *     stale entries (an older version's key is simply ignored);
 *   - an entry older than the TTL (seven days) is treated as unknown and the
 *     domain is checked again, so a merchant that adds a logo is picked up;
 *   - at most MAX_ENTRIES domains; the oldest checks are evicted first;
 *   - every read and write is wrapped: private browsing, a full quota or a
 *     disabled storage API leave the app on in-memory caching only, exactly
 *     as it behaves without this module.
 *
 * Time here is the real clock (Date.now), not meta.now: this is
 * infrastructure, not product data.
 */

const STORAGE_KEY = 'transaction-history.logo-outcomes.v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

interface Outcome {
  ok: boolean;
  at: number;
  /** Which request configuration answered: a hash of the URL template and the
   *  client id. A record from another configuration (a corrected or changed
   *  client id) is treated as unknown, so one bad id never hides logos. */
  sig: string;
}

type Store = Record<string, Outcome>;

/** The store as read once from localStorage; null when storage is unusable. */
let memory: Store | null | undefined;

/** The configuration every record is checked against (see Outcome.sig). */
let signature = '';
export function setSignature(source: string): void {
  // FNV-1a, enough to tell configurations apart; not a secret and not stored raw.
  let h = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  signature = (h >>> 0).toString(36);
}

function isOutcome(value: unknown): value is Outcome {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.ok === 'boolean' &&
    typeof v.at === 'number' &&
    Number.isFinite(v.at) &&
    typeof v.sig === 'string'
  );
}

/** Parse a stored value into a clean store; anything unreadable becomes empty. */
function parse(raw: string | null): Store {
  const store: Store = Object.create(null);
  if (!raw) return store;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [domain, outcome] of Object.entries(parsed as Record<string, unknown>)) {
        if (isOutcome(outcome)) store[domain] = outcome;
      }
    }
  } catch {
    // Corrupt value: start empty; the next write repairs the key.
  }
  return store;
}

function load(): Store | null {
  if (memory !== undefined) return memory;
  try {
    memory = parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage disabled or blocked: in-memory caching only.
    memory = null;
  }
  return memory;
}

/** A fresh outcome for this domain, or null when unknown or past its TTL. */
export function readOutcome(domain: string): Outcome | null {
  const store = load();
  const outcome = store?.[domain];
  if (!outcome || outcome.sig !== signature) return null;
  const age = Date.now() - outcome.at;
  return age >= 0 && age < TTL_MS ? outcome : null;
}

/** Record an outcome; silently does nothing when storage is unusable. */
export function writeOutcome(domain: string, ok: boolean): void {
  if (!load()) return;
  // Merge with what another tab may have written since this one read.
  let store: Store;
  try {
    store = { ...parse(window.localStorage.getItem(STORAGE_KEY)), ...memory };
  } catch {
    store = memory as Store;
  }
  store[domain] = { ok, at: Date.now(), sig: signature };
  memory = store;
  const domains = Object.keys(store);
  if (domains.length > MAX_ENTRIES) {
    domains
      .sort((a, b) => store[a].at - store[b].at)
      .slice(0, domains.length - MAX_ENTRIES)
      .forEach((domain) => delete store[domain]);
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded or storage revoked mid-session: keep the in-memory copy.
  }
}
