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
  private baseUrl = 'http://localhost:8000';
  // Add cached table existence checks to avoid repeated 404/PGRST205
  private tableExistenceCache: Record<string, { exists: boolean; timestamp: number }> = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private async checkTableExists(table: string): Promise<boolean> {
    const now = Date.now();
    const cached = this.tableExistenceCache[table];
    if (cached && now - cached.timestamp < this.CACHE_DURATION) {
      return cached.exists;
    }
    try {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        const code = (error as any)?.code || '';
        const msg = ((error as any)?.message || '').toLowerCase();
        if (code === 'PGRST205' || msg.includes("could not find the table") || msg.includes('relation')) {
          this.tableExistenceCache[table] = { exists: false, timestamp: now };
          console.warn(`[mlService] Table '${table}' missing or not in schema cache; skipping queries.`);
          return false;
        }
      }
      this.tableExistenceCache[table] = { exists: true, timestamp: now };
      return true;
    } catch (e) {
      console.warn(`[mlService] Error checking existence for '${table}':`, e);
      this.tableExistenceCache[table] = { exists: false, timestamp: now };
      return false;
    }
  }

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
      // Stable fallback: return last stored prediction for this modelType, if available
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error: fetchErr } = await supabase
            .from('ml_predictions')
            .select('*')
            .eq('user_id', user.id)
            .eq('model_type', request.modelType)
            .order('updated_at', { ascending: false })
            .limit(1);
          if (!fetchErr && data && data.length > 0) {
            const last = data[0];
            return {
              modelType: last.model_type,
              riskProbability: last.risk_probability,
              riskLevel: last.risk_level,
              prediction: last.prediction,
              confidence: last.confidence,
            } as MLPredictionResponse & { modelType: string };
          }
        }
      } catch (fallbackErr) {
        console.error('Error fetching last stored prediction:', fallbackErr);
      }
      // If no previous prediction, propagate error
      throw new Error('Prediction failed and no previous prediction available.');
    }
  }

  private async storePrediction(request: MLPredictionRequest, result: MLPredictionResponse): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user, skipping prediction storage');
        return;
      }

      // Prepare payload
      const predictionData = {
        user_id: user.id,
        model_type: request.modelType,
        risk_probability: result.riskProbability,
        risk_level: result.riskLevel,
        prediction: result.prediction,
        confidence: result.confidence,
        input_features: request.features,
      };

      // Find latest existing prediction for this user and model type
      const { data: existing } = await supabase
        .from('ml_predictions')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('model_type', request.modelType)
        .order('created_at', { ascending: false })
        .limit(1);

      const now = new Date();
      if (existing && existing.length > 0) {
        const last = existing[0];
        const lastCreated = new Date(last.created_at as string);
        const isSameDay = lastCreated.toDateString() === now.toDateString();
        const withinFiveMinutes = (now.getTime() - lastCreated.getTime()) < 5 * 60 * 1000;
        if (isSameDay || withinFiveMinutes) {
          // Update latest record to avoid duplicates
          const { error } = await supabase
            .from('ml_predictions')
            .update(predictionData)
            .eq('id', last.id);
          if (error) {
            console.error('Error updating ML prediction:', error);
          }
          return;
        }
      }

      // Otherwise, insert a new record (keep history)
      const { error } = await supabase
        .from('ml_predictions')
        .insert(predictionData);
      if (error) {
        console.error('Error storing ML prediction:', error);
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

  // Removed random mock; use stable fallbacks based on stored data instead
  private getMockPrediction(modelType: string): MLPredictionResponse {
    const mockProbability = 0.5;
    return {
      riskProbability: mockProbability,
      riskLevel: this.getRiskLevel(mockProbability),
      prediction: 0,
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
      console.log('[mlService] Calling /predict/health_overall with input:', input);
      const response = await fetch(`${this.baseUrl}/predict/health_overall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      console.log('[mlService] Received health_overall response:', result);
      
      // Store health score in Supabase
      await this.storeHealthScore(result);
      
      return result;
    } catch (error) {
      console.error('Health prediction error:', error);
      // Stable fallback: return latest stored health score if available
      try {
        const latest = await this.getLatestHealthScore();
        if (latest) {
          console.log('[mlService] Fallback to latest stored health_score:', latest);
          return {
            complication_risk: latest.complication_risk,
            emergency_visits: latest.emergency_visits,
            adherence_rate: latest.adherence_rate,
          };
        }
      } catch (fallbackErr) {
        console.error('Error fetching latest health score:', fallbackErr);
      }
      // If no previous health score, propagate error
      throw new Error('Health prediction failed and no previous health score available.');
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
      if (!user) {
        console.warn('[mlService] No authenticated user, skipping health_score storage');
        return;
      }

      // Avoid queries if table is missing
      const exists = await this.checkTableExists('health_score');
      if (!exists) {
        console.warn('[mlService] Skipping health_score storage because table is missing');
        return;
      }

      // Clamp values to table constraints to avoid DB errors
      const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number(v) || 0, min), max);
      const complicationRisk = clamp(prediction.complication_risk, 0, 100);
      const adherenceRate = clamp(prediction.adherence_rate, 0, 100);
      const emergencyVisits = Math.max(0, Number(prediction.emergency_visits) || 0);

      const healthScore = Math.round(clamp(100 - complicationRisk, 0, 100));
      const trendDirection = this.calculateTrend(complicationRisk);

      console.log('[mlService] Preparing health_score payload:', {
        user_id: user.id,
        health_score: healthScore,
        complication_risk: complicationRisk,
        emergency_visits: emergencyVisits,
        adherence_rate: adherenceRate,
        trend_direction: trendDirection,
      });

      // Check for recent/today record to avoid duplicates
      const { data: existing, error: existingErr } = await supabase
        .from('health_score')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (existingErr) {
        console.error('Error checking existing health_score:', existingErr);
        if ((existingErr as any)?.message?.includes('relation') && (existingErr as any)?.message?.includes('health_score')) {
          console.warn('[mlService] The health_score table might be missing. Please run create_health_score_table.sql in your Supabase project.');
        }
      }

      const now = new Date();
      const payload = {
        user_id: user.id,
        health_score: healthScore,
        complication_risk: complicationRisk,
        emergency_visits: emergencyVisits,
        adherence_rate: adherenceRate,
        trend_direction: trendDirection,
        risk_factors: {
          cardiovascular: Math.round(complicationRisk * 0.8),
          metabolic: Math.round(complicationRisk * 0.9),
          respiratory: Math.round(complicationRisk * 0.85),
          renal: Math.round(complicationRisk * 0.95)
        }
      };

      if (existing && existing.length > 0) {
        const last = existing[0];
        const lastCreated = new Date(last.created_at);
        const isSameDay = lastCreated.toDateString() === now.toDateString();
        const withinFiveMinutes = (now.getTime() - lastCreated.getTime()) < 5 * 60 * 1000;
        if (isSameDay || withinFiveMinutes) {
          // Update the latest record instead of inserting a duplicate
          const { error: upErr } = await supabase
            .from('health_score')
            .update(payload)
            .eq('id', last.id);
          if (upErr) {
            console.error('Error updating health_score:', upErr);
          } else {
            console.log('[mlService] Updated existing health_score record:', last.id);
          }
          return;
        }
      }

      // Insert new record
      const { error: insErr } = await supabase.from('health_score').insert(payload);
      if (insErr) {
        console.error('Error inserting health_score:', insErr);
        if ((insErr as any)?.message?.includes('relation') && (insErr as any)?.message?.includes('health_score')) {
          console.warn('[mlService] The health_score table might be missing. Please run create_health_score_table.sql in your Supabase project.');
        }
      } else {
        console.log('[mlService] Inserted new health_score record');
      }
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

      // Avoid queries if table is missing
      const exists = await this.checkTableExists('health_score');
      if (!exists) {
        console.warn('[mlService] Skipping getLatestHealthScore because table is missing');
        return null;
      }

      const { data, error } = await supabase
        .from('health_score')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching health score:', error);
        if ((error as any)?.message?.includes('relation') && (error as any)?.message?.includes('health_score')) {
          console.warn('[mlService] The health_score table might be missing. Please run create_health_score_table.sql in your Supabase project.');
        }
      }

      if (!data || data.length === 0) {
        console.log('[mlService] No health_score records found for user');
        return null;
      }

      console.log('[mlService] getLatestHealthScore returned:', data[0]);
      return data[0];
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