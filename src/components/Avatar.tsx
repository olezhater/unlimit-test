/**
 * rowAnatomy.leading — 40px avatar.
 *
 *   merchant with a logo   the Brandfetch logo (logos), once it has loaded
 *   otherwise              a lettermark: the first letter of the name on a
 *                          background picked deterministically from the name
 *   non-personal, no logo  the category glyph (edgeCases.no_logo)
 *
 * The lettermark is drawn first and stays underneath while the logo loads, so
 * a slow or failed request never shows an empty circle or a broken image. The
 * type badge belongs to the lettermark path only (edgeCases.no_logo).
 */
import { type Fixture, typeById } from '../spec/spec.ts';
import { useLogo } from '../lib/logos.ts';
import { Icon } from './Icon.tsx';

/** Number of --avatar-N tints in tokens.css. */
const AVATAR_TINTS = 8;

/** A stable string hash (FNV-1a), so a name always gets the same tint. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (const char of text) {
    h ^= char.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function tintFor(name: string): number {
  return (hash(name) % AVATAR_TINTS) + 1;
}

/** The first letter of the name, skipping any leading punctuation or digits. */
function lettermarkFor(name: string): string {
  const letter = [...name].find((char) => /\p{L}/u.test(char));
  return (letter ?? [...name][0] ?? '').toLocaleUpperCase();
}

/**
 * The reusable part: a logo when one resolves, a lettermark otherwise.
 * `badge` is drawn over the lettermark only.
 */
function LogoAvatar({
  name,
  domain,
  badge,
}: {
  name: string;
  domain?: string;
  badge?: React.ReactNode;
}) {
  const { status, url } = useLogo(domain || undefined);
  const showLogo = status === 'loaded' && url;

  return (
    <span
      className="avatar"
      data-tint={tintFor(name)}
      data-logo-status={status}
      aria-hidden="true"
    >
      <span className="avatar__letter">{lettermarkFor(name)}</span>
      {showLogo ? <img className="avatar__logo" src={url} alt="" draggable={false} /> : null}
      {!showLogo && badge ? <span className="avatar__badge">{badge}</span> : null}
    </span>
  );
}

export function Avatar({ tx }: { tx: Fixture }) {
  const type = typeById.get(tx.type);
  const glyph = tx.counterparty?.glyph;
  const name = tx.counterparty?.name ?? tx.label ?? '';

  // A category glyph is a spec icon name; Icon fails loudly in development
  // if it is not vendored (src/icons/README.md).
  if (glyph) {
    return (
      <span className="avatar avatar--glyph" aria-hidden="true">
        <Icon name={glyph} size="md" />
      </span>
    );
  }

  return (
    <LogoAvatar
      name={name}
      // logo: false never fetches, even with a domain, so edgeCases.no_logo
      // still shows the fallback while the API is working.
      domain={tx.counterparty?.logo === true ? tx.counterparty.merchantDomain : undefined}
      badge={type ? <Icon name={type.directionGlyph} size="xs" /> : null}
    />
  );
}
