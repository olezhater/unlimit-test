/**
 * toolbar.download — "Download statement", a single borderless control at the
 * top right of the header row (toolbar.download.placement). A stub under
 * prototypeAffordances.stubRule: pressing it shows the stub notice beside it,
 * to its left (toolbar.download.stub), and changes nothing else.
 */
import { DOWNLOAD } from '../spec/copy.ts';
import { StubNotice } from './StubNotice.tsx';
import { useStubNotice } from '../lib/stub.ts';

export function DownloadStatement() {
  const notice = useStubNotice();
  return (
    <span className="stub-anchor download-statement">
      <button type="button" className="text-action" onClick={notice.show}>
        {DOWNLOAD.label}
      </button>
      <StubNotice shown={notice.shown} />
    </span>
  );
}
