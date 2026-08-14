# DiceMaster

A full-stack dice roller. Enter standard tabletop dice notation (for example
`2d6+3`, `d20`, or `4d8-1`) and DiceMaster rolls it, shows the per-die
breakdown and total, and keeps a running history.

- **Server** — an Express + TypeScript API (`server/`) with a dice-notation
  engine and an in-memory roll history.
- **Client** — a Vite + React + TypeScript single-page app (`client/`) with a
  modern UI. In development it proxies `/api` to the server.

## Prerequisites

- Node.js >= 20 (developed against Node 22)
- npm 10+

## Install

This repo is an npm workspaces monorepo. A single install from the root pulls
dependencies for both the server and client:

```bash
npm install
```

## Develop

Run both dev servers together:

```bash
npm run dev
```

Or run them individually:

```bash
npm run dev:server   # Express API on http://localhost:3001
npm run dev:client   # Vite dev server on http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` requests to
the API on port 3001.

## API

| Method   | Path           | Description                                   |
| -------- | -------------- | --------------------------------------------- |
| `GET`    | `/api/health`  | Health check.                                 |
| `POST`   | `/api/roll`    | Roll dice. Body: `{ "notation": "2d6+3" }`.   |
| `GET`    | `/api/history` | Recent rolls (most recent first).             |
| `DELETE` | `/api/history` | Clear the roll history.                       |

Example:

```bash
curl -s -X POST http://localhost:3001/api/roll \
  -H 'Content-Type: application/json' \
  -d '{"notation":"2d6+3"}'
```

## Quality checks

```bash
npm run typecheck   # type-check server and client
npm test            # run the dice-engine unit tests (Vitest)
npm run build       # compile the server and build the client bundle
```

## Cloud Agent environment

`.cursor/environment.json` configures the Cursor Cloud Agent environment:
`npm install` refreshes dependencies, and the `server` and `client` dev servers
run as persistent terminals on ports 3001 and 5173.
