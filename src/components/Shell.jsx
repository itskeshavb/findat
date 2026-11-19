import { useEffect, useRef, useState } from 'react';
import { integrations } from '../integrations.js';
import BrandIcon from './BrandIcon.jsx';

const navigation = [['home', '⌂', 'Home'], ['projects', '▦', 'Projects'], ['search', '⌕', 'Search'], ['people', '♧', 'People'], ['reviews', '◷', 'Updates']];

export default function Shell({ route, reviewCount, query, onSearch, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState(query);
  const input = useRef(null);
  useEffect(() => setSearch(query), [query]);
  useEffect(() => setMobileOpen(false), [route.page, route.projectId]);
  useEffect(() => {
    const shortcut = event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); input.current?.focus(); } };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}><a className="brand" href="#/" aria-label="Findat home"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>Findat</span></a>
      <nav className="side-nav" aria-label="Main navigation">{navigation.map(([page, symbol, label]) => <a key={page} className={route.page === page ? 'active' : ''} aria-current={route.page === page ? 'page' : undefined} href={page === 'home' ? '#/' : `#/${page}`}><span className="nav-icon" aria-hidden="true">{symbol}</span>{label}{page === 'reviews' && reviewCount > 0 && <span className="nav-count">{reviewCount}</span>}</a>)}</nav>
      <div className="nav-caption second-caption">INTEGRATIONS</div><nav className="side-nav integration-nav" aria-label="Integrations">{integrations.map(source => <a key={source.id} href={`#/sources/${source.id}`} className={route.page === 'sources' && route.sourceId === source.id ? 'active' : ''} aria-current={route.page === 'sources' && route.sourceId === source.id ? 'page' : undefined}><span className="integration-icon" aria-hidden="true"><BrandIcon id={source.id} /></span>{source.name}</a>)}</nav>
      <div className="sidebar-bottom"><div className="profile"><span className="profile-avatar">KB</span><span><strong>Local workspace</strong><small>Demo mode</small></span></div></div>
    </aside>
    <div className="main-area"><header className="topbar"><button className="mobile-menu" aria-expanded={mobileOpen} aria-label="Toggle navigation" onClick={() => setMobileOpen(open => !open)}>☰</button><form className="top-search" onSubmit={event => { event.preventDefault(); onSearch(search); }}><span className="top-search-icon" aria-hidden="true">⌕</span><input ref={input} value={search} onChange={event => setSearch(event.target.value)} aria-label="Search Findat" placeholder="Search for a project, document, dataset, or person..." /><kbd>⌘ K</kbd></form><div className="topbar-actions"><span className="local-indicator"><i /> Local MVP</span><span className="avatar-button" aria-label="Local workspace">KB</span></div></header>
      <main className={`content ${route.projectId ? 'project-content' : ''}`} id="main-content">{children}</main>
    </div>
  </div>;
}
