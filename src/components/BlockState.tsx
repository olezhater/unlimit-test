/**
 * The centred block shared by empty, no-results and error. Copy comes from the
 * state's own `copy` object; nothing is authored here.
 */
import { StubButton } from './StubButton.tsx';

export function BlockState({
  id,
  headline,
  body,
  primaryAction,
  secondaryAction,
  onPrimary,
  illustration,
}: {
  id: string;
  headline?: string;
  body?: string;
  primaryAction?: string | null;
  secondaryAction?: string | null;
  onPrimary?: () => void;
  illustration?: React.ReactNode;
}) {
  return (
    <div className="block" data-state={id} role="status">
      {illustration ? <div className="block__illustration">{illustration}</div> : null}
      {headline ? <h2 className="block__headline">{headline}</h2> : null}
      {body ? <p className="block__body">{body}</p> : null}
      {primaryAction || secondaryAction ? (
        <div className="block__actions">
          {/* An action with no handler leaves this screen for a flow the
              prototype does not build (Make a transfer, Contact support): a
              stub that says so on use (prototypeAffordances.stubRule), never
              a button that silently does nothing. */}
          {primaryAction && onPrimary ? (
            <button type="button" className="button button--primary" onClick={onPrimary}>
              {primaryAction}
            </button>
          ) : null}
          {primaryAction && !onPrimary ? <StubButton label={primaryAction} primary /> : null}
          {secondaryAction ? <StubButton label={secondaryAction} /> : null}
        </div>
      ) : null}
    </div>
  );
}
