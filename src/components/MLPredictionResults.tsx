import { AlertTriangle, Shield, Siren, TrendingUp, Brain } from 'lucide-react';
import { MLPredictionResponse } from '../services/mlService';

interface MLPredictionResultsProps {
  results: (MLPredictionResponse & { modelType: string })[];
  onClear: () => void;
}

function MLPredictionResults({ results, onClear }: MLPredictionResultsProps) {
  if (results.length === 0) return null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        icon: Shield
      };
      case 'moderate': return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        icon: AlertTriangle
      };
      case 'high': return {
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        text: 'text-rose-700',
        icon: Siren
      };
      default: return {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        icon: TrendingUp
      };
    }
  };

  const getModelDisplayName = (modelType: string) => {
    const names: Record<string, string> = {
      heart: 'Heart Disease',
      diabetes: 'Diabetes',
      hypertension: 'Hypertension',
      ckd: 'Chronic Kidney Disease',
      asthma: 'Asthma',
      arthritis: 'Arthritis',
      copd: 'COPD',
      liver: 'Liver Disease'
    };
    return names[modelType] || modelType;
  };

  const getModelIcon = (modelType: string) => {
    const icons: Record<string, any> = {
      heart: '❤️',
      diabetes: '🩸',
      hypertension: '🫀',
      ckd: '🫘',
      asthma: '🫁',
      arthritis: '🦴',
      copd: '💨',
      liver: '🫀'
    };
    return icons[modelType] || '🏥';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-slate-900">AI Prediction Results</h3>
        </div>
        <button
          onClick={onClear}
          className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-100"
        >
          Clear Results
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => {
          const colors = getRiskColor(result.riskLevel);
          const IconComponent = colors.icon;
          
          return (
            <div
              key={index}
              className={`${colors.bg} border-2 ${colors.border} rounded-xl p-5`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`${colors.bg} p-2 rounded-lg`}>
                    <IconComponent className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 flex items-center space-x-2">
                      <span>{getModelIcon(result.modelType)}</span>
                      <span>{getModelDisplayName(result.modelType)}</span>
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      AI-powered risk assessment based on your health data
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${colors.text}`}>
                    {(result.riskProbability * 100).toFixed(1)}%
                  </div>
                  <div className={`text-xs font-medium ${colors.text} uppercase`}>
                    {result.riskLevel} Risk
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-900">
                    {result.prediction === 1 ? 'Positive' : 'Negative'}
                  </div>
                  <div className="text-xs text-slate-600">Prediction</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-900">
                    {(result.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-600">Confidence</div>
                </div>
              </div>

              <div className="w-full bg-white rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.riskLevel === 'low' ? 'bg-emerald-500' :
                    result.riskLevel === 'moderate' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${result.riskProbability * 100}%` }}
                />
              </div>

              <div className="mt-4 p-3 bg-white rounded-lg">
                <p className="text-sm text-slate-700">
                  {result.riskLevel === 'low' && 
                    "Your risk assessment indicates a low probability. Continue maintaining healthy habits and regular check-ups."
                  }
                  {result.riskLevel === 'moderate' && 
                    "Moderate risk detected. Consider consulting with your healthcare provider for preventive measures."
                  }
                  {result.riskLevel === 'high' && 
                    "High risk indicated. Please consult with a healthcare professional immediately for proper evaluation and care."
                  }
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Important Disclaimer</h4>
            <p className="text-sm text-blue-700 mt-1">
              These AI predictions are for informational purposes only and should not replace professional medical advice. 
              Always consult with qualified healthcare providers for proper diagnosis and treatment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MLPredictionResults;