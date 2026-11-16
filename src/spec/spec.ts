/**
 * The spec, typed, plus the indices and option lists derived from it.
 *
 * Layer 1 of the canon hierarchy (.claude/rules/spec-is-source-of-truth.md).
 * Nothing here restates a spec value: every list is derived from the JSON, so a
 * change to the spec changes the UI with no code edit.
 */
import specJson from '../../spec/transaction-history.spec.json';

type StatusId = 'in_progress' | 'completed' | 'rejected' | 'cancelled' | 'failed';
type TypeId = 'incoming' | 'outgoing' | 'between_accounts' | 'fee';

interface Counterparty {
  name: string;
  logo?: boolean;
  initials?: string;
  glyph?: string;
  iban?: string;
  /** logos.field — empty when there is no recognisable merchant. */
  merchantDomain?: string;
}

export interface Fixture {
  id: string;
  /** The identifier people read and quote (fixturesNote); `id` is internal and never shown. */
  displayId: string;
  type: TypeId;
  status: StatusId;
  counterparty?: Counterparty;
  label?: string;
  amount?: number;
  currency?: string;
  recipientGets?: number;
  sourceAmount?: number;
  convertedAmount?: number;
  fee?: number;
  sourceCurrency?: string;
  targetAmount?: number;
  targetCurrency?: string;
  rate?: number;
  rateLockedAt?: string;
  account: string;
  targetAccount?: string;
  parentId?: string | null;
  children?: string[];
  reference?: string;
  reason?: string;
  /** The account holder's private text (states.details.noteRule). */
  note?: string;
  createdAt: string;
  deliveredAt?: string;
  expectedBy?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
}

export interface Status {
  id: StatusId;
  label: string;
  iconShape: string;
  moneyMoved: string;
  countsInDayTotal: boolean;
  listTreatment: {
    amountStyle: 'regular' | 'strikethrough';
    statusPosition: string;
    /** Absent for Completed, which draws no mark in the row. */
    emphasis?: 'primary';
    badge: string;
    /** false: the row draws no status mark at all (Completed, statuses[1].specNote). */
    markVisible?: boolean;
  };
  detailHelperText: string;
  /** 'never' suppresses the helper line; 'adds-information' renders it. */
  showWhen?: 'adds-information' | 'never';
  detailHelperFallback?: string;
  reasonOverride?: boolean;
  primaryAction: string | null;
  secondaryAction: string | null;
  timeline: {
    steps: string[];
    currentStep: number;
    completedSteps: number[];
    terminalStep?: string;
    /** Step name → the fixture key holding its timestamp, or null when the
     *  step is a state rather than an event (Pending). */
    timestampSource: Record<string, string | null>;
  };
}

interface TransactionType {
  id: TypeId;
  label: string;
  amountSign: string;
  directionGlyph: string;
  listTitle: string;
}

export interface Account {
  id: string;
  label: string;
  currency: string;
  iban: string;
}

export interface SpecState {
  id: string;
  route: string;
  name: string;
  isIndex?: boolean;
  excludeFromCoverageCount?: boolean;
  trigger: string;
  behaviour: string;
  sections?: { id: string; heading: string; renderWhen: string }[];
  sectionHeadings?: Record<string, string>;
  copy?: Record<string, string>;
}

interface Filter {
  id: string;
  label: string;
  control: string;
  options?: string[];
  presets?: string[];
  source?: string;
  /** Visible labels for a filter's paired inputs (amount min/max, date from/to). */
  fieldLabels?: Record<string, string>;
  /** The value that means "no constraint" (date: default; counterparty: all). */
  default?: string;
  all?: string;
  placeholder?: string;
  /** Placeholders for a paired input (amount min/max). */
  placeholders?: Record<string, string>;
}

export interface EdgeCase {
  id: string;
  requirement: string;
  rule: string;
  fixtures: string[];
  route: string;
}

interface Spec {
  meta: {
    name: string;
    minWidth: number;
    locale: string;
    now: string;
    layout: {
      pattern: string;
      listWidth: string;
      panelWidth: number;
      sidebarWidth: number;
      panelBreakpoint: number;
      rowHeight: number;
    };
  };
  navigation: {
    activeId: string;
    items: { id: string; label: string }[];
  };
  accountScope: { label: string; all: string; default: string; note: string };
  transactionTypes: TransactionType[];
  feeModel: { rules: string[]; conversionException: { rule: string } };
  statuses: Status[];
  statusDifferentiation: { channels: string[] };
  timelineRules: {
    steps: Record<TypeId, string[]> & { terminalSteps: Record<string, string> };
    expandedByDefault: StatusId[];
  };
  listBehaviour: {
    grouping: string;
    pagination: string;
    stickyBar: string;
    groupHeaderExtra: { rule: string; included: string; emptyCase: string };
    rowAnatomy: Record<string, string>;
  };
  fxModel: { detailsBreakdown: string[] };
  states: SpecState[];
  fieldLabels: Record<string, string>;
  prototypeAffordances: {
    note: string;
    label: string;
    widths: number[];
    fullWidthLabel: string;
    widthLabel: string;
    greyscaleLabel: string;
    greyscaleHint: string;
    greyscaleActive: string;
    stubNotice: string;
    stubNoticeMs: number;
  };
  filterChips: Record<string, string>;
  filtersDrawer: { trigger: string; apply: string; reset: string; close: string };
  toolbar: {
    download: { label: string };
  };
  logos: { urlTemplate: string };
  filters: Filter[];
  search: { placeholder: string; scope: string[] };
  edgeCases: EdgeCase[];
  accounts: Account[];
  fixtures: Fixture[];
  expectedDayTotals: Record<string, unknown>;
  qaChecklist: string[];
}

export const spec = specJson as unknown as Spec;

/** meta.now is the current moment everywhere. Never Date.now(). */
export const NOW = new Date(spec.meta.now);

export const byId = new Map(spec.fixtures.map((f) => [f.id, f]));
export const statusById = new Map(spec.statuses.map((s) => [s.id, s]));
export const typeById = new Map(spec.transactionTypes.map((t) => [t.id, t]));
export const accountById = new Map(spec.accounts.map((a) => [a.id, a]));
export const filterById = new Map(spec.filters.map((f) => [f.id, f]));
export const stateById = new Map(spec.states.map((s) => [s.id, s]));

/** Rows that may appear at top level: feeModel rule 1 — a parentId is never top-level. */
export const topLevelFixtures = spec.fixtures.filter((f) => !f.parentId);

/** Child fees, resolved from children[] rather than restated. */
export function childrenOf(tx: Fixture): Fixture[] {
  return (tx.children ?? []).map((id) => byId.get(id)).filter((f): f is Fixture => Boolean(f));
}

export function childFeeTotal(tx: Fixture): number | null {
  const fees = childrenOf(tx).filter((c) => c.type === 'fee');
  if (fees.length === 0) return null;
  return fees.reduce((sum, c) => sum + Math.abs(c.amount ?? 0), 0);
}

export function isConversion(tx: Fixture): boolean {
  return tx.type === 'between_accounts' && tx.targetAmount !== undefined;
}

/** Every currency a transaction touches — used by the currency filter and day totals. */
export function currenciesOf(tx: Fixture): string[] {
  const list = [tx.currency, tx.sourceCurrency, tx.targetCurrency].filter(
    (c): c is string => Boolean(c),
  );
  return [...new Set(list)];
}

/** filters[].source = "currencies": derived from accounts[] and every fixture currency. */
export const currencyOptions = [
  ...new Set([
    ...spec.accounts.map((a) => a.currency),
    ...spec.fixtures.flatMap((f) => currenciesOf(f)),
  ]),
].sort();

/** filters[].source = "accounts". */
export const accountOptions = spec.accounts;

/**
 * The status and type filters' options are spec labels, in the drawer's order
 * (filters[].options). Map each back to its statuses[] / transactionTypes[]
 * entry; an unmatched label is a spec error and fails loudly at load.
 */
function optionsOf<T extends { label: string }>(filterId: string, entries: readonly T[]): T[] {
  const labels = (spec.filters.find((f) => f.id === filterId)?.options ?? []) as string[];
  return labels.map((label) => {
    const entry = entries.find((e) => e.label === label);
    if (!entry) throw new Error(`filters.${filterId}.options: no entry labelled "${label}"`);
    return entry;
  });
}
export const statusOptions = optionsOf('status', spec.statuses);
export const typeOptions = optionsOf('type', spec.transactionTypes);

/** Counterparty typeahead suggestions, from the fixtures only. */
export const counterpartyOptions = [
  ...new Set(topLevelFixtures.map((f) => f.counterparty?.name).filter((n): n is string => Boolean(n))),
].sort();

/** The first fixture carrying each status — gives /states a route per status. */
export function firstFixtureWithStatus(statusId: StatusId): Fixture | undefined {
  return topLevelFixtures.find((f) => f.status === statusId);
}

/** The row title: counterparty name, or the fee label for a fee with no counterparty. */
export function titleOf(tx: Fixture): string {
  // Every fixture carries a counterparty name or a label. The internal id is
  // never a fallback: no fixture key may reach the screen (qaChecklist).
  const title = tx.counterparty?.name ?? tx.label;
  if (!title) throw new Error(`fixtures: ${tx.id} has neither counterparty.name nor label`);
  return title;
}
