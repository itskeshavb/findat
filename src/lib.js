export const resourceTypes = ['Document', 'Dashboard', 'Dataset', 'Repository', 'Design', 'Conversation', 'Other'];
export const colors = ['indigo', 'teal', 'amber', 'rose'];
export const initials = name => (name || '?').split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase();
export const resourceSymbol = type => ({ Document: '▤', Dashboard: '▥', Dataset: '▦', Repository: '⌘', Design: '◈', Conversation: '◌', Person: '◉', Other: '◇' }[type] || '◇');
export const asDate = value => !value ? null : new Date(/Z$|[+-]\d{2}:\d{2}$/.test(value) ? value : value.replace(' ', 'T') + 'Z');
export function ageDays(value) { const date = asDate(value); return date && !Number.isNaN(+date) ? Math.max(0, (Date.now() - date.getTime()) / 86_400_000) : Infinity; }
export function relative(value) {
  const days = Math.floor(ageDays(value));
  if (!Number.isFinite(days)) return 'Not verified';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
export const needsReview = resource => resource.owner_status !== 'confirmed' || Boolean(resource.last_checked_at && ageDays(resource.last_checked_at) > 30) || Boolean(resource.owner_confirmed_at && ageDays(resource.owner_confirmed_at) > 90);
export const statusLabel = status => ({ confirmed: 'Confirmed', suggested: 'Suggested', unknown: 'Unknown' }[status] || 'Unknown');
export const activityDescription = action => ({ project_created: 'created a project', project_updated: 'updated a project', resource_added: 'added a resource', resource_imported: 'imported from GitHub', resource_removed: 'removed a resource', owner_confirmed: 'confirmed an owner', owner_changed: 'changed an owner', resource_reviewed: 'reviewed a resource' }[action] || action);
export function getRoute() {
  const [page = 'home', id] = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { page, projectId: page === 'projects' && id ? Number(id) : null, sourceId: page === 'sources' ? id || null : null };
}
export async function api(method, url, data, signal) {
  const response = await fetch(url, {
    method, signal,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}
