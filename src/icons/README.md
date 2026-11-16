# Interface icons

Vendored from **Lucide** (https://lucide.dev), ISC licence — see [`LICENSE`](LICENSE), copied
verbatim from the package. That file also carries the MIT notice for the Lucide icons derived
from Feather (arrow-down-left, arrow-left, arrow-right, arrow-up-right, check, chevron-down, chevron-up,
clock, search, x).

- **Source:** the published npm package `lucide-static`, version **1.73.0**, files under
  `icons/`. Taken as raw SVGs; no Lucide package is a dependency of this project.
- **Normalised:** `viewBox="0 0 24 24"` kept; `stroke="currentColor"`, `fill="none"`; width,
  height and class removed; no colour anywhere. Geometry is byte-for-byte the package's. Only
  child elements are used at runtime — `src/components/Icon.tsx` draws them inside its own
  `<svg>` and sets size (`--icon-size-xs|sm|md|lg`) and stroke (`--icon-stroke`,
  `--icon-stroke-sm`) from tokens.

## The rule

**This folder contains only icons that are placed in the UI.** A vendored icon that nothing
renders is removed, not kept for later. Adding an icon means placing it in the same change.
`qaChecklist` checks it both ways: no icon on screen is missing from this folder, and no icon in
this folder is missing from the screen.

## Inventory

| File | Used for |
|---|---|
| `house.svg` | Sidebar: Home |
| `wallet.svg` | Sidebar: Accounts |
| `receipt-text.svg` | Sidebar: Transactions |
| `credit-card.svg` | Sidebar: Cards |
| `send.svg` | Sidebar: Payments |
| `arrow-right-left.svg` | Sidebar: Exchange, and the conversion avatar glyph ("arrows-exchange") — one glyph per concept, same orientation |
| `settings.svg` | Sidebar: Settings |
| `search.svg` | Inside the search field, left of the text; decorative |
| `sliders-horizontal.svg` | Toolbar: Filters button |
| `chevron-down.svg` | Dropdown triggers (account, toolbar Date, counterparty); timeline accordion, collapsed |
| `chevron-up.svg` | Timeline accordion, expanded |
| `x.svg` | Close control of the details drawer and the filters drawer; filter chip remove |
| `arrow-left.svg` | States index: "Back to the prototype" |
| `arrow-right.svg` | Filters drawer: between the two amount inputs (`filters.amount.rangeSeparator`), decorative. Also the prototype bar, after the States index link — there drawn as a CSS mask (`.proto__arrow`), not through `Icon.tsx`, because the bar uses no product component |
| `copy.svg` | Copy controls in the details panel (`copyableFields`) |
| `check.svg` | A copy control after a successful copy |
| `clock.svg` | Status: In progress (`statuses[].iconShape` "clock") |
| `circle-check.svg` | Status: Completed ("check-circle") — the details panel badge only; Completed rows carry no mark (`statuses[1].specNote`) |
| `circle-x.svg` | Status: Rejected ("cross-circle") |
| `ban.svg` | Status: Cancelled ("slash-circle") |
| `triangle-alert.svg` | Status: Failed ("triangle-alert") |
| `arrow-down-left.svg` | Avatar badge: incoming (`transactionTypes[].directionGlyph`) |
| `arrow-up-right.svg` | Avatar badge: outgoing |
| `coins.svg` | Fee: the account-fee avatar glyph (tx_1009, "coins") — currency-neutral |
| `inbox.svg` | Empty state illustration |

**Cancelled uses `ban`, not `circle-slash`.** At 16px, Lucide's `circle-slash` draws a short
diagonal that reads as the long arm of `circle-check`; `ban` crosses the circle edge to edge.

**Fee uses `coins`, not `receipt`.** Lucide's `receipt` carries a "$" inside its outline, which
was a factual error on a EUR fee.

**No `arrows-right-left` exists in Lucide.** The conversion glyph uses `arrow-right-left`.

Spec identifiers (status shapes, glyphs, navigation ids) map to these file names in one table,
`ALIASES` in `Icon.tsx`; this table documents it and `ALIASES` wins on any disagreement.
