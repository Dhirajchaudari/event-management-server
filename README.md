# Event Management Server

Fastify + TypeGraphQL + Typegoose API for the OnferenceTV assignment.

## Stack

- **Fastify** + **@fastify/cookie** — HTTP server with auth cookies
- **TypeGraphQL** + **Mercurius** — GraphQL at `/graphql`
- **Typegoose** — MongoDB models
- **JWT (RS256)** — `PUBLIC_KEY` / `PRIVATE_KEY` cookie auth (same pattern as product-farming)

## Module structure

```
src/modules/
├── auth/
│   ├── resolvers/     # Queries & mutations (login, register, me, logout)
│   ├── schema/        # GraphQL ObjectType + InputType
│   ├── model/         # Typegoose User model
│   ├── services/
│   ├── validation/
│   └── interfaces/
└── events/
    ├── resolvers/     # Event queries & mutations (authenticated)
    ├── schema/
    ├── model/         # Typegoose Event model
    ├── services/
    └── validation/
```

## GraphQL endpoints

| Type | Name | Auth |
|------|------|------|
| Query | `authHealth` | Public |
| Query | `me` | Required |
| Query | `events`, `eventById` | Required |
| Mutation | `register`, `loginWithPassword`, `logout` | Public (except logout uses cookie) |
| Mutation | `createEvent`, `updateEvent`, `updateEventStatus`, `generateEventContent`, `deleteEvent` | Required |

Cookie name: `em_auth_token` (httpOnly, RS256 JWT)

## Local development

```bash
npm install
cp .env.example .env
# Copy PUBLIC_KEY and PRIVATE_KEY from product-farming/server/.env
npm run seed:admin
npm run dev
```

GraphQL playground (non-production): http://localhost:8000/graphiql

### Example auth + events

```graphql
mutation {
  loginWithPassword(input: {
    email: "admin@orbitalops.net"
    password: "EventAdmin@123"
  }) { id email role }
}

query {
  me { id email }
  events { id name date speakerName speakerDesignation }
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

## Production

- Health: `https://api-events.orbitalops.net/health`
- GraphQL: `https://api-events.orbitalops.net/graphql`
- Speaker photo upload: `POST /api/uploads/speaker-photo` (multipart `file`, auth cookie)
- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env.production`, regenerate `SERVER_ENV_B64`, and redeploy
- Set `GEMINI_API_KEY` for AI event content generation (`generateEventContent` mutation; uses lite flash models first to avoid free-tier quota limits on full flash models). Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
