-- Migration: Add building info workflow state table
-- Created: 2025-11-23
-- Purpose: Track multi-step building info requests

CREATE TABLE IF NOT EXISTS building_info_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    session_id TEXT NOT NULL,
    conversation_id INTEGER NOT NULL,
    current_step TEXT DEFAULT 'menu',
    request_type TEXT,
    user_data TEXT,
    completed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_building_info_session ON building_info_states(session_id);
CREATE INDEX IF NOT EXISTS idx_building_info_completed ON building_info_states(completed);
CREATE INDEX IF NOT EXISTS idx_building_info_conversation ON building_info_states(conversation_id);
