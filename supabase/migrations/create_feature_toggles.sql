-- Create feature_toggles table for admin-controlled feature flags
CREATE TABLE IF NOT EXISTS feature_toggles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name VARCHAR(100) UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  description TEXT,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default feature toggles
INSERT INTO feature_toggles (feature_name, is_enabled, description)
VALUES
  ('aura_voice', true, 'Enable/disable AuraVoice cognitive assessment feature'),
  ('worksheets', true, 'Enable/disable Worksheets generation feature')
ON CONFLICT (feature_name) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_feature_toggles_name ON feature_toggles(feature_name);

-- Add RLS (Row Level Security) policies
ALTER TABLE feature_toggles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read feature toggles
CREATE POLICY "Anyone can read feature toggles"
  ON feature_toggles
  FOR SELECT
  USING (true);

-- Only admins can update feature toggles
CREATE POLICY "Only admins can update feature toggles"
  ON feature_toggles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.clerk_id = auth.jwt() ->> 'sub'
      AND users.role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_toggles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_toggles_updated_at
  BEFORE UPDATE ON feature_toggles
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_toggles_updated_at();
