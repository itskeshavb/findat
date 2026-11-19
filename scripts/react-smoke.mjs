import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://127.0.0.1:3000/#/projects/1' });
for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLDialogElement', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'MutationObserver', 'FormData', 'getComputedStyle']) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: name === 'getComputedStyle' ? dom.window.getComputedStyle.bind(dom.window) : dom.window[name] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };

const fixture = {
  projects: [{ id: 1, name: 'Payments Platform', description: 'Payments project', color: 'indigo', updated_at: new Date().toISOString() }],
  resources: [
    { id: 1, project_id: 1, title: 'Product requirements', url: 'https://example.com/doc', type: 'Document', source: 'Example', owner_name: 'Jamie Chen', owner_status: 'confirmed', owner_confirmed_at: new Date().toISOString(), last_checked_at: null, source_modified_at: null, note: 'Requirements context' },
    { id: 2, project_id: 1, title: 'transactions_dataset', url: 'https://example.com/data', type: 'Dataset', source: 'Example', owner_name: '', owner_status: 'unknown', last_checked_at: null, source_modified_at: null, note: 'Dataset context' },
  ],
  activity: [],
};
const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (path, options = {}) => {
  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : null;
  calls.push({ path, method, body });
  let result;
  let status = 200;
  if (path === '/api/snapshot') result = structuredClone(fixture);
  else if (path === '/api/resources/2/owner' && method === 'PATCH') {
    Object.assign(fixture.resources[1], { owner_name: body.owner, owner_status: 'confirmed', owner_confirmed_at: new Date().toISOString() });
    result = { ok: true };
  } else if (path === '/api/projects' && method === 'POST') {
    fixture.projects.push({ ...body, id: 2, updated_at: new Date().toISOString() });
    result = { id: 2 }; status = 201;
  } else if (path === '/api/resources' && method === 'POST') {
    result = { error: 'Resource could not be saved. Please retry.' }; status = 503;
  } else throw new Error(`Unexpected request: ${method} ${path}`);
  return new Response(JSON.stringify(result), { status, headers: { 'Content-Type': 'application/json' } });
};

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
const React = await import('react');
const { render, screen, within, waitFor, cleanup } = await import('@testing-library/react');
const { default: userEvent } = await import('@testing-library/user-event');
try {
  const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
  const user = userEvent.setup({ document: dom.window.document });
  render(React.createElement(App));
  await screen.findByRole('heading', { name: 'Payments Platform', level: 1 });
  const inspector = screen.getByRole('complementary', { name: 'Resource details' });
  assert.ok(within(inspector).getByText('Product requirements'));

  await user.click(screen.getByRole('button', { name: /transactions_dataset/ }));
  assert.ok(within(inspector).getByText('Dataset context'));
  await user.click(within(inspector).getByRole('button', { name: 'Confirm owner' }));
  const ownerDialog = screen.getByRole('dialog', { name: 'Confirm ownership' });
  await user.type(within(ownerDialog).getByLabelText('Person or team'), 'Sarah Park');
  await user.click(within(ownerDialog).getByRole('button', { name: 'Save owner' }));
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
  assert.equal(fixture.resources[1].owner_name, 'Sarah Park');
  assert.ok(within(inspector).getByRole('button', { name: 'Change owner' }));

  await user.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: /Search/ }));
  const search = await screen.findByRole('textbox', { name: 'Search resources' });
  await user.type(search, 'transactions');
  assert.ok(screen.getByText('1 result'));
  assert.equal(screen.queryByRole('button', { name: 'Product requirements' }), null);
  await user.click(screen.getByRole('button', { name: 'View' }));
  await screen.findByRole('heading', { name: 'Payments Platform', level: 1 });
  assert.ok(within(screen.getByRole('complementary', { name: 'Resource details' })).getByText('Dataset context'));

  await user.click(screen.getByRole('link', { name: /All Projects/ }));
  await screen.findByRole('heading', { name: 'Projects', level: 1 });
  await user.click(await screen.findByRole('button', { name: '+ New project' }));
  await user.type(screen.getByLabelText('Project name'), 'React test project');
  await user.click(screen.getByRole('button', { name: 'Create project' }));
  await screen.findByRole('heading', { name: 'React test project', level: 1 });
  assert.ok(calls.some(call => call.method === 'POST' && call.path === '/api/projects'));

  await user.click(screen.getAllByRole('button', { name: '+ Add resource' })[0]);
  await user.type(screen.getByLabelText('Title'), 'Retry resource');
  await user.type(screen.getByLabelText('Link'), 'https://example.com/retry');
  await user.click(screen.getByRole('button', { name: 'Add resource' }));
  assert.equal((await screen.findByRole('alert')).textContent, 'Resource could not be saved. Please retry.');
  assert.equal(screen.getByLabelText('Title').value, 'Retry resource');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  assert.equal(screen.queryByRole('dialog'), null);
  const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
  await user.click(within(mainNav).getByRole('link', { name: 'Projects' }));
  await screen.findByRole('heading', { name: 'Projects', level: 1 });
  assert.ok(screen.getByRole('link', { name: /React test project.*Open map/ }));
  const integrationsNav = screen.getByRole('navigation', { name: 'Integrations' });
  for (const name of ['Google Drive', 'Slack', 'GitHub', 'Jira', 'Notion', 'Confluence', 'Figma', 'Snowflake']) {
    const link = within(integrationsNav).getByRole('link', { name });
    assert.ok(link.querySelector('svg'), `${name} logo is missing`);
    await user.click(link);
    await screen.findByRole('heading', { name, level: 1 });
    assert.equal(link.getAttribute('aria-current'), 'page');
  }
  await user.click(within(integrationsNav).getByRole('link', { name: 'Google Drive' }));
  await user.click(screen.getByRole('button', { name: '+ Add Google Drive link' }));
  assert.equal(screen.getByRole('dialog', { name: 'Add a Google Drive link' }).querySelector('[name=sourceId]').value, 'drive');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  console.log('React checks passed: project directory, eight integration routes and icons, source action, map selection, inspector, owner save, live search, project creation, form error recovery.');
} finally {
  cleanup();
  globalThis.fetch = originalFetch;
  await vite.close();
  dom.window.close();
}
