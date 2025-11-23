-- Migration: Add maintenance request workflow state tracking (Fixed version)
-- Created: 2025-11-23
-- This version only creates new tables and skips columns that might already exist

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
    photo_urls TEXT,
    video_urls TEXT,
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

-- Note: Columns for maintenance_requests table will be added manually if needed
-- Run this in SQL console if columns are missing:
-- ALTER TABLE maintenance_requests ADD COLUMN organization_name TEXT;
-- ALTER TABLE maintenance_requests ADD COLUMN contact_name TEXT;
-- (etc. for other columns)
