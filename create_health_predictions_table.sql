-- Create health_predictions table for storing ML model predictions
CREATE TABLE IF NOT EXISTS health_predictions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    complication_risk FLOAT NOT NULL,
    emergency_visits FLOAT NOT NULL,
    adherence_rate FLOAT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_health_predictions_user_id ON health_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_health_predictions_recorded_at ON health_predictions(recorded_at);

-- Enable Row Level Security
ALTER TABLE health_predictions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own predictions
CREATE POLICY "Users can view own health predictions" ON health_predictions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health predictions" ON health_predictions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE health_predictions;
