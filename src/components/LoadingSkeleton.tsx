/**
 * states.loading — a skeleton mirroring the real layout: two day groups of
 * three rows, blocks sized to the real avatar, title, meta and amount. Group
 * headers are skeletons too. No spinner. The fixed count is deliberate: it is
 * never a guess at the real number. The blocks are light placeholders
 * (--skeleton-fill); a non-visual user hears the App's live region instead.
 */
const GROUPS = 2;
const ROWS_PER_GROUP = 3;

export function LoadingSkeleton() {
  return (
    // The announcement is App's persistent live region (states.loading.copy
    // .ariaLive); the blocks themselves are hidden from assistive technology.
    <div className="list list--skeleton" aria-busy="true" aria-hidden="true">
      {Array.from({ length: GROUPS }, (_, group) => (
        <section className="day" key={group}>
          <header className="day__header">
            <span className="skeleton skeleton--heading" />
            <span className="skeleton skeleton--total" />
          </header>
          <ul className="day__rows">
            {Array.from({ length: ROWS_PER_GROUP }, (_, row) => (
              <li className="row-item" key={row}>
                <div className="row row--skeleton">
                  <span className="skeleton skeleton--avatar" />
                  <span className="row__body">
                    <span className="skeleton skeleton--title" />
                    <span className="skeleton skeleton--meta" />
                  </span>
                  <span className="row__trailing">
                    <span className="skeleton skeleton--amount" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
