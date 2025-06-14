-- Drop existing tables
DROP TABLE IF EXISTS XHashPass;
DROP TABLE IF EXISTS users;

-- Create tables based on schema.sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE XHashPass (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription_type TEXT NOT NULL,
    api_key TEXT NOT NULL,
    rate_limit INTEGER,
    allow_report BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- First, delete all existing data
DELETE FROM XHashPass;
DELETE FROM users;

-- Insert the admin user
INSERT INTO users (id, full_name, email, password, user_type)
VALUES (
    '00000000-0000-4000-a000-000000000001', -- UUID v4 format with custom admin ID
    'Ernests Smaliķis',
    'ernestssmalikis@lucenex.lv',
    '~ew6x3d"N''&buJC',
    'SuperUser'
);

-- Insert admin XHashPass entry with all privileges
INSERT INTO XHashPass (
    id,
    user_id,
    subscription_type,
    api_key,
    rate_limit,
    allow_report
)
VALUES (
    '00000000-0000-4000-b000-000000000001',
    '00000000-0000-4000-a000-000000000001',
    'Enterprise',
    'admin-' || hex(randomblob(16)), -- Generates a random API key with 'admin-' prefix
    1000, -- High rate limit for admin
    true  -- Allow reporting
);
