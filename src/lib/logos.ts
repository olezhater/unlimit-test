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
 * logos.clientIdSource). A domain's image is requested at most once per session: the
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
 *
 * What is PERSISTED is narrower (logos.cache): a logo that loaded, and the
 * provider's own reply that it has none — a 404. An image's error event does
 * not say why it failed, so after one the status is asked for once
 * (providerHasNoLogo); a refused connection, a 5xx, a redirect or a timeout
 * records nothing and the merchant is requested again on the next visit.
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

/**
 * The one definitive negative: the provider itself answering 404 for this
 * URL (logos.urlNote — fallback/404 makes an unknown brand a 404). Anything
 * else — a thrown fetch (refused, dropped, offline, blocked), a redirect, a
 * 5xx, a 429 — is not an answer and returns false.
 */
async function providerHasNoLogo(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    return response.status === 404 && !response.redirected;
  } catch {
    return false;
  }
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

  const settle = (status: Entry['status']) => {
    // First outcome wins: a load that lands after the timeout is ignored.
    if (entry.status !== 'loading') return false;
    window.clearTimeout(timer);
    entry.status = status;
    // A loaded logo is an answer about the merchant and is recorded at once.
    // A failure is not recorded here: see image.onerror.
    if (status === 'loaded') writeOutcome(domain, true);
    for (const notify of entry.listeners) notify();
    entry.listeners.clear();
    return true;
  };

  const image = new Image();
  image.decoding = 'async';
  image.onload = () => settle(image.naturalWidth > 0 ? 'loaded' : 'failed');
  image.onerror = () => {
    // The lettermark stays either way. Only the provider saying "no logo" is
    // remembered; a network failure is not an answer about the merchant.
    if (!settle('failed')) return;
    void providerHasNoLogo(entry.url).then((none) => {
      if (none) writeOutcome(domain, false);
    });
  };
  const timer = window.setTimeout(() => {
    image.src = '';
    settle('failed');
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
