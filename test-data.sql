-- Add test users
INSERT INTO users (id, full_name, email, password, user_type, created_at) 
VALUES 
('user-1', 'Test User', 'test@example.com', 'password123', 'User', CURRENT_TIMESTAMP),
('admin-1', 'Admin User', 'admin@example.com', 'admin123', 'Admin', CURRENT_TIMESTAMP);

-- Add test XHashPass entries
INSERT INTO XHashPass (id, user_id, subscription_type, api_key, rate_limit, allow_report, created_at) 
VALUES 
('xhp-1', 'user-1', 'Free', 'user-api-key-123', 100, true, CURRENT_TIMESTAMP),
('xhp-2', 'admin-1', 'Premium', 'admin-api-key-456', 1000, true, CURRENT_TIMESTAMP);
