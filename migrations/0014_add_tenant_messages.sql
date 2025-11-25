-- Migration: Add tenant messages and notifications
-- Created: 2025-11-25
-- This migration is fully idempotent

CREATE TABLE IF NOT EXISTS tenant_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    sender_user_id INTEGER NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    message_type TEXT DEFAULT 'notice',
    is_read INTEGER DEFAULT 0,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_messages_user ON tenant_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_messages_sender ON tenant_messages(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_messages_unread ON tenant_messages(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tenant_messages_created ON tenant_messages(created_at);
