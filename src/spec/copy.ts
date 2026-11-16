/**
 * Every user-visible string template, read from the spec.
 *
 * The panel's labels, section headings and chip formats are first-class spec
 * objects (`fieldLabels`, `states.details.sectionHeadings`, `filterChips`), so
 * nothing here parses labels out of prose. Two
 * values still live inside sentences — the day-header forms and the fee line —
 * and are extracted by shape, with no authored fallback.
 */
import { spec, stateById } from './spec.ts';

/** Pull the single-quoted fragments out of a sentence. */
function quoted(source: string): string[] {
  return [...source.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** Replace {token} with a value. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/* -------------------------------------------------------------------------- */
/* Day group headers                                                          */
/* listBehaviour.grouping: "... Group headers read 'Today', 'Yesterday',       */
/* then '12 November'."                                                       */
/* -------------------------------------------------------------------------- */
const groupingForms = quoted(spec.listBehaviour.grouping);
export const DAY_TODAY = groupingForms[0];
export const DAY_YESTERDAY = groupingForms[1];

/*
 * groupHeaderExtra.rule carries the multi-currency example
 * "−2,007.40 EUR · +1,686.40 GBP". It is matched by shape — two signed amounts
 * with currency codes — not by quote marks: the same sentence contains plain
 * apostrophes in "day's" and "currency's", so a quote scan picks the wrong
 * fragment. There is no authored fallback; a failure here must be visible.
 */
const DAY_TOTAL_EXAMPLE =
  /[+−-][\d,.]+\s[A-Z]{3}(\s\S\s)[+−-][\d,.]+\s[A-Z]{3}/
    .exec(spec.listBehaviour.groupHeaderExtra.rule);

if (!DAY_TOTAL_EXAMPLE) {
  throw new Error(
    'listBehaviour.groupHeaderExtra.rule no longer carries a two-currency example to take the separator from.',
  );
}

export const DAY_TOTAL_SEPARATOR = DAY_TOTAL_EXAMPLE[1];

export const META_SEPARATOR = (() => {
  // "Status mark … · time · note" — take the single glyph between fields.
  const match = /\s(\S)\s/.exec(spec.listBehaviour.rowAnatomy.meta);
  if (!match) throw new Error('listBehaviour.rowAnatomy.meta no longer carries a separator between its fields.');
  return ` ${match[1]} `;
})();

/* -------------------------------------------------------------------------- */
/* The fee line on a parent row                                               */
/* feeModel.rules[1]: "... a secondary line: 'incl. {amount} {currency} fee'" */
/* -------------------------------------------------------------------------- */
const feeLine = quoted(spec.feeModel.rules[1])[0];
if (!feeLine) throw new Error('feeModel.rules[1] no longer carries the quoted fee line template.');
export const FEE_LINE_TEMPLATE = feeLine;

/* -------------------------------------------------------------------------- */
/* Panel labels and headings — spec objects, read directly                    */
/* -------------------------------------------------------------------------- */
export const FIELD_LABELS = spec.fieldLabels;

const details = stateById.get('details');
if (!details?.copy) {
  throw new Error('states.details.copy is missing: every panel string comes from it.');
}
export const DETAILS_COPY = details.copy;

/**
 * states.details.copyableFields.copies — which rows may carry a copy control
 * and what each copies: 'value' (what the row shows) or 'iban' (the IBAN of
 * the party the row names where there is one, else what the row shows —
 * copyableFields.ibanRule).
 */
export const COPIES: Record<string, 'value' | 'iban'> =
  (details as { copyableFields?: { copies: Record<string, 'value' | 'iban'> } } | undefined)
    ?.copyableFields?.copies ?? {};

/*
 * states.details.sections[] — the panel's sections, in render order, each with
 * its heading and the condition it renders under. Each heading also exists in
 * states.details.sectionHeadings; the two are the same string held twice, so
 * they are checked here rather than trusted. A divergence fails loudly at load
 * instead of letting one copy move while the screen keeps showing the other.
 */
export const SECTIONS = details?.sections ?? [];
const sectionHeadings = details?.sectionHeadings ?? {};
for (const section of SECTIONS) {
  if (sectionHeadings[section.id] !== section.heading) {
    throw new Error(
      `states.details.sections["${section.id}"].heading "${section.heading}" does not match ` +
        `sectionHeadings.${section.id} "${sectionHeadings[section.id]}".`,
    );
  }
}


/** states.list.copy.pageTitle — meta.name is bookkeeping and never shown. */
export const PAGE_TITLE = stateById.get('list')?.copy?.pageTitle ?? '';

/* -------------------------------------------------------------------------- */
/* Conversion breakdown                                                       */
/* fxModel.detailsBreakdown supplies the value templates and their order;     */
/* fieldLabels supplies the labels.                                           */
/* -------------------------------------------------------------------------- */
const FX_LABEL_KEYS = [
  'youConvert',
  'fee',
  'totalDebited',
  'exchangeRate',
  'youReceive',
] as const;

export const FX_BREAKDOWN = spec.fxModel.detailsBreakdown.map((line, index) => {
  const [lineLabel, ...rest] = line.split(' — ');
  const label = FIELD_LABELS[FX_LABEL_KEYS[index]];
  // The line's own label and fieldLabels are one string held twice; a reorder
  // or rename in either must fail here, not mislabel a figure.
  if (lineLabel.trim() !== label) {
    throw new Error(`fxModel.detailsBreakdown[${index}] is labelled "${lineLabel}" but fieldLabels gives "${label}".`);
  }
  // "Label — {token} {token}" → the value side only.
  return { label, template: rest.join(' — ').trim() };
});

export const FILTER_CHIPS = spec.filterChips;

/** filtersDrawer — the toolbar trigger and the drawer's two actions. */
export const FILTERS_DRAWER = spec.filtersDrawer;

/** accountScope — the header dropdown: whose history is on screen. */
export const ACCOUNT_SCOPE = spec.accountScope;

/** timelineRules.steps — per-type step labels over the brief's three positions. */
export const TIMELINE_STEPS = spec.timelineRules.steps;

/** toolbar.download — "Download statement", a stub under prototypeAffordances.stubRule. */
export const DOWNLOAD = spec.toolbar.download;

/** states.details.repeatAction — one Repeat action, on outgoing payments only. */
const repeatAction = (details as { repeatAction?: { label: string } } | undefined)?.repeatAction;
if (!repeatAction?.label) {
  throw new Error('states.details.repeatAction.label is missing: the Repeat action would render empty.');
}
export const REPEAT_ACTION = repeatAction;

/** navigation — the sidebar items, in order, and which one is current. */
export const NAVIGATION = spec.navigation;

/** prototypeAffordances — scaffolding copy, kept apart from product copy. */
export const PROTOTYPE = spec.prototypeAffordances;
export const SEARCH_PLACEHOLDER = spec.search.placeholder;
