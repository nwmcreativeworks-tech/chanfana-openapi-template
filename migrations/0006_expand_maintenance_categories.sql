-- Migration: Expand maintenance request categories and add photo support
-- Created: 2025-11-23

-- SQLite doesn't support modifying CHECK constraints directly
-- We need to create a new table with updated constraints, copy data, and replace

-- Step 1: Create new table with expanded categories
CREATE TABLE maintenance_requests_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    conversation_id INTEGER,
    tenant_name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('hvac', 'plumbing', 'electrical', 'appliance', 'equipment', 'media_equipment', 'chairs', 'stage', 'musical_instruments', 'other')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'emergency')),
    description TEXT NOT NULL,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Step 2: Copy existing data
INSERT INTO maintenance_requests_new (id, conversation_id, tenant_name, unit_number, category, priority, description, status, created_at, updated_at, resolved_at)
SELECT id, conversation_id, tenant_name, unit_number, category, priority, description, status, created_at, updated_at, resolved_at
FROM maintenance_requests;

-- Step 3: Drop old table
DROP TABLE maintenance_requests;

-- Step 4: Rename new table
ALTER TABLE maintenance_requests_new RENAME TO maintenance_requests;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_unit_number ON maintenance_requests(unit_number);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_to ON maintenance_requests(assigned_to);
