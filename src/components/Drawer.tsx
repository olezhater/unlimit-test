/**
 * The overlay drawer shell: a scrim and a right-side modal dialog.
 *
 * Used by the details panel in drawer mode (meta.layout.panelModes.drawer) and
 * by the filters drawer (filtersDrawer). It owns the modal mechanics only —
 * portal, scrim, focus on open, focus trap, Escape and scrim click — and no
 * copy: the dialog's accessible name is passed in, assembled from spec values.
 *
 * It renders into the overlay layer the prototype shell provides, which is
 * pinned to the visible part of the application frame — never the viewport,
 * never over the prototype bar (tokens.css layer order). A plain `position: fixed` would
 * be wrong twice: it would cover the whole window when the frame is narrower,
 * and the greyscale filter on the frame would re-anchor it to the frame's
 * full scroll height.
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayLayer } from '../lib/frame.ts';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Drawer({
  label,
  onClose,
  className,
  initialFocus,
  children,
}: {
  label: string;
  onClose: () => void;
  className?: string;
  /** Selector inside the dialog to focus on open; the first focusable otherwise. */
  initialFocus?: string;
  children: React.ReactNode;
}) {
  const layer = useOverlayLayer();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const target =
      (initialFocus ? dialog.querySelector<HTMLElement>(initialFocus) : null) ??
      dialog.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus({ preventScroll: true });
    // Mount once per opening; the dialog's content may change underneath.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      // Claimed here so no listener further out acts on the same key press.
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null,
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!layer) return null;

  return createPortal(
    <div className="drawer-root" onKeyDown={onKeyDown}>
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className={`drawer${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>,
    layer,
  );
}
