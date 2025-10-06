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

  async predictRisk(request: MLPredictionRequest): Promise<MLPredictionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/${request.modelType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request.features),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        riskProbability: data.risk_probability,
        riskLevel: this.getRiskLevel(data.risk_probability),
        prediction: data.prediction,
        confidence: data.confidence || data.risk_probability,
      };
    } catch (error) {
      console.error('ML Service Error:', error);
      return this.getMockPrediction(request.modelType);
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
}

export const mlService = new MLService();
export type { MLPredictionRequest, MLPredictionResponse };