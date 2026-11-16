# Transaction history — design-ops router

This repo builds one thing: a **web transaction history** for a fintech account —
a day-grouped list plus a details panel, covering every state, status and edge case
defined in `spec/transaction-history.spec.json`.

This file is the **router**. It holds product context, the hard rules, and a map of
which agent or skill owns which job. Detail lives in the referenced files and loads
on demand — do not duplicate it here.

---

## 1. Product context

- **Surface:** web only. Desktop-first, `meta.minWidth` 1280px. No mobile layout in v1.
- **Product:** transaction history for a multi-currency consumer account (EUR / GBP / USD).
  Layout `sidebar-list-responsive-panel`: a 240px sidebar (`navigation`), the
  fluid list, and one details panel with two modes keyed on the **frame** width — at 1440px and
  above a persistent column (480px floor, widening with Full width) that always holds a visible
  transaction; below, a drawer with a scrim, opened on click only. Filters live in a
  drawer behind one button; search, a Date dropdown (the same filter as the drawer's Date) and the chips stay in the
  toolbar. "Download statement" (`toolbar.download`) is a stub at the top right, like the panel's actions. An account dropdown (`accountScope`, "All accounts" first) sits immediately right of the page
  title as part of the heading; it and the drawer's Account field are one value. Merchant logos come from
  the Brandfetch Logo API (`logos`) with a lettermark fallback, in the row and atop the panel.
- **Language:** English only (`meta.locale` = `en`). Every string comes from the spec.
- **Stack:** React + Vite + TypeScript. State lives in the URL query string, not in component
  state — there is no router dependency, `?state=`, `?tx=`, `?status=`, `?currency=` are read
  from `location.search`.
- **Scope:** a prototype that demonstrates states and decisions. No backend, no auth, no real
  money. All data is `fixtures[]`.
- **Prototype chrome:** `prototypeAffordances` is reviewer scaffolding (width presets and the
  States index link in the bar; the greyscale toggle on the States index, with a "Greyscale on"
  chip in the bar while it is active), never product UI. Its colours and type size come only from `--proto-*` tokens;
  spacing, radius and weight use the shared scale. It uses no product component, and
  `?chrome=off` removes it — every capture passes that. One exception: the Download stub's
  notice (`toolbar.download.stub`) stays, because it marks the stub's limit on the product surface. Judge the product with it off.

---

## 2. Hard rules (never violate)

1. **Every user-visible string comes from `spec/transaction-history.spec.json`.** Never
   hardcoded in a component. A string literal in a `.tsx` file is a defect — one exception,
   defined in `.claude/rules/spec-is-source-of-truth.md`.
2. **Every state in `states[]` is reachable by URL**, at the exact route the spec gives
   (`/`, `/?state=empty`, `/?state=loading`, `/?state=error`, `/?tx=tx_1004`,
   `/?status=failed&currency=EUR`, `/?status=rejected&currency=USD`), plus the `/states`
   index, which is itself a spec state (`states_index`, `excludeFromCoverageCount`).
3. **No new colour, type size, spacing or radius value outside `src/styles/tokens.css`.**
   A raw hex, px font-size or magic margin in a component is a defect where a token exists.
   Need a value the token file lacks → add the token, then use it.
4. **No invented transaction data outside `fixtures[]`.** No extra rows to make the list look
   fuller, no made-up IBANs, references, amounts, rates or counterparties. If a fixture lacks a
   field the UI needs, that is a spec gap to report, not a value to invent.
5. **Status is never communicated by colour alone.** The rule in
   `statusDifferentiation.channels`: the four exception statuses (In progress, Rejected,
   Cancelled, Failed) each carry a unique icon shape and a visible text label in the row, plus the
   amount treatment (regular vs strikethrough). Completed
   (`listTreatment.markVisible: false`) is the unmarked default: no icon and no label in the row,
   identified as the only unmarked state, with "Completed" kept in the row's accessible name
   (`statuses[1].specNote`). Colour is the last channel, never the first. The build must survive
   the greyscale test in `qaChecklist[0]`.

---

## 3. Who owns what

| Job | Owner |
|---|---|
| Canon hierarchy, conflicts between spec / tokens / code | `.claude/rules/spec-is-source-of-truth.md` |
| Building state routes, the `/states` index, verifying coverage | `.claude/skills/state-coverage/SKILL.md` |
| Rendering defects in a screenshot — fit, overflow, contrast, focus, greyscale | `.claude/skills/visual-qa/SKILL.md` |
| Spec adherence, token adherence, hierarchy in row and panel, status differentiation | `.claude/agents/design-reviewer.md` |
| Final coverage gate before submission — reports the coverage table | `.claude/agents/state-auditor.md` |
| Capturing one PNG per state, plus greyscale list renders | `scripts/capture-states.mjs` |

Boundaries are deliberate and must not blur: `design-reviewer` does not judge rendered
pixels (that is `visual-qa`) and does not audit coverage (that is `state-auditor`).
`visual-qa` judges only pixels and never reads source to form a verdict. `state-auditor`
reports and never fixes.

---

## 4. The produce loop

Every UI deliverable runs this, in order. Do not hand over a raw first draft plus a raw
review dump.

1. **Build** — from the spec. Strings, states, statuses and fixtures read out of the JSON.
2. **Self-review in a fresh context** — dispatch the relevant agent (`design-reviewer` for
   spec/token/hierarchy work, `state-auditor` for coverage) as a subagent with its own clean
   context. Never review inside the session that produced the work. For anything visual, run
   `scripts/capture-states.mjs` first and hand the reviewer the screenshots, because
   `visual-qa` cannot run from source.
3. **Self-fix only documented-rule violations** — a hardcoded string, an off-token value, a
   missing status channel, an unreachable route, a measured contrast failure, text clipping,
   horizontal page scroll, a top-level `fee_1004a` row. Re-verify after fixing.
4. **Report only the human calls** — spec ambiguities, gaps where a fixture lacks a field,
   tradeoffs with no documented right answer.

**Taste and composition are never self-fixed.** "Is this row too dense?", "does the panel
order read well?", "is this avatar treatment right?" are not rule compliance. They go to the
user as questions.

**Never resolve a spec ambiguity silently.** Pick a working default if you must proceed, say
which default you used, and surface the question.
