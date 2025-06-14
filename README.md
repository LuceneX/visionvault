# LuceneX Accounts Database Service

A minimalist Cloudflare D1 database service for user account management. This service follows the principle of single responsibility, focusing on three core operations:

1. RECEIVE: Validate and accept user data
2. STORE: Save data in D1 database through the ref-punk worker
3. SEND: Return stored data when requested

## Updated Worker Architecture

This service no longer directly accesses the D1 database. It now acts as a service layer that communicates with the `ref-punk` worker which has the actual database binding.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │     │                 │
│   XHASHPASS     │────▶│  ACCOUNTS WORKER│────▶│   REF-PUNK      │────▶│       D1        │
│    WORKER       │     │   (this repo)   │     │     WORKER      │     │    DATABASE     │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
                               ▲
                               │
┌─────────────────┐            │
│                 │            │
│ EXTERNAL CLIENTS│────────────┘
│                 │
└─────────────────┘
```

### Worker Responsibilities:
- **REF-PUNK Worker**: Database Gatekeeper
  - Has direct binding to D1 database
  - Authenticates requests with REF_PUNK_API_TOKEN
  - Exposes secure API endpoints for database operations

- **This Worker (Accounts)**: Service Layer
  - Validates user input
  - Calls ref-punk for database operations
  - Handles authentication and user management

- **XHashPass Worker**: Client service
  - Uses this worker's API for user-related operations
  - Communicates with ref-punk for XHashPass specific data

## Deployment Instructions

### Setting up Environment Variables

For each environment, you'll need to set up the proper configuration:

1. **Development Environment**:
```bash
# Configure the local development URL
wrangler secret put REF_PUNK_API_TOKEN --env development
```

2. **Staging Environment**:
```bash
# Deploy to staging
wrangler deploy --env staging

# Configure the staging secrets
wrangler secret put REF_PUNK_API_TOKEN --env staging
wrangler secret put JWT_SECRET --env staging
```

3. **Production Environment**:
```bash
# Deploy to production
wrangler deploy --env production

# Configure the production secrets
wrangler secret put REF_PUNK_API_TOKEN --env production
wrangler secret put JWT_SECRET --env production
```

### Important Configuration Notes

1. The `REF_PUNK_URL` values in `wrangler.json` must be updated to your actual deployed URLs for the ref-punk worker.

2. All workers that need to communicate with the ref-punk worker must use the same `REF_PUNK_API_TOKEN` value.

3. All JWT operations must use the same `JWT_SECRET` value across your worker ecosystem.
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
