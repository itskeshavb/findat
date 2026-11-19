import { useState } from 'react';
import { initials, relative, needsReview, resourceSymbol } from '../lib.js';
import { Activity, Button, Empty, MapStatus, ProjectIcon, Title } from './UI.jsx';
import { integrations, integrationById, resourceIntegration } from '../integrations.js';
import BrandIcon from './BrandIcon.jsx';

function Metrics({ projects, resources }) {
  const entries = [['Projects', projects.length, 'Active maps', '▤'], ['Resources', resources.length, 'Across all projects', '▦'], ['Confirmed owners', resources.filter(needs => needs.owner_status === 'confirmed').length, 'Human verified', '✓'], ['Needs review', resources.filter(needsReview).length, 'Owners or review dates', '◷']];
  return <div className="metric-grid">{entries.map(([name, count, note, symbol]) => <div className="metric-card" key={name}><div className="metric-label">{name}<span>{symbol}</span></div><div className="metric-value">{count}</div><div className="metric-note">{note}</div></div>)}</div>;
}

function ProjectCard({ project, resources }) {
  const items = resources.filter(item => item.project_id === project.id);
  return <a className="project-card" href={`#/projects/${project.id}`}><div className="project-card-top"><ProjectIcon project={project} /><span className="tag">{items.length} resource{items.length === 1 ? '' : 's'}</span></div><h3>{project.name}</h3><p>{project.description || 'Add context to help your team understand this project.'}</p><div className="project-card-bottom"><span>{items.filter(item => item.owner_status === 'confirmed').length} confirmed owners</span><span>Open map →</span></div></a>;
}

export function HomePage({ data, actions }) {
  const { projects, resources, activity } = data;
  return <><Title eyebrow="YOUR WORKSPACE" title="Project intelligence, in one place." subtitle="Find the work, the context, and the people behind it."><Button variant="primary" onClick={actions.addProject}>+ New project</Button></Title>
    <div className="hero"><div><div className="hero-label">PROJECT CLARITY, AT A GLANCE</div><h2>Know where the work lives.</h2><p>Bring scattered links and responsible people into a shared map your team can keep current.</p></div><a className="button hero-action" href="#/projects">Explore projects →</a></div>
    <Metrics {...{ projects, resources }} />
    <div className="two-col"><section className="panel"><div className="panel-head"><h2>Recent projects</h2><a className="text-link" href="#/projects">View all →</a></div>{projects.length ? projects.slice(0, 4).map(project => <a className="project-list-row" href={`#/projects/${project.id}`} key={project.id}><ProjectIcon project={project} /><span><strong>{project.name}</strong><small>{resources.filter(item => item.project_id === project.id).length} resources · Updated {relative(project.updated_at)}</small></span><span className="row-arrow">→</span></a>) : <Empty>Create a project to begin.</Empty>}</section><section><div className="section-heading section-heading-first"><h2 className="section-title">Recent activity</h2></div><Activity items={activity.slice(0, 5)} /></section></div>
    <div className="section-heading"><h2 className="section-title">Your project maps</h2><a className="text-link" href="#/projects">Browse all projects →</a></div><div className="project-grid">{projects.slice(0, 3).map(project => <ProjectCard key={project.id} {...{ project, resources }} />)}</div>
  </>;
}

export function ProjectsPage({ data, actions }) {
  return <><Title eyebrow="PROJECT DIRECTORY" title="Projects" subtitle="A shared home for the work, links, and people behind every project."><Button variant="primary" onClick={actions.addProject}>+ New project</Button></Title><Metrics projects={data.projects} resources={data.resources} /><div className="section-heading"><h2 className="section-title">All projects</h2><span className="quiet small-text">{data.projects.length} total</span></div><div className="project-grid">{data.projects.length ? data.projects.map(project => <ProjectCard key={project.id} project={project} resources={data.resources} />) : <Empty>No projects yet. Create one to get started.</Empty>}</div></>;
}

export function SearchPage({ data, query, onQuery, onOpenResource }) {
  const [type, setType] = useState('All types');
  const [projectId, setProjectId] = useState('All projects');
  const q = query.trim().toLowerCase();
  const items = data.resources.filter(item => {
    const project = data.projects.find(p => p.id === item.project_id);
    return (!q || [item.title, item.owner_name, item.type, item.source, item.note, project?.name].some(value => String(value || '').toLowerCase().includes(q))) && (type === 'All types' || item.type === type) && (projectId === 'All projects' || String(item.project_id) === projectId);
  });
  return <div className="search-page"><Title eyebrow="SEARCH FINDAT" title="Find what you need" subtitle="Search across project resources and the people responsible for them." />
    <div className="toolbar reference-toolbar"><div className="search-box"><input aria-label="Search resources" placeholder="Search resources, owners, projects..." value={query} onChange={event => onQuery(event.target.value)} /></div><select className="filter-select" aria-label="Filter by type" value={type} onChange={event => setType(event.target.value)}>{['All types', ...new Set(data.resources.map(item => item.type))].map(option => <option key={option}>{option}</option>)}</select><select className="filter-select" aria-label="Filter by project" value={projectId} onChange={event => setProjectId(event.target.value)}><option>All projects</option>{data.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
    <div className="search-result-head" role="status">{items.length} result{items.length === 1 ? '' : 's'}</div><div className="search-results">{items.length ? items.map(item => {
      const project = data.projects.find(p => p.id === item.project_id);
      return <article className="search-result-card" key={item.id}><div className="search-result-main"><span className={`search-result-icon ${item.type}`} aria-hidden="true">{resourceSymbol(item.type)}</span><div><div className="search-result-title"><button onClick={() => onOpenResource(item)}>{item.title}</button><MapStatus status={item.owner_status} /></div><p>{project?.name} › {item.type} · {item.source}</p><div className="search-result-description">{item.note || 'Open the project map to see this resource and its owner.'}</div></div></div><div className="search-result-meta"><div><span>Owner</span><strong>{item.owner_name ? <><span className="owner-avatar">{initials(item.owner_name)}</span> {item.owner_name}</> : 'Unassigned'}</strong><Button variant="small" onClick={() => onOpenResource(item)}>View</Button></div><div><span>Project</span><strong>{project?.name}</strong></div><div><span>Last checked</span><strong>{relative(item.last_checked_at)}</strong></div></div></article>;
    }) : <Empty>No matching resources. Try a different search or add a link.</Empty>}</div>
  </div>;
}

export function PeoplePage({ data, onOpenResource }) {
  const names = [...new Set(data.resources.map(item => item.owner_name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return <><Title eyebrow="PEOPLE" title="Find the right person" subtitle="See who is associated with each project resource." /><div className="owner-grid people-grid">{names.length ? names.map(name => {
    const matches = data.resources.filter(item => item.owner_name === name);
    const projects = [...new Set(matches.map(item => data.projects.find(p => p.id === item.project_id)?.name).filter(Boolean))];
    return <button className="person-card" key={name} onClick={() => onOpenResource(matches[0])}><span className="person-avatar">{initials(name)}</span><span><strong>{name}</strong><small>{projects.join(', ')} · {matches.length} resource{matches.length === 1 ? '' : 's'}</small></span><span className="person-arrow">→</span></button>;
  }) : <Empty>No people yet. Confirm an owner to add them here.</Empty>}</div></>;
}

function ReviewItem({ item, project, actions }) {
  const [busy, setBusy] = useState(false);
  const review = async () => { setBusy(true); try { await actions.review(item); } finally { setBusy(false); } };
  return <div className="review-item"><span className={`resource-icon ${item.type}`}>{resourceSymbol(item.type)}</span><div><strong>{item.title}</strong><p>{project?.name} · {item.owner_status === 'unknown' ? 'No owner assigned' : item.owner_status === 'suggested' ? `Suggested owner: ${item.owner_name}` : 'Review is due'}</p></div><Button variant="small" disabled={busy} onClick={item.owner_status === 'confirmed' ? review : () => actions.editOwner(item)}>{busy ? 'Saving…' : item.owner_status === 'confirmed' ? 'Mark reviewed' : 'Confirm owner'}</Button></div>;
}

export function ReviewsPage({ data, actions }) {
  const items = data.resources.filter(needsReview);
  return <><Title eyebrow="KEEP IT CURRENT" title="Review inbox" subtitle="Resolve unclear owners and confirm that important links still make sense." /><div className="notice">Owner suggestions need a person to confirm them. “Last checked” records a review in Findat; it does not verify the linked contents.</div><div className="panel"><div className="panel-head"><h2>{items.length} item{items.length === 1 ? '' : 's'} to review</h2></div>{items.length ? items.map(item => <ReviewItem key={item.id} item={item} project={data.projects.find(p => p.id === item.project_id)} actions={actions} />) : <Empty>You are all caught up.</Empty>}</div></>;
}

export function SourcesPage({ data, actions, sourceId, onOpenResource }) {
  const source = integrationById(sourceId);
  if (sourceId && !source) return <><Title title="Integration not found" subtitle="Choose an integration from the sidebar." /><a className="button" href="#/sources">All integrations</a></>;
  if (!source) return <><Title eyebrow="CONNECT YOUR WORK" title="Integrations" subtitle="Find saved links from the tools your team uses." />
    <div className="notice">GitHub supports public repository import. Other tools use links you save to a project; account connections and automatic sync are not set up in this local MVP.</div>
    <div className="source-grid">{integrations.map(item => { const count = data.resources.filter(resource => resourceIntegration(resource) === item.id).length; return <a className="source-card source-card-link" key={item.id} href={`#/sources/${item.id}`}><div className="source-card-top"><span className={`source-logo ${item.id}`}><BrandIcon id={item.id} /></span><div><h3>{item.name}</h3><span className="tag">{count} saved link{count === 1 ? '' : 's'}</span></div></div><p>{item.description}</p><span className="source-card-open">View {item.name} links →</span></a>; })}</div></>;
  const items = data.resources.filter(resource => resourceIntegration(resource) === source.id);
  const add = source.id === 'github' ? actions.importGithub : () => actions.addResource(undefined, source.id);
  return <><a className="reference-back" href="#/sources">← &nbsp;All integrations</a>
    <div className="integration-page-head"><span className={`source-logo ${source.id}`}><BrandIcon id={source.id} /></span><Title eyebrow="INTEGRATION" title={source.name} subtitle={source.description}><Button variant="primary" onClick={add}>{source.id === 'github' ? 'Import repository' : `+ Add ${source.name} link`}</Button></Title></div>
    <div className="notice">{source.id === 'github' ? 'Import public repository details from GitHub. Private repository access is not set up.' : `Save a ${source.name} URL to a project to find it here. Automatic account sync is not set up.`}</div>
    <div className="section-heading"><h2 className="section-title">Saved {source.name} links</h2><span className="quiet small-text">{items.length} total</span></div>
    <div className="integration-resource-list">{items.length ? items.map(item => <button key={item.id} className="integration-resource-row" onClick={() => onOpenResource(item)}><span className={`source-logo ${source.id}`}><BrandIcon id={source.id} /></span><span><strong>{item.title}</strong><small>{data.projects.find(project => project.id === item.project_id)?.name || 'Project'} · {item.type} · {item.owner_name || 'Owner unassigned'}</small></span><span className="row-arrow">→</span></button>) : <Empty>No {source.name} links saved yet. Use the button above to add one.</Empty>}</div>
    <a className="text-link integration-external" href={source.home} target="_blank" rel="noopener noreferrer">Open {source.name} ↗</a>
  </>;
}
