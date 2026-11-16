/**
 * navigation — the persistent left sidebar.
 *
 * A logo placeholder (a mark, no text), then navigation.items in order. Only
 * navigation.activeId is current; the rest are placeholders and are not
 * interactive, so they are plain text, not links or buttons — nothing in the
 * tab order leads nowhere. The current item is carried by aria-current, weight
 * and an indicator bar, never by colour alone.
 */
import { NAVIGATION } from '../spec/copy.ts';
import { Icon } from './Icon.tsx';

export function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar__inner">
      <span className="sidebar__logo" aria-hidden="true">
        <span className="sidebar__logo-mark" />
      </span>
      <nav className="sidebar__nav">
        <ul className="sidebar__list">
          {NAVIGATION.items.map((item) => {
            const current = item.id === NAVIGATION.activeId;
            return (
              <li key={item.id}>
                <span
                  className="sidebar__item"
                  data-current={current || undefined}
                  aria-current={current ? 'page' : undefined}
                >
                  <Icon name={item.id} size="md" />
                  <span className="sidebar__label">{item.label}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </nav>
      </div>
    </div>
  );
}
