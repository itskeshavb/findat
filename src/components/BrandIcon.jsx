import { siGithub, siJira, siNotion, siConfluence, siSnowflake } from 'simple-icons';

const monochrome = { github: siGithub, jira: siJira, notion: siNotion, confluence: siConfluence, snowflake: siSnowflake };

export default function BrandIcon({ id, className = '' }) {
  if (id === 'drive') return <svg className={`brand-icon ${className}`} viewBox="0 0 48 48" aria-hidden="true"><path fill="#00875A" d="M16.7 5h10l16.3 28.2-5 8.7-16.3-28.3z"/><path fill="#2684FC" d="M9.9 33.2H43l-5 8.7H4.9z"/><path fill="#FFBA00" d="M16.7 5h10L10 33.2l-5.1 8.7L0 33.2z"/></svg>;
  if (id === 'slack') return <svg className={`brand-icon ${className}`} viewBox="0 0 36 36" aria-hidden="true"><rect x="14" y="1" width="7" height="15" rx="3.5" fill="#36C5F0"/><circle cx="10.5" cy="12.5" r="3.5" fill="#36C5F0"/><rect x="20" y="14" width="15" height="7" rx="3.5" fill="#2EB67D"/><circle cx="23.5" cy="10.5" r="3.5" fill="#2EB67D"/><rect x="14" y="20" width="7" height="15" rx="3.5" fill="#E01E5A"/><circle cx="25.5" cy="23.5" r="3.5" fill="#E01E5A"/><rect x="1" y="14" width="15" height="7" rx="3.5" fill="#ECB22E"/><circle cx="12.5" cy="25.5" r="3.5" fill="#ECB22E"/></svg>;
  if (id === 'figma') return <svg className={`brand-icon ${className}`} viewBox="0 0 24 36" aria-hidden="true"><path fill="#F24E1E" d="M6 0h6v12H6A6 6 0 0 1 6 0"/><path fill="#FF7262" d="M12 0h6a6 6 0 0 1 0 12h-6z"/><path fill="#A259FF" d="M6 12h6v12H6a6 6 0 0 1 0-12"/><circle fill="#1ABCFE" cx="18" cy="18" r="6"/><path fill="#0ACF83" d="M6 24h6v6a6 6 0 1 1-6-6"/></svg>;
  const icon = monochrome[id];
  return icon ? <svg className={`brand-icon brand-icon-${id} ${className}`} viewBox="0 0 24 24" aria-hidden="true"><path d={icon.path} /></svg> : null;
}
