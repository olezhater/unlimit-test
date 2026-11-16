# Transaction history — web prototype

A transaction history for a multi-currency consumer fintech account: a sidebar, a day-grouped list
and a details panel (a persistent column at 1440px and above, an overlay drawer below), covering every state, status and edge case. Desktop web only,
1280px and up. React + Vite + TypeScript.

Take-home prototype. No backend — all data comes from the fixtures in the spec.

## Run it

```bash
npm ci
npm run dev
```

Opens on http://localhost:5173.

Merchant logos come from the Brandfetch Logo API. Copy `.env.example` to `.env` and fill in a
client id (`.env` is git-ignored):

```bash
cp .env.example .env
```

Without one, no logo request is made and every merchant shows its lettermark. Any failed,
slow or refused logo request falls back the same way.

Logo lookups are cached as outcomes, never as images. Within a session a merchant is requested
once. Across sessions, `localStorage` keeps one small record per merchant — whether it had a
logo and when that was checked — for seven days (at most 200 merchants), so a merchant the provider
said it has no logo for (a 404) is not requested again, while a network failure is never stored and is retried on the next visit. That first half is tested with mocked responses only: reading a real 404 depends on a CORS header the provider may or may not send, and it has not been exercised against the live API. If the 404 is not readable, nothing is stored and the missing logo is re-requested each visit — also correct, and the only outcome that is certain (spec `logos.cacheVerification`); image bytes stay in the browser's own HTTP cache. With
storage unavailable the app falls back to the in-memory cache and behaves the same. A `VITE_` variable is compiled into the
client bundle, so the id is visible to anyone who loads a deployed build. Brandfetch client ids
are designed to be public, but restrict yours to your domain in the Brandfetch dashboard.

The prototype bar at the top switches the app frame between 1280, 1440 and Full width; at a
fixed width the area beside the frame takes the bar's dark surface. Greyscale is switched on
from the States index (`?grey=1`, carried across every route); while it is on, the bar shows a
"Greyscale on" chip that turns it off from anywhere. The
details panel is a persistent column when the frame is 1440px or wider (it always holds a
transaction, and widens with Full width) and a drawer below that.
`?chrome=off` hides the bar.

**Download statement** (top right), the details panel's actions, and the empty and error states' way-out actions (Make a transfer, Contact support) are stubs: pressing one shows "Not implemented in this prototype" in the bar's dark style (it stays
under `?chrome=off`, since it marks the stub's limit) and generates nothing.

## The spec

`spec/transaction-history.spec.json` is the source of truth: behaviour, state definitions,
status semantics, every user-visible string, and every transaction fixture. Nothing visible in
the UI is written in a component — if a string is on screen, it is in that file.

The canon hierarchy and what each layer owns: [`.claude/rules/spec-is-source-of-truth.md`](.claude/rules/spec-is-source-of-truth.md).

## Reaching every state

Every state is a URL. **[`/states`](http://localhost:5173/states) lists them all, one click each** — generated from the spec, so it
cannot fall out of date.

| State | URL |
|---|---|
| List (default) | `/` |
| Empty | `/?state=empty` |
| Loading | `/?state=loading` |
| Error | `/?state=error` |
| Filters — active | `/?status=failed&currency=EUR` |
| Filters — no results | `/?status=rejected&currency=USD` |
| Transaction details | `/?tx=tx_1004` |

Any fixture id opens in the panel: `/?tx=tx_1007` is the stress-test row (longest counterparty
name, longest reference, no logo), `/?tx=tx_1003` is the currency conversion, `/?tx=tx_1005`,
`/?tx=tx_1006` and `/?tx=tx_1002` cover rejected, cancelled and in-progress.

Filters are real: `?status=`, `?currency=`, `?type=`, `?account=`, `?amountMin=`, `?amountMax=`,
`?date=`, `?dateFrom=`, `?dateTo=`, `?counterparty=` and `?q=` all filter (`All` is the
no-constraint value of `?date=` and `?counterparty=`; the counterparty field is a picker; `?account=`
is the account, set beside the title or in the drawer, with `?scope=` read as an alias) the fixtures rather
than switching to a canned view. `meta.now` in the spec is treated as the current moment, so
'Today' and 'Yesterday' are stable and screenshots are deterministic.

## Screenshots

With the dev server running (Playwright is a dev dependency; the browser is a one-off download):

```bash
npx playwright install chromium
```

```bash
node scripts/capture-states.mjs
```

One PNG per state at 1440×900 into `screenshots/`; the list at 1280, 1440 and Full width, at
rest and with the heading pinned, into `screenshots/widths/`; the details drawer (1280), the
filters drawer, the Recipient or sender list (1280 and 1440), the account and Date dropdowns, a
focused field and the Download statement notice into `screenshots/drawers/`; and desaturated renders of the list and filtered list into `screenshots/greyscale/` — the four marked statuses must stay distinct from each other and from the
unmarked Completed rows with the colour removed. Brandfetch refuses headless user agents, so every captured avatar shows its lettermark: that is the provider's behaviour and the fallback path working, not a broken integration. The logo path is verified manually: the deployed build at unlimit-test.netlify.app loads real merchant logos in a normal browser (Stripe, Upwork, Hostinger and Octopus Energy among them). The script creates
`screenshots/` itself; the folder is generated output and is not committed.

## Third-party assets

- **Lucide** (ISC) for interface icons, vendored as SVGs in `src/icons/` — licence and the list
  of icons in [`src/icons/README.md`](src/icons/README.md).
- **Brandfetch** for merchant logos, fetched at runtime from the Logo API (see "Run it").

## AI usage

### Tools

- **Claude** — research synthesis, the specification, and design decisions.
- **Claude Code**, running a project-specific set of agents, skills and rules written for this task — implementation and review.
- **Mobbin MCP** — pulling reference screens from Revolut, Wise and Stripe Dashboard.

### Where

**Research.** A benchmark across five products along nine axes: row anatomy, date grouping, how status is signalled without colour, how fees are tied to their payment, FX display, details structure, filters, long content, and missing-logo fallbacks. Two of the five had no web screens available; that was reported as a gap rather than filled with mobile screens.

**Specification.** `spec/transaction-history.spec.json` is the single source of truth: states, statuses, copy, fixtures and the rules that govern them. The prototype renders from it, and a rule makes a hardcoded string in a component a defect. The specification was written before any UI, and reviewed before any UI was built — that review surfaced thirteen ambiguities, six of them blocking. Two were mine: a day total that could not be computed across currencies without inventing an exchange rate, and an amount that was ambiguous by the value of its fee.

**Build and review.** Each round ended with three reviews run in a clean context — a state auditor against the specification, a design review, and a rendering pass measuring contrast and overflow. Reviews ran separately from the session that produced the work, so the work was not grading itself.

### What worked

**Inverting the order.** Writing the specification first, and reviewing it before building, moved the expensive errors to the cheapest point. Six blocking ambiguities found on paper would each have been a visible defect on screen.

**Forbidding invention.** Because no component may contain a string, the model could not paper over a missing label — it reported the gap instead. Three missing pieces of copy surfaced that way, including a close control that had been announcing the wrong thing to screen readers.

**Fresh-context review.** Reviews caught what the producing session was blind to: a transaction removed by a filter that stayed open in the details panel, a URL that opened a fee as if it were a payment, and a "Copied" confirmation that appeared even when the clipboard write had been refused.

### What didn't

**Self-reported numbers.** Contrast ratios were written from estimate rather than measurement and corrected only when challenged. The rule now says measured, not estimated, and the measurements are recorded in `tokens.css` — including three places where the base values fall below WCAG thresholds and this prototype deliberately departs from them.

**Small-size judgement.** Two status icons that are clearly different at 24px collide at 16px. Only a side-by-side check at the real size caught it.

**Consistency across rounds.** A layout was proposed that contradicted a rule written one round earlier. Rules in a file do not enforce themselves; someone has to notice.

### What stayed mine

Scope — what to cut. Where a requirement in the brief outranked a tidier idea, such as keeping the account filter after it had been argued away. And when a design decision changed what the project could claim: removing the mark from completed rows was right, and it meant the claim about colour-independence had to be rewritten rather than left standing.

### Known limits

Merchant logos come from the Brandfetch Logo API; the client id is a public, build-time value that should be restricted to the deployment's domain. In production that call would run server-side. The logo path is verified manually: the deployed build at unlimit-test.netlify.app loads real merchant logos in a normal browser (Stripe, Upwork, Hostinger and Octopus Energy among them). The automated captures and audits cannot see them, because the provider refuses headless browsers; screenshots showing lettermarks say nothing about the integration. Download statement, the details panel's actions (Download confirmation, Repeat, Contact support) and the two actions that lead out of this screen (Make a transfer, Contact support) are intentional stubs that say so on use. Below 1280px the layout is deferred, with the intended behaviour recorded in the specification rather than half-built.

The layout is designed for a standard desktop window, not a short one: 900px tall is the reference and 768px the stated minimum (`meta.minHeight`; nothing enforces it). The details panel pins its header and its actions, so a short window squeezes the scrolling body between them. Measured at a 1440 frame for the tallest header (`tx_1005`): 316px at 900 tall, 184px at 768, 56px at 640 (68px for `tx_1007`, the longest fixture). At 640 it is not usable. Recorded as a known limit in `deferred.shortViewport`, not fixed.

The negative logo cache is verified against mocked responses, not the live provider — see "Run it".
