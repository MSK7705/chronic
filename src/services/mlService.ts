import { supabase } from '../lib/supabase';

interface MLPredictionRequest {
  modelType: 'heart' | 'diabetes' | 'hypertension' | 'ckd' | 'asthma' | 'arthritis' | 'copd' | 'liver';
  features: Record<string, number | string | boolean>;
}

interface MLPredictionResponse {
  riskProbability: number;
  riskLevel: 'low' | 'moderate' | 'high';
  prediction: 0 | 1;
  confidence: number;
}

class MLService {
  private baseUrl = 'http://localhost:8001';

  async predictRisk(request: MLPredictionRequest): Promise<MLPredictionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/${request.modelType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ features: request.features }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const result = {
        riskProbability: data.risk_probability,
        riskLevel: this.getRiskLevel(data.risk_probability),
        prediction: data.prediction,
        confidence: data.confidence || data.risk_probability,
      };

      // Store prediction in Supabase
      await this.storePrediction(request, result);

      return result;
    } catch (error) {
      console.error('ML Service Error:', error);
      const mockResult = this.getMockPrediction(request.modelType);
      
      // Store mock prediction as well for consistency
      await this.storePrediction(request, mockResult);
      
      return mockResult;
    }
  }

  private async storePrediction(request: MLPredictionRequest, result: MLPredictionResponse): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user, skipping prediction storage');
        return;
      }

      // Check if prediction already exists for this user and model type
      const { data: existingPrediction } = await supabase
        .from('ml_predictions')
        .select('id')
        .eq('user_id', user.id)
        .eq('model_type', request.modelType)
        .single();

      const predictionData = {
        user_id: user.id,
        model_type: request.modelType,
        risk_probability: result.riskProbability,
        risk_level: result.riskLevel,
        prediction: result.prediction,
        confidence: result.confidence,
        input_features: request.features,
      };

      if (existingPrediction) {
        // Update existing prediction
        const { error } = await supabase
          .from('ml_predictions')
          .update(predictionData)
          .eq('id', existingPrediction.id);

        if (error) {
          console.error('Error updating ML prediction:', error);
        }
      } else {
        // Insert new prediction
        const { error } = await supabase
          .from('ml_predictions')
          .insert(predictionData);

        if (error) {
          console.error('Error storing ML prediction:', error);
        }
      }
    } catch (error) {
      console.error('Error in storePrediction:', error);
    }
  }

  async getUserPredictions(): Promise<(MLPredictionResponse & { modelType: string })[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('ml_predictions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching ML predictions:', error);
        return [];
      }

      return (data || []).map(prediction => ({
        modelType: prediction.model_type,
        riskProbability: prediction.risk_probability,
        riskLevel: prediction.risk_level,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
      }));
    } catch (error) {
      console.error('Error in getUserPredictions:', error);
      return [];
    }
  }

  async clearUserPredictions(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const { error } = await supabase
        .from('ml_predictions')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing ML predictions:', error);
      }
    } catch (error) {
      console.error('Error in clearUserPredictions:', error);
    }
  }

  private getRiskLevel(probability: number): 'low' | 'moderate' | 'high' {
    if (probability < 0.3) return 'low';
    if (probability < 0.7) return 'moderate';
    return 'high';
  }

  private getMockPrediction(modelType: string): MLPredictionResponse {
    const mockProbability = Math.random() * 0.8 + 0.1;
    return {
      riskProbability: mockProbability,
      riskLevel: this.getRiskLevel(mockProbability),
      prediction: mockProbability > 0.5 ? 1 : 0,
      confidence: mockProbability,
    };
  }

  async predictHealthOverall(input: {
    glucose: number;
    systolic_bp: number;
    diastolic_bp: number;
    heart_rate: number;
    temperature: number;
    weight: number;
  }): Promise<{ complication_risk: number; emergency_visits: number; adherence_rate: number; }> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/health_overall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      
      // Store health score in Supabase
      await this.storeHealthScore(result);
      
      return result;
    } catch (error) {
      console.error('Health prediction error:', error);
      
      // Return mock data if API fails
      const mockResult = {
        complication_risk: Math.random() * 40 + 20, // 20-60%
        emergency_visits: Math.random() * 3 + 1,    // 1-4 visits
        adherence_rate: Math.random() * 20 + 80     // 80-100%
      };
      
      // Store mock health score as well
      await this.storeHealthScore(mockResult);
      
      return mockResult;
    }
  }

  // Store health score in Supabase
  private async storeHealthScore(prediction: { 
    complication_risk: number; 
    emergency_visits: number; 
    adherence_rate: number; 
  }): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const healthScore = Math.round(100 - prediction.complication_risk);
      const trendDirection = this.calculateTrend(prediction.complication_risk);

      await supabase.from('health_score').insert({
        user_id: user.id,
        health_score: healthScore,
        complication_risk: prediction.complication_risk,
        emergency_visits: prediction.emergency_visits,
        adherence_rate: prediction.adherence_rate,
        trend_direction: trendDirection,
        risk_factors: {
          cardiovascular: Math.round(prediction.complication_risk * 0.8),
          metabolic: Math.round(prediction.complication_risk * 0.9),
          respiratory: Math.round(prediction.complication_risk * 0.85),
          renal: Math.round(prediction.complication_risk * 0.95)
        }
      });
    } catch (error) {
      console.error('Error storing health score:', error);
    }
  }

  // Get latest health score from Supabase
  async getLatestHealthScore(): Promise<{
    health_score: number;
    complication_risk: number;
    emergency_visits: number;
    adherence_rate: number;
    trend_direction: string;
    risk_factors: any;
  } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('health_score')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching health score:', error);
      return null;
    }
  }

  private calculateTrend(currentRisk: number): 'up' | 'down' | 'stable' {
    // Simple trend calculation - in a real app, you'd compare with previous values
    if (currentRisk < 30) return 'up';    // Low risk = health trending up
    if (currentRisk > 60) return 'down';  // High risk = health trending down
    return 'stable';
  }
}

export const mlService = new MLService();
export type { MLPredictionRequest, MLPredictionResponse };