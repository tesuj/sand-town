# pvprospect

Quick solar generation estimates from PVGIS and PVWatts. Internal Solar AI Solutions tool.

See [`pvprospect_PRD_v1_2_1.md`](./pvprospect_PRD_v1_2_1.md) for the full product spec.

## Stack

- **Next.js 16** App Router + React 19 + TypeScript strict
- **Tailwind 4** for styling
- **Prisma 5 + PostgreSQL 16** for persistence
- **Zod** for runtime validation
- **Vitest** (unit) + **Playwright** (e2e)
- **Docker Compose** for local app + db
- **Node 20+** (engine constraint)

## Local development

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env.local
# Edit .env.local — at minimum set PVWATTS_API_KEY and NOMINATIM_CONTACT_EMAIL.

# 3. Bring up Postgres
docker compose up -d db

# 4. Generate Prisma client + apply migrations
npm run db:generate
npm run db:migrate

# 5. Start dev server
npm run dev
# → http://localhost:3000
```

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier write / check |
| `npm test` | Vitest unit suite |
| `npm run test:e2e` | Playwright end-to-end |
| `npm run db:migrate` | Prisma dev migration |
| `npm run db:studio` | Prisma Studio UI |

## Full stack via Docker

```bash
docker compose up --build
# app:    http://localhost:3000
# db:     localhost:5432 (pvprospect / pvprospect / pvprospect)
```

polecat-test-line
