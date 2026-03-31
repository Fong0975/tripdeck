# Tripdeck

A travel itinerary planning app built with React. Organize your trips day by day with a drag-and-drop kanban board.

## Project Structure

```
tripdeck/
├── public/               # Static assets (favicon, icons, PWA manifest)
│   └── records/          # Seed data (JSON files loaded on first launch)
├── src/
│   ├── components/       # Reusable UI components
│   ├── context/          # React context (theme)
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Route-level page components
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Storage utilities (localStorage CRUD)
└── .github/workflows/    # CI: lint check, automated version bumping
```

## Features

- **Trip Management** — Create and delete trips with title, destination, date range, and notes
- **Day-by-Day Planning** — Each trip is broken into daily columns, one per day
- **Drag-and-Drop** — Reorder attraction cards within and across day columns
- **Attraction Cards** — Add, edit, and delete attractions with notes, Google Maps links, and reference websites
- **Travel Connections** — Define transport mode and duration between two consecutive attractions
- **Light / Dark Mode** — Follows system preference on first load; manually toggleable via the navbar
- **Persistent Storage** — All data is saved to `localStorage`; sample trips are seeded automatically on first launch
- **PWA Support** — Installable on iOS and Android with full-screen standalone mode

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 3. Build for Production

```bash
npm run build
```

The output will be in the `dist/` directory.

### 4. Preview Production Build

```bash
npm run preview
```

## Development

### Code Quality

```bash
# Run ESLint (includes Prettier formatting and Tailwind CSS class validation)
npm run lint

# Auto-fix all fixable issues
npm run lint:fix

# Strict check — fails on any warning
npm run lint:check

# Format all source files with Prettier
npm run format

# Check formatting without making changes
npm run format:check

# Show which files would be reformatted
npm run format:diff
```

> ESLint covers code quality, import ordering, React hooks rules, Prettier formatting, and Tailwind CSS class validation in a single pass. Use pure Prettier commands when you only need fast formatting without full analysis.
