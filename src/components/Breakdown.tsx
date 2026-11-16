/**
 * The amount breakdown.
 *
 * Conversions use fxModel.detailsBreakdown for the values and their order, with
 * the labels from fieldLabels — five lines, plus the locked rate. Payments
 * carrying a child fee use recipientGets / fee / totalPaid.
 *
 * A transaction with neither a fee nor a conversion has nothing to break down,
 * and the section is omitted rather than repeating the pinned amount.
 *
 * No copy controls: figures are not in states.details.copyableFields.
 */
import { type Fixture, childFeeTotal, isConversion } from '../spec/spec.ts';
import { magnitude, rate as formatRate, dateTime } from '../lib/format.ts';
import { FIELD_LABELS, FX_BREAKDOWN, fill } from '../spec/copy.ts';

function Line({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <div className={`breakdown__line${total ? ' breakdown__line--total' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function Breakdown({ tx }: { tx: Fixture }) {
  if (isConversion(tx)) {
    const values: Record<string, string> = {
      convertedAmount: magnitude(tx.convertedAmount ?? 0),
      sourceCurrency: tx.sourceCurrency ?? '',
      fee: magnitude(tx.fee ?? 0),
      sourceAmount: magnitude(tx.sourceAmount ?? 0),
      rate: formatRate(tx.rate ?? 0),
      targetCurrency: tx.targetCurrency ?? '',
      targetAmount: magnitude(tx.targetAmount ?? 0),
    };
    return (
      <dl className="breakdown">
        {FX_BREAKDOWN.map((line, index) => (
          <Line
            key={line.label}
            label={line.label}
            value={fill(line.template, values)}
            total={index === FX_BREAKDOWN.length - 1}
          />
        ))}
        {tx.rateLockedAt ? (
          <Line
            label={FIELD_LABELS.rateLockedAt}
            value={dateTime(tx.rateLockedAt)}
          />
        ) : null}
      </dl>
    );
  }

  const fee = childFeeTotal(tx);
  if (fee === null) return null;
  const currency = tx.currency ?? '';
  const total = Math.abs(tx.amount ?? 0);
  // amountConvention: amount is the total movement; the fee is inside it.
  const recipientGets = tx.recipientGets ?? total - fee;

  return (
    <dl className="breakdown">
      <Line
        label={FIELD_LABELS.recipientGets}
        value={`${magnitude(recipientGets)} ${currency}`}
      />
      <Line label={FIELD_LABELS.fee} value={`${magnitude(fee)} ${currency}`} />
      <Line
        label={FIELD_LABELS.totalPaid}
        value={`${magnitude(total)} ${currency}`}
        total
      />
    </dl>
  );
}
