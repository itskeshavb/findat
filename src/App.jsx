import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getRoute, needsReview } from './lib.js';
import Shell from './components/Shell.jsx';
import ProjectPage from './components/ProjectPage.jsx';
import { HomePage, ProjectsPage, SearchPage, PeoplePage, ReviewsPage, SourcesPage } from './components/Pages.jsx';
import EditorDialog from './components/EditorDialog.jsx';
import { Button, Empty, Title } from './components/UI.jsx';

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [route, setRoute] = useState(getRoute);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const notify = useCallback((message, isError = false) => {
    clearTimeout(toastTimer.current);
    setToast({ message, isError });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  const reload = useCallback(async () => {
    const next = await api('GET', '/api/snapshot');
    setData(next); setError('');
    return next;
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api('GET', '/api/snapshot', undefined, controller.signal).then(next => {
      setData(next);
      if (!window.location.hash && next.projects.length) window.location.hash = `#/projects/${next.projects[0].id}`;
    }).catch(err => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const navigate = () => { setRoute(getRoute()); setModal(null); };
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const project = data?.projects.find(item => item.id === route.projectId);
  useEffect(() => {
    const labels = { home: 'Home', projects: 'Projects', search: 'Search', people: 'People', reviews: 'Updates', sources: 'Integrations' };
    document.title = `${project?.name || labels[route.page] || 'Findat'} · Findat`;
  }, [route.page, project?.name]);

  const addResource = (projectId, sourceId) => data.projects.length ? setModal({ type: 'resource', projectId, sourceId }) : notify('Create a project first.', true);
  const openResource = item => { setSelectedId(item.id); window.location.hash = `#/projects/${item.project_id}`; };
  const actions = {
    addProject: () => setModal({ type: 'project' }),
    editProject: item => setModal({ type: 'project', item }),
    addResource,
    editOwner: item => setModal({ type: 'owner', item }),
    removeResource: item => setModal({ type: 'remove', item }),
    importGithub: () => data.projects.length ? setModal({ type: 'github' }) : notify('Create a project first.', true),
    review: async item => {
      try { await api('POST', `/api/resources/${item.id}/review`); await reload(); notify('Resource marked reviewed.'); }
      catch (err) { notify(err.message, true); }
    },
  };
  const save = async values => {
    let result, message, destination;
    switch (modal.type) {
      case 'project':
        result = await api(modal.item ? 'PATCH' : 'POST', modal.item ? `/api/projects/${modal.item.id}` : '/api/projects', values);
        message = modal.item ? 'Project updated.' : 'Project created.';
        if (!modal.item) destination = `#/projects/${result.id}`;
        break;
      case 'resource':
        result = await api('POST', '/api/resources', values);
        setSelectedId(result.id); destination = `#/projects/${values.projectId}`; message = 'Resource added.';
        break;
      case 'owner':
        await api('PATCH', `/api/resources/${modal.item.id}/owner`, values);
        message = values.owner.trim() ? 'Owner confirmed.' : 'Owner cleared.';
        break;
      case 'github':
        result = await api('POST', '/api/import/github', values);
        setSelectedId(result.id); destination = `#/projects/${result.existingProjectId || values.projectId}`;
        message = result.updated ? 'Repository metadata refreshed.' : 'Repository imported. Review the suggested owner.';
        break;
      case 'remove':
        await api('DELETE', `/api/resources/${modal.item.id}`);
        message = 'Resource removed.';
        break;
      default: throw new Error('Unknown action.');
    }
    setModal(null); notify(message);
    try { await reload(); if (destination) window.location.hash = destination; }
    catch { notify('Saved, but the workspace could not refresh. Reload the page to see the update.', true); }
  };

  let page;
  if (!data) page = error ? <div className="loading" role="alert"><p>{error}</p><Button onClick={() => reload().catch(err => setError(err.message))}>Try again</Button></div> : <div className="loading" role="status">Loading your workspace…</div>;
  else if (route.page === 'projects' && route.projectId) page = project ? <ProjectPage key={project.id} project={project} resources={data.resources.filter(item => item.project_id === project.id)} activity={data.activity.filter(item => item.project_id === project.id)} selectedId={selectedId} onSelect={setSelectedId} actions={actions} /> : <><Title title="Project not found" subtitle="This project may have been removed." /><a className="button" href="#/projects">All projects</a></>;
  else if (route.page === 'projects') page = <ProjectsPage data={data} actions={actions} />;
  else if (route.page === 'search') page = <SearchPage data={data} query={query} onQuery={setQuery} onOpenResource={openResource} />;
  else if (route.page === 'people') page = <PeoplePage data={data} onOpenResource={openResource} />;
  else if (route.page === 'reviews') page = <ReviewsPage data={data} actions={actions} />;
  else if (route.page === 'sources') page = <SourcesPage data={data} actions={actions} sourceId={route.sourceId} onOpenResource={openResource} />;
  else if (route.page === 'home') page = <HomePage data={data} actions={actions} />;
  else page = <Empty>Page not found. <a href="#/">Go home</a>.</Empty>;

  return <><Shell route={route} reviewCount={data?.resources.filter(needsReview).length || 0} query={query} onSearch={value => { setQuery(value); window.location.hash = '#/search'; }}>{page}</Shell>
    {modal && <EditorDialog key={`${modal.type}-${modal.item?.id || 'new'}`} model={modal} projects={data.projects} onClose={() => setModal(null)} onSave={save} />}
    <div className={`toast ${toast ? 'visible' : ''} ${toast?.isError ? 'error' : ''}`} role="status" aria-live="polite">{toast?.message}</div>
  </>;
}
