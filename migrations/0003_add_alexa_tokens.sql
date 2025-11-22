-- Migration: Add Alexa account linking tables
-- Created: 2025-11-22

-- Store Alexa access tokens linked to unit numbers
CREATE TABLE IF NOT EXISTS alexa_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    access_token TEXT NOT NULL UNIQUE,
    refresh_token TEXT,
    unit_number TEXT NOT NULL,
    tenant_name TEXT,
    alexa_user_id TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_alexa_tokens_access_token ON alexa_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_alexa_tokens_unit_number ON alexa_tokens(unit_number);
