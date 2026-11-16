/**
 * states.details.copy.copyField — the copy control on a key-value row.
 *
 * One control for every states.details.copyableFields entry: permanently visible
 * and in the tab order, never revealed on hover. "Copied" (states.details.copy.copied) shows only after the clipboard
 * write succeeded — a denied write announces nothing.
 */
import { Icon } from './Icon.tsx';
import { DETAILS_COPY } from '../spec/copy.ts';

export type CopyHandler = (key: string, text: string) => void;

export function CopyButton({
  id,
  text,
  label,
  copiedId,
  onCopy,
}: {
  /** Unique within the panel; identifies which control last copied. */
  id: string;
  text: string;
  /** The accessible name, filled from the spec template. */
  label: string;
  copiedId: string | null;
  onCopy: CopyHandler;
}) {
  const copied = copiedId === id;
  return (
    <span className="copy">
      <button
        type="button"
        className="copy__button"
        aria-label={label}
        data-copied={copied || undefined}
        onClick={() => onCopy(id, text)}
      >
        <Icon name={copied ? 'check' : 'copy'} size="sm" />
      </button>
      <span className="copy__status" role="status">
        {copied ? DETAILS_COPY.copied : ''}
      </span>
    </span>
  );
}
