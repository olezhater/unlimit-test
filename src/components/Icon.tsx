/**
 * Icons — the vendored Lucide set in src/icons (see src/icons/README.md).
 *
 * Each SVG is imported as raw text and only its child elements are drawn
 * inside one <svg> this component owns, so stroke, size and accessibility are
 * set here and nowhere else. No path is written in a component file. SOURCES
 * lists every file in src/icons. arrow-right is also drawn by the prototype
 * bar as a CSS mask, so the bar uses no product component; every file is on
 * screen (src/icons/README.md: nothing is vendored for later).
 *
 * Size and stroke are tokens, applied in CSS from data-size: --icon-size-*,
 * and --icon-stroke (Lucide's 2) dropping to --icon-stroke-sm (1.5) at 16px
 * and below so small glyphs (avatar badge, chips, status icons) do not read
 * heavy. `strokeWidth` overrides the token for one icon; nothing uses it.
 *
 * Every icon is decorative to assistive technology (aria-hidden). Where an icon
 * carries meaning, its container holds the name: a button's aria-label, the
 * a row's aria-label (which also names Completed, drawn with no mark).
 */
import arrowDownLeft from '../icons/arrow-down-left.svg?raw';
import arrowLeft from '../icons/arrow-left.svg?raw';
import arrowRight from '../icons/arrow-right.svg?raw';
import arrowRightLeft from '../icons/arrow-right-left.svg?raw';
import arrowUpRight from '../icons/arrow-up-right.svg?raw';
import ban from '../icons/ban.svg?raw';
import check from '../icons/check.svg?raw';
import chevronDown from '../icons/chevron-down.svg?raw';
import chevronUp from '../icons/chevron-up.svg?raw';
import circleCheck from '../icons/circle-check.svg?raw';
import circleX from '../icons/circle-x.svg?raw';
import clock from '../icons/clock.svg?raw';
import coins from '../icons/coins.svg?raw';
import copy from '../icons/copy.svg?raw';
import creditCard from '../icons/credit-card.svg?raw';
import house from '../icons/house.svg?raw';
import inbox from '../icons/inbox.svg?raw';
import receiptText from '../icons/receipt-text.svg?raw';
import search from '../icons/search.svg?raw';
import send from '../icons/send.svg?raw';
import settings from '../icons/settings.svg?raw';
import slidersHorizontal from '../icons/sliders-horizontal.svg?raw';
import triangleAlert from '../icons/triangle-alert.svg?raw';
import wallet from '../icons/wallet.svg?raw';
import x from '../icons/x.svg?raw';

const SOURCES: Record<string, string> = {
  'arrow-down-left': arrowDownLeft,
  'arrow-left': arrowLeft,
  'arrow-right': arrowRight,
  'arrow-right-left': arrowRightLeft,
  'arrow-up-right': arrowUpRight,
  ban,
  check,
  'chevron-down': chevronDown,
  'chevron-up': chevronUp,
  'circle-check': circleCheck,
  'circle-x': circleX,
  clock,
  coins,
  copy,
  'credit-card': creditCard,
  house,
  inbox,
  'receipt-text': receiptText,
  search,
  send,
  settings,
  'sliders-horizontal': slidersHorizontal,
  'triangle-alert': triangleAlert,
  wallet,
  x,
};

/**
 * Spec identifiers → vendored file names. The spec names shapes and
 * navigation items in its own words (statuses[].iconShape, transactionTypes[]
 * .directionGlyph, fixture glyphs, navigation.items[].id); this is the one
 * place they meet the icon set.
 */
const ALIASES: Record<string, string> = {
  // statuses[].iconShape
  'check-circle': 'circle-check',
  'cross-circle': 'circle-x',
  // Lucide's circle-slash draws a short stroke that reads as the long arm of
  // circle-check at 16px; ban's edge-to-edge slash does not.
  'slash-circle': 'ban',
  // fixtures[].counterparty.glyph
  'arrows-exchange': 'arrow-right-left',
  // navigation.items[].id
  home: 'house',
  accounts: 'wallet',
  transactions: 'receipt-text',
  cards: 'credit-card',
  payments: 'send',
  // One glyph per concept: the Exchange item and the conversion row share it.
  exchange: 'arrow-right-left',
};

/** The child elements of a vendored file — everything inside its <svg>. */
const BODIES: Record<string, string> = Object.fromEntries(
  Object.entries(SOURCES).map(([key, source]) => [
    key,
    source
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      // No whitespace text nodes: they would leak into a control's textContent.
      .replace(/>\s+</g, '><')
      .trim(),
  ]),
);

/** --icon-size-xs | sm | md | lg in tokens.css. */
type IconSize = 'xs' | 'sm' | 'md' | 'lg';

export function Icon({
  name,
  size = 'sm',
  strokeWidth,
}: {
  name: string;
  size?: IconSize;
  strokeWidth?: number;
}) {
  const body = BODIES[ALIASES[name] ?? name];
  if (!body) {
    // A spec identifier with no vendored file would silently drop a status
    // shape or a glyph: fail during development, draw nothing in a build.
    if (import.meta.env.DEV) throw new Error(`Icon: no vendored icon for "${name}".`);
    return null;
  }
  return (
    <svg
      className="icon"
      data-size={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      style={strokeWidth === undefined ? undefined : { strokeWidth }}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
