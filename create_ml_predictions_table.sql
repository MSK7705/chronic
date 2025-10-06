-- Create ML predictions table for storing AI assessment results
CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL CHECK (model_type IN ('heart', 'diabetes', 'hypertension', 'ckd', 'asthma', 'arthritis', 'copd', 'liver')),
  risk_probability DECIMAL(5,4) NOT NULL CHECK (risk_probability >= 0 AND risk_probability <= 1),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high')),
  prediction INTEGER NOT NULL CHECK (prediction IN (0, 1)),
  confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  input_features JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_id ON ml_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model_type ON ml_predictions(model_type);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_model ON ml_predictions(user_id, model_type);

-- Enable RLS (Row Level Security)
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own predictions
CREATE POLICY "Users can view their own ML predictions" ON ml_predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ML predictions" ON ml_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ML predictions" ON ml_predictions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ML predictions" ON ml_predictions
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_ml_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ml_predictions_updated_at_trigger
  BEFORE UPDATE ON ml_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_ml_predictions_updated_at();