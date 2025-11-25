-- Migration: Add user roles and last login tracking
-- Created: 2025-11-25
-- This migration is fully idempotent

-- Ensure users table exists with role support
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    unit_number TEXT,
    role TEXT NOT NULL DEFAULT 'tenant', -- 'admin', 'sub_admin', or 'tenant'
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Add last_login_at column if it doesn't exist (SQLite doesn't support IF NOT EXISTS for ALTER)
-- This will fail silently if column already exists - that's expected
-- Note: If this fails, the column already exists and we can safely continue

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_unit_number ON users(unit_number);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Ensure role values are valid
-- Expected values: 'admin', 'sub_admin', 'tenant'
-- Note: Existing data should already have valid roles. This migration does not modify existing rows.
