# The spec is the source of truth

Standing rule. Applies to every agent, skill and build step in this repo.

## The hierarchy

Three layers. Higher wins. Read down only until something answers your question.

**1. `spec/transaction-history.spec.json` — canonical for everything the user can see or do.**

It owns:
- **Behaviour** — `listBehaviour` (day grouping, row anatomy, sorting, pagination),
  `feeModel`, `fxModel`, `search`, `filters[]`.
- **State definitions** — `states[]`: each state's `id`, `route`, `trigger` and `behaviour`.
- **Status semantics** — `statuses[]`: `label`, `iconShape`, `moneyMoved`, `listTreatment`,
  `detailHelperText`, `primaryAction`, `secondaryAction`, `timeline`, and the four channels in
  `statusDifferentiation`.
- **All copy** — every `copy.*` object in `states[]`, every `label`, `detailHelperText`,
  `search.placeholder`, `filters[].label` and `filters[].options`, the group-header forms in
  `listBehaviour.grouping`, the breakdown lines in `fxModel.detailsBreakdown`.
- **All fixture data** — `fixtures[]`, `accounts[]`, `transactionTypes[]`, `edgeCases[]`.
  Amounts, currencies, IBANs, references, rates, timestamps, logos, initials, merchantDomain.
- **Layout intent** — `meta.layout`: `pattern` "sidebar-list-responsive-panel",
  `sidebarWidth` 240, `panelBreakpoint` 1440 with `panelModes` persistent / drawer,
  `panelWidth` 480 with `panelWidthNote`, `listWidth` "fluid, min 640", `rowHeight` 64, `minWidth` 1280,
  and the `rationale` / `densityNote` behind them; `states.list.defaultSelection` (wide,
  narrow, focus, noResults) governs what the panel holds. Also `navigation`,
  `filtersDrawer` and `logos`. Quote the file, not this summary — it is the line
  most likely to go stale.

**2. `src/styles/tokens.css` — canonical for visual values.**

It owns colour, type scale, spacing, radii, sizes and layer order (z-index) — and nothing else. The spec deliberately names no
hex, no font, no px value except the layout dimensions in `meta.layout`; that silence is the
token file's territory. A value the token file lacks gets added as a token, never inlined.

**3. Component code (`src/**`) — layout and interaction only.**

Components own composition, DOM structure, event handling, focus management, the URL
read/write, and how spec values are arranged on screen. They own no copy, no data, no
visual constants.

## On a conflict

**The spec wins and the component is wrong.** Always, with no exception and no bridging.

- Component renders `"No transactions found"`, spec says
  `states[].copy.headline` = `"No transactions yet"` → the component is wrong. Fix the
  component; do not edit the spec to match the code.
- Component has `color: #16a34a` → the component is wrong. Use a token.
- Token file and component disagree on a radius → the token wins.
- Spec and token file appear to disagree (e.g. a layout dimension) → the spec wins;
  `meta.layout` is behaviour, not styling.
- Spec contradicts **itself** → that is **not** yours to resolve. Report it as a question per
  `CLAUDE.md` §4. If you must proceed, state the working default you used.

Drift runs downward only: spec → tokens → components. A fix belongs at the highest layer that
is wrong, never patched in at the call site. Never average, derive or interpolate between
layers, and never invent a value to bridge a gap.

## The practical rule: a string in a `.tsx` file is a defect

If the user can read it, it came from the JSON. This covers headlines, body copy, button
labels, status labels, filter labels and options, chip text, group headers, the result count,
placeholders, helper text, breakdown row labels, timeline step names, and empty/error copy.

Templated strings keep their placeholders in the spec and are interpolated in code:
`"{n} of {total} transactions"`, `"incl. {amount} {currency} fee"`,
`"Delivered on {deliveredAt}"`, `"Rate locked at {rateLockedAt}"`,
`"1 {sourceCurrency} = {rate} {targetCurrency}"`. The template text stays in the spec — code
substitutes values, it never rewrites the sentence.

**The one allowed exception: aria labels and `title` attributes assembled from spec values.**
`aria-label={`${tx.counterparty.name}, ${statusLabel}, ${formattedAmount}`}` is fine — every
word of it traces to the spec, and the glue is punctuation. Writing
`aria-label="Transaction row"` is not fine: that is new copy. Same rule for the `title`
attribute on the truncated row title required by `edgeCases.long_counterparty` — it carries the
fixture's own `counterparty.name`, nothing authored.

Not exceptions, and not permitted: `alt` text that invents a description, `aria-live`
announcements (`states.loading.copy.ariaLive` = `"Loading your transactions"` is in the spec —
use it), tooltip prose, visually-hidden labels with authored wording.

## Reading discipline

Load the spec at runtime as data (import the JSON), do not transcribe it into TypeScript
constants. A hand-copied status table in `src/` is a second source of truth and will drift —
derive types from the JSON instead. The same applies when writing rules or reviews: quote the
spec key, never your memory of it.
