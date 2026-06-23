# Event Management Server

Fastify + TypeGraphQL + Typegoose API for the OnferenceTV assignment.

## Stack

- **Fastify** — HTTP server
- **TypeGraphQL** + **Mercurius** — GraphQL at `/graphql`
- **Typegoose** — MongoDB models

## Module structure

```
src/modules/events/
├── controllers/   # TypeGraphQL resolvers
├── inputs/        # GraphQL ObjectType + InputType
├── model/         # Typegoose models
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

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Service + DB health |
| `POST /graphql` | GraphQL API |

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

  updateEvent(id: "EVENT_ID", input: { name: "Updated name" }) { id name }

  deleteEvent(id: "EVENT_ID")
}
```

## Deploy

Production health check:

```bash
curl -s https://api-events.orbitalops.net/health
```

GraphQL endpoint: `https://api-events.orbitalops.net/graphql`
