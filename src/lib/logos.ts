/**
 * logos — merchant logos from the Brandfetch Logo API.
 *
 * Two caches, both of OUTCOMES, never of image bytes (logos.cache):
 *   - in memory, per session: the first request for a domain creates its entry
 *     synchronously, so concurrent and repeated requests from every avatar and
 *     re-render share one request;
 *   - across sessions, via logoCache.ts: a domain known to have no logo is not
 *     requested again until its record's TTL expires. A domain known to HAVE a
 *     logo is still requested, because the image must be loaded — the browser's
 *     HTTP cache serves it, since the URL for a merchant never changes.
 *
 * The URL template and client id source are spec data (logos.urlTemplate,
 * logos.clientIdSource). A domain is requested at most once per session: the
 * first request's outcome — loaded or failed — is kept here and every avatar
 * for that merchant reads it. A failure is silent; the avatar keeps its
 * lettermark.
 *
 * Every failure mode ends in 'failed': a network error, a blocked request and
 * any 4xx or 5xx (rate limiting included) fire the image's error event; a
 * response that decodes to nothing counts as failed; a request still pending
 * after LOGO_TIMEOUT_MS is abandoned. A missing or empty client id makes no
 * request at all. Nothing is rendered until a logo has fully loaded, so there
 * is no broken image and no flash of a missing asset.
 */
import { useEffect, useState } from 'react';
import { spec } from '../spec/spec.ts';
import { readOutcome, setSignature, writeOutcome } from './logoCache.ts';

type LogoStatus = 'none' | 'loading' | 'loaded' | 'failed';

const CLIENT_ID: string = (import.meta.env.VITE_BRANDFETCH_CLIENT_ID ?? '').trim();

// Records are only trusted for the configuration that produced them.
setSignature(`${spec.logos.urlTemplate}|${CLIENT_ID}`);

/** A logo slower than this is treated as failed; the lettermark stays. */
const LOGO_TIMEOUT_MS = 6000;

interface Entry {
  status: Exclude<LogoStatus, 'none'>;
  url: string;
  listeners: Set<() => void>;
}

const cache = new Map<string, Entry>();

function logoUrl(domain: string): string {
  return spec.logos.urlTemplate
    .replace('{domain}', encodeURIComponent(domain))
    .replace('{clientId}', encodeURIComponent(CLIENT_ID));
}

function request(domain: string): Entry {
  const existing = cache.get(domain);
  if (existing) return existing;

  // A recorded, still-fresh "no logo" answers without touching the network.
  const known = readOutcome(domain);
  if (known && !known.ok) {
    const failed: Entry = { status: 'failed', url: logoUrl(domain), listeners: new Set() };
    cache.set(domain, failed);
    return failed;
  }

  const entry: Entry = { status: 'loading', url: logoUrl(domain), listeners: new Set() };
  cache.set(domain, entry);

  /** `definitive` false: a timeout, which says nothing lasting about the merchant. */
  const settle = (status: Entry['status'], definitive = true) => {
    // First outcome wins: a load that lands after the timeout is ignored.
    if (entry.status !== 'loading') return;
    window.clearTimeout(timer);
    entry.status = status;
    // Persist only what the merchant's answer says: a loaded logo, or a
    // refusal while the browser is online. A timeout or an offline failure
    // is about this visit's network, not the merchant, and is not recorded.
    if (definitive && (status === 'loaded' || navigator.onLine)) {
      writeOutcome(domain, status === 'loaded');
    }
    for (const notify of entry.listeners) notify();
    entry.listeners.clear();
  };

  const image = new Image();
  image.decoding = 'async';
  image.onload = () => settle(image.naturalWidth > 0 ? 'loaded' : 'failed');
  image.onerror = () => settle('failed');
  const timer = window.setTimeout(() => {
    image.src = '';
    settle('failed', false);
  }, LOGO_TIMEOUT_MS);
  image.src = entry.url;
  return entry;
}

/**
 * The logo state for one merchant. No domain, or no client id configured,
 * means no request at all: the lettermark is the answer, not a fallback.
 */
export function useLogo(domain: string | undefined): { status: LogoStatus; url: string | null } {
  const active = Boolean(domain && CLIENT_ID);
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!active || !domain) return;
    const entry = request(domain);
    if (entry.status !== 'loading') return;
    const notify = () => rerender((n) => n + 1);
    entry.listeners.add(notify);
    return () => {
      entry.listeners.delete(notify);
    };
  }, [active, domain]);

  if (!active || !domain) return { status: 'none', url: null };
  const entry = cache.get(domain);
  if (!entry) {
    // First render, before the effect runs: a recorded "no logo" is already
    // the answer, so the fallback renders final from the first frame.
    const known = readOutcome(domain);
    return { status: known && !known.ok ? 'failed' : 'loading', url: null };
  }
  return { status: entry.status, url: entry.status === 'loaded' ? entry.url : null };
}
