-- Migration: Add thermostat permissions system
-- Created: 2025-11-25
-- EXTENDS existing thermostat_devices table (does NOT recreate it)

-- NOTE: thermostat_devices already exists with full schema from migration 0005
-- We only need to add user_thermostat_permissions table

-- Create user-thermostat permissions join table
CREATE TABLE IF NOT EXISTS user_thermostat_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    thermostat_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    granted_by_user_id INTEGER,
    role_scope TEXT DEFAULT 'tenant',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (thermostat_id) REFERENCES thermostat_devices(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes for user_thermostat_permissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_thermostat_unique
ON user_thermostat_permissions(user_id, thermostat_id);

CREATE INDEX IF NOT EXISTS idx_user_thermostat_user
ON user_thermostat_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_thermostat_thermostat
ON user_thermostat_permissions(thermostat_id);

-- Add index for existing thermostat_devices columns (if not exist)
CREATE INDEX IF NOT EXISTS idx_thermostat_devices_endpoint ON thermostat_devices(alexa_endpoint_id);
