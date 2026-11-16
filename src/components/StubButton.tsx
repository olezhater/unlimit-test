/**
 * A panel action that the prototype does not implement
 * (prototypeAffordances.stubRule): pressing it shows the stub notice above
 * the button — the actions are the panel's pinned footer — and changes
 * nothing else. Used for every action in the details
 * panel — the status's primaryAction and secondaryAction and Repeat.
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
