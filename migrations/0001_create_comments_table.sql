-- Create Users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('Client', 'Enterprise', 'Bot', 'SuperUser'))
);
-- Create XHashPass table if it doesn't exist
CREATE TABLE IF NOT EXISTS XHashPass (
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