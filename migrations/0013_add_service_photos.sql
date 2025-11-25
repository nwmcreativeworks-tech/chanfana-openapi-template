-- Migration: Add service photos (before/after photos)
-- Created: 2025-11-25
-- This migration is fully idempotent

CREATE TABLE IF NOT EXISTS service_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    maintenance_request_id INTEGER,
    photo_url TEXT NOT NULL,
    phase TEXT DEFAULT 'unspecified',
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (maintenance_request_id) REFERENCES maintenance_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_service_photos_user ON service_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_service_photos_request ON service_photos(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_service_photos_phase ON service_photos(phase);
CREATE INDEX IF NOT EXISTS idx_service_photos_uploaded ON service_photos(uploaded_at);
