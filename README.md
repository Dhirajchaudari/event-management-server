# Event Management Server

Fastify + TypeScript API for the OnferenceTV assignment. Phase 1: health endpoint, MongoDB, Docker blue/green deploy, GitHub Actions CI/CD to GCP.

## Local development

```bash
npm install
cp .env.example .env
# set MONGODB_URI
npm run dev
curl http://localhost:8000/health
```

## API endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Service + DB health |
| `POST` | `/api/events` | Create event |
| `GET` | `/api/events` | List events |
| `GET` | `/api/events/:id` | Get event |
| `PUT` | `/api/events/:id` | Update event |
| `DELETE` | `/api/events/:id` | Delete event |

## Domains

| Service | URL |
|---------|-----|
| API (production) | `https://api-events.orbitalops.net` |
| Frontend (later) | `https://events.orbitalops.net` |

## Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for GCP VM, Atlas, Cloudflare, Nginx, and GitHub secrets setup.

```bash
curl -s https://api-events.orbitalops.net/health
```
