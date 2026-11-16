/**
 * prototypeAffordances.stubRule — the behaviour every stub shares: activating
 * it shows prototypeAffordances.stubNotice for prototypeAffordances.stubNoticeMs,
 * then the notice clears itself. Used by Download statement and every panel action.
 */
import { useEffect, useRef, useState } from 'react';
import { PROTOTYPE } from '../spec/copy.ts';

/** One stub notice on screen at a time: showing one hides whichever was up. */
let hideCurrent: (() => void) | null = null;

export function useStubNotice(): { shown: boolean; show: () => void; hide: () => void } {
  const [shown, setShown] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = () => {
    if (hideCurrent && hideCurrent !== hideSelf) hideCurrent();
    hideCurrent = hideSelf;
    setShown(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(false), PROTOTYPE.stubNoticeMs);
  };
  function hideSelf() {
    window.clearTimeout(timer.current);
    setShown(false);
  }
  const hide = hideSelf;
  return { shown, show, hide };
}
