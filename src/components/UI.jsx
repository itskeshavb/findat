import { initials, relative, statusLabel, resourceSymbol, activityDescription } from '../lib.js';

export function Button({ children, variant = '', className = '', ...props }) {
  return <button type="button" className={`button ${variant} ${className}`} {...props}>{children}</button>;
}
export function Empty({ children }) { return <div className="empty"><div className="empty-symbol" aria-hidden="true">⌕</div>{children}</div>; }
export function Status({ status }) { return <span className={`status ${status}`}>{status === 'confirmed' ? '✓ ' : status === 'suggested' ? '◌ ' : '○ '}{statusLabel(status)}</span>; }
export function MapStatus({ status }) {
  return <span className={`map-status ${status === 'confirmed' ? 'okay' : status === 'suggested' ? 'review' : 'missing'}`}>{status === 'confirmed' ? 'Confirmed' : status === 'suggested' ? 'Needs review' : 'No owner'}</span>;
}
export function ProjectIcon({ project }) { return <span className={`project-icon ${project.color}`}>{initials(project.name)}</span>; }
export function Title({ eyebrow, title, subtitle, children }) { return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div><div className="head-actions">{children}</div></div>; }
export function Activity({ items }) {
  return <div className="panel">{items.length ? items.map(item => <div className="activity-row" key={item.id}><span className="activity-dot" /><p><strong>{item.detail}</strong> {activityDescription(item.action)}</p><small>{relative(item.created_at)}</small></div>) : <Empty>No updates yet.</Empty>}</div>;
}
export function ResourceTable({ items, projects, onOwner, onRemove, onSelect }) {
  return <div className="panel table-wrap"><table className="data-table"><thead><tr><th>Resource</th>{projects && <th>Project</th>}<th>Owner</th><th>Ownership</th><th>Last checked</th><th className="align-right">Actions</th></tr></thead><tbody>
    {!items.length && <tr><td colSpan={projects ? 6 : 5}><Empty>No resources in this view yet.</Empty></td></tr>}
    {items.map(item => <tr key={item.id}><td><div className="resource-cell"><span className={`resource-icon ${item.type}`}>{resourceSymbol(item.type)}</span><span><button className="resource-title resource-title-button" onClick={() => onSelect(item)}>{item.title}</button><small>{item.type} · {item.source}</small></span></div></td>
      {projects && <td><a href={`#/projects/${item.project_id}`} className="text-link">{projects.find(p => p.id === item.project_id)?.name}</a></td>}
      <td>{item.owner_name ? <span className="owner-cell"><span className="owner-avatar">{initials(item.owner_name)}</span>{item.owner_name}</span> : <span className="quiet">Unassigned</span>}</td><td><Status status={item.owner_status} /></td><td>{relative(item.last_checked_at)}</td><td><div className="inline-actions"><Button variant="ghost small" onClick={() => onOwner(item)}>Edit owner</Button><button className="more-btn" aria-label={`Remove ${item.title}`} onClick={() => onRemove(item)}>•••</button></div></td>
    </tr>)}
  </tbody></table></div>;
}
