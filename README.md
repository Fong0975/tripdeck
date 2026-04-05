# Tripdeck

A travel itinerary planning app with a React frontend and a Node.js REST API backend. Organize your trips day by day with a drag-and-drop kanban board, and track your packing checklist with multi-occasion columns.

## Project Structure

```
tripdeck/
├── client/                   # React frontend (Vite + TypeScript + Tailwind)
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React context (theme)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Route-level page components
│   │   ├── types/            # TypeScript type definitions
│   │   └── utils/            # Backend API client utilities
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
│   ├── package.json
│   └── tsconfig.json
├── package.json              # Workspace root — orchestrates client + server
└── .github/workflows/        # CI: lint check, automated version bumping
```

## Features

- **Trip Management** — Create and delete trips with title, destination, date range, and notes
- **Day-by-Day Planning** — Each trip is broken into daily columns, one per day
- **Drag-and-Drop** — Reorder attraction cards within and across day columns
- **Attraction Cards** — Add, edit, and delete attractions with notes, Google Maps links, and reference websites
- **Travel Connections** — Define transport mode and duration between two consecutive attractions
- **Luggage Checklist** — Manage a reusable packing template; each trip gets a snapshot copy with multi-occasion columns for check-off tracking
- **Light / Dark Mode** — Follows system preference on first load; manually toggleable via the navbar
- **MySQL Database** — All data is persisted in a MySQL database; tables are created automatically on first server start
- **PWA Support** — Installable on iOS and Android with full-screen standalone mode
- **Health API** — `GET /api/health` endpoint exposed by the backend server

## Getting Started

### 1. Install Dependencies

Run from the workspace root — npm workspaces installs all packages in one step:

```bash
npm install
```

### 2. Configure Database Connection

Copy `.env.example` to `.env` at the workspace root and fill in your MySQL credentials:

```bash
cp .env.example .env
```

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tripdeck
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
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without making changes (used in CI) |

### Client-Only Scripts

```bash
npm run dev -w client
npm run build -w client
npm run lint -w client
npm run lint:fix -w client
npm run lint:check -w client       # Fails on any warning
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

### Code Quality

Both client and server have full ESLint + Prettier coverage:

| Tool | Client | Server |
|------|--------|--------|
| ESLint | TypeScript, React hooks, Tailwind CSS, import order, Prettier | TypeScript, import order, Prettier |
| Prettier | All `.ts`, `.tsx`, `.css`, `.json` | All `.ts` |

The CI workflow (`lint.yml`) runs three checks on every push or PR to `main`:
1. **Client ESLint** — `npm run lint:check -w client` (zero warnings allowed)
2. **Server ESLint** — `npm run lint:check -w server` (zero warnings allowed)
3. **Root Prettier** — `npm run format:check` (covers CSS, JSON, and all source files)

## API Reference

The full interactive API reference is available via Swagger UI while the backend is running:

```
http://localhost:3001/api/docs
```
