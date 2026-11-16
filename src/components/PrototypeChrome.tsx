/**
 * prototypeAffordances — reviewer scaffolding, not product UI.
 *
 * A bar above the application frame with the width presets (1280, 1440 and
 * Full width) and a link to the states index; while greyscale is on, a chip
 * that turns it off (the control itself lives on the States index). It is built
 * from plain elements with its own classes and tokens and reuses no product
 * component, so it can never be mistaken for the interface under review.
 * `?chrome=off` removes it entirely; the capture script passes that on every
 * route.
 *
 * The shell also provides two things the product needs from the frame:
 *   - the frame's width, because meta.layout.breakpointSource puts the panel
 *     breakpoint on the frame, not the window;
 *   - an overlay layer confined to the visible part of the frame, for the
 *     drawers and their scrims.
 *
 * Scrolling: with the bar shown, the bar sits above the stage and never
 * scrolls; the stage, holding only the frame, is the single scroll container
 * for both axes. A frame wider than the viewport scrolls sideways inside the
 * stage and the page body never does. The overlay layer is pinned to the
 * visible part of the frame, so no drawer or scrim ever covers the bar. With
 * `?chrome=off` there is no stage: the product scrolls the window, exactly as
 * it would ship, and the layer is the viewport.
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { spec, stateById } from '../spec/spec.ts';
import { PROTOTYPE } from '../spec/copy.ts';
import { indexRoute, type Query, withPrototypeParams } from '../lib/url.ts';
import { FrameContext } from '../lib/frame.ts';

type PrototypeState = Pick<Query, 'chrome' | 'frame' | 'grey'>;

const indexName = stateById.get('states_index')?.name ?? '';

export function PrototypeShell({
  state,
  onChange,
  onNavigate,
  hideBar = false,
  children,
}: {
  /** The States index: no bar there (prototypeAffordances.indexBar). */
  hideBar?: boolean;
  state: PrototypeState;
  onChange: (next: Partial<PrototypeState>) => void;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const attachLayer = useCallback((node: HTMLDivElement | null) => {
    layerRef.current = node;
    setLayer(node);
  }, []);
  const [width, setWidth] = useState(() => window.innerWidth);
  const linkRef = useRef<HTMLAnchorElement>(null);

  /* Track the frame's box: its width drives the panel mode, and the overlay
     layer takes its top, left, width and height — clipped to the stage, or the
     viewport under ?chrome=off. */
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const sync = () => {
      const rect = frame.getBoundingClientRect();
      setWidth(Math.round(rect.width));
      const node = layerRef.current;
      if (node) {
        // The visible part of the frame: the frame's box clipped to its scroll
        // container — the stage's content box, which starts below the
        // prototype bar and excludes its scrollbars, or the viewport under
        // ?chrome=off. Overlays are confined to it.
        const stage = stageRef.current;
        const view = stage
          ? (() => {
              const s = stage.getBoundingClientRect();
              const top = s.top + stage.clientTop;
              const left = s.left + stage.clientLeft;
              return { top, left, bottom: top + stage.clientHeight, right: left + stage.clientWidth };
            })()
          : {
              top: 0,
              left: 0,
              bottom: document.documentElement.clientHeight,
              right: document.documentElement.clientWidth,
            };
        const top = Math.max(rect.top, view.top);
        const bottom = Math.min(rect.bottom, view.bottom);
        const left = Math.max(rect.left, view.left);
        const right = Math.min(rect.right, view.right);
        node.style.top = `${top}px`;
        node.style.height = `${Math.max(bottom - top, 0)}px`;
        node.style.left = `${left}px`;
        node.style.width = `${Math.max(right - left, 0)}px`;
      }
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(frame);
    const stage = stageRef.current;
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, { passive: true });
    stage?.addEventListener('scroll', sync, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync);
      stage?.removeEventListener('scroll', sync);
    };
  }, [layer, state.chrome, hideBar]);

  /* No bar under ?chrome=off, and none on the States index, which is itself
     scaffolding (prototypeAffordances.indexBar). Without the bar nothing is
     constrained; the chosen ?frame= and ?grey= stay in the URL, so following a
     link back into the product restores both. */
  const bare = state.chrome === 'off' || hideBar;
  const fixedWidth = bare ? null : state.frame;

  const frame = (
    <div
      ref={frameRef}
      className="frame"
      data-grey={state.grey || undefined}
      data-fixed={fixedWidth ? true : undefined}
      style={{
        // Both widths are spec data: meta.minWidth and prototypeAffordances.widths.
        minWidth: `${spec.meta.minWidth}px`,
        width: fixedWidth ? `${fixedWidth}px` : undefined,
      }}
    >
      {children}
    </div>
  );

  const overlay = (
    <div ref={attachLayer} className="overlay-layer" data-grey={state.grey || undefined} />
  );

  const context = { width, layer };

  if (bare) {
    return (
      <FrameContext.Provider value={context}>
        {frame}
        {overlay}
      </FrameContext.Provider>
    );
  }

  return (
    <FrameContext.Provider value={context}>
      <div className="prototype-root">
        {/* prototypeAffordances.barLayout — three zones: the greyscale chip at
            the left (only while greyscale is on), the width switcher centred,
            the States index link at the right. The region keeps its name from
            prototypeAffordances.label; nothing in the bar is a heading. */}
        <div className="proto" role="region" aria-label={PROTOTYPE.label}>
          <div className="proto__start">
            {/* prototypeAffordances.greyscalePlacement — the way out of
                greyscale, shown only while it is on. A pressed toggle whose name
                is its visible text, greyscaleActive (WCAG 2.5.3). */}
            {state.grey ? (
              <button
                type="button"
                className="proto__chip"
                aria-pressed="true"
                onClick={() => {
                  onChange({ grey: false });
                  linkRef.current?.focus();
                }}
              >
                {PROTOTYPE.greyscaleActive}
              </button>
            ) : null}
          </div>

          {/* No visible label: widthLabel names the group for assistive
              technology (prototypeAffordances.widthLabelUse). */}
          <div className="proto__group" role="group" aria-label={PROTOTYPE.widthLabel}>
            {PROTOTYPE.widths.map((preset) => (
              <button
                type="button"
                key={preset}
                className="proto__button"
                aria-pressed={state.frame === preset}
                onClick={() => onChange({ frame: preset })}
              >
                {preset}
              </button>
            ))}
            <button
              type="button"
              className="proto__button"
              aria-pressed={state.frame === null}
              onClick={() => onChange({ frame: null })}
            >
              {PROTOTYPE.fullWidthLabel}
            </button>
          </div>

          <div className="proto__end">
            <a
              ref={linkRef}
              className="proto__link"
              href={withPrototypeParams(indexRoute, window.location.search)}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(indexRoute);
              }}
            >
              {indexName}
              {/* The vendored arrow-right, drawn as a CSS mask in the link's own
                  colour: the bar uses no product component, the Icon included. */}
              <span className="proto__arrow" aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="stage" ref={stageRef} data-fixed={fixedWidth ? true : undefined}>
          {frame}
        </div>
      </div>
      {overlay}
    </FrameContext.Provider>
  );
}
