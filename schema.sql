DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS XHashPass;
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
