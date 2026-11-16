/**
 * One row, per listBehaviour.rowAnatomy:
 *   leading           40px avatar
 *   primary           counterparty name, or 'Account A to Account B'
 *   meta              status mark (exception statuses only) · time · note,
 *                     truncated to one line; nothing after the time with no note
 *   trailing          signed amount, bold (for conversions, the target amount)
 *   trailingSecondary one value only — conversion source amount, else the fee line
 */
import { type Fixture, childFeeTotal, isConversion, statusById, titleOf } from '../spec/spec.ts';
import { magnitude, signedMoney, time } from '../lib/format.ts';
import { primaryAmount } from '../lib/data.ts';
import { FEE_LINE_TEMPLATE, META_SEPARATOR, fill } from '../spec/copy.ts';
import { Avatar } from './Avatar.tsx';
import { StatusBadge } from './StatusBadge.tsx';
import { noteOf, useNotesVersion } from '../lib/notes.ts';

/** rowAnatomy.trailingSecondary — one value, by the spec's priority order. */
function secondaryValue(tx: Fixture): { text: string; kind: 'source' | 'fee' } | null {
  // (1) conversions: the source amount. feeModel.conversionException — the fee
  // is not shown on the row, the source amount wins the slot.
  if (isConversion(tx)) {
    return {
      text: signedMoney(tx.sourceAmount ?? 0, tx.sourceCurrency ?? ''),
      kind: 'source',
    };
  }
  // (2) payments carrying a child fee.
  const fee = childFeeTotal(tx);
  if (fee !== null) {
    return {
      text: fill(FEE_LINE_TEMPLATE, { amount: magnitude(fee), currency: tx.currency ?? '' }),
      kind: 'fee',
    };
  }
  return null;
}

export function TransactionRow({
  tx,
  selected,
  onOpen,
}: {
  tx: Fixture;
  selected: boolean;
  onOpen: (id: string) => void;
}) {
  const status = statusById.get(tx.status);
  const { value, currency } = primaryAmount(tx);
  const amount = signedMoney(value, currency);
  const secondary = secondaryValue(tx);
  const title = titleOf(tx);
  // rowAnatomy.metaNote — the note, never the reference; a panel edit shows at once.
  useNotesVersion();
  // A note of only spaces or newlines is no note: nothing follows the time.
  const note = noteOf(tx).trim();

  if (!status) return null;
  const marked = status.listTreatment.markVisible !== false;

  return (
    <li className="row-item">
      <button
        type="button"
        id={`row-${tx.id}`}
        className="row"
        data-selected={selected || undefined}
        onClick={() => onOpen(tx.id)}
        /* Assembled from spec values only — the allowed aria exception. */
        aria-label={`${title}, ${status.label}, ${amount}`}
      >
        <Avatar tx={tx} />

        <span className="row__body">
          <span className="row__title" title={title}>
            {title}
          </span>
          <span className="row__meta">
            {/* Completed is unmarked: the meta line starts with the time. */}
            {marked ? (
              <>
                <StatusBadge status={status} />
                <span className="row__meta-sep" aria-hidden="true">
                  {META_SEPARATOR}
                </span>
              </>
            ) : null}
            <span className="row__time">{time(tx.createdAt)}</span>
            {note ? (
              <>
                <span className="row__meta-sep" aria-hidden="true">
                  {META_SEPARATOR}
                </span>
                <span className="row__note">{note}</span>
              </>
            ) : null}
          </span>
        </span>

        <span className="row__trailing">
          <span
            className="row__amount"
            data-style={status.listTreatment.amountStyle}
            data-sign={value < 0 ? 'negative' : 'positive'}
          >
            {amount}
          </span>
          {secondary ? (
            <span className="row__secondary" data-kind={secondary.kind}>
              {secondary.text}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
