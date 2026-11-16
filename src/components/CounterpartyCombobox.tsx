/**
 * filters.counterparty — a combobox with the application's own listbox.
 *
 * Resting value "All" (filters.counterparty.all): no constraint, no chip. The
 * field stays typeable; typing narrows the list, and a free-typed value that
 * matches no counterparty is kept and filters to nothing (filters.counterparty
 * .note). filters.counterparty.openBehaviour: opening the list empties the
 * field and shows the current value as its placeholder, so typing replaces
 * the selection and narrows the full list; closing without a choice (Escape,
 * the chevron, leaving with nothing typed) restores the previous value.
 * The browser's autofill list is suppressed (autocomplete="off" and a
 * per-instance name) — the list below is ours, drawn from tokens.
 *
 * ARIA combobox pattern: the input carries role="combobox", aria-expanded,
 * aria-controls and aria-activedescendant; the list is role="listbox" with
 * role="option" entries. Keyboard: Down/Up open and move, Enter selects the
 * highlighted option (typing highlights the first match; with no match
 * nothing is highlighted and Enter commits the typed text), Escape closes and
 * keeps focus in the input. Tab commits the highlighted option if there is
 * one, otherwise the typed text as typed (filters.counterparty.openBehaviour).
 * aria-selected marks the committed value; the highlight is
 * aria-activedescendant, absent when nothing is highlighted.
 *
 * Look: the shared dropdown primitives (components/dropdown.tsx). The list is
 * the shared floating surface, placed below the field — or above it when the
 * drawer body has more room there — and its height is capped by both the
 * shared maximum and the room inside the drawer body, so it never escapes the
 * drawer or the frame (dropdowns.containment).
 */
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { counterpartyOptions } from '../spec/spec.ts';
import { COUNTERPARTY_ALL } from '../lib/url.ts';
import { DropdownChevron, DropdownOptionContent } from './dropdown.tsx';
import { closeOnEscape, useActiveInView, useOutsideClose } from '../lib/dropdown.ts';

export function CounterpartyCombobox({
  value,
  onChange,
  labelledBy,
  placeholder,
}: {
  /** The committed value; null means All. */
  value: string | null;
  onChange: (next: string | null) => void;
  labelledBy: string;
  placeholder?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  /** The text in the field. */
  const [text, setText] = useState(value ?? COUNTERPARTY_ALL);
  /** True once the user has typed since the list opened: only then does it narrow. */
  const [typed, setTyped] = useState(false);
  /** The highlighted option's index; -1 when nothing is highlighted. */
  const [active, setActive] = useState(0);

  // Follow the committed value when it changes from outside (the drawer's Clear all), adjusted
  // during render rather than in an effect.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value ?? COUNTERPARTY_ALL);
  }

  const options = useMemo(() => {
    const needle = typed ? text.trim().toLowerCase() : '';
    const names = needle
      ? counterpartyOptions.filter((name) => name.toLowerCase().includes(needle))
      : counterpartyOptions;
    return [COUNTERPARTY_ALL, ...names];
  }, [text, typed]);

  const optionId = (index: number) => `${id}-opt-${index}`;

  // Keep the highlighted option in view inside the list's own scroll box.
  useActiveInView(open, open && active >= 0 ? optionId(active) : null);

  const rootRef = useRef<HTMLDivElement>(null);
  /**
   * Place the surface inside the drawer body: below the field when it fits,
   * otherwise on the side with more room, its height capped by that room.
   */
  useLayoutEffect(() => {
    const list = listRef.current;
    const field = rootRef.current;
    if (!open || !list || !field) return;
    const body = field.closest('.filters-drawer__body') ?? document.documentElement;
    const area = body.getBoundingClientRect();
    const box = field.getBoundingClientRect();
    const styles = getComputedStyle(list);
    const cap = parseFloat(styles.getPropertyValue('--dd-max-height')) || list.scrollHeight;
    const gap = parseFloat(styles.marginTop) || 0;
    const below = area.bottom - box.bottom - gap * 2;
    const above = box.top - area.top - gap * 2;
    const wanted = Math.min(cap, list.scrollHeight);
    const up = below < wanted && above > below;
    list.dataset.placement = up ? 'above' : 'below';
    let limit = Math.max(Math.min(cap, up ? above : below), 0);
    // A list that scrolls is cut to a whole number of option pitches. Every
    // option is one line, so with useActiveInView stopping on option
    // boundaries no scroll position shows part of an option.
    // The pitch is an option plus the gap after it; the last option has none.
    const [first, second] = list.querySelectorAll<HTMLElement>('[role="option"]');
    const pitch = first && second ? second.offsetTop - first.offsetTop : 0;
    const gapAfter = pitch - (first?.offsetHeight ?? 0);
    const frame =
      parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom) +
      parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    if (pitch > 0 && list.scrollHeight > limit) {
      limit = Math.floor((limit - frame + gapAfter) / pitch) * pitch - gapAfter + frame;
    }
    list.style.maxHeight = `${limit}px`;
  });

  /** Re-select the field's text while it has focus, so typing replaces it
   *  (never "All" + typed text). */
  const reselect = () => {
    window.requestAnimationFrame(() => {
      if (document.activeElement === inputRef.current) inputRef.current?.select();
    });
  };

  const commit = (next: string) => {
    const trimmed = next.trim();
    // A typed value that equals a counterparty but for case or spacing is
    // that counterparty; anything else is kept as typed and filters to
    // nothing (filters.counterparty.note).
    const canonical =
      counterpartyOptions.find((name) => name.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
    const resolved = !canonical || canonical === COUNTERPARTY_ALL ? null : canonical;
    onChange(resolved);
    setText(resolved ?? COUNTERPARTY_ALL);
    setTyped(false);
    setOpen(false);
    reselect();
  };

  /** Close without a choice: the previous selection comes back. */
  const dismiss = () => {
    setOpen(false);
    setTyped(false);
    setText(value ?? COUNTERPARTY_ALL);
  };

  /** Typed text is a choice (filters.counterparty.note); an empty field is not. */
  const typedChoice = typed && text.trim() !== '';

  /**
   * Text drawn over the input so a long name ends in an ellipsis: Chromium
   * never ellipsises a focused field. Open and empty, it is the placeholder
   * (the current value); closed and untouched, it is the value itself.
   */
  const ghostPlaceholder = open && text === '';
  const ghostValue = !open && !typed && text !== '' && text === (value ?? COUNTERPARTY_ALL);
  const ghost = ghostPlaceholder || ghostValue;

  useOutsideClose(open, [rootRef], () => {
    if (typedChoice) commit(text);
    else dismiss();
  });

  const openList = () => {
    setTyped(false);
    // The current value moves into the placeholder; the field is ready to type.
    setText('');
    const current = value ? options.indexOf(value) : 0;
    // The committed value is highlighted; a free-typed value that is not an
    // option leaves nothing highlighted, so Tab cannot replace it with All.
    setActive(value ? current : 0);
    setOpen(true);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        if (open) {
          event.preventDefault();
          setActive(0);
        }
        break;
      case 'End':
        if (open) {
          event.preventDefault();
          setActive(options.length - 1);
        }
        break;
      case 'Enter':
        if (open) {
          event.preventDefault();
          // The highlighted option, All included when the user moved there;
          // with nothing highlighted, the typed text as typed.
          if (active >= 0) commit(options[active]);
          else if (typedChoice) commit(text);
          else dismiss();
        }
        break;
      case 'Escape':
        if (open) {
          // Close the list only; the drawer stays open and focus stays here.
          closeOnEscape(
            event,
            () => {
              dismiss();
              reselect();
            },
            inputRef.current,
          );
        }
        break;
      case 'Tab':
        // filters.counterparty.openBehaviour — a highlighted option is a
        // choice already made; with none, the typed text is kept as typed.
        if (open && active >= 0) commit(options[active]);
        else if (typedChoice) commit(text);
        else if (open) dismiss();
        break;
    }
  };

  return (
    <div className="combobox dd" ref={rootRef}>
      <div className="dd-trigger dd-trigger--input">
        <span className="combobox__field">
          <input
            ref={inputRef}
            className="combobox__input"
            type="text"
            role="combobox"
            aria-labelledby={labelledBy}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            name={`counterparty-${id}`}
            placeholder={open ? (value ?? COUNTERPARTY_ALL) : placeholder}
            data-ghost={ghostPlaceholder ? 'placeholder' : ghostValue ? 'value' : undefined}
            value={text}
            onFocus={(event) => event.currentTarget.select()}
            onClick={() => (open ? null : openList())}
            onChange={(event) => {
              const next = event.target.value;
              setText(next);
              setTyped(true);
              // A new search starts at the top of the list, "All" in view.
              if (listRef.current) listRef.current.scrollTop = 0;
              // Highlight the first match, not "All", once something is typed.
              const needle = next.trim().toLowerCase();
              const hasMatch =
                needle && counterpartyOptions.some((name) => name.toLowerCase().includes(needle));
              setActive(hasMatch ? 1 : -1);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
          />
          {/* Hidden from assistive technology, which reads the input's own
              value and placeholder. */}
          {ghost ? (
            <span
              className="combobox__ghost"
              data-kind={ghostPlaceholder ? 'placeholder' : 'value'}
              aria-hidden="true"
            >
              {value ?? COUNTERPARTY_ALL}
            </span>
          ) : null}
        </span>
        {/* Pointer affordance only; the keyboard opens the list with Down. */}
        <button
          type="button"
          className="dd-trigger__toggle"
          tabIndex={-1}
          aria-hidden="true"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            inputRef.current?.focus({ preventScroll: true });
            if (open) dismiss();
            else openList();
          }}
        >
          <DropdownChevron open={open} />
        </button>
      </div>

      {open ? (
        <ul ref={listRef} id={listId} className="dd-surface dd-surface--fill" role="listbox" aria-labelledby={labelledBy}>
          {options.map((name, index) => {
            const selected = (value ?? COUNTERPARTY_ALL) === name;
            return (
              <li
                key={name}
                id={optionId(index)}
                role="option"
                className="dd-option"
                aria-selected={selected}
                data-active={index === active || undefined}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(name)}
              >
                <DropdownOptionContent label={name} selected={selected} />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
