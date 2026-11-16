/**
 * states.details — the details panel for the selected transaction.
 *
 * The pinned header opens with one line — the counterparty avatar (the row's
 * own logo-or-fallback component) left, the status badge right, and in the
 * drawer the close control — then the amount, the counterparty and the status
 * block (timeline accordion, no heading, no separate date). The scrolling body
 * renders the entries of states.details.sections[] that apply — Amount
 * breakdown, Details (sections.details.fields, six of them copyable),
 * then Note. The actions are a footer pinned below the body: the status's
 * primaryAction, Repeat (repeatAction) and secondaryAction — each a stub
 * (prototypeAffordances.stubRule). Cancelled
 * keeps full contrast (its specNote).
 *
 * Copy controls only where states.details.copyableFields.rule gives one —
 * values people transcribe: payment reference, recipient or sender, IBAN and
 * Transaction ID copy what the row shows; From and To always carry one, copying
 * the IBAN of the party they name where there is one and the displayed value
 * where there is not (ibanRule) — permanently visible. Each name says what it
 * copies: copy.copyIban when it copies an IBAN, copy.copyField otherwise, with
 * the fieldLabels label in lower case (copy.copyFieldCase).
 *
 * One component, two modes (meta.layout.panelModes):
 *   column  1440px and above — a persistent column beside the list that always
 *           holds a transaction (defaultSelection.wide). Not a dialog: it never
 *           takes focus, and it has no close control and no Escape.
 *   drawer  below 1440px — the same content inside the overlay Drawer: a modal
 *           dialog with a scrim, focus moved to the close control, trapped
 *           inside, closed by Escape, the close control or the scrim.
 * Everything inside the panel is shared; only the wrapper differs.
 */
import { useEffect, useRef, useState } from "react";
import {
  type Fixture,
  accountById,
  childFeeTotal,
  hasThirdParty,
  isConversion,
  statusById,
  titleOf,
} from "../spec/spec.ts";
import { dateTime, signedMoney } from "../lib/format.ts";
import { primaryAmount } from "../lib/data.ts";
import {
  COPIES,
  DETAILS_COPY,
  FIELD_LABELS,
  REPEAT_ACTION,
  SECTIONS,
  fill,
} from "../spec/copy.ts";
import { Icon } from "./Icon.tsx";
import { StatusBadge } from "./StatusBadge.tsx";
import { Timeline } from "./Timeline.tsx";
import { Breakdown } from "./Breakdown.tsx";
import { Drawer } from "./Drawer.tsx";
import { Avatar } from "./Avatar.tsx";
import { CopyButton, type CopyHandler } from "./CopyButton.tsx";
import { StubButton } from "./StubButton.tsx";
import { noteOf, setNote, useNotesVersion } from "../lib/notes.ts";

/** states.details.sections.details.fields — the Details rows, in order. */
const DETAIL_FIELDS: string[] =
  (
    SECTIONS.find((section) => section.id === "details") as
      { fields?: string[] } | undefined
  )?.fields ?? [];

/** copy.copyFieldCase — lower case, except a word written wholly in capitals. */
function copyLabel(label: string, template: string): string {
  const words = label
    .split(" ")
    .map((word) =>
      word.length > 1 && word === word.toUpperCase()
        ? word
        : word.toLowerCase(),
    );
  return fill(template, { label: words.join(" ") });
}

export type PanelMode = "column" | "drawer";

/**
 * sections[note] — its own block: the heading names the field (label
 * association), and the field sits beneath it at full width, filled, growing
 * to --note-max-height before it scrolls. Session state only (noteRule).
 */
function NoteSection({ tx, title }: { tx: Fixture; title: string }) {
  useNotesVersion();
  const fieldId = `note-${tx.id}`;
  return (
    <section className="panel__section">
      <h3 className="panel__section-title">
        <label htmlFor={fieldId}>{title}</label>
      </h3>
      <textarea
        id={fieldId}
        className="note-field"
        rows={2}
        placeholder={DETAILS_COPY.notePlaceholder}
        value={noteOf(tx)}
        onChange={(event) => setNote(tx.id, event.target.value)}
      />
    </section>
  );
}

/**
 * sections[].renderWhen, one predicate per section id. The conditions are the
 * spec's sentences; this is their executable form, keyed by the spec's ids so
 * order and headings stay in the spec.
 */
const RENDER_WHEN: Record<string, (tx: Fixture) => boolean> = {
  // "when the transaction has a fee, a child fee, or a conversion"
  breakdown: (tx) =>
    (tx.fee ?? 0) > 0 || childFeeTotal(tx) !== null || isConversion(tx),
  // "always — every transaction has at least From and Transaction ID"
  details: (tx) => detailRows(tx).length > 0,
  // always, on every transaction; empty only where there is no note
  note: () => true,
};

/**
 * The Details section's rows: states.details.sections.details.fields, in that
 * order, each only where the transaction has it. No Date and time row: the
 * header's status block carries it (sections[details].dateTimeInHeader). The
 * recipient details (name, IBAN, bank) only for a third party and
 * only where the fixture carries the value.
 */
function detailRows(
  tx: Fixture,
): {
  key: string;
  value: string;
  copy?: string;
  /** The control copies an IBAN, not the value shown: its name says so. */
  copiesIban?: boolean;
  wrap?: boolean;
  mono?: boolean;
}[] {
  const name = titleOf(tx);
  const debit = accountById.get(tx.account)?.label;
  const credit = tx.targetAccount
    ? accountById.get(tx.targetAccount)?.label
    : undefined;
  // The user's own account on one side, the other party on the other.
  const incoming = tx.type === "incoming";
  const from = incoming ? name : debit;
  const to = incoming
    ? debit
    : (credit ?? (tx.type === "fee" ? undefined : name));
  const third = hasThirdParty(tx);
  // copyableFields.ibanRule — From and To copy the IBAN of the party they
  // name where one is on record (the user's own accounts always have one; a
  // third party only where the fixture carries it), else the displayed value.
  const debitIban = accountById.get(tx.account)?.iban;
  const creditIban = tx.targetAccount
    ? accountById.get(tx.targetAccount)?.iban
    : undefined;
  const theirIban = third ? tx.counterparty?.iban : undefined;
  const ibans: Record<string, string | undefined> = {
    fromAccount: incoming ? theirIban : debitIban,
    toAccount: incoming ? debitIban : (creditIban ?? theirIban),
  };
  const values: Record<
    string,
    { value?: string; wrap?: boolean; mono?: boolean }
  > = {
    transactionId: { value: tx.displayId, mono: true },
    fromAccount: { value: from },
    toAccount: { value: to },
    reference: { value: tx.reference, wrap: true },
    counterpartyName: { value: third ? name : undefined, wrap: true },
    counterpartyAccount: {
      value: third ? tx.counterparty?.iban : undefined,
      wrap: true,
    },
    counterpartyBank: {
      value: third ? tx.counterparty?.bank : undefined,
      wrap: true,
    },
  };
  return DETAIL_FIELDS.flatMap((key) =>
    values[key]?.value
      ? [
          {
            key,
            value: values[key].value as string,
            // copyableFields.copies — the row's own value, the IBAN behind
            // it, or nothing.
            copy:
              COPIES[key] === "value"
                ? (values[key].value as string)
                : COPIES[key] === "iban"
                  ? (ibans[key] ?? (values[key].value as string))
                  : undefined,
            copiesIban: COPIES[key] === "iban" && Boolean(ibans[key]),
            wrap: values[key].wrap,
            mono: values[key].mono,
          },
        ]
      : [],
  );
}

/**
 * statuses[].detailHelperText, with detailHelperFallback when the fixture lacks
 * the field the template needs. reasonOverride: a fixture's own `reason`
 * replaces the helper text entirely — the two never render together.
 */
function helperText(
  tx: Fixture,
  status: NonNullable<ReturnType<typeof statusById.get>>,
): string | null {
  // statuses[].showWhen — the helper renders only when it adds something the
  // timeline does not. Completed would repeat the Delivered timestamp.
  if (status.showWhen === "never") return null;
  if (status.reasonOverride && tx.reason) return tx.reason;

  const values: Record<string, string> = {};
  for (const key of [
    "deliveredAt",
    "createdAt",
    "expectedBy",
    "cancelledAt",
    "rejectedAt",
    "failedAt",
  ] as const) {
    const value = tx[key];
    if (typeof value === "string") values[key] = dateTime(value);
  }

  const needs = (template: string) =>
    [...template.matchAll(/\{(\w+)\}/g)].every(
      (m) => values[m[1]] !== undefined,
    );

  if (status.detailHelperText && needs(status.detailHelperText))
    return fill(status.detailHelperText, values);
  if (status.detailHelperFallback && needs(status.detailHelperFallback)) {
    return fill(status.detailHelperFallback, values);
  }
  return null;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel__section">
      <h3 className="panel__section-title">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  id,
  labelKey,
  value,
  copyText,
  copiesIban,
  wrap,
  mono,
  copiedId,
  onCopy,
}: {
  id: string;
  /** The fieldLabels key; it names the field. */
  labelKey: string;
  value: string;
  /** What the copy control copies; absent, the row has no control. */
  copyText?: string;
  /** The control copies an IBAN rather than the value shown. */
  copiesIban?: boolean;
  wrap?: boolean;
  /** Transaction ID: monospaced, one line, never wrapping. */
  mono?: boolean;
  copiedId: string | null;
  onCopy: CopyHandler;
}) {
  const label = FIELD_LABELS[labelKey];
  return (
    <div className="fields__row">
      <dt>{label}</dt>
      <dd className={mono ? "fields__mono" : wrap ? "fields__wrap" : undefined}>
        {value}
      </dd>
      {copyText ? (
        <CopyButton
          id={id}
          text={copyText}
          label={copyLabel(
            label,
            copiesIban ? DETAILS_COPY.copyIban : DETAILS_COPY.copyField,
          )}
          copiedId={copiedId}
          onCopy={onCopy}
        />
      ) : null}
    </div>
  );
}

export function DetailsPanel({
  tx,
  mode,
  onClose,
}: {
  tx: Fixture;
  mode: PanelMode;
  onClose: () => void;
}) {
  /** Which copy control last succeeded; one "Copied" at a time. */
  // Keyed by transaction, so swapping transactions clears it without an effect.
  const [copied, setCopied] = useState<{ txId: string; id: string } | null>(null);
  const copiedId = copied?.txId === tx.id ? copied.id : null;
  const timerRef = useRef<number | undefined>(undefined);

  const status = statusById.get(tx.status);

  useEffect(() => () => window.clearTimeout(timerRef.current), [tx.id]);

  if (!status) return null;

  const { value, currency } = primaryAmount(tx);
  const helper = helperText(tx, status);
  const counterpartyName = titleOf(tx);
  /* states.details.repeatAction — outgoing payments only, with the standing
     the status gives it (prominence): primary, secondary, or none at all. */
  const repeat = tx.type === "outgoing" ? status.repeat : null;
  const repeatable = repeat !== null;

  const onCopy: CopyHandler = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // A denied write is not a copy. states.details.copy carries no failure
      // string, so nothing is announced rather than a false "Copied".
      return;
    }
    setCopied({ txId: tx.id, id });
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(null), 2000);
  };
  const copy = { copiedId, onCopy };
  const amountText = signedMoney(value, currency);

  /* Assembled from spec values — the allowed aria exception. */
  const label = `${counterpartyName}, ${status.label}, ${amountText}`;

  const content = (
    <>
      <header className="panel__pinned">
        {/* states.details.behaviour — one line: the avatar left, the status
            badge aligned right; in the drawer the close control ends the line
            (defaultSelection.wide: no close control at 1440+). */}
        <div className="panel__lead">
          <Avatar tx={tx} />
          <StatusBadge status={status} size="panel" />
          {mode === "drawer" ? (
            <button
              type="button"
              className="panel__close"
              onClick={onClose}
              aria-label={DETAILS_COPY.close}
            >
              <Icon name="x" size="md" />
            </button>
          ) : null}
        </div>
        <p
          className="panel__amount"
          data-style={status.listTreatment.amountStyle}
          data-sign={value < 0 ? "negative" : "positive"}
        >
          {amountText}
        </p>
        <p className="panel__counterparty">{counterpartyName}</p>
        {/* The status block, directly under the counterparty, with no heading:
            collapsed it is the current step with its date and time, so the
            header carries no separate date line. */}
        <div className="panel__status">
          <Timeline key={tx.id} tx={tx} status={status} />
          {/* states.details.behaviour — the helper line sits directly beneath
              the status block, in the pinned header, so the two stay together. */}
          {helper ? <p className="panel__helper">{helper}</p> : null}
        </div>
      </header>

      <div className="panel__body">
        {SECTIONS.filter((section) => RENDER_WHEN[section.id]?.(tx)).map(
          (section) =>
            section.id === "note" ? (
              <NoteSection
                key={`note-${tx.id}`}
                tx={tx}
                title={section.heading}
              />
            ) : (
              <Section key={section.id} title={section.heading}>
                {section.id === "breakdown" ? <Breakdown tx={tx} /> : null}

                {section.id === "details" ? (
                  <dl className="fields fields--details">
                    {detailRows(tx).map((row) => (
                      <Field
                        key={row.key}
                        id={`detail-${row.key}`}
                        labelKey={row.key}
                        value={row.value}
                        copyText={row.copy}
                        copiesIban={row.copiesIban}
                        wrap={row.wrap}
                        mono={row.mono}
                        {...copy}
                      />
                    ))}
                  </dl>
                ) : null}
              </Section>
            ),
        )}
      </div>

      {/* A footer pinned to the panel's bottom edge, outside the scroll
          (states.details.behaviour): the status's primaryAction, then Repeat
          (repeatAction.order) in the standing statuses[].repeat gives it,
          then secondaryAction. */}
      {status.primaryAction || repeatable || status.secondaryAction ? (
        <div className="panel__actions" key={tx.id}>
          {status.primaryAction ? (
            <StubButton label={status.primaryAction} primary />
          ) : null}
          {repeatable ? (
            <StubButton
              label={REPEAT_ACTION.label}
              primary={repeat === "primary"}
            />
          ) : null}
          {status.secondaryAction ? (
            <StubButton label={status.secondaryAction} />
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (mode === "drawer") {
    return (
      <Drawer
        label={label}
        onClose={onClose}
        className="panel"
        initialFocus=".panel__close"
      >
        {content}
      </Drawer>
    );
  }

  return (
    <aside className="panel" aria-label={label}>
      {content}
    </aside>
  );
}
