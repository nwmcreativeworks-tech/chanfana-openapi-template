-- Migration: Add thermostat devices and user permissions
-- Created: 2025-11-25
-- This migration is fully idempotent

-- Ensure thermostat_devices table exists
CREATE TABLE IF NOT EXISTS thermostat_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    alexa_endpoint_id TEXT,
    device_name TEXT,
    room_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for thermostat_devices
CREATE INDEX IF NOT EXISTS idx_thermostat_devices_room ON thermostat_devices(room_name);
CREATE INDEX IF NOT EXISTS idx_thermostat_devices_endpoint ON thermostat_devices(alexa_endpoint_id);

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

-- Insert default thermostat devices for Hospital Church rooms
INSERT OR IGNORE INTO thermostat_devices (id, device_name, room_name, alexa_endpoint_id)
VALUES
    (1, 'Sanctuary Thermostat', 'Sanctuary', NULL),
    (2, 'Fellowship Hall Thermostat', 'Fellowship Hall', NULL),
    (3, 'Tech Booth Thermostat', 'Tech Booth', NULL),
    (4, 'Office Suite Thermostat', 'Office Suite', NULL),
    (5, 'Green Room Thermostat', 'Green Room', NULL);
