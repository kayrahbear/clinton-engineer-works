# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack web application for tracking multi-generational Sims 4 Legacy Challenge playthroughs. The architecture uses React frontend, AWS Lambda backend with API Gateway, and PostgreSQL RDS database, all managed via Terraform.

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS + React Router
- **Backend**: Node.js 20 on AWS Lambda (CommonJS modules)
- **Database**: PostgreSQL 15+ with pg driver
- **Infrastructure**: Terraform (AWS: Lambda, API Gateway, RDS, VPC, Secrets Manager)
- **Deployment**: S3 for Lambda packages, CloudWatch for logs

## Project Structure

```
sims-legacy-tracker/
├── frontend/          # React app with Vite
│   └── src/
│       ├── api/       # API client layer (with auth token injection)
│       ├── components/  # Reusable React components
│       ├── context/   # React contexts (auth, active legacy)
│       ├── pages/     # Route-level page components
│       └── config.js  # API endpoint configuration
├── backend/           # Lambda function handlers
│   └── src/
│       ├── handlers/  # Route handlers (auth, sims, reference, relationships, etc.)
│       ├── db/        # Database pool with Secrets Manager support
│       ├── middleware/  # CORS, error handling, and auth middleware
│       ├── utils/     # JWT, validation, authorization helpers
│       └── index.js   # Main Lambda handler with regex routing
├── database/
│   ├── schema.sql     # Complete PostgreSQL schema
│   ├── migrations/    # Paired .up.sql/.down.sql migration files
│   ├── scripts/       # Migration runner, seed scripts
│   └── seed-data/     # Game content seed data
└── infrastructure/    # Terraform AWS configuration
```

## Development Commands

### Frontend

```bash
cd frontend
npm install
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

Requires Node.js 20.19+. If using nvm: `nvm use 20.19.0`

### Backend

```bash
cd backend
npm install
npm run dev          # Start local dev server on port 3001
npm run build        # Build Lambda deployment package
```

**Local dev server** (backend/src/dev-server.js) listens on port 3001 and uses environment variables from `.env` for database connection.

### Database

**Local setup:**
```bash
createdb sims_legacy
psql -d sims_legacy -f database/schema.sql
```

**Migrations:**
```bash
cd backend
npm run db:migrate              # Apply pending migrations
npm run db:migrate:status       # Show migration status
npm run db:migrate:down         # Rollback last migration
npm run db:migrate:baseline     # Mark migrations as applied without running
```

Migration files live in `database/migrations/` as paired `NNN_description.up.sql` and `NNN_description.down.sql`. The migration runner tracks state in the `schema_migrations` table.

**Seeding:**
```bash
cd backend
npm run seed:reference     # Seed skills, traits, aspirations, careers, worlds
npm run seed:legacy        # Seed Pack Legacy Challenge (35 generations)
npm run seed              # Generic seed script
npm run db:clear          # Clear all data (keeps schema)
```

**Environment variables** (backend/.env or infrastructure environment):
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `DB_SSL=true` - Enable SSL (required for RDS)
- `DB_SECRET_ARN` - Use AWS Secrets Manager instead of env vars (Lambda only)
- `JWT_SECRET` - JWT signing key (local development)
- `JWT_SECRET_ARN` - Secrets Manager ARN for JWT key (Lambda only)

### Infrastructure

```bash
cd infrastructure
terraform init
terraform plan
terraform apply
terraform output       # View outputs (API URL, RDS endpoint, etc.)
```

**Key outputs:**
- `api_gateway_url` - Base API URL
- `rds_address` / `rds_endpoint` - Database connection
- `ops_instance_id` - SSM-managed instance for RDS access
- `db_secret_arn` - Secrets Manager ARN for database credentials
- `jwt_secret_arn` - Secrets Manager ARN for JWT signing key

**RDS access via SSM port forwarding:**
```bash
# Get outputs
terraform output -raw ops_instance_id
terraform output -raw rds_address

# Forward RDS port through ops instance
aws ssm start-session \
  --target <ops-instance-id> \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["<rds-address>"],"portNumber":["5432"],"localPortNumber":["5432"]}'

# In another terminal, run migrations
cd backend
DB_HOST=127.0.0.1 DB_PORT=5432 DB_SSL=true npm run db:migrate
```

## Architecture Patterns

### Backend Routing

The Lambda handler (backend/src/index.js) uses **regex-based routing** to match incoming API Gateway events. Routes are tested in specific order:

1. **Sub-resource ID routes** (2 UUIDs) - e.g., `/sims/:simId/traits/:traitId`
2. **Sub-resource collection routes** (1 UUID) - e.g., `/sims/:simId/traits`
3. **Main resource routes** - e.g., `/sims/:simId`

All handlers follow the pattern: `(origin, userId, ...resourceIds, body?) => response`

Response format:
```javascript
{
  statusCode: 200,
  headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
  body: JSON.stringify(data)
}
```

### Database Connection

**backend/src/db/pool.js** creates a singleton connection pool that:
- Uses local env vars when `DB_SECRET_ARN` is not set
- Fetches credentials from AWS Secrets Manager when `DB_SECRET_ARN` is set (Lambda environment)
- Automatically enables SSL when `DB_SSL=true` or when using Secrets Manager

All handlers should use: `const pool = await getPool()`

### Authentication & Authorization

The app uses self-hosted JWT authentication (bcrypt + jsonwebtoken).

**Auth middleware** (`backend/src/middleware/auth.js`):
- `withAuth(handler)` extracts Bearer token, verifies JWT, attaches `event.userId`
- Handler chain: `withErrorHandling(withAuth(handler))`
- Public routes (no auth required): health, `/reference/*`, `/generation-templates/*`, `/auth/register`, `/auth/login`, `/auth/refresh`

**JWT utilities** (`backend/src/utils/jwt.js`):
- Access tokens: 15-minute expiry, contain `{ userId, email, type: "access" }`
- Refresh tokens: 7-day expiry, stored hashed in `refresh_tokens` table, rotated on use
- Secret source: `JWT_SECRET` env var (local) or `JWT_SECRET_ARN` via Secrets Manager (Lambda)

**Authorization** (`backend/src/utils/authorization.js`):
- `verifyLegacyOwnership(legacyId, userId)` - checks `legacies.user_id`
- `verifySimOwnership(simId, userId)` - JOINs sims → legacies
- `verifyGenerationOwnership(generationId, userId)` - JOINs generations → legacies
- `verifyGoalOwnership(goalId, userId)` - JOINs goals → generations → legacies
- All return boolean; handlers return 404 on failure (avoids leaking resource existence)

**Frontend auth** (`frontend/src/context/AuthProvider.jsx`):
- `useAuth()` hook provides `{ user, loading, login, register, logout, isAuthenticated }`
- API client (`frontend/src/api/client.js`) injects `Authorization: Bearer` header from localStorage
- On 401: attempts token refresh via `/auth/refresh`, retries request once, dispatches `auth:logout` event on failure
- `ProtectedRoute` component gates all app routes; unauthenticated users redirect to `/login`

### Error Handling

All route handlers are wrapped in `withErrorHandling()` middleware (backend/src/middleware/error-handler.js) which catches errors and returns appropriate HTTP responses.

### CORS

CORS headers are added via `getCorsHeaders(origin)` from backend/src/middleware/cors.js. API Gateway also has CORS configured for OPTIONS preflight requests.

### Database Schema

The schema uses PostgreSQL enums extensively for succession laws, life stages, occult types, trait types, career types, etc. Key tables:

- **Auth**: `users`, `refresh_tokens`
- **Core**: `legacies` (has `user_id` FK to users), `generations`, `sims`
- **Reference data**: `skills`, `traits`, `aspirations`, `careers`, `worlds`, `collections`
- **Junction tables**: `sim_traits`, `sim_skills`, `sim_aspirations`, `sim_careers`, `relationships`
- **Tracking**: `life_events`, `generation_goals`, `legacy_collections`

All IDs use UUID v4 via `uuid-ossp` extension.

### Frontend API Layer

API calls are centralized in `frontend/src/api/` with base URL configured in `frontend/src/api/client.js`. The client reads `VITE_API_BASE_URL` from environment, defaulting to `http://localhost:3001/api/v1` for development. The client automatically injects Bearer tokens and handles 401 refresh logic.

### Frontend Routing

React Router v7 manages client-side routing. All app routes are wrapped in `ProtectedRoute` which requires authentication.

**Public routes** (no auth):
- `/login` - Login page
- `/register` - Registration page

**Protected routes** (inside Layout):
- `/` - Home
- `/sims` - Sim list
- `/sims/:id` - Sim detail
- `/sims/:id/family-tree` - Family tree visualization
- `/sims/new` - Create new sim
- `/legacy` - Legacy landing
- `/legacy/new` - Legacy creation wizard
- `/legacy/:legacyId` - Legacy dashboard
- `/legacy/:legacyId/generations/:generationId` - Generation detail

## Key Conventions

### Backend

- Use CommonJS (`require`/`module.exports`) - Lambda environment is Node.js 20 but not ESM
- All route handlers are in `backend/src/handlers/`
- Handler signature: `async (origin, userId, ...resourceIds, body?) => response`
- `userId` is injected by auth middleware; all authenticated handlers receive it as second param
- Database queries use parameterized queries (`$1`, `$2`) to prevent SQL injection
- UUIDs are validated via regex before querying database
- Return 404 for missing resources (and for unauthorized access to avoid leaking existence), 400 for validation errors, 401 for auth failures, 500 for server errors

### Frontend

- Use ES modules (`import`/`export`)
- Tailwind CSS for all styling (avoid inline styles)
- Components in `src/components/` are reusable; page-specific logic in `src/pages/`
- Loading states with `<LoadingSpinner>` or `<LoadingSkeleton>`
- Error states with `<ErrorState>` component
- Modal component in `src/components/Modal.jsx` for overlays

### Database

- All migrations must have paired `.up.sql` and `.down.sql` files
- Use `uuid_generate_v4()` for UUID generation
- Enum types for fixed value sets
- Nullable `pack_required` column means base game content
- Soft deletes: `sim_status='deleted'` instead of DROP

### Infrastructure

- Environment-specific config via `terraform.tfvars`
- Lambda packages stored in S3 (`s3_deployment_bucket`)
- RDS runs in private subnets, accessed via VPC Lambda or SSM port forwarding
- Secrets Manager holds RDS credentials and JWT signing key
- CloudWatch logs retention: 14 days (dev), 90 days (prod)

## API Endpoint Patterns

Base path: `/api/v1`

**Authentication** (public, no Bearer token required):
- `POST /auth/register` - Create account (email, password, display_name) → returns user + tokens
- `POST /auth/login` - Sign in (email, password) → returns user + tokens
- `POST /auth/refresh` - Rotate refresh token → returns new token pair

**Authentication** (requires Bearer token):
- `GET /auth/me` - Get current user profile
- `POST /auth/logout` - Revoke refresh token(s)

**Reference data** (read-only, public):
- `GET /reference/skills`
- `GET /reference/traits`
- `GET /reference/aspirations`
- `GET /reference/careers`
- `GET /reference/worlds`

**Sims CRUD**:
- `POST /sims` - Create sim
- `GET /sims/:simId` - Get sim by ID
- `GET /legacies/:legacyId/sims?generation=N` - Get sims in legacy (optional generation filter)
- `PUT /sims/:simId` - Update sim
- `DELETE /sims/:simId` - Soft delete sim

**Sim relationships**:
- `GET /sims/:simId/traits` - Get sim's traits
- `POST /sims/:simId/traits` - Add trait to sim
- `DELETE /sims/:simId/traits/:traitId` - Remove trait from sim
- `GET /sims/:simId/skills` - Get sim's skills
- `POST /sims/:simId/skills` - Add/update skill (upsert)
- `DELETE /sims/:simId/skills/:skillId` - Remove skill
- `GET /sims/:simId/aspirations` - Get sim's aspirations
- `POST /sims/:simId/aspirations` - Add aspiration
- `PUT /sims/:simId/aspirations/:aspirationId` - Update aspiration progress
- `DELETE /sims/:simId/aspirations/:aspirationId` - Remove aspiration
- `GET /sims/:simId/careers` - Get sim's careers
- `POST /sims/:simId/careers` - Add career
- `PUT /sims/:simId/careers/:simCareerId` - Update career progress
- `DELETE /sims/:simId/careers/:simCareerId` - Remove career
- `GET /sims/:simId/family-tree` - Get family tree (ancestors/descendants)
- `GET /sims/:simId/relationships` - Get relationships
- `POST /sims/:simId/relationships` - Add relationship
- `PUT /sims/:simId/relationships/:relationshipId` - Update relationship
- `DELETE /sims/:simId/relationships/:relationshipId` - Remove relationship

## Testing & Debugging

**No test framework** is currently configured. Tests should be added using a framework like Jest or Vitest.

**Backend debugging**: Use `console.log()` - logs appear in CloudWatch (AWS) or stdout (local dev server).

**Frontend debugging**: Browser DevTools. Vite provides source maps.

**Database debugging**: Use `psql` to connect and run queries:
```bash
psql -d sims_legacy -U sims_admin
```

## Deployment

**Lambda deployment** is manual. Build the package and upload to S3:

```bash
cd backend
npm run build    # Creates deployment package
# Upload to S3 and update Lambda function (manual step or CI/CD)
```

Terraform expects Lambda code at `s3://s3_deployment_bucket/lambda-placeholder.zip`. Update `aws_lambda_function.api` resource to point to real deployment package.

**Frontend deployment** is not yet configured. Build with `npm run build` and deploy `dist/` to a static host (S3 + CloudFront, Vercel, Netlify, etc.).

## Important Notes

- **No production deployment** is currently live. All infrastructure is dev environment.
- **CORS**: Currently allows `*` origin in dev. Update `CORS_ALLOWED_ORIGIN` for production.
- **Authentication**: JWT-based auth with email/password. Tokens stored in localStorage (acceptable for personal tool; can migrate to httpOnly cookies later). A default admin user (`00000000-0000-0000-0000-000000000001`) is created by migration 007; set its password via `database/scripts/seed-admin-user.js`.
- **Image upload**: Sim portraits are not yet implemented (S3 upload needed).
- **Obsidian export**: Not implemented (future feature per roadmap).
- Legacy Challenge succession laws (gender, bloodline, heir, species) are modeled but UI not fully wired.
