/**
 * Dropdown primitives — one visual language for the three dropdowns in the
 * spec's `dropdowns.members`: the account dropdown beside the title and the
 * toolbar Date dropdown (single-choice listboxes) and the counterparty field
 * (a combobox).
 *
 * These own the shared LOOK only — the trigger chrome, the chevron that turns
 * on open, the floating surface and the option row with its active and
 * selected treatment (classes `.dd-*` in index.css, every value a token). Each
 * control keeps its own semantics, roles and keyboard model in its own file.
 */
import { Icon } from './Icon.tsx';

/** The trigger's chevron; it turns half a turn while the surface is open. */
export function DropdownChevron({ open }: { open: boolean }) {
  return (
    <span className="dd-chevron" data-open={open || undefined} aria-hidden="true">
      <Icon name="chevron-down" size="sm" />
    </span>
  );
}

/**
 * One option row's content. `selected` draws the shared selection indicator
 * (a check) — only the two controls that hold a value pass it. The label is
 * one line, ellipsised when long, with the full value in the native title.
 * The keyboard highlight (data-active on the row) is set by each control from
 * the keyboard only; pointer hover is a separate, CSS-only treatment.
 */
export function DropdownOptionContent({
  label,
  selected,
}: {
  label: string;
  selected?: boolean;
}) {
  return (
    <>
      <span className="dd-option__text" title={label}>
        {label}
      </span>
      {selected ? (
        <span className="dd-option__check" aria-hidden="true">
          <Icon name="check" size="sm" />
        </span>
      ) : null}
    </>
  );
}
