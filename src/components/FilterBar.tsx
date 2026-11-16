/**
 * The toolbar (listBehaviour.stickyBar, filtersDrawer): the search field, the
 * Date dropdown (filters.date.toolbar — the same filter as the drawer's Date
 * field, one value) and a single Filters button. Every other filter lives in
 * the FiltersDrawer.
 *
 * filters_active.specNote rejects the count-only pattern ('Filters (1)'), so
 * the button carries no count: the chips below the toolbar say what is active.
 */
import { useEffect, useState } from 'react';
import { FILTERS_DRAWER, SEARCH_PLACEHOLDER } from '../spec/copy.ts';
import type { Query } from '../lib/url.ts';
import { Icon } from './Icon.tsx';
import { FiltersDrawer } from './FiltersDrawer.tsx';
import { SelectDropdown } from './SelectDropdown.tsx';
import { DATE_ALL, DATE_CUSTOM, DATE_PRESETS } from '../lib/url.ts';
import { filterById } from '../spec/spec.ts';
import { FILTER_CHIPS, fill } from '../spec/copy.ts';

/** filters.date — its label names the toolbar control; its presets are the options. */
const DATE_FILTER = filterById.get('date');
const DATE_OPTIONS = DATE_PRESETS.map((preset) => ({ id: preset, label: preset }));

const SEARCH_DEBOUNCE = 250; // search.behaviour — debounced at 250ms

export function FilterBar({
  query,
  onChange,
}: {
  query: Query;
  onChange: (next: Query) => void;
}) {
  const [draft, setDraft] = useState(query.q ?? '');
  const [open, setOpen] = useState(false);
  /** Opened from the toolbar's Custom: the drawer starts on Custom. */
  const [startCustom, setStartCustom] = useState(false);

  /** The one date value, as the toolbar shows it. */
  const dateValue = query.date ?? (query.dateFrom || query.dateTo ? DATE_CUSTOM : DATE_ALL);
  const onDate = (preset: string) => {
    if (preset === DATE_CUSTOM) {
      // Custom names no range of its own: its bounds are set in the drawer.
      setStartCustom(true);
      setOpen(true);
      return;
    }
    onChange({ ...query, date: preset === DATE_ALL ? null : preset, dateFrom: null, dateTo: null });
  };

  // The URL's search changed from outside (a chip removed, Clear all): the
  // field follows it. Adjusted during render, not in an effect.
  const [syncedQ, setSyncedQ] = useState(query.q);
  if (syncedQ !== query.q) {
    setSyncedQ(query.q);
    setDraft(query.q ?? '');
  }

  useEffect(() => {
    const current = query.q ?? '';
    if (draft === current) return;
    const timer = window.setTimeout(() => {
      onChange({ ...query, q: draft || null });
    }, SEARCH_DEBOUNCE);
    return () => window.clearTimeout(timer);
  }, [draft, query, onChange]);

  const close = () => {
    setOpen(false);
    setStartCustom(false);
    // Back to the control that opened it.
    document.getElementById('filters-trigger')?.focus({ preventScroll: true });
  };

  return (
    <div className="filterbar">
      {/* The search glyph is decorative; the field is named by its placeholder. */}
      <label className="search-field">
        <Icon name="search" size="sm" />
        <input
          type="search"
          className="search"
          placeholder={SEARCH_PLACEHOLDER}
          aria-label={SEARCH_PLACEHOLDER}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>

      <SelectDropdown
        className="date-dropdown"
        variant="field"
        label={DATE_FILTER?.label ?? ''}
        options={DATE_OPTIONS}
        value={dateValue}
        display={fill(FILTER_CHIPS.template, { label: DATE_FILTER?.label ?? '', value: dateValue })}
        onChange={onDate}
      />

      <button
        type="button"
        id="filters-trigger"
        className="filters-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Icon name="sliders-horizontal" size="sm" />
        <span>{FILTERS_DRAWER.trigger}</span>
      </button>

      {open ? (
        <FiltersDrawer
          query={query}
          startCustom={startCustom}
          onApply={(next) => {
            onChange(next);
            close();
          }}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
