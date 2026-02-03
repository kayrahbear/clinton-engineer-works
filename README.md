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
- `rds_endpoint` - Database connection endpoint
- `api_gateway_url` - API base URL
- `lambda_function_name` - Lambda function name
- `s3_deployment_bucket` - Deployment artifact bucket
- `db_secret_arn` - Secrets Manager ARN for DB credentials

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

## Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Legacy Challenge Laws

The tracker supports all standard Sims 4 Legacy Challenge succession laws:

- **Gender Law**: Matriarchy, Strict Matriarchy, Patriarchy, Strict Patriarchy, Equality, Strict Equality
- **Bloodline Law**: Strict Traditional, Traditional, Modern, Foster, Strict Foster
- **Heir Law**: First Born, Last Born, Living Will, Merit, Strength, Random, Exemplar, Democracy, Magical Bloodline, Magical Strength
- **Species Law**: Xenoarchy, Xenophobic, Brood, Tolerant
