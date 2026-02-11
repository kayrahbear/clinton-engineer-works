# Sims 4 Legacy Challenge Tracker

A full-stack web application for tracking multi-generational Sims 4 Legacy Challenge playthroughs.

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | AWS Lambda + API Gateway |
| Database | PostgreSQL (AWS RDS) |
| Infrastructure | Terraform |
| Export | Obsidian markdown files |

## Project Structure

```
sims-legacy-tracker/
├── frontend/              # React + Vite app
├── backend/               # Lambda function handlers
├── infrastructure/        # Terraform configuration
├── database/
│   ├── schema.sql         # Complete PostgreSQL schema
│   ├── migrations/        # Database migrations
│   └── seed-data/         # Seed data for game content
└── README.md
```

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Terraform 1.5+
- AWS CLI configured with appropriate credentials

## Database Setup

### Local Development

1. Create a local PostgreSQL database:

```bash
createdb sims_legacy
```

2. Apply the schema:

```bash
psql -d sims_legacy -f database/schema.sql
```

3. (Optional) Load seed data:

```bash
psql -d sims_legacy -f database/seed-data/*.sql
```

### Database Schema

The schema includes 23 tables covering:

- **Core tables**: legacies, generations, sims
- **Reference data**: skills, traits, aspirations, careers, worlds, collections
- **Relationships**: sim_traits, sim_skills, sim_aspirations, sim_careers, relationships
- **Tracking**: life_events, generation_goals, legacy_collections
- **Challenge rules**: generation_required_traits, generation_required_careers

All succession laws (gender, bloodline, heir, species) are modeled as PostgreSQL enums.

## Database Migrations

Migrations live in `database/migrations` using paired files:

- `NNN_description.up.sql`
- `NNN_description.down.sql`

The migration runner tracks applied migrations in a `schema_migrations` table.

### Apply migrations (local or RDS)

```bash
cd backend
npm run db:migrate
```

### Check migration status

```bash
cd backend
npm run db:migrate:status
```

### Roll back the last migration

```bash
cd backend
npm run db:migrate:down
```

### Baseline existing schema

If your database already has the schema applied (e.g., from `schema.sql`), record
the migration as applied without re-running it:

```bash
cd backend
npm run db:migrate:baseline
```

### Environment variables

The migration runner uses the same DB environment variables as the backend:

```
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

### RDS migrations (direct connection)

RDS is publicly accessible (secured by strong password + SSL). After Terraform
apply, connect directly:

1. Fetch the RDS endpoint:

```bash
cd infrastructure
terraform output -raw rds_address
```

2. Run migrations with SSL enabled:

```bash
cd backend
DB_HOST=<rds-address> DB_PORT=5432 DB_SSL=true npm run db:migrate
```

## Infrastructure Deployment

### First-Time Setup

1. Copy the example variables file:

```bash
cd infrastructure
cp terraform.tfvars.example terraform.tfvars
```

2. Edit `terraform.tfvars` with your values.

3. Initialize and deploy:

```bash
terraform init
terraform plan
terraform apply
```

### Key Outputs

After deployment, Terraform outputs:
- `rds_endpoint` / `rds_address` - Database connection endpoint (publicly accessible)
- `api_gateway_url` - API base URL
- `lambda_function_name` - Lambda function name
- `s3_deployment_bucket` - Deployment artifact bucket
- `db_secret_arn` - Secrets Manager ARN for DB credentials
- `jwt_secret_arn` - Secrets Manager ARN for JWT signing key

### Lambda package bucket

Lambda deployment packages are stored in the S3 bucket `s3_deployment_bucket`.
Terraform uploads a placeholder zip at `lambda-placeholder.zip` until the real
deployment workflow is wired up.

### Environment Differences

| Setting | Dev | Prod |
|---------|-----|------|
| RDS instance | db.t3.micro | Configurable |
| Multi-AZ | No | Yes |
| Backup retention | 1 day | 7 days |
| Deletion protection | No | Yes |
| Log retention | 14 days | 90 days |

## Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

If you're using nvm, ensure Node 20.19+ is active before installing dependencies:

```bash
nvm use 20.19.0
```

## Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Secrets Manager DB credentials (Lambda)

In AWS, the Lambda is configured with `DB_SECRET_ARN`. When this is set, the
backend loads DB credentials from Secrets Manager instead of local env vars.

The secret JSON should include:

```json
{
  "username": "sims_admin",
  "password": "...",
  "host": "...",
  "port": 5432,
  "dbname": "sims_legacy",
  "engine": "postgres"
}
```

## Legacy Challenge Laws

The tracker supports all standard Sims 4 Legacy Challenge succession laws:

- **Gender Law**: Matriarchy, Strict Matriarchy, Patriarchy, Strict Patriarchy, Equality, Strict Equality
- **Bloodline Law**: Strict Traditional, Traditional, Modern, Foster, Strict Foster
- **Heir Law**: First Born, Last Born, Living Will, Merit, Strength, Random, Exemplar, Democracy, Magical Bloodline, Magical Strength
- **Species Law**: Xenoarchy, Xenophobic, Brood, Tolerant
