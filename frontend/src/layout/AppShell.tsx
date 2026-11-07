import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon, Logo, type IconName } from '../components/Icon';
import { useI18n } from '../i18n/context';
import './AppShell.css';

export const PAGES = [
  { key: 'overview', path: '/', icon: 'overview' },
  { key: 'vehicle', path: '/vehicle', icon: 'vehicle' },
  { key: 'geography', path: '/geography', icon: 'geography' },
  { key: 'ask', path: '/ask', icon: 'ask' },
  { key: 'about', path: '/about', icon: 'about' },
] as const satisfies readonly { key: string; path: string; icon: IconName }[];

export type PageKey = (typeof PAGES)[number]['key'];

const COLLAPSED_KEY = 'autoinsights.sidebar.collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function pageForPath(pathname: string): PageKey {
  return PAGES.find((p) => p.path !== '/' && pathname.startsWith(p.path))?.key ?? 'overview';
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  const page = t.pages[pageForPath(location.pathname)];

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // not persisted
    }
  }, [collapsed]);

  useEffect(() => {
    document.title = `${page.title} – ${t.app.name}`;
  }, [page.title, t.app.name]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButton.current?.focus();
  }, []);

  // Drawer: focus the close button when it opens; Escape closes it.
  useEffect(() => {
    if (!drawerOpen) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && closeDrawer();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  const nav = (
    <ul className="nav-list">
      {PAGES.map((p) => (
        <li key={p.key}>
          <NavLink
            to={p.path}
            end={p.path === '/'}
            className="nav-link"
            title={collapsed ? t.pages[p.key].nav : undefined}
            onClick={() => setDrawerOpen(false)}
          >
            <Icon name={p.icon} size={21} />
            <span className="nav-label">{t.pages[p.key].nav}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="shell" data-collapsed={collapsed} data-drawer={drawerOpen}>
      <a className="skip-link" href="#content">
        {t.app.skip}
      </a>

      <aside className="sidebar" aria-label={t.app.nav}>
        <div className="sidebar-brand">
          <Logo />
          <span className="brand-name">{t.app.name}</span>
          <button ref={closeButton} type="button" className="icon-button drawer-close" onClick={closeDrawer} aria-label={t.app.closeMenu}>
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label={t.app.nav}>{nav}</nav>
        <div className="sidebar-foot">
          <p className="sidebar-tagline">{t.app.tagline}</p>
          <button
            type="button"
            className="collapse-button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t.app.expand : t.app.collapse}
            title={collapsed ? t.app.expand : t.app.collapse}
          >
            <Icon name="collapse" />
            <span className="nav-label">{t.app.collapse}</span>
          </button>
        </div>
      </aside>
      <div className="drawer-backdrop" onClick={closeDrawer} aria-hidden="true" />

      <div className="main-column">
        <header className="topbar">
          <button
            ref={menuButton}
            type="button"
            className="icon-button menu-button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t.app.openMenu}
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" />
          </button>
          <div className="topbar-title">
            <h1>{page.title}</h1>
            <p>{page.subtitle}</p>
          </div>
          <div className="lang-switch" role="group" aria-label={t.app.language}>
            {(['en', 'es'] as const).map((code) => (
              <button key={code} type="button" aria-pressed={lang === code} onClick={() => setLang(code)}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </header>
        <main id="content" className="content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
