/**
 * filters.counterparty — a combobox with the application's own listbox.
 *
 * Resting value "All" (filters.counterparty.all): no constraint, no chip. The
 * field stays typeable; typing narrows the list, and a free-typed value that
 * matches no counterparty is kept and filters to nothing (filters.counterparty
 * .note). The browser's autofill list is suppressed (autocomplete="off" and a
 * per-instance name) — the list below is ours, drawn from tokens.
 *
 * ARIA combobox pattern: the input carries role="combobox", aria-expanded,
 * aria-controls and aria-activedescendant; the list is role="listbox" with
 * role="option" entries. Keyboard: Down/Up open and move, Enter selects the
 * highlighted option (typing highlights the first match; with no match, Enter
 * commits the typed text), Escape closes and keeps focus in the input, Tab
 * closes and commits the typed text. aria-selected marks the committed value;
 * the highlight is aria-activedescendant.
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
  const [active, setActive] = useState(0);

  // Follow the committed value when it changes from outside (Reset), adjusted
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
  useActiveInView(open, open ? optionId(active) : null);

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
    list.style.maxHeight = `${Math.max(Math.min(cap, up ? above : below), 0)}px`;
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

  useOutsideClose(open, [rootRef], () => {
    if (typed) commit(text);
    else setOpen(false);
  });

  const openList = () => {
    setTyped(false);
    const current = value ? options.indexOf(value) : 0;
    setActive(current > 0 ? current : 0);
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
          // Typed text that matches nothing (only "All" listed) commits the
          // text itself; otherwise Enter takes the highlighted option, All
          // included when the user moved there.
          if (typed && text.trim() && options.length === 1) commit(text);
          else commit(options[active] ?? text);
        }
        break;
      case 'Escape':
        if (open) {
          // Close the list only; the drawer stays open and focus stays here.
          closeOnEscape(
            event,
            () => {
              setOpen(false);
              setTyped(false);
              setText(value ?? COUNTERPARTY_ALL);
              reselect();
            },
            inputRef.current,
          );
        }
        break;
      case 'Tab':
        if (open || typed) commit(text);
        break;
    }
  };

  return (
    <div className="combobox dd" ref={rootRef}>
      <div className="dd-trigger dd-trigger--input">
        <input
          ref={inputRef}
          className="combobox__input"
          type="text"
          role="combobox"
          aria-labelledby={labelledBy}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open ? optionId(active) : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          name={`counterparty-${id}`}
          placeholder={placeholder}
          value={text}
          onFocus={(event) => event.currentTarget.select()}
          onClick={() => (open ? null : openList())}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            setTyped(true);
            // Highlight the first match, not "All", once something is typed.
            const needle = next.trim().toLowerCase();
            const hasMatch =
              needle && counterpartyOptions.some((name) => name.toLowerCase().includes(needle));
            setActive(hasMatch ? 1 : 0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {/* Pointer affordance only; the keyboard opens the list with Down. */}
        <button
          type="button"
          className="dd-trigger__toggle"
          tabIndex={-1}
          aria-hidden="true"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            inputRef.current?.focus({ preventScroll: true });
            if (open) setOpen(false);
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
                onMouseEnter={() => setActive(index)}
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
