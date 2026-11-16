/**
 * filtersDrawer — every entry of filters[] in a right-side drawer, in
 * filters[] order. Search stays in the toolbar.
 *
 * The drawer edits a draft. Apply writes the draft to the URL and closes;
 * Clear all (filtersDrawer.reset) clears every field of the draft and stays open; Escape, the close
 * control or the scrim close it and discard the draft.
 *
 * Options are derived from the spec: currencies from accounts[] and every
 * fixture currency, accounts from accounts[], statuses and types from
 * filters[].options, mapped to statuses[] / transactionTypes[] (spec.ts).
 */
import { useState } from 'react';
import {
  accountOptions,
  currencyOptions,
  filterById,
  spec,
  statusOptions,
  typeOptions,
} from '../spec/spec.ts';
import { ACCOUNT_SCOPE, FILTERS_DRAWER } from '../spec/copy.ts';
import {
  DATE_ALL,
  DATE_CUSTOM,
  DATE_PRESETS,
  type Query,
  clearedFilters,
  normaliseAmount,
} from '../lib/url.ts';
import { Drawer } from './Drawer.tsx';
import { Icon } from './Icon.tsx';
import { CounterpartyCombobox } from './CounterpartyCombobox.tsx';

type MultiKey = 'status' | 'currency' | 'type';

/** filters.amount.fieldLabels — accessible names only, never drawn (fieldLabelsUse). */
const AMOUNT_LABELS = filterById.get('amount')?.fieldLabels ?? {};
/** filters.date.fieldLabels — the visible labels of the custom bounds. */
const DATE_LABELS = filterById.get('date')?.fieldLabels ?? {};
/** filters.amount.placeholders — "From" / "To": the resting text of an empty bound. */
const AMOUNT_PLACEHOLDERS = filterById.get('amount')?.placeholders ?? {};
const COUNTERPARTY_PLACEHOLDER = filterById.get('counterparty')?.placeholder;

/** Keep what a decimal amount can contain: digits and one '.' or ','. */
function amountText(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  const first = cleaned.search(/[.,]/);
  return first === -1 ? cleaned : cleaned.slice(0, first + 1) + cleaned.slice(first + 1).replace(/[.,]/g, '');
}

/** A visible label above its input; the label is the input's accessible name. */
function LabelledInput({
  label,
  ...input
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className="input" {...input} />
    </label>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="option">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

export function FiltersDrawer({
  query,
  startCustom = false,
  onApply,
  onClose,
}: {
  query: Query;
  /** Opened from the toolbar Date dropdown's Custom: the draft starts on Custom. */
  startCustom?: boolean;
  onApply: (next: Query) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Query>(query);
  const [customOpen, setCustomOpen] = useState(startCustom || Boolean(query.dateFrom || query.dateTo));

  const set = (patch: Partial<Query>) => setDraft((d) => ({ ...d, ...patch }));

  const toggle = (key: MultiKey, value: string) => {
    setDraft((d) => {
      const values = new Set(d[key]);
      if (values.has(value)) values.delete(value);
      else values.add(value);
      return { ...d, [key]: [...values] };
    });
  };

  const reset = () => {
    // Search is not in the drawer, so the drawer's Clear all leaves it alone.
    setDraft((d) => ({ ...clearedFilters(d), q: d.q }));
    setCustomOpen(false);
  };

  const field = (id: string): React.ReactNode => {
    switch (id) {
      case 'date':
        return (
          <div className="option-list">
            {DATE_PRESETS.map((preset) => {
              const isCustom = preset === DATE_CUSTOM;
              const isAll = preset === DATE_ALL;
              const customOn = customOpen || Boolean(draft.dateFrom || draft.dateTo);
              // filters.date.default — "All" is selected whenever nothing else
              // is, so the group always has a valid resting answer.
              const checked = isCustom
                ? customOn
                : isAll
                  ? !draft.date && !customOn
                  : draft.date === preset;
              return (
                <label className="option" key={preset}>
                  <input
                    type="radio"
                    name="date-preset"
                    checked={checked}
                    onChange={() => {
                      setCustomOpen(isCustom);
                      // Custom names no range of its own: it filters nothing
                      // until a bound is set.
                      set(
                        isCustom
                          ? { date: null }
                          : { date: isAll ? null : preset, dateFrom: null, dateTo: null },
                      );
                    }}
                  />
                  <span>{preset}</span>
                </label>
              );
            })}
            {customOpen || draft.dateFrom || draft.dateTo ? (
              <div className="option-list option-list--inputs">
                <LabelledInput
                  label={DATE_LABELS.from}
                  type="date"
                  value={draft.dateFrom ?? ''}
                  onChange={(event) => set({ date: null, dateFrom: event.target.value || null })}
                />
                <LabelledInput
                  label={DATE_LABELS.to}
                  type="date"
                  value={draft.dateTo ?? ''}
                  onChange={(event) => set({ date: null, dateTo: event.target.value || null })}
                />
              </div>
            ) : null}
          </div>
        );
      case 'type':
        return (
          <div className="option-list">
            {typeOptions.map((type) => (
              <CheckOption
                key={type.id}
                label={type.label}
                checked={draft.type.includes(type.id)}
                onChange={() => toggle('type', type.id)}
              />
            ))}
          </div>
        );
      case 'account':
        // filters.account.note — one value with the dropdown beside the title:
        // a single choice, All accounts first. Applied with the rest of the draft.
        return (
          <div className="option-list">
            {[{ id: ACCOUNT_SCOPE.default, label: ACCOUNT_SCOPE.all }, ...accountOptions].map((account) => (
              <label className="option" key={account.id}>
                <input
                  type="radio"
                  name="account"
                  checked={(draft.scope ?? ACCOUNT_SCOPE.default) === account.id}
                  onChange={() => set({ scope: account.id === ACCOUNT_SCOPE.default ? null : account.id })}
                />
                <span>{account.label}</span>
              </label>
            ))}
          </div>
        );
      case 'amount':
        return (
          <div className="option-list option-list--inputs option-list--range">
            {/* filters.amount.inputNote — decimal keyboard, no steppers.
                fieldLabelsUse — no visible label; fieldLabels is each input's
                accessible name. rangeSeparator — an arrow between the two. */}
            <input
              className="input"
              aria-label={AMOUNT_LABELS.min}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={AMOUNT_PLACEHOLDERS.min}
              value={draft.amountMin ?? ''}
              onChange={(event) => set({ amountMin: amountText(event.target.value) || null })}
            />
            <span className="range-arrow">
              <Icon name="arrow-right" size="sm" />
            </span>
            <input
              className="input"
              aria-label={AMOUNT_LABELS.max}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={AMOUNT_PLACEHOLDERS.max}
              value={draft.amountMax ?? ''}
              onChange={(event) => set({ amountMax: amountText(event.target.value) || null })}
            />
          </div>
        );
      case 'status':
        return (
          <div className="option-list">
            {statusOptions.map((status) => (
              <CheckOption
                key={status.id}
                label={status.label}
                checked={draft.status.includes(status.id)}
                onChange={() => toggle('status', status.id)}
              />
            ))}
          </div>
        );
      case 'currency':
        return (
          <div className="option-list">
            {currencyOptions.map((currency) => (
              <CheckOption
                key={currency}
                label={currency}
                checked={draft.currency.includes(currency)}
                onChange={() => toggle('currency', currency)}
              />
            ))}
          </div>
        );
      case 'counterparty':
        return (
          <CounterpartyCombobox
            value={draft.counterparty}
            onChange={(counterparty) => set({ counterparty })}
            labelledBy="filter-counterparty"
            placeholder={COUNTERPARTY_PLACEHOLDER}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Drawer label={FILTERS_DRAWER.trigger} onClose={onClose} className="filters-drawer">
      <header className="filters-drawer__header">
        <h2 className="filters-drawer__title">{FILTERS_DRAWER.trigger}</h2>
        <button
          type="button"
          className="panel__close filters-drawer__close"
          onClick={onClose}
          aria-label={FILTERS_DRAWER.close}
        >
          <Icon name="x" size="md" />
        </button>
      </header>

      <div className="filters-drawer__body">
        {spec.filters.map((filter) => (
          <fieldset className="filters-drawer__field" key={filter.id}>
            <legend className="filters-drawer__legend" id={`filter-${filter.id}`}>
              {filter.label}
            </legend>
            {field(filter.id)}
          </fieldset>
        ))}
      </div>

      <footer className="filters-drawer__footer">
        <button type="button" className="button button--secondary" onClick={reset}>
          {FILTERS_DRAWER.reset}
        </button>
        <button
          type="button"
          className="button button--primary"
          onClick={() =>
            onApply({
              ...draft,
              amountMin: normaliseAmount(draft.amountMin),
              amountMax: normaliseAmount(draft.amountMax),
              q: query.q,
            })
          }
        >
          {FILTERS_DRAWER.apply}
        </button>
      </footer>
    </Drawer>
  );
}
