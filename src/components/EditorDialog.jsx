import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { colors, resourceTypes } from '../lib.js';
import { integrationById } from '../integrations.js';
import { Button } from './UI.jsx';

function Field({ label, name, as = 'input', children, ...props }) {
  const Tag = as;
  return <div className="field"><label htmlFor={`field-${name}`}>{label}</label><Tag id={`field-${name}`} name={name} {...props}>{children}</Tag></div>;
}

export default function EditorDialog({ model, projects, onClose, onSave }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { type, item, projectId, sourceId } = model;
  const source = integrationById(sourceId);
  useEffect(() => {
    const previous = document.activeElement;
    const node = dialog.current;
    node.showModal();
    return () => { node.close(); if (previous?.isConnected) previous.focus(); };
  }, []);

  const settings = {
    project: [item ? 'Edit project' : 'New project', 'Give the work a clear home.', item ? 'Save changes' : 'Create project'],
    resource: [source ? `Add a ${source.name} link` : 'Add a resource', 'Save a useful link and the person who knows it.', 'Add resource'],
    owner: ['Confirm ownership', `Who is responsible for ${item?.title || 'this resource'}?`, 'Save owner'],
    github: ['Import a GitHub repository', 'Import current metadata from a public repository.', 'Import repository'],
    remove: ['Remove resource', item?.title || '', 'Remove resource'],
  }[type];
  const submit = async event => {
    event.preventDefault();
    setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { await onSave(values); } catch (err) { setError(err.message); setBusy(false); }
  };
  const projectField = <Field label="Project" name="projectId" as="select" defaultValue={projectId || projects[0]?.id} required>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</Field>;
  return createPortal(<dialog ref={dialog} className="react-dialog" aria-labelledby="modal-title" aria-describedby="modal-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}><div className="modal"><div className="modal-head"><div><h2 id="modal-title">{settings[0]}</h2><p id="modal-description">{settings[1]}</p></div><button className="close-btn" aria-label="Close dialog" disabled={busy} onClick={onClose}>×</button></div>
    <form onSubmit={submit}><fieldset className="form-fields" disabled={busy}><div className="modal-body">
      {type === 'project' && <><Field label="Project name" name="name" required autoFocus maxLength={80} defaultValue={item?.name || ''} placeholder="e.g. Customer onboarding" /><Field label="Description" name="description" as="textarea" maxLength={400} defaultValue={item?.description || ''} placeholder="What does this project cover?" /><Field label="Color" name="color" as="select" defaultValue={item?.color || 'indigo'}>{colors.map(color => <option key={color} value={color}>{color[0].toUpperCase() + color.slice(1)}</option>)}</Field></>}
      {type === 'resource' && <>{source && <input type="hidden" name="sourceId" value={source.id} />}{projectField}<Field label="Title" name="title" required autoFocus maxLength={140} placeholder="e.g. Customer metrics dashboard" /><Field label="Link" name="url" required type="url" placeholder={source ? `Paste a ${source.name} URL` : 'https://...'} /><Field label="Type" name="type" as="select" defaultValue={source?.type || 'Document'}>{resourceTypes.map(value => <option key={value}>{value}</option>)}</Field><Field label="Responsible person or team" name="owner" maxLength={100} placeholder="Optional" /><Field label="Context" name="note" as="textarea" maxLength={500} placeholder="What will teammates find here?" /></>}
      {type === 'owner' && <><Field label="Person or team" name="owner" autoFocus maxLength={100} defaultValue={item.owner_name || ''} placeholder="e.g. Maya Chen" /><p className="field-help">Save a name to confirm it. Clear the field to mark the owner unknown.</p></>}
      {type === 'github' && <>{projectField}<Field label="Repository URL" name="url" required type="url" autoFocus placeholder="https://github.com/owner/repository" /></>}
      {type === 'remove' && <p className="dialog-copy">This removes the link from the project map.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div><div className="modal-footer"><Button onClick={onClose}>Cancel</Button><button type="submit" className={`button ${type === 'remove' ? 'danger' : 'primary'}`}>{busy ? 'Saving…' : settings[2]}</button></div></fieldset></form>
  </div></dialog>, document.body);
}
