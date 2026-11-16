/**
 * An action that the prototype does not implement
 * (prototypeAffordances.stubRule): pressing it shows the stub notice and
 * changes nothing else. Used for every action in the details panel — the
 * status's primaryAction and secondaryAction and Repeat, where the notice
 * opens above the button because the actions are the panel's pinned footer —
 * and for the block-state actions that lead out of this screen (the empty
 * state's primaryAction, the error state's secondaryActionAfterSecondFailure),
 * where it opens below.
 */
import { StubNotice } from './StubNotice.tsx';
import { useStubNotice } from '../lib/stub.ts';

export function StubButton({ label, primary }: { label: string; primary?: boolean }) {
  const notice = useStubNotice();
  const show = () => notice.show();
  return (
    <span className="stub-anchor">
      <button
        type="button"
        className={`button ${primary ? 'button--primary' : 'button--secondary'}`}
        onClick={show}
      >
        {label}
      </button>
      <StubNotice shown={notice.shown} />
    </span>
  );
}
