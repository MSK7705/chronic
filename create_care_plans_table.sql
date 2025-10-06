-- Create care_plans table for storing comprehensive care plans
CREATE TABLE IF NOT EXISTS care_plans (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    conditions TEXT[] NOT NULL DEFAULT '{}',
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'very-high')),
    overall_health_score NUMERIC(5,2) DEFAULT 0,
    goals JSONB NOT NULL DEFAULT '[]',
    recommendations JSONB NOT NULL DEFAULT '[]',
    emergency_plan JSONB NOT NULL DEFAULT '{}',
    next_review_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_care_plans_user_id ON care_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_care_plans_created_at ON care_plans(created_at);
CREATE INDEX IF NOT EXISTS idx_care_plans_risk_level ON care_plans(risk_level);
CREATE INDEX IF NOT EXISTS idx_care_plans_next_review_date ON care_plans(next_review_date);

-- Enable Row Level Security (RLS)
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own care plans" ON care_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own care plans" ON care_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own care plans" ON care_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own care plans" ON care_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_care_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_care_plans_updated_at_trigger
    BEFORE UPDATE ON care_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_care_plans_updated_at();

-- Add comments for documentation
COMMENT ON TABLE care_plans IS 'Stores comprehensive care plans for chronic disease management';
COMMENT ON COLUMN care_plans.id IS 'Unique identifier for the care plan';
COMMENT ON COLUMN care_plans.user_id IS 'Reference to the user this care plan belongs to';
COMMENT ON COLUMN care_plans.patient_name IS 'Name of the patient';
COMMENT ON COLUMN care_plans.conditions IS 'Array of diagnosed conditions';
COMMENT ON COLUMN care_plans.risk_level IS 'Overall risk level assessment';
COMMENT ON COLUMN care_plans.overall_health_score IS 'Calculated health score (0-100)';
COMMENT ON COLUMN care_plans.goals IS 'JSON array of care plan goals with progress tracking';
COMMENT ON COLUMN care_plans.recommendations IS 'JSON array of evidence-based recommendations';
COMMENT ON COLUMN care_plans.emergency_plan IS 'JSON object containing emergency procedures and contacts';
COMMENT ON COLUMN care_plans.next_review_date IS 'Date when care plan should be reviewed next';
COMMENT ON COLUMN care_plans.created_at IS 'Timestamp when care plan was created';
COMMENT ON COLUMN care_plans.updated_at IS 'Timestamp when care plan was last updated';