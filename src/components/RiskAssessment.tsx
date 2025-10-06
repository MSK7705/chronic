import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Shield, Activity, Heart, Eye, Siren, ChevronDown, Brain } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '../lib/supabase';
import { mlService } from '../services/mlService';
import { carePlanService } from '../services/carePlanService';
import MLPredictionForm from './MLPredictionForm';
import MLPredictionResults from './MLPredictionResults';
import { MLPredictionResponse } from '../services/mlService';

interface AIRiskAnalysis {
  overallRiskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'very-high';
  conditions: string[];
  riskFactors: string[];
  recommendations: string[];
  complicationRisk: number;
  emergencyVisits: number;
  adherenceRate: number;
}

interface RiskFactor {
  name: string;
  level: 'low' | 'moderate' | 'high';
  score: number;
  description: string;
  icon: any;
}

interface ChartDataPoint {
  date: string;
  time?: string;
  day?: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  temperature: number;
  weight: number;
}

interface StepsDataPoint {
  day: string;
  time?: string;
  steps: number;
}

type TimePeriod = '1day' | '1week' | '1month';

function RiskAssessment() {

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [stepsData, setStepsData] = useState<StepsDataPoint[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1week');
  const [mlPredictions, setMlPredictions] = useState<(MLPredictionResponse & { modelType: string })[]>([]);
  const [showMLForm, setShowMLForm] = useState(false);
  const [overallRiskScore, setOverallRiskScore] = useState<number>(28);
  const [aiRiskAnalysis, setAiRiskAnalysis] = useState<AIRiskAnalysis | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);

  useEffect(() => {
    fetchVitalSignsData();
    fetchHealthPredictions();
    fetchMLPredictions();
    fetchAIRiskAnalysis();
  }, [timePeriod]);

  const fetchAIRiskAnalysis = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get AI-generated health data analysis
      const analysis = await carePlanService.analyzeHealthData(user.id);
      
      const aiAnalysis: AIRiskAnalysis = {
        overallRiskScore: Math.round((1 - analysis.healthScore / 100) * 100),
        riskLevel: analysis.complicationRisk > 0.8 ? 'very-high' : 
                  analysis.complicationRisk > 0.6 ? 'high' :
                  analysis.complicationRisk > 0.3 ? 'moderate' : 'low',
        conditions: analysis.conditions,
        riskFactors: analysis.riskFactors,
        recommendations: [], // Will be populated from care plan
        complicationRisk: analysis.complicationRisk,
        emergencyVisits: analysis.emergencyVisits,
        adherenceRate: analysis.adherenceRate
      };

      setAiRiskAnalysis(aiAnalysis);
      setOverallRiskScore(aiAnalysis.overallRiskScore);

      // Convert AI analysis to risk factors for display
      const aiRiskFactors: RiskFactor[] = analysis.riskFactors.map((factor, index) => {
        const riskScore = Math.round(analysis.complicationRisk * 100 * (0.8 + index * 0.1));
        return {
          name: factor,
          level: riskScore > 70 ? 'high' : riskScore > 40 ? 'moderate' : 'low',
          score: riskScore,
          description: `AI-detected risk factor based on health data analysis`,
          icon: getIconForRiskFactor(factor)
        };
      });

      setRiskFactors(aiRiskFactors);
    } catch (error) {
      console.error('Error fetching AI risk analysis:', error);
    }
  };

  const getIconForRiskFactor = (factor: string) => {
    if (factor.toLowerCase().includes('cardiovascular') || factor.toLowerCase().includes('heart')) return Heart;
    if (factor.toLowerCase().includes('kidney') || factor.toLowerCase().includes('renal')) return Activity;
    if (factor.toLowerCase().includes('eye') || factor.toLowerCase().includes('retina')) return Eye;
    if (factor.toLowerCase().includes('nerve') || factor.toLowerCase().includes('neuro')) return TrendingUp;
    if (factor.toLowerCase().includes('diabetes') || factor.toLowerCase().includes('glucose')) return AlertTriangle;
    return Shield;
  };

  const fetchMLPredictions = async () => {
    try {
      const predictions = await mlService.getUserPredictions();
      setMlPredictions(predictions);
      
      // Update risk factors based on stored predictions
      if (predictions.length > 0) {
        updateRiskFactorsFromML(predictions);
      }
    } catch (error) {
      console.error('Error fetching ML predictions:', error);
    }
  };

  const fetchHealthPredictions = async () => {
    try {
      // First try to get from new health_score table
      const latestScore = await mlService.getLatestHealthScore();
      if (latestScore) {
        setOverallRiskScore(100 - latestScore.health_score); // Convert health score to risk score
        
        // Update risk factors based on stored risk factors
        const riskFactors = latestScore.risk_factors || {};
        setRiskFactors([
          {
            name: 'Cardiovascular Risk',
            level: riskFactors.cardiovascular > 60 ? 'high' : riskFactors.cardiovascular > 30 ? 'moderate' : 'low',
            score: riskFactors.cardiovascular || Math.round(latestScore.complication_risk * 0.8),
            description: riskFactors.cardiovascular > 60 ? 'High cardiovascular risk detected' : 
                        riskFactors.cardiovascular > 30 ? 'Moderate cardiovascular risk' : 'Low cardiovascular risk',
            icon: Heart
          },
          {
            name: 'Kidney Disease',
            level: riskFactors.renal > 50 ? 'moderate' : 'low',
            score: riskFactors.renal || Math.round(latestScore.complication_risk * 0.95),
            description: riskFactors.renal > 50 ? 'Monitor kidney function' : 'Kidney function stable',
            icon: Activity
          },
          {
            name: 'Retinopathy',
            level: riskFactors.metabolic > 40 ? 'moderate' : 'low',
            score: riskFactors.metabolic || Math.round(latestScore.complication_risk * 0.9),
            description: riskFactors.metabolic > 40 ? 'Regular eye exams recommended' : 'Eye health stable',
            icon: Eye
          },
          {
            name: 'Neuropathy',
            level: riskFactors.respiratory > 45 ? 'moderate' : 'low',
            score: riskFactors.respiratory || Math.round(latestScore.complication_risk * 0.85),
            description: riskFactors.respiratory > 45 ? 'Monitor for nerve symptoms' : 'Nerve function stable',
            icon: TrendingUp
          }
        ]);
        return;
      }

      // Fallback to old health_predictions table
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: latestPrediction } = await supabase
        .from('health_predictions')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (latestPrediction && latestPrediction.length > 0) {
        const pred = latestPrediction[0];
        setOverallRiskScore(Math.round(pred.complication_risk));

        // Update risk factors based on predictions
        setRiskFactors([
          {
            name: 'Cardiovascular Risk',
            level: pred.complication_risk > 60 ? 'high' : pred.complication_risk > 30 ? 'moderate' : 'low',
            score: Math.round(pred.complication_risk),
            description: pred.complication_risk > 60 ? 'High cardiovascular risk detected' : 
                        pred.complication_risk > 30 ? 'Moderate cardiovascular risk' : 'Low cardiovascular risk',
            icon: Heart
          },
          {
            name: 'Kidney Disease',
            level: pred.complication_risk > 50 ? 'moderate' : 'low',
            score: Math.round(pred.complication_risk * 0.4),
            description: pred.complication_risk > 50 ? 'Monitor kidney function' : 'Kidney function stable',
            icon: Activity
          },
          {
            name: 'Retinopathy',
            level: pred.complication_risk > 40 ? 'moderate' : 'low',
            score: Math.round(pred.complication_risk * 0.5),
            description: pred.complication_risk > 40 ? 'Regular eye exams recommended' : 'Eye health stable',
            icon: Eye
          },
          {
            name: 'Neuropathy',
            level: pred.complication_risk > 45 ? 'moderate' : 'low',
            score: Math.round(pred.complication_risk * 0.85),
            description: pred.complication_risk > 45 ? 'Monitor for nerve symptoms' : 'Nerve function stable',
            icon: TrendingUp
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching health predictions:', error);
    }
  };

  const fetchVitalSignsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate date range based on selected time period
      const now = new Date();
      let startDate = new Date();
      let limit = 30;

      switch (timePeriod) {
        case '1day':
          startDate.setHours(0, 0, 0, 0);
          limit = 24; // Hourly data for 1 day
          break;
        case '1week':
          startDate.setDate(now.getDate() - 7);
          limit = 7; // Daily data for 1 week
          break;
        case '1month':
          startDate.setDate(now.getDate() - 30);
          limit = 30; // Daily data for 1 month
          break;
      }

      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching vital signs:', error);
        // Use mock data if no data available
        setChartData(generateMockData());
        setStepsData(generateMockStepsData());
        return;
      }

      if (data && data.length > 0) {
        const formattedData = data.map((item, index) => {
          const recordedDate = new Date(item.recorded_at);
          let dateLabel = '';
          let timeLabel = '';
          let dayLabel = '';

          switch (timePeriod) {
            case '1day':
              timeLabel = recordedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              dateLabel = timeLabel;
              break;
            case '1week':
              dayLabel = recordedDate.toLocaleDateString([], { weekday: 'short' });
              dateLabel = dayLabel;
              break;
            case '1month':
              dateLabel = recordedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
              break;
          }

          return {
            date: dateLabel,
            time: timeLabel,
            day: dayLabel,
            bloodPressureSystolic: item.systolic || 0,
            bloodPressureDiastolic: item.diastolic || 0,
            heartRate: item.heart_rate || 0,
            temperature: item.temperature || 0,
            weight: item.weight || 0,
          };
        });
        setChartData(formattedData);

        // Generate mock steps data since it's not in our current schema
        setStepsData(generateMockStepsData());
      } else {
        // Use mock data if no real data available
        setChartData(generateMockData());
        setStepsData(generateMockStepsData());
      }
    } catch (error) {
      console.error('Error:', error);
      setChartData(generateMockData());
      setStepsData(generateMockStepsData());
    }
  };

  // Realtime refresh on new vital_signs inserts
  useEffect(() => {
    const channel = supabase
      .channel('realtime:risk:vital_signs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vital_signs' },
        () => {
          fetchVitalSignsData();
          fetchHealthPredictions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timePeriod]);

  const generateMockData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = new Date();

    switch (timePeriod) {
      case '1day':
        // Generate hourly data for 1 day
        for (let i = 0; i < 24; i++) {
          const hour = new Date(now);
          hour.setHours(i, 0, 0, 0);
          const timeLabel = hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          data.push({
            date: timeLabel,
            time: timeLabel,
            day: '',
            bloodPressureSystolic: 120 + Math.random() * 20,
            bloodPressureDiastolic: 80 + Math.random() * 10,
            heartRate: 70 + Math.random() * 20,
            temperature: 98.6 + Math.random() * 2,
            weight: 150 + Math.random() * 10,
          });
        }
        break;

      case '1week':
        // Generate daily data for 1 week
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
          const day = new Date(now);
          day.setDate(now.getDate() - i);
          const dayLabel = daysOfWeek[day.getDay()];
          
          data.push({
            date: dayLabel,
            time: '',
            day: dayLabel,
            bloodPressureSystolic: 120 + Math.random() * 20,
            bloodPressureDiastolic: 80 + Math.random() * 10,
            heartRate: 70 + Math.random() * 20,
            temperature: 98.6 + Math.random() * 2,
            weight: 150 + Math.random() * 10,
          });
        }
        break;

      case '1month':
        // Generate daily data for 1 month
        for (let i = 29; i >= 0; i--) {
          const day = new Date(now);
          day.setDate(now.getDate() - i);
          const dateLabel = day.toLocaleDateString([], { month: 'short', day: 'numeric' });
          
          data.push({
            date: dateLabel,
            time: '',
            day: '',
            bloodPressureSystolic: 120 + Math.random() * 20,
            bloodPressureDiastolic: 80 + Math.random() * 10,
            heartRate: 70 + Math.random() * 20,
            temperature: 98.6 + Math.random() * 2,
            weight: 150 + Math.random() * 10,
          });
        }
        break;
    }

    return data;
  };

  const generateMockStepsData = (): StepsDataPoint[] => {
    const data: StepsDataPoint[] = [];
    const now = new Date();

    switch (timePeriod) {
      case '1day':
        // Generate hourly data for 1 day
        for (let i = 0; i < 24; i++) {
          const hour = new Date(now);
          hour.setHours(i, 0, 0, 0);
          const timeLabel = hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          data.push({
            day: timeLabel,
            time: timeLabel,
            steps: Math.floor(Math.random() * 500) + 100, // 100-600 steps per hour
          });
        }
        break;

      case '1week':
        // Generate daily data for 1 week
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
          const day = new Date(now);
          day.setDate(now.getDate() - i);
          const dayLabel = daysOfWeek[day.getDay()];
          
          data.push({
            day: dayLabel,
            time: '',
            steps: Math.floor(Math.random() * 5000) + 3000, // 3000-8000 steps per day
          });
        }
        break;

      case '1month':
        // Generate daily data for 1 month
        for (let i = 29; i >= 0; i--) {
          const day = new Date(now);
          day.setDate(now.getDate() - i);
          const dateLabel = day.toLocaleDateString([], { month: 'short', day: 'numeric' });
          
          data.push({
            day: dateLabel,
            time: '',
            steps: Math.floor(Math.random() * 5000) + 3000, // 3000-8000 steps per day
          });
        }
        break;
    }

    return data;
  };


  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        bar: 'bg-emerald-500'
      };
      case 'moderate': return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        bar: 'bg-amber-500'
      };
      case 'high': return {
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        text: 'text-rose-700',
        bar: 'bg-rose-500'
      };
      default: return {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        bar: 'bg-slate-500'
      };
    }
  };

  const getOverallRiskLevel = (score: number) => {
    if (score < 30) return { level: 'Low Risk', color: 'emerald', icon: Shield };
    if (score < 60) return { level: 'Moderate Risk', color: 'amber', icon: AlertTriangle };
    return { level: 'High Risk', color: 'rose', icon: Siren };
  };

  const overallRisk = getOverallRiskLevel(overallRiskScore);

  const handleMLPrediction = (result: MLPredictionResponse & { modelType: string }) => {
    setMlPredictions(prev => {
      const filtered = prev.filter(p => p.modelType !== result.modelType);
      const updated = [...filtered, result];
      
      // Update individual risk factors based on ML predictions
      updateRiskFactorsFromML(updated);
      
      return updated;
    });
    setShowMLForm(false);
  };

  const updateRiskFactorsFromML = (predictions: (MLPredictionResponse & { modelType: string })[]) => {
    const updatedFactors = [...riskFactors];
    
    predictions.forEach(prediction => {
      const riskScore = Math.round(prediction.riskProbability * 100);
      const riskLevel = prediction.riskLevel;
      
      switch (prediction.modelType) {
        case 'heart':
          const heartIndex = updatedFactors.findIndex(f => f.name === 'Cardiovascular Risk');
          if (heartIndex !== -1) {
            updatedFactors[heartIndex] = {
              ...updatedFactors[heartIndex],
              score: riskScore,
              level: riskLevel,
              description: `AI Assessment: ${riskLevel} risk for heart disease (${riskScore}% probability)`
            };
          }
          break;
          
        case 'diabetes':
          const diabetesIndex = updatedFactors.findIndex(f => f.name === 'Diabetes Risk');
          if (diabetesIndex === -1) {
            updatedFactors.push({
              name: 'Diabetes Risk',
              level: riskLevel,
              score: riskScore,
              description: `AI Assessment: ${riskLevel} risk for diabetes (${riskScore}% probability)`,
              icon: Activity
            });
          } else {
            updatedFactors[diabetesIndex] = {
              ...updatedFactors[diabetesIndex],
              score: riskScore,
              level: riskLevel,
              description: `AI Assessment: ${riskLevel} risk for diabetes (${riskScore}% probability)`
            };
          }
          break;
          
        case 'hypertension':
          const hyperIndex = updatedFactors.findIndex(f => f.name === 'Hypertension Risk');
          if (hyperIndex === -1) {
            updatedFactors.push({
              name: 'Hypertension Risk',
              level: riskLevel,
              score: riskScore,
              description: `AI Assessment: ${riskLevel} risk for hypertension (${riskScore}% probability)`,
              icon: Heart
            });
          } else {
            updatedFactors[hyperIndex] = {
              ...updatedFactors[hyperIndex],
              score: riskScore,
              level: riskLevel,
              description: `AI Assessment: ${riskLevel} risk for hypertension (${riskScore}% probability)`
            };
          }
          break;
          
        case 'ckd':
          const ckdIndex = updatedFactors.findIndex(f => f.name === 'Kidney Disease');
          if (ckdIndex !== -1) {
            updatedFactors[ckdIndex] = {
              ...updatedFactors[ckdIndex],
              score: riskScore,
              level: riskLevel,
              description: `AI Assessment: ${riskLevel} risk for chronic kidney disease (${riskScore}% probability)`
            };
          }
          break;
          
        case 'asthma':
          const asthmaIndex = updatedFactors.findIndex(f => f.name === 'Asthma Risk');
          if (asthmaIndex === -1) {
            updatedFactors.push({
              name: 'Asthma Risk',
              level: riskLevel,
              score: riskScore,
              description: `AI Assessment: ${riskLevel} risk for asthma (${riskScore}% probability)`,
              icon: Activity
            });
          } else {
            updatedFactors[asthmaIndex] = {
              ...updatedFactors[asthmaIndex],
              score: riskScore,
              level: riskLevel,
              description: `AI Assessment: ${riskLevel} risk for asthma (${riskScore}% probability)`
            };
          }
          break;
          
        case 'arthritis':
          const arthritisIndex = updatedFactors.findIndex(f => f.name === 'Arthritis Risk');
          if (arthritisIndex === -1) {
            updatedFactors.push({
              name: 'Arthritis Risk',
              level: riskLevel,
              score: riskScore,
              description: `AI Assessment: ${riskLevel} risk for arthritis (${riskScore}% probability)`,
              icon: TrendingUp
            });
          } else {
            updatedFactors[arthritisIndex] = {
              ...updatedFactors[arthritisIndex],
              score: riskScore,
              level: riskLevel,
              description: `AI Assessment: ${riskLevel} risk for arthritis (${riskScore}% probability)`
            };
          }
          break;
          
        case 'copd':
          const copdIndex = updatedFactors.findIndex(f => f.name === 'COPD Risk');
          if (copdIndex === -1) {
            updatedFactors.push({
              name: 'COPD Risk',
              level: riskLevel,
              score: riskScore,
              description: `AI Assessment: ${riskLevel} risk for COPD (${riskScore}% probability)`,
              icon: Activity
            });
          } else {
            updatedFactors[copdIndex] = {
              ...updatedFactors[copdIndex],
              score: riskScore,
              level: riskLevel,
              description: `AI Assessment: ${riskLevel} risk for COPD (${riskScore}% probability)`
            };
          }
          break;
          
        case 'liver':
          const liverIndex = updatedFactors.findIndex(f => f.name === 'Liver Disease Risk');
          if (liverIndex === -1) {
            updatedFactors.push({
              name: 'Liver Disease Risk',
              level: riskLevel,
              score: riskScore,
              description: `AI Assessment: ${riskLevel} risk for liver disease (${riskScore}% probability)`,
              icon: Activity
            });
          } else {
            updatedFactors[liverIndex] = {
              ...updatedFactors[liverIndex],
              score: riskScore,
              level: riskLevel,
              description: `AI Assessment: ${riskLevel} risk for liver disease (${riskScore}% probability)`
            };
          }
          break;
      }
    });
    
    setRiskFactors(updatedFactors);
  };

  const clearMLResults = async () => {
    try {
      await mlService.clearUserPredictions();
      setMlPredictions([]);
      
      // Reset risk factors to default state
      setRiskFactors([
        {
          name: 'Cardiovascular Risk',
          level: 'moderate',
          score: 45,
          description: 'Blood pressure trends show occasional elevations',
          icon: Heart
        },
        {
          name: 'Kidney Disease',
          level: 'low',
          score: 18,
          description: 'Glucose control stable, minimal risk factors',
          icon: Activity
        },
        {
          name: 'Retinopathy',
          level: 'low',
          score: 22,
          description: 'Regular screenings show healthy progression',
          icon: Eye
        },
        {
          name: 'Neuropathy',
          level: 'moderate',
          score: 38,
          description: 'Monitor for symptoms, maintain glucose control',
          icon: TrendingUp
        }
      ]);
    } catch (error) {
      console.error('Error clearing ML predictions:', error);
      // Fallback to local clear if Supabase fails
      setMlPredictions([]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Overall Risk Score */}
      <div className={`bg-gradient-to-br from-${overallRisk.color}-500 to-${overallRisk.color}-600 rounded-2xl shadow-lg p-8 text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <overallRisk.icon className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Overall Complication Risk</h2>
            </div>
            <p className="text-lg opacity-90 mb-6">
              Based on your recent health data and predictive analysis
            </p>
            <div className="flex items-baseline space-x-3">
              <span className="text-5xl font-bold">{overallRiskScore}%</span>
              <span className="text-xl">{overallRisk.level}</span>
            </div>
          </div>

          {/* Risk Gauge */}
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="16"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="white"
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 70 * (overallRiskScore / 100)} ${2 * Math.PI * 70}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{overallRiskScore}</div>
                <div className="text-xs opacity-75">Risk Score</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">-25%</div>
              <div className="text-sm opacity-75">vs. Last Month</div>
            </div>
            <div>
              <div className="text-2xl font-bold">92%</div>
              <div className="text-sm opacity-75">Adherence Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold">3</div>
              <div className="text-sm opacity-75">Risk Factors</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Risk Assessment Section */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Brain className="w-8 h-8" />
              <h2 className="text-2xl font-bold">AI Risk Assessment</h2>
            </div>
            <p className="text-lg opacity-90 mb-6">
              Get personalized predictions using advanced machine learning models
            </p>
            {!showMLForm ? (
              <button
                onClick={() => setShowMLForm(true)}
                className="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors"
              >
                Start AI Assessment
              </button>
            ) : (
              <button
                onClick={() => setShowMLForm(false)}
                className="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors"
              >
                ← Back to Overview
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ML Form and Results */}
      {showMLForm && (
        <div className="flex justify-center">
          <div className="w-full max-w-4xl">
            <MLPredictionForm onPredictionResult={handleMLPrediction} />
          </div>
        </div>
      )}

      {/* ML Results */}
      {showMLForm && mlPredictions.length > 0 && (
        <div className="flex justify-center">
          <div className="w-full max-w-4xl">
            <MLPredictionResults results={mlPredictions} onClear={clearMLResults} />
          </div>
        </div>
      )}

      {/* ML Results Only */}
      {!showMLForm && mlPredictions.length > 0 && (
        <div className="flex justify-center">
          <div className="w-full max-w-4xl">
            <MLPredictionResults results={mlPredictions} onClear={clearMLResults} />
          </div>
        </div>
      )}

      {/* Individual Risk Factors */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Individual Risk Factors</h3>
          {mlPredictions.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-purple-600">
              <Brain className="w-4 h-4" />
              <span>Updated with AI Assessment</span>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {riskFactors.map((factor, index) => {
            const colors = getRiskColor(factor.level);
            const hasMLPrediction = mlPredictions.some(p => 
              (p.modelType === 'heart' && factor.name === 'Cardiovascular Risk') ||
              (p.modelType === 'diabetes' && factor.name === 'Diabetes Risk') ||
              (p.modelType === 'hypertension' && factor.name === 'Hypertension Risk') ||
              (p.modelType === 'ckd' && factor.name === 'Kidney Disease') ||
              (p.modelType === 'asthma' && factor.name === 'Asthma Risk') ||
              (p.modelType === 'arthritis' && factor.name === 'Arthritis Risk') ||
              (p.modelType === 'copd' && factor.name === 'COPD Risk') ||
              (p.modelType === 'liver' && factor.name === 'Liver Disease Risk')
            );
            
            return (
              <div
                key={index}
                className={`${colors.bg} border-2 ${colors.border} rounded-xl p-5 transition-all duration-200 hover:shadow-md ${hasMLPrediction ? 'ring-2 ring-purple-200' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`${colors.bg} p-2 rounded-lg relative`}>
                      <factor.icon className={`w-5 h-5 ${colors.text}`} />
                      {hasMLPrediction && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                          <Brain className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 flex items-center space-x-2">
                        <span>{factor.name}</span>
                        {hasMLPrediction && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            AI Enhanced
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">{factor.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${colors.text}`}>{factor.score}%</div>
                    <div className={`text-xs font-medium ${colors.text} uppercase`}>{factor.level}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                  <div
                    className={`${colors.bar} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
                
                {/* Show ML prediction details if available */}
                {hasMLPrediction && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Brain className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">AI Assessment Details</span>
                    </div>
                    {mlPredictions
                      .filter(p => 
                        (p.modelType === 'heart' && factor.name === 'Cardiovascular Risk') ||
                        (p.modelType === 'diabetes' && factor.name === 'Diabetes Risk') ||
                        (p.modelType === 'hypertension' && factor.name === 'Hypertension Risk') ||
                        (p.modelType === 'ckd' && factor.name === 'Kidney Disease') ||
                        (p.modelType === 'asthma' && factor.name === 'Asthma Risk') ||
                        (p.modelType === 'arthritis' && factor.name === 'Arthritis Risk') ||
                        (p.modelType === 'copd' && factor.name === 'COPD Risk') ||
                        (p.modelType === 'liver' && factor.name === 'Liver Disease Risk')
                      )
                      .map((prediction, idx) => (
                        <div key={idx} className="text-xs text-purple-700">
                          <div className="flex justify-between">
                            <span>Prediction: {prediction.prediction === 1 ? 'Positive' : 'Negative'}</span>
                            <span>Confidence: {(prediction.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Key Insights</h3>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Improved glucose control</span> reduced complication risk by 15% this month
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Blood pressure variability</span> detected in evening readings
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Medication adherence</span> has been excellent at 92%
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Exercise patterns</span> correlate with better glucose levels
              </p>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Preventive Goals</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Reduce Emergency Visits</span>
                <span className="text-sm font-bold text-emerald-600">28% / 30%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '93%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Reduce Complications</span>
                <span className="text-sm font-bold text-emerald-600">22% / 25%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '88%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Medication Adherence</span>
                <span className="text-sm font-bold text-emerald-600">92% / 95%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '97%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Metrics Charts */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-slate-900">Health Metrics Trends</h3>
          
          {/* Time Period Dropdown */}
          <div className="relative">
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1day">1 Day</option>
              <option value="1week">1 Week</option>
              <option value="1month">1 Month</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        
        {/* First Row - Blood Pressure and Heart Rate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blood Pressure Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-lg font-bold text-slate-900 mb-4">Blood Pressure Trends</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="bloodPressureSystolic" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Systolic BP"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bloodPressureDiastolic" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    name="Diastolic BP"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Heart Rate Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-lg font-bold text-slate-900 mb-4">Heart Rate Trends</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="heartRate" 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    name="Heart Rate (bpm)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Second Row - Temperature and Weight */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Body Temperature Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-lg font-bold text-slate-900 mb-4">Body Temperature Trends</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#059669" 
                    strokeWidth={2}
                    name="Temperature (°F)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weight Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-lg font-bold text-slate-900 mb-4">Weight Trends</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#7c3aed" 
                    strokeWidth={2}
                    name="Weight (lbs)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Third Row - Steps Bar Chart (Full Width) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h4 className="text-lg font-bold text-slate-900 mb-4">Weekly Steps</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stepsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="steps" 
                  fill="#3b82f6" 
                  name="Steps"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskAssessment;
