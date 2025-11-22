-- Complete database setup for Tenant Support Chatbot
-- Run this if migrations fail: npx wrangler d1 execute DB --remote --file=setup-all-tables.sql

-- ============================================================================
-- TASKS TABLE (from original template)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT 0,
    due_date TEXT
);

INSERT INTO tasks (name, slug, description, completed, due_date) VALUES
('Buy groceries', 'buy-groceries', 'Milk, bread, and eggs', 0, '2024-01-15'),
('Finish project', 'finish-project', 'Complete the API integration', 0, '2024-01-20'),
('Call dentist', 'call-dentist', 'Schedule annual checkup', 1, '2024-01-10');

-- ============================================================================
-- CHATBOT TABLES
-- ============================================================================

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    tenant_name TEXT,
    unit_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Maintenance requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    conversation_id INTEGER,
    tenant_name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('hvac', 'plumbing', 'electrical', 'appliance', 'media_equipment', 'other')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'emergency')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_unit_number ON maintenance_requests(unit_number);

-- Thermostat settings table
CREATE TABLE IF NOT EXISTS thermostat_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    unit_number TEXT NOT NULL UNIQUE,
    current_temp REAL,
    target_temp REAL NOT NULL DEFAULT 72.0,
    mode TEXT NOT NULL DEFAULT 'auto' CHECK(mode IN ('heat', 'cool', 'auto', 'off')),
    fan_mode TEXT NOT NULL DEFAULT 'auto' CHECK(fan_mode IN ('auto', 'on')),
    is_locked INTEGER NOT NULL DEFAULT 0,
    min_temp REAL NOT NULL DEFAULT 65.0,
    max_temp REAL NOT NULL DEFAULT 78.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_thermostat_settings_unit_number ON thermostat_settings(unit_number);

-- Knowledge base table with vMix troubleshooting
CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);

-- Pre-load vMix and media equipment troubleshooting knowledge
INSERT INTO knowledge_base (category, question, answer, keywords) VALUES
('vmix', 'vMix is not starting or crashing on startup', 'Try these steps: 1) Right-click vMix icon and select "Run as Administrator" 2) Check Windows Event Viewer for errors under Application logs 3) Update your graphics drivers from the manufacturer website 4) Verify your vMix license is valid 5) Try reinstalling vMix', 'vmix crash startup administrator license'),
('vmix', 'vMix shows black screen or no video input', '1) Check if your camera/capture device is connected and powered on 2) In vMix, go to Settings > Inputs and verify the input is selected 3) Try removing and re-adding the input 4) Update camera/capture card drivers 5) Check if another program is using the camera', 'vmix black screen no video input camera'),
('vmix', 'vMix audio not working or no sound', '1) Click the Audio Mixer button (headphone icon) 2) Check if the input is muted (M button) 3) Verify the audio meter shows levels 4) Check Windows sound settings - ensure correct output device 5) Restart vMix audio engine: Settings > Audio > Restart', 'vmix audio sound mute mixer volume'),
('vmix', 'vMix stream is buffering or laggy', '1) Reduce your stream bitrate in Output settings 2) Lower your vMix resolution (Settings > Display) 3) Close other programs using internet 4) Check your upload speed at speedtest.net 5) Use wired Ethernet instead of WiFi', 'vmix lag buffer stream quality bitrate'),
('vmix', 'How to add a camera or video source in vMix', '1) Click "Add Input" at the bottom 2) Select "Camera" for webcams or capture cards 3) Choose your device from the dropdown 4) Adjust resolution and frame rate 5) Click OK - your camera will appear', 'vmix add camera input source video'),
('media_equipment', 'Camera not detected by computer', '1) Try a different USB port (USB 3.0 recommended) 2) Check if camera is powered on 3) Install manufacturer drivers from their website 4) Test camera with manufacturer software first 5) Try a different USB cable', 'camera usb not detected drivers'),
('media_equipment', 'HDMI not working or no signal', '1) Verify HDMI cable is fully inserted at both ends 2) Try a different HDMI cable 3) Check if you selected the correct HDMI input on monitor/TV 4) Power cycle both devices 5) Test with a different HDMI port', 'hdmi no signal cable display monitor'),
('media_equipment', 'Microphone too quiet or low volume', '1) Right-click speaker icon > Sounds > Recording 2) Select your microphone > Properties 3) Go to Levels tab, increase microphone volume to 100 4) Try Microphone Boost if available 5) In vMix, check Audio Mixer levels', 'microphone quiet low volume boost recording'),
('media_equipment', 'Microphone has echo or feedback', '1) Use headphones instead of speakers 2) Reduce microphone gain/volume 3) Move microphone away from speakers 4) In Windows: Sound Settings > Recording > your mic > Properties > Enhancements > Enable "Echo Cancellation" 5) Check vMix Audio Mixer for monitoring settings', 'microphone echo feedback loop speakers'),
('building_info', 'What are the building quiet hours?', 'Quiet hours are 10:00 PM to 8:00 AM on weekdays, and 11:00 PM to 9:00 AM on weekends. Please keep noise levels considerate during these times.', 'quiet hours noise policy'),
('building_info', 'Where is the gym located?', 'The fitness center is located on the 2nd floor. It is accessible 24/7 with your key fob.', 'gym fitness center exercise location'),
('building_info', 'How do I report a maintenance issue?', 'You can report maintenance issues through this chatbot, via email to maintenance@building.com, or by calling the front desk. Emergency issues can be reported 24/7.', 'maintenance report issue request'),
('building_info', 'What is the WiFi password?', 'The building WiFi network is "BuildingGuest". The password is updated monthly and posted in the lobby. Please ask the front desk for the current password.', 'wifi password internet network'),
('thermostat', 'How do I adjust my thermostat?', 'You can control your thermostat by asking me! Just say "set temperature to 72" or "make it warmer". The temperature range is 65°F to 78°F for energy efficiency.', 'thermostat control temperature adjust'),
('thermostat', 'Why wont my thermostat go above 78 or below 65?', 'The temperature range is limited to 65-78°F for energy efficiency and to prevent system damage. If you need an exception, please contact building management.', 'thermostat limit range temperature minimum maximum');

-- ============================================================================
-- ALEXA TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS alexa_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    access_token TEXT NOT NULL UNIQUE,
    refresh_token TEXT,
    unit_number TEXT NOT NULL,
    tenant_name TEXT,
    alexa_user_id TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alexa_tokens_access_token ON alexa_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_alexa_tokens_unit_number ON alexa_tokens(unit_number);

-- ============================================================================
-- USER MANAGEMENT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    unit_number TEXT,
    role TEXT NOT NULL DEFAULT 'tenant' CHECK(role IN ('admin', 'tenant', 'maintenance')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_unit_number ON users(unit_number);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER,
    user_name TEXT,
    action_type TEXT NOT NULL,
    action_description TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    unit_number TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_unit_number ON activity_log(unit_number);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- Create default admin user
INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES
('admin@building.com', 'admin123hash', 'Administrator', 'admin', 1);

-- ============================================================================
-- PHYSICAL THERMOSTAT DEVICES TABLES
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_thermostat_devices_device_id ON thermostat_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_thermostat_devices_unit_number ON thermostat_devices(unit_number);
CREATE INDEX IF NOT EXISTS idx_thermostat_devices_user_id ON thermostat_devices(user_id);

-- Alexa API credentials
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

-- ============================================================================
-- DONE! Database setup complete
-- ============================================================================
