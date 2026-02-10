# Frontend

## App overview

We built the frontend as a Next.js application that renders lessons and quizzes and provides a tutor chat interface backed by the API.

## Tech stack

Our frontend stack includes:

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Supabase JS client
- react-markdown

## Folder structure

We organize the frontend around routes, shared components, and utilities:

- [frontend/app/](frontend/app/) — routes, pages, and UI composition.
- [frontend/components/](frontend/components/) — shared UI components.
- [frontend/lib/](frontend/lib/) — API helpers, types, and utilities.
- [frontend/public/](frontend/public/) — static assets.
- [frontend/package.json](frontend/package.json) — scripts and dependencies.

## Installation and setup

We install dependencies from the frontend folder:

```bash
cd frontend
npm install
```

## Environment variables

We keep environment variables in `.env.local` for local development:

```bash
touch .env.local
```

Required for Supabase client:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Optional for backend API:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Running the development server

We start the dev server with:

```bash
npm run dev
```

The app runs at `http://localhost:3000` by default.

## Production build

We build and start the production server with:

```bash
npm run build
npm run start
```

## How the frontend connects to the backend

We read the backend base URL from `NEXT_PUBLIC_BACKEND_URL` when set. Otherwise we default to `http://localhost:8000`. The tutor chat uses `/chat` and `/chat/session`.

## Troubleshooting

We usually check the following first:

- Missing Supabase env vars: we set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` and restart the dev server.
- Backend not reachable: we verify the API is running and `NEXT_PUBLIC_BACKEND_URL` points to it.
- Stale env vars: we stop and restart `npm run dev` after changes to `.env.local`.
