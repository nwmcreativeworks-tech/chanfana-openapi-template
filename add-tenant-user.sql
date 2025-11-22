-- Add test tenant user for Hospital Church
-- This user can log in to the chatbot portal

INSERT INTO users (email, password_hash, full_name, unit_number, role, is_active) VALUES
('tenant@hospitalchurch.com', 'password123', 'John Smith', '101', 'tenant', 1);
