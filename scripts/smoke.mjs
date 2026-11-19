import assert from 'node:assert/strict';

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
async function call(method, path, body, headers = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, body: await response.json() };
}

let projectId;
try {
  const html = await fetch(base);
  assert.equal(html.status, 200);
  const document = await html.text();
  assert.match(document, /Findat/);
  assert.match(document, /id="root"/);
  const jsPath = document.match(/<script[^>]*src="([^"]+)"/)?.[1];
  assert.ok(jsPath, 'React module is referenced by the page');
  const js = await fetch(base + jsPath);
  assert.equal(js.status, 200);
  assert.match(js.headers.get('content-type'), /javascript/);
  for (const match of document.matchAll(/<link[^>]*href="([^"]+\.css)"/g)) {
    const css = await fetch(base + match[1]);
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
  }

  const created = await call('POST', '/api/projects', { name: 'Smoke test project', description: 'Temporary verification' });
  assert.equal(created.status, 201);
  projectId = created.body.id;
  assert.ok(projectId);

  const added = await call('POST', '/api/resources', {
    projectId,
    title: 'Smoke test dashboard',
    url: 'https://example.com/dashboard',
    type: 'Dashboard',
    note: 'Verification resource'
  });
  assert.equal(added.status, 201);
  const resourceId = added.body.id;

  const drive = await call('POST', '/api/resources', {
    projectId, title: 'Smoke test Drive file', url: 'https://drive.google.com/file/d/example/view', type: 'Document', sourceId: 'drive'
  });
  assert.equal(drive.status, 201);
  const wrongSource = await call('POST', '/api/resources', {
    projectId, title: 'Wrong source', url: 'https://example.com/file', type: 'Document', sourceId: 'drive'
  });
  assert.equal(wrongSource.status, 400);

  const invalid = await call('POST', '/api/resources', { projectId, title: 'Unsafe URL', url: 'javascript:alert(1)', type: 'Other' });
  assert.equal(invalid.status, 400);
  const crossSite = await call('POST', '/api/projects', { name: 'Blocked' }, { origin: 'https://example.com' });
  assert.equal(crossSite.status, 403);

  const owned = await call('PATCH', `/api/resources/${resourceId}/owner`, { owner: 'Alex Rivera' });
  assert.equal(owned.status, 200);
  const reviewed = await call('POST', `/api/resources/${resourceId}/review`);
  assert.equal(reviewed.status, 200);

  const snapshot = await call('GET', '/api/snapshot');
  assert.equal(snapshot.status, 200);
  const item = snapshot.body.resources.find(r => r.id === resourceId);
  assert.equal(item.owner_name, 'Alex Rivera');
  assert.equal(item.owner_status, 'confirmed');
  assert.equal(snapshot.body.resources.find(r => r.id === drive.body.id)?.source, 'Google Drive');
  assert.ok(item.owner_confirmed_at);
  assert.ok(item.last_checked_at);
  assert.equal(snapshot.body.projects.find(p => p.id === projectId)?.name, 'Smoke test project');

  const badGithub = await call('POST', '/api/import/github', { projectId, url: 'https://example.com/owner/repo' });
  assert.equal(badGithub.status, 400);
  console.log('Smoke check passed: static assets, project/resource workflow, integration URL classification, owner review, validation, local origin.');
} finally {
  if (projectId) {
    const removed = await call('DELETE', `/api/projects/${projectId}`);
    assert.equal(removed.status, 200);
  }
}
