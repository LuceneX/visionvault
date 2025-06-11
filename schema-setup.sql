DROP TABLE IF EXISTS XHashPass;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0
);

CREATE TABLE XHashPass (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription_type TEXT NOT NULL,
    api_key TEXT UNIQUE,
    rate_limit INTEGER DEFAULT 0,
    rate_limit_reset_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
