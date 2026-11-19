# Findat React MVP

A React app for mapping projects to links and responsible people, with the project map and details panel styled after the provided reference. It includes persistent projects, resource search, owner confirmation, freshness reviews, and public GitHub repository import. A fresh workspace includes example projects, including Payments Platform.

## Run

Requires Node.js 24 or later. Install the dependencies once, then start development mode:

```powershell
npm install
npm run dev
```

Open <http://127.0.0.1:3000>. Vite runs inside the local Node server, so the React app, hot reload, and API share one address. The server listens only on your computer. Saved data stays in `.data/findat.sqlite` between restarts and frontend builds. To use another port, set `PORT` before starting the server.

To serve the compiled React app:

```powershell
npm run build
npm start
```

The build creates `dist/`. The Node server serves those assets in normal mode; the SQLite file is outside the build directory.

`npm run test:react` checks the project directory, integration navigation and icons, map selection, ownership forms, live search, project creation, and form error recovery using a simulated DOM and mocked API. It does not change saved workspace data. `npm run smoke` checks served assets and the real API, including integration URL classification, while the server is running; it creates and removes a temporary project.

## React source

- `src/App.jsx`: application state, navigation, data fetching, and mutations.
- `src/components/Shell.jsx`: navigation and global search.
- `src/components/BrandIcon.jsx` and `src/integrations.js`: service logos, links, and URL matching.
- `src/components/ProjectPage.jsx`: project tabs, grouped map, and resource inspector.
- `src/components/Pages.jsx`: home, directory, search, people, updates, and sources.
- `src/components/EditorDialog.jsx`: project, resource, ownership, import, and removal forms.
- `src/components/UI.jsx`: shared buttons, statuses, tables, and activity views.
- `src/styles/`: responsive styles derived from the supplied reference.
- `server.mjs`: API, public GitHub import, SQLite persistence, and Vite/static serving.

## Try the main workflow

1. Open **Projects**, choose a project to view its map, or create a project.
2. Add a document, dashboard, dataset, Slack conversation, or Google Drive file as a manual link.
3. Open **Search** and find the resource by title, project, type, or owner.
4. Confirm its owner from the resource details panel or **Updates**.
5. Open a project map to see resources and contacts together.
6. Use the integration links in the sidebar to find saved links from Google Drive, Slack, GitHub, Jira, Notion, Confluence, Figma, or Snowflake. Add a link from its service page. GitHub also supports public `github.com/owner/repository` import; review the suggested owner after import.

## Current boundaries

This is a single-user local MVP. It does not implement workspace accounts, employee-specific source permissions, automated Google Drive sync, or private GitHub access. Manual links store the title, URL, context, and owner you enter; they do not verify source contents. GitHub import fetches current public repository metadata on demand and does not run in the background. Do not expose this server to a network or use it with confidential company data.

The [pilot architecture](docs/MVP_ARCHITECTURE.md) describes the additional authentication, source authorization, synchronization, and deployment work required for a multi-user pilot.
