/**
 * prototypeAffordances.stubNotice — the boundary of a stub, drawn in the
 * prototype bar's own style (`.proto-notice`) so it reads as scaffolding, not
 * a product message. The live region is always mounted so the text is
 * announced when it appears. It floats below its anchor (the parent must be
 * positioned) and takes no space when empty.
 */
import { PROTOTYPE } from '../spec/copy.ts';

export function StubNotice({ shown, className }: { shown: boolean; className?: string }) {
  return (
    <p className={`proto-notice${className ? ` ${className}` : ''}`} role="status">
      {shown ? PROTOTYPE.stubNotice : ''}
    </p>
  );
}
