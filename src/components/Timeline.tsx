/**
 * The status timeline, as an accordion (timelineRules.accordion).
 *
 * Positions and progress are statuses[].timeline — the brief's three-step model,
 * unchanged. Only the rendered labels differ: timelineRules.steps gives the
 * labels per transaction type, by position, and terminalSteps names the step a
 * terminal status ends on. A step shows a timestamp only where the fixture
 * records one (timestampSource; Pending is a state, not an event).
 *
 * Collapsed, it shows the current step alone with its timestamp; expanded, the
 * full timeline. Expanded by default for every status in
 * timelineRules.expandedByDefault — everything except Completed.
 */
import { useId, useState } from 'react';
import { type Fixture, type Status, accountById } from '../spec/spec.ts';
import { dateTime } from '../lib/format.ts';
import { DETAILS_COPY, TIMELINE_STEPS, fill } from '../spec/copy.ts';
import { spec } from '../spec/spec.ts';
import { Icon } from './Icon.tsx';

function timestampFor(step: string, tx: Fixture, status: Status): string | null {
  const key = status.timeline.timestampSource?.[step];
  if (!key) return null;
  const value = tx[key as keyof Fixture];
  return typeof value === 'string' ? dateTime(value) : null;
}

/** The rendered label for the step at this position. */
function labelFor(step: string, index: number, tx: Fixture, status: Status): string {
  if (status.timeline.terminalStep === step) {
    return TIMELINE_STEPS.terminalSteps[status.id] ?? step;
  }
  const template = TIMELINE_STEPS[tx.type]?.[index];
  if (!template) return step;
  const target = tx.targetAccount ? accountById.get(tx.targetAccount) : undefined;
  return fill(template, { targetAccountLabel: target?.label ?? '' });
}

export function Timeline({ tx, status }: { tx: Fixture; status: Status }) {
  const { steps, completedSteps, currentStep, terminalStep } = status.timeline;
  const [expanded, setExpanded] = useState(() =>
    spec.timelineRules.expandedByDefault.includes(status.id),
  );
  const listId = useId();

  const items = steps
    .map((step, index) => ({ step, index }))
    .filter(({ index }) => expanded || index === currentStep);

  return (
    <div className="timeline-accordion" data-expanded={expanded || undefined}>
      <ol className="timeline" id={listId}>
        {items.map(({ step, index }) => {
          const done = completedSteps.includes(index);
          const current = index === currentStep;
          const stamp = timestampFor(step, tx, status);
          return (
            <li
              className="timeline__step"
              key={step}
              data-done={done || undefined}
              data-current={current || undefined}
              data-terminal={terminalStep === step || undefined}
              data-untimed={!stamp || undefined}
            >
              <span className="timeline__marker" aria-hidden="true" />
              <span className="timeline__body">
                <span className="timeline__label">{labelFor(step, index, tx, status)}</span>
                {stamp ? <span className="timeline__time">{stamp}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      {steps.length > 1 ? (
        <button
          type="button"
          className="timeline__toggle"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? DETAILS_COPY.timelineCollapse : DETAILS_COPY.timelineExpand}
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="sm" />
        </button>
      ) : null}
    </div>
  );
}
