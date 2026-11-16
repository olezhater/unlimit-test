/**
 * The centred block shared by empty, no-results and error. Copy comes from the
 * state's own `copy` object; nothing is authored here.
 */
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
          {primaryAction ? (
            <button type="button" className="button button--primary" onClick={onPrimary}>
              {primaryAction}
            </button>
          ) : null}
          {secondaryAction ? (
            <button type="button" className="button button--secondary">
              {secondaryAction}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
