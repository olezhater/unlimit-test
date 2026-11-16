/**
 * The shell and the router.
 *
 * No router library: the pathname and query string are read directly, popstate
 * is listened to, and navigation pushes state. Two shapes — /states for the
 * index, and / with query parameters for every other state in the spec.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { byId, spec, stateById } from './spec/spec.ts';
import { PAGE_TITLE } from './spec/copy.ts';
import {
  type Query,
  clearedFilters,
  hasFilters,
  isIndexPath,
  parseQuery,
  serializeQuery,
  withPrototypeParams,
} from './lib/url.ts';
import { applyFilters, groupByDay, scopedTotal } from './lib/data.ts';
import { TransactionList } from './components/TransactionList.tsx';
import { DetailsPanel, type PanelMode } from './components/DetailsPanel.tsx';
import { FilterBar } from './components/FilterBar.tsx';
import { FilterChips } from './components/FilterChips.tsx';
import { BlockState } from './components/BlockState.tsx';
import { LoadingSkeleton } from './components/LoadingSkeleton.tsx';
import { StatesIndex } from './components/StatesIndex.tsx';
import { PrototypeShell } from './components/PrototypeChrome.tsx';
import { useFrameWidth } from './lib/frame.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { AccountScope } from './components/AccountScope.tsx';
import { DownloadStatement } from './components/DownloadStatement.tsx';
import { Icon } from './components/Icon.tsx';

/** states.loading.behaviour — the skeleton holds for a minimum of 300ms. */
const SKELETON_MIN_MS = 300;

const emptyCopy = stateById.get('empty')?.copy ?? {};
const noResultsCopy = stateById.get('filters_no_results')?.copy ?? {};
const errorCopy = stateById.get('error')?.copy ?? {};
const listState = stateById.get('list') as { defaultSelection?: { rule: string } } | undefined;

/** meta.layout.panelBreakpoint — measured on the frame (breakpointSource). */
const PANEL_BREAKPOINT = spec.meta.layout.panelBreakpoint;

function useLocation() {
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
  }));

  useEffect(() => {
    const onPopState = () => {
      setLocation({ pathname: window.location.pathname, search: window.location.search });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const go = useCallback((route: string, mode: 'push' | 'replace', carry: boolean) => {
    // Product navigation carries the prototype parameters along; a prototype
    // control sets them itself and must be able to clear one.
    const target = carry ? withPrototypeParams(route, window.location.search) : route;
    if (mode === 'push') window.history.pushState({}, '', target);
    else window.history.replaceState({}, '', target);
    const url = new URL(target, window.location.origin);
    setLocation({ pathname: url.pathname, search: url.search });
  }, []);

  const navigate = useCallback((route: string) => go(route, 'push', true), [go]);
  const replace = useCallback((route: string) => go(route, 'replace', true), [go]);
  const replaceExact = useCallback((route: string) => go(route, 'replace', false), [go]);

  return { ...location, navigate, replace, replaceExact };
}

export default function App() {
  const { pathname, search, navigate, replace, replaceExact } = useLocation();
  const query = useMemo(() => parseQuery(search), [search]);

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  /* Prototype controls change the frame, not the product state: they edit only
     their own parameters, in place, and add no history entry. */
  const onPrototypeChange = useCallback(
    (next: Partial<Pick<Query, 'frame' | 'grey'>>) => {
      const url = new URL(window.location.href);
      const merged = { ...parseQuery(url.search), ...next };
      if (merged.frame) url.searchParams.set('frame', String(merged.frame));
      else url.searchParams.delete('frame');
      if (merged.grey) url.searchParams.set('grey', '1');
      else url.searchParams.delete('grey');
      replaceExact(`${url.pathname}${url.search}`);
    },
    [replaceExact],
  );

  return (
    <PrototypeShell
      state={{ chrome: query.chrome, frame: query.frame, grey: query.grey }}
      onChange={onPrototypeChange}
      onNavigate={navigate}
      hideBar={isIndexPath(pathname)}
    >
      {isIndexPath(pathname) ? (
        <StatesIndex
          onNavigate={navigate}
          grey={query.grey}
          onGreyChange={(grey) => onPrototypeChange({ grey })}
          chromeOff={query.chrome === 'off'}
        />
      ) : (
        <HistoryPage query={query} navigate={navigate} replace={replace} />
      )}
    </PrototypeShell>
  );
}

function HistoryPage({
  query,
  navigate,
  replace,
}: {
  query: Query;
  navigate: (route: string) => void;
  replace: (route: string) => void;
}) {
  /** First load shows the skeleton; filter changes update in place. */
  const [booting, setBooting] = useState(true);
  /** states.error — after a second consecutive failure the copy changes. */
  const [failures, setFailures] = useState(1);
  const [retrying, setRetrying] = useState(false);
  const lastOpenedRef = useRef<string | null>(null);
  const prevModeRef = useRef<PanelMode | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const appbarRef = useRef<HTMLElement>(null);
  const [pinned, setPinned] = useState(false);
  const frameWidth = useFrameWidth();
  const mode: PanelMode = frameWidth >= PANEL_BREAKPOINT ? 'column' : 'drawer';

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), SKELETON_MIN_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const setQuery = useCallback((next: Query) => navigate(serializeQuery(next)), [navigate]);

  /** defaultSelection.focus — selection by click or Enter leaves focus on the row. */
  const focusRow = (id: string) => {
    const row = document.getElementById(`row-${id}`);
    if (!row) return;
    row.focus({ preventScroll: true });
    if (document.activeElement !== row) {
      window.requestAnimationFrame(() => row.focus({ preventScroll: true }));
      window.setTimeout(() => row.focus({ preventScroll: true }), 0);
    }
  };

  // Search reads notes as they stand when the query changes (search.scope). A
  // note edit does not re-filter on its own, so typing in the open
  // transaction's note never filters that transaction out from under the
  // cursor (states.details.noteRule: editing a note changes no other field).
  const rows = useMemo(() => applyFilters(query), [query]);
  const groups = useMemo(
    () => groupByDay(rows, { scope: query.scope, currencies: query.currency }),
    [rows, query.scope, query.currency],
  );
  const visibleIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const newest = groups[0]?.rows[0];

  const isEmptyState = query.state === 'empty';
  const isLoadingState = query.state === 'loading' || booting || retrying;
  const isErrorState = query.state === 'error' && !retrying;
  const isNoResults = !isEmptyState && !isErrorState && !isLoadingState && rows.length === 0;
  const listVisible = !isLoadingState && !isErrorState && !isEmptyState && !isNoResults;

  /* feeModel: a child fee lives inside its parent and is never shown on its
     own. ?tx= naming one resolves to the parent payment. */
  const requested = query.tx ? byId.get(query.tx) : undefined;
  const selected = requested?.parentId ? byId.get(requested.parentId) : requested;
  /** The selection counts only while its row is in the visible set. */
  const selectedVisible = selected && visibleIds.has(selected.id) ? selected : undefined;

  /**
   * What the panel shows. defaultSelection.wide: at 1440+ the column always
   * holds a transaction — the visible selection, else the newest remaining.
   * The effect below brings the URL in line; rendering it here as well means
   * no frame of an empty or stale panel in between.
   * defaultSelection.narrow: the drawer shows the visible selection or nothing.
   */
  const shown = listVisible
    ? (selectedVisible ?? (mode === 'column' ? newest : undefined))
    : undefined;

  const openTx = useCallback(
    (id: string) => {
      lastOpenedRef.current = id;
      setQuery({ ...query, tx: id });
      // Chromium focuses a clicked button; Safari does not. Make it explicit.
      // In drawer mode the drawer takes focus itself.
      if (mode === 'column') focusRow(id);
    },
    [query, setQuery, mode],
  );

  /** The drawer's close control, Escape and the scrim. Drawer mode only. */
  const closeTx = useCallback(() => {
    // A transaction opened from the URL has no click behind it; its own row is
    // still where focus returns.
    lastOpenedRef.current ??= selected?.id ?? null;
    setQuery({ ...query, tx: null });
  }, [query, setQuery, selected]);

  /**
   * Drawer closes return focus to the originating row. The row is already
   * mounted, so it is focused synchronously; requestAnimationFrame is only a
   * fallback, because it does not fire in a hidden or backgrounded tab.
   */
  useEffect(() => {
    if (query.tx) return;
    const id = lastOpenedRef.current;
    if (!id) return;
    lastOpenedRef.current = null;
    const target = document.getElementById(`row-${id}`);
    if (!target) return;
    target.focus();
    if (document.activeElement === target) return;
    window.requestAnimationFrame(() => target.focus());
    window.setTimeout(() => target.focus(), 0);
  }, [query.tx]);

  /**
   * The selection invariant — a selection never survives its row.
   *   child fee in the URL                         → its parent
   *   nothing visible (empty, no-results, error)   → no selection at all
   *   wide, selection not visible                  → the newest remaining, focus untouched
   *   narrow, selection not visible                → the drawer closes
   * Loading is left alone, so a deep link survives the boot skeleton.
   */
  useEffect(() => {
    if (requested?.parentId && selected) {
      replace(serializeQuery({ ...query, tx: selected.id }));
      return;
    }
    if (isLoadingState) return;
    if (!listVisible) {
      if (query.tx) {
        lastOpenedRef.current = null;
        replace(serializeQuery({ ...query, tx: null }));
      }
      return;
    }
    if (selectedVisible) return;
    if (mode === 'column') {
      if (!newest || listState?.defaultSelection?.rule !== 'newest') return;
      replace(serializeQuery({ ...query, tx: newest.id }));
    } else if (query.tx) {
      lastOpenedRef.current = null;
      replace(serializeQuery({ ...query, tx: null }));
    }
  }, [requested, selected, selectedVisible, isLoadingState, listVisible, mode, newest, query, replace]);

  /**
   * Crossing the breakpoint after load.
   *   into drawer: defaultSelection.narrow opens details "on click only", so
   *     whatever the column showed is dismissed rather than popping a modal.
   *   into column: the drawer and the focus inside it unmount; the row it was
   *     opened from takes focus back.
   */
  useEffect(() => {
    if (booting) return;
    const previous = prevModeRef.current;
    prevModeRef.current = mode;
    if (previous === null || previous === mode) return;
    if (mode === 'drawer' && query.tx) {
      lastOpenedRef.current = null;
      replace(serializeQuery({ ...query, tx: null }));
    } else if (mode === 'column' && query.tx) {
      if (!document.activeElement || document.activeElement === document.body) focusRow(query.tx);
    }
  }, [mode, booting, query, replace]);

  /**
   * listBehaviour.stickyBar — the day headers stick beneath the bar, whose
   * height changes as chips wrap. Measure it and publish the height so the
   * headers and the scroll padding both track it.
   */
  useLayoutEffect(() => {
    const root = document.documentElement;
    const bar = barRef.current;
    if (!bar) {
      root.style.setProperty('--listbar-height', '0px');
      return;
    }
    const publish = () => {
      root.style.setProperty('--listbar-height', `${Math.ceil(bar.getBoundingClientRect().height)}px`);
      // Where the columns begin in the scroll container. The sticky panel is
      // sized from it so that on load, before anything is stuck, its bottom
      // edge — and the actions above it — still sit inside the viewport.
      const columns = document.querySelector('.columns');
      const stage = document.querySelector('.stage');
      if (columns) {
        const originTop = stage ? stage.getBoundingClientRect().top : 0;
        const scrolled = stage ? stage.scrollTop : window.scrollY;
        const offset = columns.getBoundingClientRect().top - originTop + scrolled;
        root.style.setProperty('--panel-offset', `${Math.ceil(offset)}px`);
      }
      // The day header is part of the sticky stack too; measured, not guessed.
      const header = document.querySelector('.day__header');
      if (header) {
        root.style.setProperty('--dayheader-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
      }
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    // Observe the live header too: during the boot the first header is the
    // skeleton's, which is shorter, and the real one mounts afterwards.
    const header = document.querySelector('.day__header');
    if (header) observer.observe(header);
    window.addEventListener('resize', publish);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', publish);
    };
  }, [isEmptyState, listVisible, mode]);

  /**
   * listBehaviour.headingCollapse — the heading is pinned once its box starts
   * to leave the scroll container's edge (the stage with the prototype bar
   * shown, the window under ?chrome=off). Only a data attribute and the row's
   * offset change; the box keeps its height, so nothing reflows.
   */
  useLayoutEffect(() => {
    const header = appbarRef.current;
    if (!header) return;
    const stage = document.querySelector('.stage');
    const check = () => {
      const origin = stage ? stage.getBoundingClientRect().top : 0;
      const stickyTop = parseFloat(getComputedStyle(header).top) || 0;
      const top = header.getBoundingClientRect().top - origin;
      // The row slides down by as much as the box has passed the scroll edge,
      // never more than the sticky offset: the heading never goes above it.
      const shift = Math.min(Math.max(-top, 0), -stickyTop);
      header.style.setProperty('--appbar-shift', `${shift}px`);
      // Pinned as soon as the box starts to leave the edge, so the resting
      // heading is never what gets cut off.
      setPinned(top < -0.5);
    };
    check();
    const target: EventTarget = stage ?? window;
    target.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      target.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  const retry = () => {
    setRetrying(true);
    window.setTimeout(() => {
      setRetrying(false);
      setFailures((n) => n + 1);
    }, SKELETON_MIN_MS);
  };

  /**
   * The one account value (accountScope.oneValue): the dropdown beside the
   * title and the drawer's Account field read and write it alike.
   */
  const setScope = (scope: string | null) => {
    if (scope === query.scope) return;
    setQuery({ ...query, scope });
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="app">
      <header className="appbar" ref={appbarRef} data-pinned={pinned || undefined}>
        {/* accountScope.placement — the account dropdown reads as part of the
            heading. It stays rendered in every state, error included. */}
        <div className="appbar__heading">
          <h1 className="appbar__title">{PAGE_TITLE}</h1>
          <AccountScope value={query.scope} onChange={setScope} />
        </div>
        <DownloadStatement />
      </header>

      {/* defaultSelection.noResults — with nothing visible the panel column
          collapses and the list takes the full width. */}
      <div className="columns" data-mode={mode} data-panel={shown ? undefined : 'none'}>
        <main className="main">
          {/* listBehaviour.stickyBar — search, filters and chips pinned at the
              top of the list region. states.empty hides it, not disables it. */}
          {!isEmptyState ? (
            <div className="listbar" ref={barRef} data-filtered={hasFilters(query) || undefined}>
              <FilterBar query={query} onChange={setQuery} />
              <FilterChips
                query={query}
                shown={rows.length}
                total={scopedTotal(query.scope)}
                onChange={setQuery}
              />
            </div>
          ) : null}

          {isLoadingState ? <LoadingSkeleton /> : null}

          {!isLoadingState && isErrorState ? (
            <BlockState
              id="error"
              headline={errorCopy.headline}
              body={failures > 1 ? errorCopy.bodyAfterSecondFailure : errorCopy.body}
              primaryAction={errorCopy.primaryAction}
              secondaryAction={failures > 1 ? errorCopy.secondaryActionAfterSecondFailure : null}
              onPrimary={retry}
            />
          ) : null}

          {!isLoadingState && isEmptyState ? (
            <BlockState
              id="empty"
              headline={emptyCopy.headline}
              body={emptyCopy.body}
              primaryAction={emptyCopy.primaryAction}
              illustration={<Icon name="inbox" size="lg" />}
            />
          ) : null}

          {!isLoadingState && isNoResults ? (
            <BlockState
              id="filters_no_results"
              headline={noResultsCopy.headline}
              body={noResultsCopy.body}
              primaryAction={noResultsCopy.primaryAction}
              onPrimary={() => setQuery(clearedFilters(query))}
            />
          ) : null}

          {listVisible ? (
            <TransactionList groups={groups} selectedId={shown?.id ?? null} onOpen={openTx} />
          ) : null}
        </main>

        {/* meta.layout.panelModes. Persistent: the column always holds a
            transaction while anything is visible, so selecting or swapping
            changes no column width. Drawer: no column; the panel
            overlays the content, and only on click. */}
        {shown ? <DetailsPanel tx={shown} mode={mode} onClose={closeTx} /> : null}
      </div>
      </div>
    </div>
  );
}
