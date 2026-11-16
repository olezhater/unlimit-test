/**
 * The status badge. In the row, the four exception statuses carry a unique icon
 * shape and their visible label (statusDifferentiation.channels). Completed —
 * the unmarked default — sets listTreatment.markVisible false and draws nothing
 * in the row; its label stays in the row's accessible name (TransactionRow).
 * The panel badge always draws icon and label, Completed included.
 */
import { type Status } from '../spec/spec.ts';
import { Icon } from './Icon.tsx';

export function StatusBadge({ status, size = 'row' }: { status: Status; size?: 'row' | 'panel' }) {
  // statuses[1].specNote — Completed is identified as the only unmarked row.
  if (size === 'row' && status.listTreatment.markVisible === false) return null;
  return (
    <span
      className={`status status--${size}`}
      data-status={status.id}
      data-emphasis={status.listTreatment.emphasis}
    >
      <Icon name={status.iconShape} size="sm" />
      <span className="status__label">{status.label}</span>
    </span>
  );
}
