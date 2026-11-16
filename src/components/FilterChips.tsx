/**
 * states.filters_active — every active filter is a chip showing its field and
 * value, each with a remove control. The account is scope, not a filter: no
 * chip, and on its own no row at all; {total} counts within it. The chip text comes from filterChips:
 * `template` for the plain filters, and a dedicated template for each range
 * and for search, so no field name is ever composed in code.
 */
import {
  currencyOptions,
  filterById,
  spec,
  stateById,
  statusById,
  statusOptions,
  typeById,
  typeOptions,
} from "../spec/spec.ts";
import { FILTER_CHIPS, fill } from "../spec/copy.ts";
import { date as formatDate, magnitude } from "../lib/format.ts";
import { clearedFilters, hasFilters, type Query } from "../lib/url.ts";
import { Icon } from "./Icon.tsx";

const activeCopy = stateById.get("filters_active")?.copy ?? {};

interface Chip {
  key: string;
  /** The filters[] id the chip belongs to; null for search, which is not in filters[]. */
  filter: string | null;
  text: string;
  remove: (query: Query) => Query;
}

function label(id: string): string {
  return filterById.get(id)?.label ?? id;
}

/** filterChips.template — "{label}: {value}". */
function plain(id: string, value: string): string {
  return fill(FILTER_CHIPS.template, { label: label(id), value });
}

/** Dates render as "12 November 2026", never ISO. */
function day(iso: string): string {
  return formatDate(`${iso}T00:00:00Z`);
}

/**
 * filterChips.amountFormat — the same grouping and decimals as amounts in rows,
 * with the currency code when a currency filter is active. With several
 * currencies active, no single code is true of the bound, so none is shown.
 */
function amount(raw: string, query: Query): string {
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  const code = query.currency.length === 1 ? ` ${query.currency[0]}` : "";
  return `${magnitude(value)}${code}`;
}

function buildChips(query: Query): Chip[] {
  const chips: Chip[] = [];

  if (query.date) {
    chips.push({
      key: "date",
      filter: "date",
      text: plain("date", query.date),
      remove: (q) => ({ ...q, date: null }),
    });
  }

  if (query.dateFrom || query.dateTo) {
    const from = query.dateFrom ? day(query.dateFrom) : "";
    const to = query.dateTo ? day(query.dateTo) : "";
    const text =
      query.dateFrom && query.dateTo
        ? fill(FILTER_CHIPS.dateRange, { from, to })
        : query.dateFrom
          ? fill(FILTER_CHIPS.dateFrom, { from })
          : fill(FILTER_CHIPS.dateTo, { to });
    chips.push({
      key: "dateBounds",
      filter: "date",
      text,
      remove: (q) => ({ ...q, dateFrom: null, dateTo: null }),
    });
  }

  for (const id of inOptionOrder(
    query.type,
    typeOptions.map((t) => t.id),
  )) {
    chips.push({
      key: `type-${id}`,
      filter: "type",
      text: plain("type", typeById.get(id as never)?.label ?? ""),
      remove: (q) => ({ ...q, type: q.type.filter((v) => v !== id) }),
    });
  }

  // The account makes no chip (states.filters_active.behaviour): the heading
  // names it. It still counts as narrowing — see FilterChips below.

  if (query.amountMin || query.amountMax) {
    const min = query.amountMin ? amount(query.amountMin, query) : "";
    const max = query.amountMax ? amount(query.amountMax, query) : "";
    const text =
      query.amountMin && query.amountMax
        ? fill(FILTER_CHIPS.amountRange, { min, max })
        : query.amountMin
          ? fill(FILTER_CHIPS.amountFrom, { min })
          : fill(FILTER_CHIPS.amountTo, { max });
    chips.push({
      key: "amountBounds",
      filter: "amount",
      text,
      remove: (q) => ({ ...q, amountMin: null, amountMax: null }),
    });
  }

  for (const id of inOptionOrder(
    query.status,
    statusOptions.map((s) => s.id),
  )) {
    chips.push({
      key: `status-${id}`,
      filter: "status",
      text: plain("status", statusById.get(id as never)?.label ?? ""),
      remove: (q) => ({ ...q, status: q.status.filter((v) => v !== id) }),
    });
  }

  for (const code of inOptionOrder(
    query.currency,
    currencyOptions as readonly string[],
  )) {
    chips.push({
      key: `currency-${code}`,
      filter: "currency",
      text: plain("currency", code),
      remove: (q) => ({ ...q, currency: q.currency.filter((v) => v !== code) }),
    });
  }

  if (query.counterparty) {
    chips.push({
      key: "counterparty",
      filter: "counterparty",
      text: plain("counterparty", query.counterparty),
      remove: (q) => ({ ...q, counterparty: null }),
    });
  }

  if (query.q) {
    chips.push({
      key: "q",
      filter: null,
      text: fill(FILTER_CHIPS.search, { value: query.q }),
      remove: (q) => ({ ...q, q: null }),
    });
  }

  // filterChips.order — filters[] order, the drawer's, whatever order the
  // filters were applied in; search, outside filters[], last. Array sort is
  // stable, so chips of one filter keep their option order.
  return chips.sort((a, b) => rank(a.filter) - rank(b.filter));
}

const FILTER_ORDER = spec.filters.map((f) => f.id);

function rank(filter: string | null): number {
  const index = filter === null ? -1 : FILTER_ORDER.indexOf(filter);
  return index === -1 ? FILTER_ORDER.length : index;
}

/** The values of a multi-select in the order its options appear in the drawer. */
function inOptionOrder(values: string[], options: readonly string[]): string[] {
  return [...values].sort((a, b) => options.indexOf(a) - options.indexOf(b));
}

/**
 * Split the rendered chip string at its first ": " so the field and value can
 * be styled differently. The two parts concatenate back to the spec's string
 * exactly — no separator is added in code.
 */
function split(text: string): [string, string] {
  const match = /^([^:]*:\s)(.*)$/.exec(text);
  return match ? [match[1], match[2]] : ["", text];
}

export function FilterChips({
  query,
  shown,
  total,
  onChange,
}: {
  query: Query;
  shown: number;
  total: number;
  onChange: (next: Query) => void;
}) {
  const chips = buildChips(query);
  // accountScope.scopeNotFilter — the row shows only for filters and search;
  // the account alone is a change of view, named by the heading.
  if (!hasFilters(query)) return null;

  return (
    <div className="chips">
      {chips.length ? (
        <ul className="chips__list">
          {chips.map((chip) => {
            const [field, value] = split(chip.text);
            return (
              <li className="chip" key={chip.key}>
                <span className="chip__text">
                  <span className="chip__field">{field}</span>
                  <span className="chip__value">{value}</span>
                </span>
                <button
                  type="button"
                  className="chip__remove"
                  onClick={() => onChange(chip.remove(query))}
                  /* filterChips.remove — 'Remove {label}', filled with the chip's own text. */
                  aria-label={fill(FILTER_CHIPS.remove, { label: chip.text })}
                >
                  <Icon name="x" size="xs" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <button
        type="button"
        className="chips__clear"
        onClick={() => onChange(clearedFilters(query))}
      >
        {activeCopy.clearAll}
      </button>
      <p className="chips__count">
        {fill(activeCopy.resultCount ?? "", {
          n: String(shown),
          total: String(total),
        })}
      </p>
    </div>
  );
}
