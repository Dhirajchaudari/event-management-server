# Event Management Server

Fastify + TypeGraphQL + Typegoose API for the OnferenceTV assignment.

## Stack

- **Fastify** — HTTP server
- **TypeGraphQL** + **Mercurius** — GraphQL at `/graphql`
- **Typegoose** — MongoDB models
- **REST** — `/api/events` CRUD (same service layer as GraphQL)

## Module structure

```
src/modules/events/
├── controllers/   # TypeGraphQL resolvers
├── inputs/        # GraphQL ObjectType + InputType
├── model/         # Typegoose models
├── routes/        # REST routes
├── services/      # Business logic
├── validation/    # Input validation
└── index.ts
```

## Local development

```bash
npm install
cp .env.example .env
npm run dev
curl http://localhost:8000/health
```

GraphQL playground (non-production): http://localhost:8000/graphiql

## API

### REST

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Service + DB health |
| `POST` | `/api/events` | Create event |
| `GET` | `/api/events` | List events |
| `GET` | `/api/events/:id` | Get event |
| `PUT` | `/api/events/:id` | Update event |
| `DELETE` | `/api/events/:id` | Delete event |

### GraphQL

```graphql
query {
  events { id name date speakerName speakerDesignation }
  eventById(id: "EVENT_ID") { id name }
}

mutation {
  createEvent(input: {
    name: "Advances in Fetal Medicine"
    date: "2026-08-15"
    speakerName: "Dr. Jane Smith"
    speakerDesignation: "Senior Consultant"
  }) { id name }
}
```

## Deploy

See `DEPLOYMENT.md` (local only, not committed) for GCP, Atlas, Cloudflare, and CI/CD setup.
