-- Create a global_settings table for application-wide settings
CREATE TABLE IF NOT EXISTS global_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_system_prompt TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- Add a trigger to update the updated_at column
CREATE TRIGGER update_global_settings_updated_at
BEFORE UPDATE ON global_settings
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Insert a default row
INSERT INTO global_settings (student_system_prompt)
VALUES ('');

-- RLS Policies
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to read/write
CREATE POLICY "Allow admins full access to global settings"
    ON global_settings
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Allow all authenticated users to read
CREATE POLICY "Allow all users to read global settings"
    ON global_settings
    FOR SELECT
    USING (auth.role() = 'authenticated'); 