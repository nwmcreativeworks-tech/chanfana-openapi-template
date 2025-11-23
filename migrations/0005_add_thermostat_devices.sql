-- Migration: Add physical thermostat devices
-- Created: 2025-11-22

-- Store physical Alexa thermostats
CREATE TABLE IF NOT EXISTS thermostat_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    device_id TEXT NOT NULL UNIQUE,
    device_name TEXT NOT NULL,
    friendly_name TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    unit_number TEXT,
    user_id INTEGER,
    alexa_endpoint_id TEXT,
    capabilities TEXT,
    is_online INTEGER DEFAULT 1,
    current_temperature REAL,
    target_temperature REAL,
    mode TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_sync DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Note: Columns for thermostat_settings table are commented out to make migration idempotent
-- If these columns don't exist, add them manually:
-- ALTER TABLE thermostat_settings ADD COLUMN device_id INTEGER;
-- ALTER TABLE thermostat_settings ADD COLUMN is_virtual INTEGER DEFAULT 1;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_thermostat_devices_device_id ON thermostat_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_thermostat_devices_unit_number ON thermostat_devices(unit_number);
CREATE INDEX IF NOT EXISTS idx_thermostat_devices_user_id ON thermostat_devices(user_id);

-- Store Alexa API credentials
CREATE TABLE IF NOT EXISTS alexa_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'Bearer',
    expires_at DATETIME NOT NULL,
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
