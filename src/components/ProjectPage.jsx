import { useState } from 'react';
import { ageDays, asDate, initials, relative, resourceSymbol } from '../lib.js';
import { Activity, Button, Empty, MapStatus, ResourceTable, Status } from './UI.jsx';

function MapGroup({ name, kind, items, symbol, selectedId, onSelect }) {
  return <section className={`map-group ${kind}`} aria-label={name}>
    <div className="map-group-head"><span>{symbol} &nbsp;{name}</span><small>{items.length}</small></div>
    <div className="map-group-list">{items.length ? items.slice(0, 5).map(item => <button type="button" key={item.key || item.id} className={`map-resource ${selectedId === item.id ? 'selected' : ''}`} onClick={() => onSelect(item.id)} aria-pressed={selectedId === item.id} title={item.title}>
      <span className={`map-resource-icon ${item.type}`} aria-hidden="true">{resourceSymbol(item.type)}</span><span className="map-resource-name">{item.title}</span><MapStatus status={item.owner_status} />
    </button>) : <div className="map-empty">No resources yet</div>}{items.length > 5 && <div className="map-more">+{items.length - 5} more in Resources</div>}</div>
  </section>;
}

export function ProjectMap({ project, resources, selectedId, onSelect }) {
  const owners = [...new Set(resources.map(item => item.owner_name).filter(Boolean))].map(name => {
    const owned = resources.filter(item => item.owner_name === name);
    const first = owned[0];
    return { id: first.id, key: name, title: name, type: 'Person', owner_status: owned.every(item => item.owner_status === 'confirmed') ? 'confirmed' : 'suggested' };
  });
  const groups = [
    ['Documents', 'documents', resources.filter(item => ['Document', 'Design'].includes(item.type)), '▤'],
    ['Owners', 'owners', owners, '♟'],
    ['Code', 'code', resources.filter(item => item.type === 'Repository'), '⌘'],
    ['Datasets', 'datasets', resources.filter(item => ['Dataset', 'Dashboard'].includes(item.type)), '▦'],
    ['Communication', 'communication', resources.filter(item => item.type === 'Conversation'), '◉'],
    ['Other links', 'other', resources.filter(item => item.type === 'Other'), '◆'],
  ];
  return <div className="map-stage"><svg className="map-lines" viewBox="0 0 1000 590" preserveAspectRatio="none" aria-hidden="true"><path className="line-doc" d="M500 295 C400 295 350 95 260 95" /><path className="line-code" d="M500 295 C395 295 360 295 260 295" /><path className="line-communication" d="M500 295 C400 295 350 490 260 490" /><path className="line-owner" d="M500 295 C600 295 650 95 740 95" /><path className="line-data" d="M500 295 C605 295 650 295 740 295" /><path className="line-other" d="M500 295 C600 295 650 490 740 490" /></svg>
    <div className="map-grid">{groups.map(([name, kind, items, symbol]) => <MapGroup key={kind} {...{ name, kind, items, symbol, selectedId, onSelect }} />)}
      <div className="map-center-card"><span className="center-cube" aria-hidden="true">◇</span><div><strong>{project.name}</strong><small><i /> Active project</small></div></div>
    </div>
  </div>;
}

export function ResourceInspector({ item, project, actions }) {
  const [reviewing, setReviewing] = useState(false);
  if (!item) return <aside className="resource-inspector"><div className="inspector-head"><h2>Resource Details</h2></div><div className="inspector-empty">Add a resource to see its details here.</div><Button variant="primary" onClick={() => actions.addResource(project.id)}>+ Add resource</Button></aside>;
  const review = async () => { setReviewing(true); try { await actions.review(item); } finally { setReviewing(false); } };
  return <aside className="resource-inspector" aria-label="Resource details">
    <div className="inspector-head"><h2>Resource Details</h2><button className="more-btn" aria-label={`Remove ${item.title}`} onClick={() => actions.removeResource(item)}>•••</button></div>
    <div className="inspector-resource"><span className={`inspector-icon ${item.type}`} aria-hidden="true">{resourceSymbol(item.type)}</span><div><strong>{item.title}</strong><MapStatus status={item.owner_status} /></div></div>
    <dl className="inspector-meta"><div><dt>Type</dt><dd>{item.type} ({item.source})</dd></div><div><dt>Source updated</dt><dd>{asDate(item.source_modified_at)?.toLocaleDateString() || 'Not available'}</dd></div><div><dt>Owner</dt><dd>{item.owner_name || 'Unassigned'}</dd></div></dl>
    <div className="inspector-section"><h3>Description</h3><p>{item.note || `A ${item.type.toLowerCase()} linked to ${project.name}.`}</p><a className="open-resource" href={item.url} target="_blank" rel="noopener noreferrer">Open resource ↗</a></div>
    <div className="inspector-section owner-section"><div className="inspector-section-title"><h3>Ownership</h3><Status status={item.owner_status} /></div><div className="inspector-owner"><span className="owner-avatar">{initials(item.owner_name)}</span><span><strong>{item.owner_name || 'No owner assigned'}</strong><small>{item.owner_status === 'confirmed' ? item.owner_confirmed_at ? `Confirmed ${relative(item.owner_confirmed_at).toLowerCase()}` : 'Confirmation date unavailable' : item.owner_status === 'suggested' ? 'Suggested contact' : 'Add a responsible person'}</small></span></div><Button variant="small" onClick={() => actions.editOwner(item)}>{item.owner_status === 'confirmed' ? 'Change owner' : 'Confirm owner'}</Button></div>
    <div className="inspector-section freshness-section"><h3>Freshness <span title="Review dates record checks in Findat; they do not inspect the linked content.">ⓘ</span></h3><div className="freshness-track"><i className={ageDays(item.last_checked_at) <= 30 ? 'fresh' : 'due'} /></div><p>{item.last_checked_at ? `Entry reviewed ${relative(item.last_checked_at).toLowerCase()}` : 'Entry has not been reviewed yet'}</p><button className="text-link" onClick={review} disabled={reviewing}>{reviewing ? 'Saving…' : 'Mark reviewed'}</button></div>
  </aside>;
}

export default function ProjectPage({ project, resources, activity, selectedId, onSelect, actions }) {
  const [tab, setTab] = useState('map');
  const selected = resources.find(item => item.id === selectedId) || resources[0];
  const owners = [...new Set(resources.map(item => item.owner_name).filter(Boolean))];
  return <div className="project-screen"><div className="project-main"><a className="reference-back" href="#/projects">← &nbsp;All Projects</a>
    <div className="reference-heading"><div><h1>{project.name}</h1><p>{project.description || 'A shared map of resources and the people responsible for them.'}</p></div><div className="reference-actions"><Button variant="small" onClick={() => actions.editProject(project)}>Edit</Button><Button variant="primary" onClick={() => actions.addResource(project.id)}>+ Add resource</Button></div></div>
    <div className="reference-tabs" aria-label="Project views">{[['map', 'Map'], ['resources', 'Resources'], ['owners', 'Owners'], ['activity', 'Updates']].map(([key, label]) => <button type="button" key={key} aria-pressed={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
    <div className="project-view">
      {tab === 'map' && <ProjectMap {...{ project, resources, onSelect }} selectedId={selected?.id} />}
      {tab === 'resources' && <ResourceTable items={resources} onOwner={actions.editOwner} onRemove={actions.removeResource} onSelect={item => onSelect(item.id)} />}
      {tab === 'owners' && <div className="owner-grid">{owners.length ? owners.map(name => { const owned = resources.filter(item => item.owner_name === name); return <button key={name} className="person-card" onClick={() => onSelect(owned[0].id)}><span className="person-avatar">{initials(name)}</span><span><strong>{name}</strong><small>{owned.length} resource{owned.length === 1 ? '' : 's'} in this project</small></span><span className="person-arrow">→</span></button>; }) : <Empty>No owners yet. Add one to a resource.</Empty>}</div>}
      {tab === 'activity' && <Activity items={activity} />}
    </div></div><ResourceInspector item={selected} project={project} actions={actions} /></div>;
}
