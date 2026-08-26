# Tripdeck

A travel itinerary planning app with a React frontend and a Node.js REST API backend.

- **Itinerary planning** — Organize trips day by day on a drag-and-drop kanban board; add attractions with notes, Google Maps links, reference websites, and photos, then define transport connections between them.
- **Itinerary export** — Generate a formatted Word (.docx) document from any trip, with an editable Markdown preview step before download. The export includes styled day headers, transport tables, embedded images, and clickable hyperlinks.
- **Packing checklist** — Manage a reusable packing template; each trip gets its own copy with multiple occasion columns so you can track what to pack for each part of the journey.
- **Trip backup / import** — Export one or more trips as a self-contained zip (full data plus every uploaded image), and import a backup zip back in as brand-new trips, with automatic title de-duplication and ID remapping so nothing collides with existing data.

## Project Structure

```
tripdeck/
├── client/                   # React frontend (Vite + TypeScript + Tailwind)
│   ├── public/
│   ├── src/
│   │   ├── api/              # Backend API client (per domain: trips, attractions, images, etc.)
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React context (theme)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Route-level page components
│   │   ├── types/            # TypeScript type definitions
│   │   └── utils/            # Docx export, weather API, and other shared helpers
│   ├── Dockerfile            # Multi-stage build: Vite → nginx
│   ├── nginx.conf.template   # nginx config template (port + proxy via envsubst)
│   ├── package.json
│   └── vite.config.ts
├── server/                   # Node.js REST API backend (Express + TypeScript)
│   ├── src/
│   │   ├── config/           # Database connection setup
│   │   ├── controllers/      # Handles API business logic and responses
│   │   ├── db/               # Schema definitions and table initialization
│   │   ├── middleware/       # Express middleware (multer file upload)
│   │   ├── repositories/     # Database query layer (MySQL2)
│   │   ├── routes/           # Defines API endpoints and URL mapping
│   │   ├── types/            # Request/response type definitions
│   │   └── index.ts          # Express server entry point
│   ├── swagger/              # Auto-generated Swagger spec (output.json)
│   ├── uploads/              # Uploaded image files (git-ignored, UUID filenames)
│   ├── Dockerfile            # Multi-stage build: tsc → production Node.js
│   ├── package.json
│   ├── tsconfig.json         # Used for editor/lint (includes test files)
│   ├── tsconfig.build.json   # Used by `npm run build` (excludes *.test.ts)
│   └── vitest.config.ts
├── docker-compose.yml        # Two-service deployment (backend + frontend, host network)
├── export_docker.bat         # Copies deployment files to ./docker/ and injects .env.production
├── .env.example              # Environment variable reference
├── package.json              # Workspace root — orchestrates client + server
└── .github/workflows/        # CI: lint/test check, automated version bumping
```

## Getting Started

### 1. Install Dependencies

Run from the workspace root — npm workspaces installs all packages in one step:

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` at the workspace root:

```bash
cp .env.example .env
```

```dotenv
# MySQL connection — required
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tripdeck

# Backend API endpoint — leave empty in local development (Vite proxy handles routing)
# Set to the server's domain when the frontend and backend are on different origins
# Example: http://192.168.1.100
VITE_API_DOMAIN=
VITE_API_PORT=3001

# Frontend dev server port
FRONTEND_PORT=3000
```

The database and all tables are created automatically on first server start.

### 3. Start Development Servers

Run both the frontend and backend concurrently from the workspace root:

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://localhost:3001 |

Or start each independently:

```bash
npm run dev -w client   # frontend only
npm run dev -w server   # backend only
```

### 4. Build for Production

```bash
npm run build
```

Outputs:
- `client/dist/` — static frontend bundle
- `server/dist/` — compiled Node.js server

### 5. Start Production Server

```bash
npm run start
```

## Development

### Available Root Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in watch mode |
| `npm run build` | Build client and server for production |
| `npm run start` | Start the production server |
| `npm run swagger` | Generate / update `server/swagger/output.json` from route annotations |
| `npm run lint` | Run ESLint across client and server |
| `npm run lint:fix` | Auto-fix all fixable ESLint issues across client and server |
| `npm run lint:check` | ESLint strict check — fails on any warning (used in CI) |
| `npm run test` | Run the client and server unit test suites once |
| `npm run test:watch` | Run both suites in watch mode |
| `npm run test:coverage` | Run both suites once with a coverage report |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without making changes (used in CI) |
| `npm run format:diff` | List files that would be reformatted, without changing them |

### Client-Only Scripts

```bash
npm run dev -w client
npm run build -w client
npm run lint -w client
npm run lint:fix -w client
npm run lint:check -w client       # Fails on any warning
npm run test -w client             # Runs the Vitest suite once
npm run test:watch -w client       # Vitest in watch mode
npm run test:coverage -w client    # Vitest with a coverage report
npm run format -w client
npm run format:check -w client
npm run format:diff -w client
```

### Server-Only Scripts

```bash
npm run dev -w server              # tsx watch — auto-restarts on changes
npm run build -w server            # tsc — compiles to server/dist/
npm run start -w server            # node dist/index.js
npm run swagger -w server          # Generate / update server/swagger/output.json
npm run lint -w server
npm run lint:fix -w server
npm run lint:check -w server       # Fails on any warning
npm run test -w server             # Runs the Vitest suite once
npm run test:watch -w server       # Vitest in watch mode
npm run test:coverage -w server    # Vitest with a coverage report
npm run format -w server
npm run format:check -w server
npm run format:diff -w server
```

### API Documentation (Swagger)

The backend exposes an interactive Swagger UI generated by [swagger-autogen](https://github.com/davibaltar/swagger-autogen).

**Generate or update the spec** (run whenever routes or `#swagger.*` annotations change):

```bash
npm run swagger
```

This scans `server/swagger/entry.ts` and writes the result to `server/swagger/output.json`.

**View the docs** (requires the backend to be running):

```
http://localhost:3001/api/docs
```

> The `server/swagger/output.json` file is committed to the repository so the server can start without requiring a prior `npm run swagger` call. Re-run the command after any route changes to keep it in sync.

### Testing

The client uses [Vitest](https://vitest.dev) with [React Testing Library](https://testing-library.com/react) and jsdom. Test files are co-located next to the code they cover (`Foo.ts` → `Foo.test.ts`), and prefer table-driven cases (`it.each`/`describe.each`) over one-off single-case tests where the assertions are uniform.

```bash
npm run test -w client             # Run once
npm run test:watch -w client       # Watch mode
npm run test:coverage -w client    # Run once with a coverage report (used in CI)
```

The server also uses [Vitest](https://vitest.dev), running under Node instead of jsdom. Test files are co-located the same way (`fooRepository.ts` → `fooRepository.test.ts`); the MySQL2 `pool` is mocked with `vi.mock('../config/database')` so tests don't need a real database connection. Coverage is tracked the same way as the client, with an 80% threshold gate. Purely declarative files (routes, the static schema/type definitions, the app entry point) are excluded from coverage — see `server/vitest.config.ts` for the exact exclusion list.

```bash
npm run test -w server             # Run once
npm run test:watch -w server       # Watch mode
npm run test:coverage -w server    # Run once with a coverage report (used in CI)
```

### Code Quality

Both client and server have full ESLint + Prettier coverage:

| Tool | Client | Server |
|------|--------|--------|
| ESLint | TypeScript, React hooks, Tailwind CSS, import order, Prettier | TypeScript, import order, Prettier |
| Prettier | All `.ts`, `.tsx`, `.css`, `.json` | All `.ts` |

The CI workflow (`ci.yml`) runs on every push or PR to `main`, gating each check on whether the relevant workspace's files actually changed:
1. **Client ESLint** — `npm run lint:check -w client` (zero warnings allowed)
2. **Server ESLint** — `npm run lint:check -w server` (zero warnings allowed)
3. **Server unit tests** — `npm run test:coverage -w server` (also enforces the server's 80% coverage threshold)
4. **Client unit tests** — `npm run test:coverage -w client` (also enforces the client's 80% coverage threshold)
5. **Root Prettier** — `npm run format:check` (covers CSS, JSON, and all source files)

## API Reference

The full interactive API reference is available via Swagger UI while the backend is running:

```
http://localhost:3001/api/docs
```
