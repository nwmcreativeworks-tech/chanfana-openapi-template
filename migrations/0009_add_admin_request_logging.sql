-- Migration: Add admin request logging table
-- Created: 2025-11-23
-- Purpose: Track all tenant requests and interactions for admin dashboard

CREATE TABLE IF NOT EXISTS admin_request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    request_type TEXT NOT NULL,
    user_name TEXT,
    phone_or_email TEXT,
    location TEXT,
    issue_category TEXT,
    equipment_type TEXT,
    message_details TEXT,
    status TEXT DEFAULT 'Active',
    source TEXT DEFAULT 'Tenant Portal',
    session_id TEXT,
    conversation_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_type ON admin_request_logs(request_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_status ON admin_request_logs(status);
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON admin_request_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_logs_session ON admin_request_logs(session_id);
