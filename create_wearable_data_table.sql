-- Create wearable_data table for storing smartwatch and health device data
CREATE TABLE IF NOT EXISTS wearable_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  heart_rate INTEGER,
  steps INTEGER,
  calories INTEGER,
  spo2 INTEGER,
  battery_level INTEGER,
  temperature DECIMAL(5,2),
  sleep_hours DECIMAL(4,2),
  stress_level INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wearable_data_user_id ON wearable_data(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_data_recorded_at ON wearable_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_wearable_data_user_recorded ON wearable_data(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_data_device_type ON wearable_data(device_type);

-- Enable Row Level Security
ALTER TABLE wearable_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own wearable data" ON wearable_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wearable data" ON wearable_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wearable data" ON wearable_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wearable data" ON wearable_data
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_wearable_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wearable_data_updated_at_trigger
  BEFORE UPDATE ON wearable_data
  FOR EACH ROW
  EXECUTE FUNCTION update_wearable_data_updated_at();

-- Add comments for documentation
COMMENT ON TABLE wearable_data IS 'Stores health data collected from smartwatches and wearable devices';
COMMENT ON COLUMN wearable_data.device_name IS 'Name of the connected device';
COMMENT ON COLUMN wearable_data.device_type IS 'Type of device (Smartwatch, Smart Scale, etc.)';
COMMENT ON COLUMN wearable_data.heart_rate IS 'Heart rate in beats per minute';
COMMENT ON COLUMN wearable_data.steps IS 'Number of steps taken';
COMMENT ON COLUMN wearable_data.calories IS 'Calories burned';
COMMENT ON COLUMN wearable_data.spo2 IS 'Blood oxygen saturation percentage';
COMMENT ON COLUMN wearable_data.battery_level IS 'Device battery level percentage';
COMMENT ON COLUMN wearable_data.temperature IS 'Body temperature in Fahrenheit';
COMMENT ON COLUMN wearable_data.sleep_hours IS 'Hours of sleep recorded';
COMMENT ON COLUMN wearable_data.stress_level IS 'Stress level (0-100)';
COMMENT ON COLUMN wearable_data.recorded_at IS 'When the data was recorded by the device';