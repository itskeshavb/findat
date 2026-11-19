export const integrations = [
  { id: 'drive', name: 'Google Drive', hosts: ['drive.google.com', 'docs.google.com'], description: 'Documents and folders saved from Google Drive.', type: 'Document', home: 'https://drive.google.com/' },
  { id: 'slack', name: 'Slack', hosts: ['slack.com'], description: 'Channel and conversation links saved from Slack.', type: 'Conversation', home: 'https://slack.com/' },
  { id: 'github', name: 'GitHub', hosts: ['github.com'], description: 'Repositories imported from GitHub.', type: 'Repository', home: 'https://github.com/' },
  { id: 'jira', name: 'Jira', hosts: ['atlassian.net'], description: 'Issues and project boards saved from Jira.', type: 'Other', home: 'https://www.atlassian.com/software/jira' },
  { id: 'notion', name: 'Notion', hosts: ['notion.so', 'notion.site'], description: 'Pages and databases saved from Notion.', type: 'Document', home: 'https://www.notion.so/' },
  { id: 'confluence', name: 'Confluence', hosts: ['atlassian.net'], description: 'Knowledge base pages saved from Confluence.', type: 'Document', home: 'https://www.atlassian.com/software/confluence' },
  { id: 'figma', name: 'Figma', hosts: ['figma.com'], description: 'Design files and prototypes saved from Figma.', type: 'Design', home: 'https://www.figma.com/' },
  { id: 'snowflake', name: 'Snowflake', hosts: ['snowflake.com', 'snowflakecomputing.com'], description: 'Datasets and worksheets saved from Snowflake.', type: 'Dataset', home: 'https://www.snowflake.com/' },
];

export const integrationById = id => integrations.find(item => item.id === id);

export function resourceIntegration(resource) {
  const explicit = integrations.find(item => item.name.toLowerCase() === String(resource.source || '').toLowerCase());
  if (explicit) return explicit.id;
  try {
    const host = new URL(resource.url).hostname.toLowerCase();
    if (host.endsWith('.atlassian.net')) return /confluence|\/wiki\//i.test(resource.url) ? 'confluence' : 'jira';
    return integrations.find(item => item.hosts.some(domain => host === domain || host.endsWith(`.${domain}`)))?.id || null;
  } catch { return null; }
}
