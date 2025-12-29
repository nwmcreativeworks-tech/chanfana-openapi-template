-- Migration: Add NWM Media Troubleshooting Knowledge Base
-- Created: 2025-12-29
-- Purpose: Store equipment-specific troubleshooting guides for AV/Media support

CREATE TABLE IF NOT EXISTS media_troubleshooting (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('Video', 'Audio', 'Presentation', 'Connectivity')),
    device TEXT NOT NULL,
    issue TEXT NOT NULL,
    quick_fix TEXT NOT NULL, -- JSON array of steps
    advanced_redirect TEXT NOT NULL,
    keywords TEXT, -- Space-separated keywords for search
    times_used INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_media_troubleshooting_category ON media_troubleshooting(category);
CREATE INDEX IF NOT EXISTS idx_media_troubleshooting_device ON media_troubleshooting(device);
CREATE INDEX IF NOT EXISTS idx_media_troubleshooting_keywords ON media_troubleshooting(keywords);

-- Insert NWM Creative Works troubleshooting guides
INSERT INTO media_troubleshooting (category, device, issue, quick_fix, advanced_redirect, keywords) VALUES
-- Video Issues
(
    'Video',
    'vMix',
    'My capture card doesn''t show video',
    '["Check USB or PCIe connection", "Confirm camera is powered on", "Verify input is added in VMix using ''Add Input > Camera''", "Check selected resolution matches camera output", "Restart vMix and reconnect device"]',
    'Escalate to Advanced Media Support',
    'vmix capture card video black screen usb pcie camera input'
),
(
    'Video',
    'Capture Card',
    'Computer does not detect capture card',
    '["Try different USB port", "Use powered USB hub", "Update drivers", "Restart computer", "Try different cable"]',
    'Escalate to Advanced Media Support',
    'capture card usb detect drivers computer connection'
),

-- Audio Issues - Behringer WING
(
    'Audio',
    'Behringer WING',
    'No sound is coming out of speakers',
    '["Check master fader level", "Unmute main bus", "Verify speaker is powered on", "Confirm output routing to Main L/R", "Test with known-working mic"]',
    'Escalate to Advanced Media Support',
    'behringer wing audio sound speaker output routing mute fader'
),
(
    'Audio',
    'Behringer WING',
    'Microphone is too low',
    '["Raise channel gain", "Check mic placement", "Increase fader level", "Disable pad if active", "Apply light compression"]',
    'Escalate to Advanced Media Support',
    'behringer wing microphone low volume gain fader quiet'
),
(
    'Audio',
    'Behringer WING',
    'Feedback is happening',
    '["Lower main volume", "Move mic away from speaker", "Reduce high frequency EQ", "Use low-cut filter", "Check mic position"]',
    'Escalate to Advanced Media Support',
    'behringer wing feedback squeal echo microphone speaker eq frequency'
),

-- Audio Issues - X-AIR
(
    'Audio',
    'X-AIR',
    'Mixer not connecting to WiFi',
    '["Restart mixer", "Confirm WiFi light is active", "Reconnect device to correct network", "Restart tablet/phone", "Move closer to router"]',
    'Escalate to Advanced Media Support',
    'xair x-air wifi connection network tablet app reconnect'
),
(
    'Audio',
    'X-AIR',
    'No sound from one channel',
    '["Unmute channel", "Check gain knob", "Confirm routing", "Try different XLR cable", "Test on another channel"]',
    'Escalate to Advanced Media Support',
    'xair x-air channel audio sound mute gain xlr cable routing'
),

-- Audio Issues - Zoom Mixer
(
    'Audio',
    'Zoom Mixer',
    'Participants can''t hear',
    '["Confirm correct mic selected in Zoom", "Unmute in Zoom", "Test mic in computer settings", "Reconnect USB", "Restart Zoom"]',
    'Escalate to Advanced Media Support',
    'zoom mixer microphone audio mute participants hear settings usb'
),
(
    'Audio',
    'Zoom Mixer',
    'Echo in Zoom call',
    '["Use headphones", "Reduce speaker volume", "Disable ''Original Sound''", "Check for multiple mics", "Mute extra devices"]',
    'Escalate to Advanced Media Support',
    'zoom mixer echo feedback loop speaker headphones original sound'
),

-- Audio Issues - Microphone
(
    'Audio',
    'Microphone',
    'No audio from microphone',
    '["Check XLR cable", "Turn on phantom power if needed", "Test on another channel", "Ensure not muted", "Test with second mic"]',
    'Escalate to Advanced Media Support',
    'microphone audio xlr phantom power cable mute channel connection'
),

-- Presentation Issues - Proclaim
(
    'Presentation',
    'Proclaim',
    'Slides are not displaying on screen',
    '["Check display settings", "Confirm correct output screen", "Restart Proclaim", "Ensure HDMI is connected", "Test with second monitor"]',
    'Escalate to Advanced Media Support',
    'proclaim slides display screen hdmi output monitor projection'
),
(
    'Presentation',
    'Proclaim',
    'Video not playing in Proclaim',
    '["Ensure file is fully uploaded", "Check file format compatibility", "Restart Proclaim", "Test video outside Proclaim", "Reinsert file"]',
    'Escalate to Advanced Media Support',
    'proclaim video playback format upload file compatibility codec'
);

-- Escalation tracking table
CREATE TABLE IF NOT EXISTS troubleshooting_escalations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    troubleshooting_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    user_name TEXT,
    user_email TEXT,
    escalation_reason TEXT NOT NULL,
    photos TEXT, -- JSON array of base64 images
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'resolved', 'cancelled')),
    assigned_to TEXT,
    resolution_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (troubleshooting_id) REFERENCES media_troubleshooting(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_troubleshooting_escalations_session ON troubleshooting_escalations(session_id);
CREATE INDEX IF NOT EXISTS idx_troubleshooting_escalations_status ON troubleshooting_escalations(status);
CREATE INDEX IF NOT EXISTS idx_troubleshooting_escalations_created ON troubleshooting_escalations(created_at);
