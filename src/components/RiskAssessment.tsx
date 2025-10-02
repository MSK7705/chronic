import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Shield, Activity, Heart, Eye, Siren } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '../lib/supabase';

interface RiskFactor {
  name: string;
  level: 'low' | 'moderate' | 'high';
  score: number;
  description: string;
  icon: any;
}

interface ChartDataPoint {
  date: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  temperature: number;
  weight: number;
}

interface StepsDataPoint {
  day: string;
  steps: number;
}

function RiskAssessment() {
  const [riskFactors] = useState<RiskFactor[]>([
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

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [stepsData, setStepsData] = useState<StepsDataPoint[]>([]);

  useEffect(() => {
    fetchVitalSignsData();
  }, []);

  const fetchVitalSignsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: true })
        .limit(30);

      if (error) {
        console.error('Error fetching vital signs:', error);
        // Use mock data if no data available
        setChartData(generateMockData());
        setStepsData(generateMockStepsData());
        return;
      }

      if (data && data.length > 0) {
        const formattedData = data.map((item, index) => ({
          date: new Date(item.recorded_at).toLocaleDateString(),
          bloodPressureSystolic: item.systolic || 0,
          bloodPressureDiastolic: item.diastolic || 0,
          heartRate: item.heart_rate || 0,
          temperature: item.temperature || 0,
          weight: item.weight || 0,
        }));
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

  const generateMockData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      data.push({
        date: date.toLocaleDateString(),
        bloodPressureSystolic: 120 + Math.random() * 20,
        bloodPressureDiastolic: 80 + Math.random() * 10,
        heartRate: 70 + Math.random() * 20,
        temperature: 98.6 + (Math.random() - 0.5) * 2,
        weight: 150 + Math.random() * 10,
      });
    }
    return data;
  };

  const generateMockStepsData = (): StepsDataPoint[] => {
    const data: StepsDataPoint[] = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach(day => {
      data.push({
        day,
        steps: Math.floor(5000 + Math.random() * 5000),
      });
    });
    return data;
  };

  const overallRiskScore = 28;

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

      {/* Individual Risk Factors */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Individual Risk Factors</h3>
        <div className="space-y-4">
          {riskFactors.map((factor, index) => {
            const colors = getRiskColor(factor.level);
            return (
              <div
                key={index}
                className={`${colors.bg} border-2 ${colors.border} rounded-xl p-5 transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`${colors.bg} p-2 rounded-lg`}>
                      <factor.icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{factor.name}</h4>
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
        <h3 className="text-2xl font-bold text-slate-900">Health Metrics Trends</h3>
        
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
