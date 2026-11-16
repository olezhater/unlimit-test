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

/** Keep the active option in view inside the surface's own scroll box. */
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
    const top =
      box.scrollTop + option.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientTop;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (top + option.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTop = top + option.offsetHeight - box.clientHeight;
  }, [open, activeId]);
}
