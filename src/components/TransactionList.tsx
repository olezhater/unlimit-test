/**
 * The day-grouped list. Headers read Today / Yesterday / '12 November' against
 * meta.now, and carry the day's per-currency net total on the right — only for
 * transactions whose status has countsInDayTotal true.
 */
import { type DayGroup } from '../lib/data.ts';
import { dayHeading } from '../lib/format.ts';
import { TransactionRow } from './TransactionRow.tsx';

export function TransactionList({
  groups,
  selectedId,
  onOpen,
}: {
  groups: DayGroup[];
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="list">
      {groups.map((group) => (
        <section className="day" key={group.key} aria-labelledby={`day-${group.key}`}>
          <header className="day__header">
            <h2 className="day__heading" id={`day-${group.key}`}>
              {dayHeading(group.key)}
            </h2>
            {/* groupHeaderExtra.emptyCase — a day with nothing settled shows no total. */}
            {group.total ? <span className="day__total">{group.total}</span> : null}
          </header>
          <ul className="day__rows">
            {group.rows.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                selected={tx.id === selectedId}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
