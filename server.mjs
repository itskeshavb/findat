import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { integrationById, resourceIntegration } from './src/integrations.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, '.data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'findat.sqlite'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Manual',
  owner_name TEXT NOT NULL DEFAULT '',
  owner_status TEXT NOT NULL DEFAULT 'unknown' CHECK(owner_status IN ('unknown','suggested','confirmed')),
  owner_confirmed_at TEXT,
  source_modified_at TEXT,
  last_checked_at TEXT,
  note TEXT NOT NULL DEFAULT '',
  external_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source, external_key)
);
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  resource_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS resources_project_idx ON resources(project_id);
CREATE INDEX IF NOT EXISTS resources_review_idx ON resources(owner_status, last_checked_at);
`);

const count = db.prepare('SELECT COUNT(*) AS n FROM projects').get().n;
if (count === 0) {
  const projectInsert = db.prepare('INSERT INTO projects (name, description, color) VALUES (?, ?, ?)');
  const resourceInsert = db.prepare(`INSERT INTO resources
    (project_id, title, url, type, source, owner_name, owner_status, source_modified_at, last_checked_at, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const p1 = Number(projectInsert.run('Customer insights', 'Research, metrics, and decisions behind the customer experience.', 'indigo').lastInsertRowid);
  const p2 = Number(projectInsert.run('Platform services', 'Core systems and the people who know them best.', 'teal').lastInsertRowid);
  resourceInsert.run(p1, 'Research hub', 'https://example.com/research', 'Document', 'Example', 'Maya Chen', 'confirmed', '2026-11-10T16:00:00Z', '2026-11-18T14:00:00Z', 'Example resource — replace with your team link.');
  resourceInsert.run(p1, 'Analytics dashboard', 'https://example.com/analytics', 'Dashboard', 'Example', '', 'unknown', '2026-11-04T15:30:00Z', '2026-11-18T14:00:00Z', 'Example resource — replace with your team link.');
  resourceInsert.run(p2, 'Service catalog', 'https://example.com/services', 'Document', 'Example', 'Jordan Lee', 'suggested', '2026-10-22T10:00:00Z', '2026-11-18T14:00:00Z', 'Example resource — replace with your team link.');
  resourceInsert.run(p2, 'Release checklist', 'https://example.com/releases', 'Document', 'Example', 'Taylor Reed', 'confirmed', '2026-11-12T11:00:00Z', '2026-11-18T14:00:00Z', 'Example resource — replace with your team link.');
}

// Add a richer example map only while the database still contains the original demo records.
const demoState = db.prepare(`SELECT
  (SELECT COUNT(*) FROM projects) AS projects,
  (SELECT COUNT(*) FROM resources) AS resources,
  (SELECT COUNT(*) FROM resources WHERE source = 'Example') AS examples,
  (SELECT COUNT(*) FROM projects WHERE name IN ('Customer insights', 'Platform services')) AS original_projects,
  (SELECT COUNT(*) FROM projects WHERE name = 'Payments Platform') AS payments`).get();
if (demoState.projects === 2 && demoState.resources === 4 && demoState.examples === 4 && demoState.original_projects === 2 && demoState.payments === 0) {
  const p = Number(db.prepare('INSERT INTO projects (name, description, color) VALUES (?, ?, ?)')
    .run('Payments Platform', 'A sample map of checkout, payments data, code, and project decisions.', 'indigo').lastInsertRowid);
  const add = db.prepare(`INSERT INTO resources
    (project_id, title, url, type, source, owner_name, owner_status, owner_confirmed_at, source_modified_at, last_checked_at, note)
    VALUES (?, ?, ?, ?, 'Example', ?, ?, ?, ?, ?, ?)`);
  const daysAgo = n => new Date(Date.now() - n * 86_400_000).toISOString();
  const demo = [
    ['Product requirements', 'Document', 'Jamie Chen', 'confirmed', 2, 2, 'Sample requirements and roadmap for the payments platform.'],
    ['Technical architecture', 'Document', 'Marcus Green', 'suggested', 18, 20, 'Sample system architecture and service boundaries.'],
    ['QA runbook', 'Document', 'Jamie Chen', 'confirmed', 4, 3, 'Sample testing and release procedures.'],
    ['payments-service', 'Repository', 'Marcus Green', 'confirmed', 1, 1, 'Sample service for payment processing.'],
    ['checkout-ui', 'Repository', 'Alex Kim', 'suggested', 6, 8, 'Sample checkout interface repository.'],
    ['transactions_dataset', 'Dataset', 'Sarah Park', 'confirmed', 3, 2, 'Sample transaction data used by analytics.'],
    ['user_risk_scores', 'Dataset', '', 'unknown', 22, 36, 'Sample risk scoring dataset.'],
    ['#payments-platform', 'Conversation', 'Jamie Chen', 'confirmed', 1, 1, 'Sample project discussion link.'],
    ['Design specs', 'Design', 'Alex Kim', 'unknown', 40, 46, 'Sample payments interface designs.']
  ];
  demo.forEach(([title, type, owner, status, changed, checked, note], i) =>
    add.run(p, title, `https://example.com/findat-demo/${i + 1}`, type, owner, status, status === 'confirmed' ? daysAgo(checked) : null, daysAgo(changed), daysAgo(checked), `${note} Example resource — replace with your team link.`));
}

const types = new Set(['Document', 'Dashboard', 'Dataset', 'Repository', 'Design', 'Conversation', 'Other']);
const colors = new Set(['indigo', 'teal', 'amber', 'rose']);
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
};
const error = (res, status, message) => json(res, status, { error: message });
const text = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const integer = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const safeUrl = value => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
};
const readBody = async req => {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16_384) throw new Error('Request is too large.');
  }
  try { return JSON.parse(body || '{}'); } catch { throw new Error('Invalid JSON.'); }
};
const projectExists = id => !!db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
const resource = id => db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
const activity = (projectId, resourceId, action, detail) => db.prepare('INSERT INTO activity (project_id, resource_id, action, detail) VALUES (?, ?, ?, ?)').run(projectId, resourceId, action, detail);
const snapshot = () => ({
  projects: db.prepare('SELECT * FROM projects ORDER BY updated_at DESC, id DESC').all(),
  resources: db.prepare('SELECT * FROM resources ORDER BY updated_at DESC, id DESC').all(),
  activity: db.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT 30').all(),
  serverTime: new Date().toISOString()
});

async function route(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/snapshot') return json(res, 200, snapshot());
  if (req.method === 'POST' && pathname === '/api/projects') {
    const body = await readBody(req);
    const name = text(body.name, 80);
    if (!name) return error(res, 400, 'Project name is required.');
    const description = text(body.description, 400);
    const color = colors.has(body.color) ? body.color : 'indigo';
    const result = db.prepare('INSERT INTO projects (name, description, color) VALUES (?, ?, ?)').run(name, description, color);
    activity(Number(result.lastInsertRowid), null, 'project_created', name);
    return json(res, 201, { id: Number(result.lastInsertRowid) });
  }
  const projectMatch = pathname.match(/^\/api\/projects\/(\d+)$/);
  if (projectMatch && req.method === 'PATCH') {
    const id = integer(projectMatch[1]);
    if (!projectExists(id)) return error(res, 404, 'Project not found.');
    const body = await readBody(req);
    const name = text(body.name, 80);
    if (!name) return error(res, 400, 'Project name is required.');
    db.prepare("UPDATE projects SET name = ?, description = ?, color = ?, updated_at = datetime('now') WHERE id = ?")
      .run(name, text(body.description, 400), colors.has(body.color) ? body.color : 'indigo', id);
    activity(id, null, 'project_updated', name);
    return json(res, 200, { ok: true });
  }
  if (projectMatch && req.method === 'DELETE') {
    const id = integer(projectMatch[1]);
    if (!projectExists(id)) return error(res, 404, 'Project not found.');
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return json(res, 200, { ok: true });
  }
  if (req.method === 'POST' && pathname === '/api/resources') {
    const body = await readBody(req);
    const projectId = integer(body.projectId);
    const title = text(body.title, 140);
    const url = safeUrl(body.url);
    if (!projectExists(projectId)) return error(res, 400, 'Choose a project.');
    if (!title) return error(res, 400, 'Resource title is required.');
    if (!url) return error(res, 400, 'Enter an HTTP or HTTPS link.');
    const detectedId = resourceIntegration({ url });
    const requestedSource = body.sourceId ? integrationById(body.sourceId) : null;
    if (body.sourceId && (!requestedSource || requestedSource.id !== detectedId)) return error(res, 400, `Enter a valid ${requestedSource?.name || 'integration'} URL.`);
    const source = integrationById(detectedId)?.name || 'Manual';
    const type = types.has(body.type) ? body.type : 'Other';
    const owner = text(body.owner, 100);
    const result = db.prepare(`INSERT INTO resources
      (project_id, title, url, type, source, owner_name, owner_status, owner_confirmed_at, last_checked_at, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(projectId, title, url, type, source, owner, owner ? 'confirmed' : 'unknown', owner ? new Date().toISOString() : null, null, text(body.note, 500));
    db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(projectId);
    activity(projectId, Number(result.lastInsertRowid), 'resource_added', title);
    return json(res, 201, { id: Number(result.lastInsertRowid) });
  }
  const ownerMatch = pathname.match(/^\/api\/resources\/(\d+)\/owner$/);
  if (ownerMatch && req.method === 'PATCH') {
    const id = integer(ownerMatch[1]);
    const item = resource(id);
    if (!item) return error(res, 404, 'Resource not found.');
    const body = await readBody(req);
    const owner = text(body.owner, 100);
    const status = owner ? (body.status === 'suggested' ? 'suggested' : 'confirmed') : 'unknown';
    db.prepare("UPDATE resources SET owner_name = ?, owner_status = ?, owner_confirmed_at = ?, updated_at = datetime('now') WHERE id = ?")
      .run(owner, status, status === 'confirmed' ? new Date().toISOString() : null, id);
    activity(item.project_id, id, status === 'confirmed' ? 'owner_confirmed' : 'owner_changed', owner || 'Owner cleared');
    return json(res, 200, { ok: true });
  }
  const reviewMatch = pathname.match(/^\/api\/resources\/(\d+)\/review$/);
  if (reviewMatch && req.method === 'POST') {
    const id = integer(reviewMatch[1]);
    const item = resource(id);
    if (!item) return error(res, 404, 'Resource not found.');
    const checkedAt = new Date().toISOString();
    db.prepare("UPDATE resources SET last_checked_at = ?, owner_confirmed_at = CASE WHEN owner_status = 'confirmed' THEN ? ELSE owner_confirmed_at END, updated_at = datetime('now') WHERE id = ?")
      .run(checkedAt, checkedAt, id);
    activity(item.project_id, id, 'resource_reviewed', item.title);
    return json(res, 200, { ok: true });
  }
  const resourceMatch = pathname.match(/^\/api\/resources\/(\d+)$/);
  if (resourceMatch && req.method === 'DELETE') {
    const id = integer(resourceMatch[1]);
    const item = resource(id);
    if (!item) return error(res, 404, 'Resource not found.');
    db.prepare('DELETE FROM resources WHERE id = ?').run(id);
    activity(item.project_id, null, 'resource_removed', item.title);
    return json(res, 200, { ok: true });
  }
  if (req.method === 'POST' && pathname === '/api/import/github') {
    const body = await readBody(req);
    const projectId = integer(body.projectId);
    if (!projectExists(projectId)) return error(res, 400, 'Choose a project.');
    const input = safeUrl(body.url);
    if (!input) return error(res, 400, 'Enter a public GitHub repository URL.');
    const url = new URL(input);
    const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (url.hostname.toLowerCase() !== 'github.com' || parts.length !== 2 || !parts.every(p => /^[A-Za-z0-9_.-]+$/.test(p)))
      return error(res, 400, 'Use a public github.com/owner/repository URL.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let repo;
    try {
      const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}`, {
        headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'Findat-local-MVP' },
        signal: controller.signal
      });
      if (response.status === 404) return error(res, 404, 'Public repository not found.');
      if (!response.ok) return error(res, 502, `GitHub returned ${response.status}. Try again later.`);
      repo = await response.json();
    } catch { return error(res, 502, 'Could not reach GitHub. Try again later.'); }
    finally { clearTimeout(timeout); }
    if (repo.private || !repo.id || !repo.html_url) return error(res, 400, 'Only public repositories are supported.');
    const externalKey = String(repo.id);
    const existing = db.prepare("SELECT id, project_id, owner_status FROM resources WHERE source = 'GitHub' AND external_key = ?").get(externalKey);
    const ownerName = text(repo.owner?.login, 100);
    const now = new Date().toISOString();
    if (existing) {
      db.prepare(`UPDATE resources SET title = ?, url = ?, source_modified_at = ?, last_checked_at = ?, note = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(text(repo.full_name, 140), safeUrl(repo.html_url), repo.pushed_at || repo.updated_at || null, now, text(repo.description, 500), existing.id);
      return json(res, 200, { id: existing.id, existingProjectId: existing.project_id, updated: true });
    }
    const result = db.prepare(`INSERT INTO resources
      (project_id, title, url, type, source, owner_name, owner_status, source_modified_at, last_checked_at, note, external_key)
      VALUES (?, ?, ?, 'Repository', 'GitHub', ?, 'suggested', ?, ?, ?, ?)`).run(projectId, text(repo.full_name, 140), safeUrl(repo.html_url), ownerName, repo.pushed_at || repo.updated_at || null, now, text(repo.description, 500), externalKey);
    activity(projectId, Number(result.lastInsertRowid), 'resource_imported', text(repo.full_name, 140));
    return json(res, 201, { id: Number(result.lastInsertRowid), updated: false });
  }
  return error(res, 404, 'Endpoint not found.');
}

const distRoot = path.join(root, 'dist');
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const port = Number(process.env.PORT) || 3000;
const development = process.argv.includes('--dev');
let vite;
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const host = req.headers.host || '';
  if (!/^((127\.0\.0\.1)|(localhost))(:(\d+))?$/.test(host)) return error(res, 403, 'Local access only.');
  if (pathname.startsWith('/api/')) {
    if (req.method !== 'GET') {
      const origin = req.headers.origin;
      if (origin && !['http://127.0.0.1:' + port, 'http://localhost:' + port].includes(origin)) return error(res, 403, 'Cross-site request blocked.');
      if (req.headers['content-type'] && !req.headers['content-type'].startsWith('application/json')) return error(res, 415, 'JSON request required.');
    }
    try { return await route(req, res, pathname); }
    catch (err) {
      const message = err?.message === 'Request is too large.' || err?.message === 'Invalid JSON.' ? err.message : 'Something went wrong.';
      if (message === 'Something went wrong.') console.error(err);
      return error(res, message === 'Something went wrong.' ? 500 : 400, message);
    }
  }
  if (req.method !== 'GET') return error(res, 405, 'Method not allowed.');
  if (vite) return vite.middlewares(req, res, () => error(res, 404, 'Page not found.'));
  if (pathname !== '/' && !/^\/assets\/[a-zA-Z0-9_.-]+$/.test(pathname)) return error(res, 404, 'Page not found.');
  const file = pathname === '/' ? path.join(distRoot, 'index.html') : path.join(distRoot, pathname.slice(1));
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return error(res, pathname === '/' ? 503 : 404, pathname === '/' ? 'Build the React app with npm run build before starting the server.' : 'Asset not found.');
  const type = mimeTypes[path.extname(file)];
  if (!type) return error(res, 404, 'Asset not found.');
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': pathname === '/' ? 'no-store' : 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'" });
  fs.createReadStream(file).pipe(res);
});
if (development) {
  const { createServer } = await import('vite');
  vite = await createServer({ server: { middlewareMode: true, ws: { server } }, appType: 'spa' });
}
server.listen(port, '127.0.0.1', () => console.log(`Findat React MVP running at http://127.0.0.1:${port}${development ? ' (development)' : ''}`));
