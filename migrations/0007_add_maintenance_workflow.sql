-- Migration: Add maintenance request workflow state tracking
-- Created: 2025-11-23

-- Table to track multi-step maintenance request in progress
CREATE TABLE IF NOT EXISTS maintenance_request_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    conversation_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,

    -- Step 1: Contact Info
    organization_name TEXT,
    contact_name TEXT,
    contact_role TEXT,
    contact_phone TEXT,
    contact_email TEXT,

    -- Step 2: Location
    location TEXT,
    location_details TEXT,

    -- Step 3: Issue Category
    issue_category TEXT,

    -- Step 4: Urgency
    urgency_level TEXT,
    priority_high_notify BOOLEAN DEFAULT 0,

    -- Step 5: Description
    incident_description TEXT,

    -- Step 6: Cause
    probable_cause TEXT,

    -- Step 7: Equipment
    equipment_involved TEXT,
    equipment_details TEXT,

    -- Step 8: Evidence
    photo_urls TEXT, -- JSON array of photo URLs
    video_urls TEXT, -- JSON array of video URLs
    evidence_uploaded BOOLEAN DEFAULT 0,

    -- Step 9: Access
    access_window TEXT,
    onsite_contact TEXT,
    access_requirements TEXT,

    -- Step 10: Liability
    liability_confirmed BOOLEAN DEFAULT 0,

    -- Tracking
    current_step INTEGER DEFAULT 1,
    completed BOOLEAN DEFAULT 0,
    ticket_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_maint_drafts_session ON maintenance_request_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_maint_drafts_conversation ON maintenance_request_drafts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_maint_drafts_completed ON maintenance_request_drafts(completed);

-- Update maintenance_requests table to include all new fields
ALTER TABLE maintenance_requests ADD COLUMN organization_name TEXT;
ALTER TABLE maintenance_requests ADD COLUMN contact_name TEXT;
ALTER TABLE maintenance_requests ADD COLUMN contact_role TEXT;
ALTER TABLE maintenance_requests ADD COLUMN contact_phone TEXT;
ALTER TABLE maintenance_requests ADD COLUMN contact_email TEXT;
ALTER TABLE maintenance_requests ADD COLUMN location TEXT;
ALTER TABLE maintenance_requests ADD COLUMN location_details TEXT;
ALTER TABLE maintenance_requests ADD COLUMN urgency_level TEXT;
ALTER TABLE maintenance_requests ADD COLUMN incident_description TEXT;
ALTER TABLE maintenance_requests ADD COLUMN probable_cause TEXT;
ALTER TABLE maintenance_requests ADD COLUMN equipment_involved TEXT;
ALTER TABLE maintenance_requests ADD COLUMN equipment_details TEXT;
ALTER TABLE maintenance_requests ADD COLUMN photo_urls TEXT;
ALTER TABLE maintenance_requests ADD COLUMN video_urls TEXT;
ALTER TABLE maintenance_requests ADD COLUMN access_window TEXT;
ALTER TABLE maintenance_requests ADD COLUMN onsite_contact TEXT;
ALTER TABLE maintenance_requests ADD COLUMN access_requirements TEXT;
ALTER TABLE maintenance_requests ADD COLUMN liability_confirmed BOOLEAN DEFAULT 0;
ALTER TABLE maintenance_requests ADD COLUMN ticket_number TEXT UNIQUE;
