---
name: visual-qa
description: >-
  Check a RENDERED screenshot of the transaction history prototype for defects that only
  appear once pixels exist — text not fitting the longest fixture values, overflow and
  horizontal page scroll, measured contrast failures, invisible focus rings, and the greyscale
  status test. Invoke after scripts/capture-states.mjs, or when someone says "does this render
  correctly", "check for overflow/clipping/contrast", "QA these screenshots", "does the
  greyscale test pass", or before submitting the prototype. Judges rendered pixels only and
  requires a screenshot — it must not run from source code. It does not judge spec adherence
  (see design-reviewer) or state coverage (see state-coverage).
---

# Visual QA — is it drawn without defects?

Narrow by design. One question: *given what the spec says this should be, is it drawn
correctly at 1280px+?* Thresholds, not opinions. Every finding names the number it violates.

| Question | Owner |
|---|---|
| Does it match the spec and the tokens? | `design-reviewer` agent |
| Is every state reachable and complete? | `state-coverage` skill |
| **Is the rendered result broken?** | **this skill** |

A row can be perfectly on-spec and on-token and still ship with tx_1007's name clipping the
amount column.

## Hard prerequisite: you need pixels

**This skill judges rendered pixels only. It cannot run from source code.** Reading a `.tsx`
file or a `.css` file cannot catch clipping, overflow, a contrast failure or a focus ring that
vanishes — do not infer any of them from markup, class names or token values.

Required input: PNGs from `scripts/capture-states.mjs` (1440×900, one per `states[]` route,
plus `screenshots/greyscale/`), or a live render inspected in a browser at 1440×900 with the
viewport also checked at exactly **1280px**, the spec's `meta.minWidth`.

If you have only code, stop and say:
*"I need a screenshot to do visual QA — run `node scripts/capture-states.mjs` first. Reading
the source cannot catch clipping, overflow or contrast."*
Do not substitute a code review and do not report any check as passed.

## The checks

Six. Work through all of them. Report each as a pass or as a defect.

### 1. Text fitting against the longest fixture values

The fixtures are deliberately adversarial. These are the breakers, and each must be checked
by name, not in general:

- **tx_1007 counterparty** — `"Gesellschaft für Internationale Zusammenarbeit und
  Entwicklungsfinanzierung mbH"` (76 chars). In the row: exactly **one line**, ellipsised, and
  it must not collide with or push the trailing amount. In the panel: wraps to a **maximum of
  three lines** per `edgeCases.long_counterparty`; a fourth line is a defect.
- **tx_1007 reference** — `"Contract 2026/GIZ/EFD-4471-B · Milestone 3 of 5 · Framework
  agreement for technical cooperation services"` (105 chars). Not in the row at all — the row
  meta shows the note, never the reference (`rowAnatomy.metaNote`). Panel: **never truncated**,
  wraps in full, no ellipsis anywhere, copy control still reachable.
- **tx_1007 amount** — `-12,750.00 EUR`, the widest amount; the amount column must not wrap or
  shrink the title below readable width.
- **tx_1007 is the stress row** (`qaChecklist[2]`): it must not break the row, the day group
  header or the details panel at **1280px**. Check at 1280, not only 1440.
- **Non-Latin glyphs** — tx_1005 `"Teknoloji Anonim Şirketi"`, tx_1002
  `"Katarzyna Wiśniewska"`: no tofu boxes, no clipped diacritics (the dot of Ş and ś sits at
  the line-box edge — verify the descender/ascender is not cut).
- **tx_1003 FX row** — two stacked amounts in the trailing slot (`+1,686.40 GBP` primary,
  `−2,007.40 EUR` grey below) inside the 64px `meta.layout.rowHeight`. Both fully visible, no
  vertical clipping. Per `feeModel.conversionException` the fee must **not** appear here.
- **Day group header** — the per-currency net total on the right must not collide with the
  header label (`"Today"`, `"Yesterday"`, `"12 November"`) at the narrowest list width. The
  two-currency case is the breaker: `−2,007.40 EUR · +1,686.40 GBP`.
- **Filter chips** — the longest chip (`"Recipient or sender: Gesellschaft für …"`) must wrap
  the chip row, not overflow it; the remove control stays inside the chip.

**Thresholds:** no text clipped or ellipsised except where the spec requires it (row title,
row meta note). No text overflowing its container. Flag tight fits under **8px**
clearance to the next element, not only actual breaks.

### 2. Overflow and horizontal page scroll

- **Check every width in `prototypeAffordances.widths`** (1280, 1440) and Full width (a 1920
  window) as a real
  viewport, and through the prototype's frame control inside a narrower viewport: a frame wider
  than the viewport scrolls sideways inside the stage, never the body.
- **The page body must never scroll sideways.** Measure it:
  `document.documentElement.scrollWidth <= innerWidth`. Check at **1280px** and **1440px**.
  Any excess is a **blocker**, no tolerance.
- At a 1440 frame, the sidebar (240) plus the persistent panel column (480) plus the list
  column's 640px floor plus the gutters must fit with no horizontal scroll. Measure the list
  column at 1440: below 640 is a defect. At 1280 the panel is a drawer and reserves nothing.
- Nothing cut off by a fixed height or `overflow: hidden`: the panel scrolls internally while
  the amount and status stay pinned (`states.details.behaviour`), and that pinned block must
  not cover the first scrolled section.
- In persistent mode the panel column must never cover a row: measure the gap between the list
  column's right edge and the panel's left edge — it must be positive. In drawer mode covering
  the list is the design (`meta.layout.rationale`); check instead that the drawer spans the
  visible height of the frame (the stage below the prototype bar, or the viewport under
  `?chrome=off`) and that its scrim covers the rest of that visible area, never the bar.
- **Overlay containment (`qaChecklist[33]`).** With the bar shown (no `?chrome=off`), open
  the details drawer at 1280, the filters drawer, the dropdowns and the Download statement notice, scroll the
  stage behind each, and sample the bar: its background stays `--proto-surface`, nothing is
  drawn over it, and `elementFromPoint` on it returns the bar. This is the one check that needs
  the chrome on.
- The type badge on the initials avatar (tx_1002, tx_1007) sits at the lower right of the 40px
  circle and must stay inside the row box.

### 3. Contrast — measured, never eyeballed

Sample the actual rendered pixel colours from the screenshot and compute the ratio. Report the
number. "Looks fine" is not a result.

- **Body and meta text: ≥ 4.5:1** (WCAG 1.4.3). The usual failures here are the grey meta
  line, the grey source amount on tx_1003, and the day-header net total.
- **Large text (≥24px, or ≥19px at 600+) and UI boundaries: ≥ 3:1** (WCAG 1.4.11). Covers
  chip borders, input and button borders, the copy control and the dropdown trigger outlines.
- **Exempt, by recorded decision: row dividers, the day-header rule and the details panel's
  outline.** They measure 1.26:1 (`--line-row`), 1.41:1 (`--line-strong`) and 1.26:1 (the
  persistent panel's `--line-default` edge) and are decorative separators or container edges
  beside content that carries the meaning, so the 3:1 boundary rule — which governs control
  outlines and meaningful boundaries — does not apply (see the note beside `--line-row` in
  `tokens.css`). Do not report them. The exemption names these three only.
- **Exempt, by recorded decision: the primary button's edge.** Its fill measures 1.25:1
  against `--surface-page` and it has no outline, so its edge alone does not identify it; its
  label does (black on lime, 16.85:1), together with its place at the start of an action
  group. WCAG 1.4.11 applies where a boundary is needed to identify a control, and this one is
  not (see the Brand note in `tokens.css`, which carries the same wording and measurement). Do
  not report the fill ratio; do report its label if it ever falls below 4.5:1.
- **Not a boundary: the dropdown surface's hairline** (`--line-surface`, #E5E5E5, 1.19:1 against the page tinted by its shadow).
  The options inside are identified by their text, so the 3:1 rule does not bind it (the note
  at `--line-surface` in `tokens.css`). Do not report it.
- **Not a boundary: the loading skeleton blocks.** A placeholder shape carries no information a
  person reads, so the 3:1 rule does not bind it (`states.loading.skeletonFill`, the note at
  `--skeleton-fill`). Measure and report its ratio for the record; flag it only if a block reads
  as text or a control, or is invisible against the page.
- **Status badges: ≥ 4.5:1** for the label text against the badge fill — the four marked
  statuses in the row, and all five on the panel badge.
- **Strikethrough amounts** (rejected, cancelled, failed): the amount text still needs 4.5:1,
  and the strike line itself needs **≥ 3:1** — a line that fails is a status channel lost.
- Any value **below threshold is a defect**; report the measured ratio and the required one.

### 4. Focus ring visibility

- Every interactive element reachable by Tab has a **visible** ring: rows, chip remove
  controls, `Clear all`, filter controls, search input, panel close, copy control, the per-status
  primary and secondary actions.
- The ring must measure **≥ 3:1 against both the element's own fill and the surface behind
  it** — check it on a row (near-white) and on a filled primary button.
- Ring **≥ 2px** and not clipped by the parent's `overflow: hidden` — row focus rings on a
  64px row with a divider are the common casualty.
- After Escape closes the panel, focus returns to the originating row and that ring is
  **visible on screen**, not scrolled out of view (`qaChecklist[10]`).

### 5. The greyscale status test

Run it through the product's own toggle (`?grey=1`, or the States index control), not injected CSS:
the toggle must desaturate the application frame and leave the prototype bar untouched.

`statusDifferentiation.colourRole` makes this a gate, and `qaChecklist[0]` names it.

1. Take `screenshots/greyscale/` — the list and filtered-list renders with saturation removed.
2. **The four marked statuses must remain distinguishable from each other and from unmarked
   rows** with zero colour information, at 16px, at 1x and 2x (`qaChecklist[0]`). Completed is
   the unmarked default (`statuses[1].specNote`): a Completed row passes when it
   carries **no** status mark at all — no icon, no label — so it reads as the only unmarked state.
3. For each of the four marked statuses, name which channel carried it in the greyscale image:
   - text label present and legible;
   - icon shape distinguishable at rendered size — clock, cross circle, slash circle, alert
     triangle. Icons are the vendored Lucide set (`src/icons`), all outline circles except
     Failed, so the inner glyph carries the difference: zoom to the icon and check **circle-x
     vs the Cancelled slash (`ban`)** at 16px, and that `failed` reads as the only triangle;
   - amount treatment: strikethrough actually visible on rejected / cancelled / failed, absent
     on in_progress / completed.
4. **If any marked status is identifiable only by its position in the list, or needs two
   statuses side by side to tell apart, it fails.** Judge each badge on its own; a stray mark on
   a Completed row also fails, because it breaks "the only unmarked state".
5. Check the filtered greyscale render too — the four marks must survive both renders.

### 6. Rendering integrity

- Fonts loaded, not fallen back; no synthesised faux-bold where a real weight exists.
- Counterparty logos (`logos`, fixtures with a `merchantDomain`): no broken image, no squashed
  aspect ratio. Headless captures show lettermarks (Brandfetch refuses headless user agents; the real
  logos are verified manually on the deployed build, `logos.verification` — never report a
  capture's lettermarks as a broken integration);
  every lettermark must be a single letter on its tint at ≥ 4.5:1.
- No leftover scaffolding visible: an unsubstituted `{n}`, `{total}`, `{cancelledAt}`,
  `{expectedBy}`, `{rateLockedAt}`, `{convertedAmount}`, `{sourceAmount}` or `{amount}` on
  screen is a **blocker**. Verify by reading the rendered
  text, never by layer or class name.
- Even rhythm: all rows at the 64px `rowHeight`; no single row or group gap off the others.
- Dropdown options (`dropdowns.optionRows`): every option in the three lists is one line and one
  height; a long name ends in an ellipsis, never wraps; hover (a fill) and the keyboard
  highlight (fill plus inset ring) are visibly distinct (`qaChecklist[75]`).
- The skeleton in `/?state=loading` mirrors the real layout — two groups of three rows, blocks
  sized to the real avatar, title, meta and amount; no spinner.

## Output

```
## Visual QA — <what you inspected: which PNGs / which widths / greyscale yes-no>
Blockers — renders broken, unreadable, or a measured threshold failed outright
Major    — clearly wrong, users will notice
Minor    — noticeable on inspection
Nit      — polish
Passed   — one line naming the checks that came back clean
Not run  — every check you could not perform, and why
```

Each defect carries four parts, all four required:
1. **Where** — route, region, and the fixture id if a row (`/?tx=tx_1007`, panel Details row).
2. **What's wrong** — the observed fact, with the measured number.
3. **The threshold it violates** — `4.5:1 required, measured 3.2:1`; `one line required,
   wrapped to two`; `scrollWidth 1392 > innerWidth 1280`.
4. **A concrete fix** — the specific change, naming the token where one applies.

**An unrun check is never reported as a pass.** No greyscale render → greyscale goes under
*Not run*, not *Passed*. Only 1440 captured → the 1280 checks are *Not run*. Saying "no issues
found" for a check you did not perform is the one failure mode this skill exists to prevent.

## Boundaries

- Fix only defects with a definite threshold: clipping, overflow, horizontal scroll, a measured
  contrast failure, a missing focus ring, an unsubstituted placeholder. Re-verify after fixing.
- **Never invent or shorten copy to make text fit.** The strings are the spec's
  (`.claude/rules/spec-is-source-of-truth.md`); a fitting problem is fixed in layout, or
  reported.
- **Never edit a fixture to make a row render better.** tx_1007 is long on purpose.
- "Is the density right?", "is the hierarchy clear?", "does the panel order read well?" are
  taste calls — out of scope here, and they belong to `design-reviewer` or the user.
