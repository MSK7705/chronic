-- Create health_score table for persistent health score storage
CREATE TABLE IF NOT EXISTS health_score (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  complication_risk DECIMAL(5,2) NOT NULL CHECK (complication_risk >= 0 AND complication_risk <= 100),
  emergency_visits DECIMAL(5,2) NOT NULL CHECK (emergency_visits >= 0),
  adherence_rate DECIMAL(5,2) NOT NULL CHECK (adherence_rate >= 0 AND adherence_rate <= 100),
  risk_factors JSONB DEFAULT '{}',
  trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')) DEFAULT 'stable',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_health_score_user_id ON health_score(user_id);
CREATE INDEX IF NOT EXISTS idx_health_score_created_at ON health_score(created_at);
CREATE INDEX IF NOT EXISTS idx_health_score_user_latest ON health_score(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE health_score ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own health scores" ON health_score
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health scores" ON health_score
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health scores" ON health_score
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health scores" ON health_score
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_health_score_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_score_updated_at_trigger
  BEFORE UPDATE ON health_score
  FOR EACH ROW
  EXECUTE FUNCTION update_health_score_updated_at();

-- Add comments for documentation
COMMENT ON TABLE health_score IS 'Stores calculated health scores and risk assessments for users';
COMMENT ON COLUMN health_score.health_score IS 'Overall health score (0-100, higher is better)';
COMMENT ON COLUMN health_score.complication_risk IS 'Risk of complications percentage (0-100)';
COMMENT ON COLUMN health_score.emergency_visits IS 'Predicted emergency visits risk';
COMMENT ON COLUMN health_score.adherence_rate IS 'Treatment adherence rate percentage (0-100)';
COMMENT ON COLUMN health_score.risk_factors IS 'JSON object containing individual risk factor scores';
COMMENT ON COLUMN health_score.trend_direction IS 'Health score trend direction (up/down/stable)';