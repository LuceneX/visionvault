# Worker + D1 Database

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/d1-template)

![Worker + D1 Template Preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/cb7cb0a9-6102-4822-633c-b76b7bb25900/public)

<!-- dash-content-start -->

D1 is Cloudflare's native serverless SQL database ([docs](https://developers.cloudflare.com/d1/)). This project demonstrates using a Worker with a D1 binding to execute a SQL statement. A simple frontend displays the result of this query:

```SQL
SELECT * FROM comments LIMIT 3;
```

The D1 database is initialized with a `comments` table and this data:

```SQL
INSERT INTO comments (author, content)
VALUES
    ('Kristian', 'Congrats!'),
    ('Serena', 'Great job!'),
    ('Max', 'Keep up the good work!')
;
```

> [!IMPORTANT]
> When using C3 to create this project, select "no" when it asks if you want to deploy. You need to follow this project's [setup steps](https://github.com/cloudflare/templates/tree/main/d1-template#setup-steps) before deploying.

<!-- dash-content-end -->

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```
npm create cloudflare@latest -- --template=cloudflare/templates/d1-template
```

A live public deployment of this template is available at [https://d1-template.templates.workers.dev](https://d1-template.templates.workers.dev)

## Setup Steps

1. Install the project dependencies with a package manager of your choice:
   ```bash
   npm install
   ```
2. Create a [D1 database](https://developers.cloudflare.com/d1/get-started/) with the name "d1-template-database":
   ```bash
   npx wrangler d1 create d1-template-database
   ```
   ...and update the `database_id` field in `wrangler.json` with the new database ID.
3. Run the following db migration to initialize the database (notice the `migrations` directory in this project):
   ```bash
   npx wrangler d1 migrations apply --remote d1-template-database
   ```
4. Deploy the project!
   ```bash
   npx wrangler deploy
   ```

# LuceneX Accounts Database Service

A minimalist Cloudflare D1 database service for user account management. This service follows the principle of single responsibility, focusing on three core operations:

1. RECEIVE: Validate and accept user data
2. STORE: Save data in D1 database
3. SEND: Return stored data when requested

## Worker Architecture

This is the DATABASE WORKER in your multi-worker setup:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │    DATABASE      │
│   AUTH WORKER   │────▶│   API WORKER    │────▶│     WORKER      │
│                 │     │                 │     │   (this repo)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │       D1        │
                                                │    DATABASE     │
                                                └─────────────────┘

```

### Worker Responsibilities:
- **This Worker (Database)**: Handles all database operations
  - URL: `accounts.lucenex.workers.dev`
  - Role: Database interface
  - Operations: Create/Read user data

- **Auth Worker**: Handles authentication
  - Hashes passwords
  - Validates credentials
  - Issues tokens
  - Calls this worker at: `accounts.lucenex.workers.dev/register`

- **API Worker**: Handles API requests
  - Manages rate limiting
  - Routes requests
  - Handles API key validation
  - Calls this worker at: `accounts.lucenex.workers.dev/user/:id`

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('Client', 'Enterprise', 'Bot', 'SuperUser'))
);
```

### XHashPass Table
```sql
CREATE TABLE XHashPass (
    id UUID PRIMARY KEY NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    subscription_type TEXT NOT NULL CHECK (subscription_type IN ('Free', 'Pro', 'Premium', 'Enterprise')),
    api_key TEXT,
    rate_limit INTEGER DEFAULT 0,
    rate_limit_reset_at TIMESTAMP,
    allow_report BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### POST /register
Registers a new user and creates their API key.

**Request:**
```json
{
  "full_name": "string",
  "email": "string",
  "password": "string",
  "user_type": "Client | Enterprise | Bot | SuperUser"
}
```

**Response:**
```json
{
  "id": "uuid",
  "api_key": "uuid"
}
```

### GET /user/:id
Retrieves user information.

**Response:**
```json
{
  "id": "uuid",
  "full_name": "string",
  "email": "string",
  "user_type": "string",
  "api_key": "string",
  "subscription_type": "string"
}
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create D1 database:
   ```bash
   npx wrangler d1 create LuceneXAccounts
   ```

3. Update wrangler.json with your database ID

4. Run migrations:
   ```bash
   npx wrangler d1 migrations apply --remote LuceneXAccounts
   ```

5. Deploy:
   ```bash
   npx wrangler deploy
   ```

## Security Notes

- Password hashing is handled by the authentication worker
- API key rotation and management should be handled by the API gateway
- Rate limiting should be implemented at the edge
