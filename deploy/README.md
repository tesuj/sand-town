# pvprospect deployment

Production preview lives at:

```
https://pvprospect2.preview.solaisol.com
```

The site is fronted by Nginx Proxy Manager (NPM) under the wildcard cert
`*.preview.solaisol.com` (cert id 19) and forwarded to a Docker Compose
stack on the VPS.

## Stack

- `pvprospect-app` — Next.js production server (multi-stage Dockerfile, Node 20-alpine)
- `pvprospect-db` — Postgres 16
- NPM proxy host `pvprospect2.preview.solaisol.com` → `172.18.0.1:3002`

## Bring it up

```bash
cd /opt/gastown/sand_town/mayor/rig
cp .env.example .env       # fill PVWATTS_API_KEY + NOMINATIM_CONTACT_EMAIL
POSTGRES_PORT=5439 APP_PORT=3002 docker compose up -d --build
```

The app binds to host port `APP_PORT`. From the npm container that maps to
the host gateway IP (`172.18.0.1` on `npm_default` bridge).

## Register the NPM proxy host

```bash
cd /opt/agents/autopilot
python3 -c "import sys; sys.path.insert(0,'src'); from autopilot import npm; \
  print(npm.create_proxy_host('pvprospect2', '172.18.0.1', 3002))"
```

`create_proxy_host` is idempotent: if a host for the slug already exists it
returns the URL without touching it. To change the forward target use
`delete_proxy_host_for_slug('pvprospect2')` first.

## Run migrations

```bash
docker compose exec app npx prisma migrate deploy
```

## Tear down

```bash
docker compose down            # keeps data volume
docker compose down -v         # wipes data volume
python3 -c "import sys; sys.path.insert(0,'src'); from autopilot import npm; \
  npm.delete_proxy_host_for_slug('pvprospect2')"
```
