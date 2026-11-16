/**
 * A single-choice dropdown — the ARIA "select-only combobox": the trigger is
 * role="combobox" and keeps focus; aria-activedescendant points into a
 * role="listbox" whose role="option" entries carry aria-selected.
 *
 * Shared by the account dropdown beside the title and the Date dropdown in the
 * toolbar (spec `dropdowns`). The list, option rows, selection indicator,
 * keyboard and focus treatment are the system's; only the trigger varies by
 * context — `inline` (borderless, link colour, part of a heading) or `field`
 * (bordered, in a toolbar or form).
 *
 * Keyboard: Enter, Space, Down or Up open on the current choice; Down/Up move,
 * Home/End jump, Enter or Space choose, Escape closes with focus on the
 * trigger, Tab closes and chooses nothing.
 */
import { useId, useRef, useState } from 'react';
import { DropdownChevron, DropdownOptionContent } from './dropdown.tsx';
import { closeOnEscape, useActiveInView, useOutsideClose } from '../lib/dropdown.ts';

interface SelectOption {
  id: string;
  label: string;
}

export function SelectDropdown({
  options,
  value,
  onChange,
  label,
  display,
  variant,
  className,
}: {
  options: SelectOption[];
  /** The chosen option's id. */
  value: string;
  onChange: (id: string) => void;
  /** The accessible name — a spec label. */
  label: string;
  /** The trigger's visible text; defaults to the chosen option's label. */
  display?: string;
  variant: 'inline' | 'field';
  className?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-opt-${index}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.id === value));
  const [active, setActive] = useState(selectedIndex);

  useOutsideClose(open, [rootRef], () => setOpen(false));
  useActiveInView(open, open ? optionId(active) : null);

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };

  const choose = (index: number) => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
    onChange(options[index].id);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = options.length - 1;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        openAt(selectedIndex);
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((i) => Math.min(i + 1, last));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(active);
        break;
      case 'Escape':
        closeOnEscape(event, () => setOpen(false), triggerRef.current);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <div className={`dd${className ? ` ${className}` : ''}`} ref={rootRef}>
      <div
        ref={triggerRef}
        className={`dd-trigger dd-trigger--${variant}`}
        role="combobox"
        tabIndex={0}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={onKeyDown}
      >
        <span className="dd-trigger__value">{display ?? options[selectedIndex]?.label}</span>
        <DropdownChevron open={open} />
      </div>

      {open ? (
        <ul id={listId} className="dd-surface" role="listbox" aria-label={label}>
          {options.map((option, index) => (
            <li
              key={option.id}
              id={optionId(index)}
              role="option"
              className="dd-option"
              aria-selected={index === selectedIndex}
              data-active={index === active || undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <DropdownOptionContent label={option.label} selected={index === selectedIndex} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
