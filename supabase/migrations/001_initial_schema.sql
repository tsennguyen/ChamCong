-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male','female')) NOT NULL,
    role TEXT CHECK (role IN ('admin','teacher')) DEFAULT 'teacher',
    phone TEXT,
    start_date DATE,
    is_active BOOLEAN DEFAULT true,
    must_change_password BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: shifts
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('regular','extra')) DEFAULT 'regular',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_minutes INTEGER DEFAULT 1,
    overtime_rate DECIMAL DEFAULT 40000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: shift_assignments
CREATE TABLE IF NOT EXISTS shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, shift_id, effective_from)
);
CREATE INDEX idx_shift_assignments_user_id ON shift_assignments(user_id);

-- Table: attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    late_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    overtime_amount DECIMAL DEFAULT 0,
    check_in_ip TEXT,
    check_out_ip TEXT,
    check_in_device TEXT,
    check_out_device TEXT,
    check_in_note TEXT,
    check_out_note TEXT,
    status TEXT CHECK (status IN ('checked_in','checked_out','needs_review')) DEFAULT 'checked_in',
    shift_type TEXT CHECK (shift_type IN ('regular','extra')) DEFAULT 'regular',
    is_synced BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, shift_id, attendance_date)
);
CREATE INDEX idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_records_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_records_created_at ON attendance_records(created_at);

-- Table: extra_sessions
CREATE TABLE IF NOT EXISTS extra_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    planned_start TIME NOT NULL,
    planned_end TIME NOT NULL,
    actual_check_in TIMESTAMPTZ,
    actual_check_out TIMESTAMPTZ,
    total_minutes INTEGER DEFAULT 0,
    note TEXT,
    is_synced BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: device_logs
CREATE TABLE IF NOT EXISTS device_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    fingerprint TEXT,
    user_agent TEXT,
    ip_address TEXT,
    action TEXT CHECK (action IN ('check_in','check_out','login')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    ip_address TEXT,
    device_fingerprint TEXT,
    metadata JSONB,
    is_success BOOLEAN DEFAULT true,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: sync_logs
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direction TEXT CHECK (direction IN ('web_to_sheet','sheet_to_web')),
    sheet_tab TEXT,
    records_count INTEGER DEFAULT 0,
    is_success BOOLEAN DEFAULT true,
    error_message TEXT,
    synced_at TIMESTAMPTZ DEFAULT now()
);

-- Table: app_config
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- RLS setup
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON shift_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE extra_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON extra_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE device_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON device_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON sync_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON app_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger Function for users updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Enable Supabase Realtime for attendance_records
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;

-- Seed data
INSERT INTO users (email, password_hash, full_name, gender, role)
VALUES ('admin@lumi.edu.vn', 'placeholder_hash', 'Admin', 'female', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO shifts (name, start_time, end_time, grace_minutes, overtime_rate)
VALUES ('Ca 7:00-17:00', '07:00:00', '17:00:00', 1, 40000);

INSERT INTO app_config (key, value, description)
VALUES 
    ('wifi_ssid', 'Lumi-WiFi', 'WiFi SSID bắt buộc để check-in'),
    ('school_ip_range', '192.168.1.0/24', 'Dải IP trường học');
