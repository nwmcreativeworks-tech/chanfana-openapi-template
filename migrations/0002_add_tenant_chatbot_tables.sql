-- Tenant Chatbot System Tables

-- Chat conversations
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    tenant_name TEXT,
    unit_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Maintenance requests
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

-- Thermostat settings
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT
);

-- Knowledge base for common questions and vMix troubleshooting
CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('vmix', 'media_equipment', 'building_info', 'thermostat', 'general')),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_unit ON maintenance_requests(unit_number);
CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_knowledge_category ON knowledge_base(category);

-- Insert default knowledge base entries
INSERT INTO knowledge_base (category, question, answer, keywords) VALUES
-- vMix troubleshooting
('vmix', 'vMix is not starting or crashing on startup', 'Try these steps: 1) Right-click vMix icon and select "Run as Administrator" 2) Check Windows Event Viewer for errors 3) Update your graphics drivers 4) Disable antivirus temporarily 5) Reinstall vMix if needed. Make sure your Windows is up to date.', 'vmix crash startup not starting administrator graphics driver'),
('vmix', 'vMix shows black screen or no video preview', 'Solutions: 1) Check if your camera/input is properly connected 2) Try removing and re-adding the input 3) Check if another program is using the camera 4) Update camera drivers 5) In vMix Settings, try changing the video renderer (Settings > Display > Renderer)', 'vmix black screen no video preview camera'),
('vmix', 'vMix audio not working or no sound', 'Steps to fix: 1) Check the audio meter in vMix - is it showing levels? 2) Click the M (mute) button to unmute if needed 3) Check audio mixer settings (click the headphone icon) 4) Verify Windows audio settings - right device selected? 5) Check cables and connections 6) Try Audio Settings > restart audio', 'vmix audio sound not working mute volume'),
('vmix', 'vMix is laggy or running slow', 'Performance tips: 1) Close other programs to free up RAM 2) Lower preview quality (Settings > Performance) 3) Use a wired internet connection instead of WiFi 4) Check CPU usage in Task Manager - close unnecessary apps 5) Update graphics drivers 6) Consider lowering stream quality settings', 'vmix slow lag performance fps drops'),

-- Media equipment
('media_equipment', 'HDMI cable not working or no signal', 'Troubleshooting steps: 1) Try a different HDMI cable 2) Unplug and reconnect both ends firmly 3) Try a different HDMI port 4) Restart both devices 5) Check if the correct input source is selected on TV/monitor 6) Test the cable with another device', 'hdmi cable no signal not working'),
('media_equipment', 'Microphone not working or very quiet', 'Solutions: 1) Check if muted (physical mute button or software) 2) Increase gain/volume on audio interface 3) Check Windows Sound Settings - set as default device 4) Update audio drivers 5) Test with another program to isolate issue 6) Try a different USB port or cable', 'microphone mic not working quiet low volume'),
('media_equipment', 'Camera not detected by computer', 'Try these fixes: 1) Unplug and reconnect the camera 2) Try a different USB port (preferably USB 3.0) 3) Check Device Manager for errors 4) Update camera drivers 5) Try the camera on another computer 6) Disable USB selective suspend in Power Options', 'camera not detected usb webcam'),

-- Thermostat
('thermostat', 'How do I change the temperature?', 'You can control your thermostat through this chatbot! Just tell me: "Set temperature to 72" or "Make it cooler" or "Increase heat". I can adjust it between 65°F and 78°F. You can also ask "What is the current temperature?"', 'thermostat temperature change control'),
('thermostat', 'Thermostat is not responding or locked', 'Your thermostat may be in locked mode for energy management. Please ask me to adjust the temperature and I can help! If there is a technical issue, I can submit a maintenance request for you.', 'thermostat locked not responding'),
('thermostat', 'Room is too hot or too cold', 'I can help adjust your thermostat right away! Tell me your desired temperature or if you want it warmer/cooler. If the temperature still does not change after 30 minutes, there may be an HVAC issue and I can create a maintenance request.', 'too hot cold temperature uncomfortable'),

-- Building info
('building_info', 'What are the building quiet hours?', 'Quiet hours are 10:00 PM to 8:00 AM on weekdays, and 11:00 PM to 9:00 AM on weekends. Please keep noise levels down during these times to respect your neighbors.', 'quiet hours noise'),
('building_info', 'Where is the mail room?', 'The mail room is located on the ground floor next to the main lobby. Access hours are 6:00 AM to 10:00 PM daily. You will need your access key card.', 'mail room mailroom packages'),
('building_info', 'How do I report an emergency?', 'For life-threatening emergencies, always call 911 first. For building emergencies (flooding, no heat in winter, no AC in extreme heat, gas smell, etc.), call our emergency maintenance line at [YOUR NUMBER]. For non-urgent issues, you can submit a maintenance request through this chatbot.', 'emergency urgent help'),
('building_info', 'What is the WiFi password?', 'For security reasons, WiFi credentials are provided in your welcome packet. If you did not receive it or need a reset, please submit a maintenance request and our team will assist you.', 'wifi password internet wireless'),

-- General
('general', 'How do I submit a maintenance request?', 'Just tell me what is wrong! For example: "My sink is leaking" or "The AC is not working" or "I need help with the media equipment". I will gather details and submit a maintenance request for you automatically.', 'maintenance request submit create'),
('general', 'What can you help me with?', 'I can help you with: 1) Controlling your thermostat 2) Submitting maintenance requests 3) Troubleshooting vMix and media equipment 4) Answering questions about the building 5) Providing step-by-step tech support. Just ask me anything!', 'help what can you do capabilities');

-- Insert default thermostat settings for sample units
INSERT INTO thermostat_settings (unit_number, current_temp, target_temp, mode, fan_mode) VALUES
('101', 72.0, 72.0, 'auto', 'auto'),
('102', 71.5, 72.0, 'auto', 'auto'),
('103', 73.0, 72.0, 'auto', 'auto');
