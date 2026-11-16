/**
 * Behaviour shared by the three dropdowns (see components/dropdown.tsx for the
 * shared look). Each control still owns its own roles and keyboard model.
 */
import { useEffect } from 'react';

/**
 * The one Escape step for all three dropdowns: close the surface, keep the
 * key from reaching anything behind it (the Filters drawer), and put focus
 * back on the trigger.
 */
export function closeOnEscape(
  event: React.KeyboardEvent,
  close: () => void,
  trigger: HTMLElement | null,
) {
  event.preventDefault();
  event.stopPropagation();
  close();
  trigger?.focus({ preventScroll: true });
}

/** Closes an open surface on a pointer press outside `roots`. */
export function useOutsideClose(
  open: boolean,
  roots: Array<React.RefObject<HTMLElement | null>>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (roots.some((root) => root.current?.contains(target))) return;
      close();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  });
}

/**
 * Keep the active option in view inside the surface's own scroll box. The
 * scroll stops on an option boundary, so the active option is fully visible
 * and the option at the top edge is never cut in half — on opening a list
 * whose selection sits far down, "All" or whichever option leads stays whole.
 */
export function useActiveInView(open: boolean, activeId: string | null) {
  useEffect(() => {
    if (!open || !activeId) return;
    // Scroll the surface only. scrollIntoView would also scroll the page when
    // the surface hangs from the sticky heading, moving the list under the
    // pointer as the dropdown opens.
    const option = document.getElementById(activeId);
    const box = option?.closest<HTMLElement>('[role="listbox"]');
    if (!option || !box) return;
    // Measured against the surface itself, whatever its positioning context.
    const boxTop = box.getBoundingClientRect().top + box.clientTop;
    const offset = (el: Element) => box.scrollTop + el.getBoundingClientRect().top - boxTop;
    // An option boundary: the option's top less the surface's own padding,
    // so the padding shows above the first whole option.
    const pad = parseFloat(getComputedStyle(box).paddingTop) || 0;
    const top = offset(option);
    const bottom = top + option.offsetHeight;
    if (top - pad < box.scrollTop) {
      box.scrollTop = Math.max(top - pad, 0);
    } else if (bottom > box.scrollTop + box.clientHeight) {
      const needed = bottom - box.clientHeight;
      const stops = [...box.querySelectorAll('[role="option"]')]
        .map((el) => offset(el) - pad)
        .filter((stop) => stop >= needed && stop <= top - pad);
      box.scrollTop = stops.length ? Math.min(...stops) : needed;
    }
  }, [open, activeId]);
}
