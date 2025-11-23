-- Migration: Add room-based thermostat control with tenant permissions
-- Created: 2025-11-23

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    room_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Thermostat devices from Alexa
CREATE TABLE IF NOT EXISTS thermostat_devices_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    alexa_device_id TEXT NOT NULL UNIQUE,
    device_name TEXT NOT NULL,
    assigned_room_id INTEGER,
    is_active INTEGER DEFAULT 1,
    manufacturer TEXT,
    model TEXT,
    capabilities TEXT,
    last_sync DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Tenant room permissions
CREATE TABLE IF NOT EXISTS tenant_room_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    tenant_name TEXT NOT NULL,
    tenant_email TEXT NOT NULL,
    room_id INTEGER NOT NULL,
    can_control_temp INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_thermostat_devices_v2_alexa_id ON thermostat_devices_v2(alexa_device_id);
CREATE INDEX IF NOT EXISTS idx_thermostat_devices_v2_room ON thermostat_devices_v2(assigned_room_id);
CREATE INDEX IF NOT EXISTS idx_tenant_room_permissions_tenant ON tenant_room_permissions(tenant_email);
CREATE INDEX IF NOT EXISTS idx_tenant_room_permissions_room ON tenant_room_permissions(room_id);

-- Insert default rooms for Hospital Church
INSERT OR IGNORE INTO rooms (room_name, description) VALUES
('Sanctuary', 'Main sanctuary worship area'),
('Fellowship Hall', 'Fellowship and overflow hall'),
('Tech Booth', 'Audio/visual control booth'),
('Office Suite', 'Administrative offices'),
('Green Room', 'Preparation and waiting area');
