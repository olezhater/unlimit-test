/**
 * What the product needs from the application frame, provided by the
 * prototype shell: the frame's width (meta.layout.breakpointSource) and the
 * overlay layer drawers portal into.
 */
import { createContext, useContext } from 'react';

interface FrameContextValue {
  width: number;
  layer: HTMLDivElement | null;
}

export const FrameContext = createContext<FrameContextValue>({ width: 0, layer: null });

/** The application frame's current width in px. */
export function useFrameWidth(): number {
  return useContext(FrameContext).width;
}

/** The element drawers portal into. */
export function useOverlayLayer(): HTMLDivElement | null {
  return useContext(FrameContext).layer;
}
