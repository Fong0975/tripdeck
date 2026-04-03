# Tripdeck

A travel itinerary planning app with a React frontend and a Node.js REST API backend. Organize your trips day by day with a drag-and-drop kanban board, and track your packing checklist with multi-occasion columns.

## Project Structure

```
tripdeck/
├── client/                   # React frontend (Vite + TypeScript + Tailwind)
│   ├── public/
│   │   └── records/          # Default sample data — copy to records/ to get started
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React context (theme)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Route-level page components
│   │   ├── types/            # TypeScript type definitions
│   │   └── utils/            # Storage utilities (file-based CRUD with session cache)
│   ├── package.json
│   └── vite.config.ts        # Vite config; includes local file API middleware
├── server/                   # Node.js REST API backend (Express + TypeScript)
│   ├── src/
│   │   ├── controllers/      # Handles API business logic and responses
│   │   ├── routes/           # Defines API endpoints and URL mapping
│   │   └── index.ts          # Express server entry point
│   ├── package.json
│   └── tsconfig.json
├── records/                  # Runtime JSON data (git-ignored, auto-created)
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
- **File-Based Storage** — All data is read from and written to JSON files in `records/`; changes are cached in sessionStorage for the current session
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

### 3. Set Up Sample Data (Optional)

To start with sample trips and checklists, copy the provided sample files into `records/`:

```bash
cp client/public/records/trips.json records/trips.json
cp client/public/records/trip_trip-tokyo-2024.json records/trip_trip-tokyo-2024.json
cp client/public/records/trip_trip-kansai-2024.json records/trip_trip-kansai-2024.json
cp client/public/records/checklist_template.json records/checklist_template.json
cp client/public/records/checklist_trip-tokyo-2024.json records/checklist_trip-tokyo-2024.json
cp client/public/records/checklist_trip-kansai-2024.json records/checklist_trip-kansai-2024.json
```

The `records/` directory is git-ignored and auto-created on first run. Without sample data the app starts empty.

### 4. Start Development Servers

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

### 5. Build for Production

```bash
npm run build
```

Outputs:
- `client/dist/` — static frontend bundle
- `server/dist/` — compiled Node.js server

### 6. Start Production Server

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
npm run lint -w server
npm run lint:fix -w server
npm run lint:check -w server       # Fails on any warning
npm run format -w server
npm run format:check -w server
npm run format:diff -w server
```

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

> **Note:** The Vite dev server must be running for the app to work. File read/write is handled by a Vite plugin that exposes a local `/api/records` middleware — opening `index.html` directly will not work.

## API Reference

### Backend (Express — port 3001)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns server status and current timestamp |

### Frontend File API (Vite middleware — dev only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/records/trips` | List all trips |
| `PUT` | `/api/records/trips` | Save trips list |
| `GET` | `/api/records/trip/:id` | Get trip itinerary |
| `PUT` | `/api/records/trip/:id` | Save trip itinerary |
| `DELETE` | `/api/records/trip/:id` | Delete trip itinerary file |
| `GET` | `/api/records/checklist-template` | Get packing list template |
| `PUT` | `/api/records/checklist-template` | Save packing list template |
| `GET` | `/api/records/checklist/:id` | Get trip checklist |
| `PUT` | `/api/records/checklist/:id` | Save trip checklist |
| `DELETE` | `/api/records/checklist/:id` | Delete trip checklist file |
