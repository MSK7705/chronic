import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { mlService } from '../services/mlService';
import { carePlanService } from '../services/carePlanService';
import { TrendingUp, TrendingDown, Activity, Heart, Droplet, Wind, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HealthMetric {
  label: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'danger';
  trend: 'up' | 'down' | 'stable';
  icon: any;
  color: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  time: string;
}

function Dashboard() {
  const [userName, setUserName] = useState<string>('');
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [healthScore, setHealthScore] = useState<number>(75);
  const [complicationRiskDelta, setComplicationRiskDelta] = useState<number>(-22);
  const [emergencyVisitsDelta, setEmergencyVisitsDelta] = useState<number>(-28);
  const [adherenceRate, setAdherenceRate] = useState<number>(92);
  const [riskHistory, setRiskHistory] = useState<{ date: string; complication: number }[]>([]);
  const [carePlanStatus, setCarePlanStatus] = useState<{
    hasActivePlan: boolean;
    lastUpdated: string | null;
    nextReview: string | null;
    riskLevel: string | null;
  }>({
    hasActivePlan: false,
    lastUpdated: null,
    nextReview: null,
    riskLevel: null
  });
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'warning',
      message: 'Blood glucose slightly elevated. Consider checking your diet.',
      time: '2 hours ago'
    },
    {
      id: '2',
      type: 'success',
      message: 'Medication reminder: Take evening dose at 8:00 PM',
      time: '4 hours ago'
    },
    {
      id: '3',
      type: 'info',
      message: 'Next appointment scheduled for Oct 15, 2025',
      time: '1 day ago'
    }
  ]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        } else if (user?.user_metadata?.name) {
          setUserName(user.user_metadata.name);
        } else {
          setUserName('User');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserName('User');
      }
    };

    const fetchLatestHealthScore = async () => {
      try {
        const latestScore = await mlService.getLatestHealthScore();
        if (latestScore) {
          setHealthScore(latestScore.health_score);
          setComplicationRiskDelta(-Math.round(latestScore.complication_risk));
          setEmergencyVisitsDelta(-Math.round(latestScore.emergency_visits));
          setAdherenceRate(Math.round(latestScore.adherence_rate));
        }
      } catch (error) {
        console.error('Error fetching latest health score:', error);
      }
    };

    const fetchCarePlanStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const carePlan = await carePlanService.getLatestCarePlan(user.id);
          if (carePlan) {
            setCarePlanStatus({
              hasActivePlan: true,
              lastUpdated: carePlan.updatedAt,
              nextReview: carePlan.nextReviewDate,
              riskLevel: carePlan.riskLevel
            });
          } else {
            // Generate a new care plan if none exists
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single();
            
            const patientName = profile?.full_name || userName || 'Patient';
            const newCarePlan = await carePlanService.generateCarePlan(user.id, patientName);
            
            if (newCarePlan) {
              await carePlanService.storeCarePlan(newCarePlan);
              setCarePlanStatus({
                hasActivePlan: true,
                lastUpdated: newCarePlan.updatedAt,
                nextReview: newCarePlan.nextReviewDate,
                riskLevel: newCarePlan.riskLevel
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching care plan status:', error);
      }
    };

    const fetchVitalSigns = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('vital_signs')
            .select('*')
            .eq('user_id', user.id)
            .order('recorded_at', { ascending: false })
            .limit(14);

          if (error) throw error;

          if (data && data.length > 0) {
            const latestData = data[0];
            const newMetrics: HealthMetric[] = [];

            // Blood Glucose
            if (latestData.blood_glucose) {
              const glucose = latestData.blood_glucose;
              let status: 'normal' | 'warning' | 'danger' = 'normal';
              if (glucose > 140) status = 'warning';
              if (glucose > 180) status = 'danger';
              
              newMetrics.push({
                label: 'Blood Glucose',
                value: glucose.toString(),
                unit: 'mg/dL',
                status,
                trend: 'stable',
                icon: Droplet,
                color: 'text-amber-600'
              });
            }

            // Blood Pressure
            if (latestData.systolic && latestData.diastolic) {
              const systolic = latestData.systolic;
              const diastolic = latestData.diastolic;
              let status: 'normal' | 'warning' | 'danger' = 'normal';
              if (systolic > 130 || diastolic > 80) status = 'warning';
              if (systolic > 140 || diastolic > 90) status = 'danger';
              
              newMetrics.push({
                label: 'Blood Pressure',
                value: `${systolic}/${diastolic}`,
                unit: 'mmHg',
                status,
                trend: 'stable',
                icon: Heart,
                color: 'text-rose-600'
              });
            }

            // Heart Rate
            if (latestData.heart_rate) {
              const heartRate = latestData.heart_rate;
              let status: 'normal' | 'warning' | 'danger' = 'normal';
              if (heartRate < 60 || heartRate > 100) status = 'warning';
              if (heartRate < 50 || heartRate > 120) status = 'danger';
              
              newMetrics.push({
                label: 'Heart Rate',
                value: heartRate.toString(),
                unit: 'bpm',
                status,
                trend: 'stable',
                icon: Activity,
                color: 'text-red-600'
              });
            }

            // Temperature
            if (latestData.temperature) {
              const temp = latestData.temperature;
              let status: 'normal' | 'warning' | 'danger' = 'normal';
              if (temp > 99.5 || temp < 97.0) status = 'warning';
              if (temp > 101.0 || temp < 95.0) status = 'danger';
              
              newMetrics.push({
                label: 'Body Temperature',
                value: temp.toString(),
                unit: '°F',
                status,
                trend: 'stable',
                icon: Wind,
                color: 'text-blue-600'
              });
            }

            // Weight
            if (latestData.weight) {
              newMetrics.push({
                label: 'Weight',
                value: latestData.weight.toString(),
                unit: 'lbs',
                status: 'normal',
                trend: 'stable',
                icon: Wind,
                color: 'text-purple-600'
              });
            }

            setMetrics(newMetrics);

            // Call backend health model
            const glucose = Number(latestData.blood_glucose) || 0;
            const systolic = Number(latestData.systolic) || 0;
            const diastolic = Number(latestData.diastolic) || 0;
            const heart_rate = Number(latestData.heart_rate) || 0;
            const temperature = Number(latestData.temperature) || 0;
            const weight = Number(latestData.weight) || 0;
            try {
              const pred = await mlService.predictHealthOverall({
                glucose,
                systolic_bp: systolic,
                diastolic_bp: diastolic,
                heart_rate,
                temperature,
                weight,
              });
              // Health score: invert complication risk
              setHealthScore(Math.round(100 - pred.complication_risk));
              setAdherenceRate(Math.round(pred.adherence_rate));
              setComplicationRiskDelta(-Math.round(pred.complication_risk));
              setEmergencyVisitsDelta(-Math.round(pred.emergency_visits));

              // Store prediction for trend
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                try {
                  await supabase.from('health_predictions').insert({
                    user_id: user.id,
                    complication_risk: pred.complication_risk,
                    emergency_visits: pred.emergency_visits,
                    adherence_rate: pred.adherence_rate,
                    recorded_at: new Date().toISOString(),
                  });
                } catch {}
                try {
                  const { data: hist } = await supabase
                    .from('health_predictions')
                    .select('complication_risk, recorded_at')
                    .eq('user_id', user.id)
                    .order('recorded_at', { ascending: true })
                    .limit(20);
                  if (hist) {
                    setRiskHistory(
                      hist.map((h: any) => ({
                        date: new Date(h.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                        complication: Math.round(h.complication_risk),
                      }))
                    );
                  }
                } catch {}
              }
            } catch (e) {
              console.warn('Health model prediction failed:', e);
            }
          } else {
            // No data found, show placeholder message
            setMetrics([]);
            setHealthScore(75);
          }
        }
      } catch (error) {
        console.error('Error fetching vital signs:', error);
        setMetrics([]);
      }
    };

    fetchUserData();
    fetchVitalSigns();
    fetchLatestHealthScore();
    fetchCarePlanStatus();

    // Realtime refresh on inserts
    const channel = supabase
      .channel('realtime:dashboard:vital_signs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vital_signs' },
        () => fetchVitalSigns()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-emerald-50 border-emerald-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'danger': return 'bg-rose-50 border-rose-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'danger': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-rose-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-emerald-500" />;
    return <div className="w-4 h-4 border-b-2 border-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900">Welcome back, {userName}</h2>
        <p className="text-slate-600 mt-1">Here's your health overview for today</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.length > 0 ? (
          metrics.map((metric, index) => (
            <div
              key={index}
              className={`
                ${getStatusColor(metric.status)}
                rounded-2xl border-2 p-6 transition-all duration-200
                hover:shadow-lg hover:scale-105 cursor-pointer
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-white shadow-sm ${metric.color}`}>
                  <metric.icon className="w-6 h-6" />
                </div>
                {getTrendIcon(metric.trend)}
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600">{metric.label}</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-slate-900">{metric.value}</span>
                  <span className="text-sm text-slate-500">{metric.unit}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <div className={`w-2 h-2 rounded-full ${getStatusDot(metric.status)}`} />
                <span className="text-xs font-medium text-slate-600 capitalize">{metric.status}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="text-slate-400 mb-2">
              <Activity className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-600 mb-2">No Health Data Available</h3>
            <p className="text-slate-500">Start by entering your vital signs in the Data Entry tab to see your health metrics here.</p>
          </div>
        )}
      </div>

      {/* Care Plan Status & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Care Plan Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Care Plan Status</h3>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          
          {carePlanStatus.hasActivePlan ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-slate-600">Active Care Plan</span>
              </div>
              
              {carePlanStatus.riskLevel && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Risk Level</span>
                  <span className={`text-sm font-medium capitalize ${
                    carePlanStatus.riskLevel === 'high' ? 'text-red-600' :
                    carePlanStatus.riskLevel === 'medium' ? 'text-amber-600' :
                    'text-emerald-600'
                  }`}>
                    {carePlanStatus.riskLevel}
                  </span>
                </div>
              )}
              
              {carePlanStatus.lastUpdated && (
                <div className="text-xs text-slate-500">
                  Last updated: {new Date(carePlanStatus.lastUpdated).toLocaleDateString()}
                </div>
              )}
              
              {carePlanStatus.nextReview && (
                <div className="text-xs text-slate-500">
                  Next review: {new Date(carePlanStatus.nextReview).toLocaleDateString()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Generating care plan...</p>
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Recent Alerts</h3>
            <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {alerts.slice(0, 2).map((alert) => (
              <div
                key={alert.id}
                className={`
                  flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200
                  ${alert.type === 'warning' ? 'bg-amber-50 border-amber-200' : ''}
                  ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200' : ''}
                  ${alert.type === 'info' ? 'bg-blue-50 border-blue-200' : ''}
                  hover:shadow-md
                `}
              >
                {alert.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
                {alert.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />}
                {alert.type === 'info' && <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />}

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-900 font-medium">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Health Score</h3>
            <div className="flex items-center space-x-2 text-emerald-100">
              <Activity className="w-4 h-4" />
              <span className="text-xs">AI Enhanced</span>
            </div>
          </div>

          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="white"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56 * (healthScore / 100)} ${2 * Math.PI * 56}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl font-bold">{healthScore}</span>
                  <div className="text-xs text-emerald-100">Health Score</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-emerald-100" />
                <span className="text-sm text-emerald-100">Complications Risk</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold">{Math.abs(complicationRiskDelta)}%</span>
                {complicationRiskDelta < 0 ? (
                  <TrendingDown className="w-4 h-4 text-emerald-200" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-red-200" />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-emerald-100" />
                <span className="text-sm text-emerald-100">Emergency Visits</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold">{Math.abs(emergencyVisitsDelta)}%</span>
                {emergencyVisitsDelta < 0 ? (
                  <TrendingDown className="w-4 h-4 text-emerald-200" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-red-200" />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-100" />
                <span className="text-sm text-emerald-100">Adherence Rate</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold">{adherenceRate}%</span>
                <CheckCircle className="w-4 h-4 text-emerald-200" />
              </div>
            </div>
          </div>

          {/* Risk Factor Breakdown */}
          <div className="mt-6 pt-4 border-t border-white/20">
            <h4 className="text-sm font-medium text-emerald-100 mb-3">Risk Factor Analysis</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-emerald-100">Cardiovascular</div>
                <div className="font-bold text-white">{Math.round(100 - healthScore * 0.8)}%</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-emerald-100">Metabolic</div>
                <div className="font-bold text-white">{Math.round(100 - healthScore * 0.9)}%</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-emerald-100">Respiratory</div>
                <div className="font-bold text-white">{Math.round(100 - healthScore * 0.85)}%</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-emerald-100">Renal</div>
                <div className="font-bold text-white">{Math.round(100 - healthScore * 0.95)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complication Risk Trend */}
      {riskHistory.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Complication Risk Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskHistory as any}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="complication" stroke="#10b981" strokeWidth={2} name="Complication Risk (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
