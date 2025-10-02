import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Heart, Droplet, Wind, AlertCircle, CheckCircle, Clock } from 'lucide-react';
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

    const fetchVitalSigns = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('vital_signs')
            .select('*')
            .eq('user_id', user.id)
            .order('recorded_at', { ascending: false })
            .limit(1);

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
          } else {
            // No data found, show placeholder message
            setMetrics([]);
          }
        }
      } catch (error) {
        console.error('Error fetching vital signs:', error);
        setMetrics([]);
      }
    };

    fetchUserData();
    fetchVitalSigns();
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

      {/* Alerts & Statistics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Recent Alerts</h3>
            <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`
                  flex items-start space-x-4 p-4 rounded-xl border-2 transition-all duration-200
                  ${alert.type === 'warning' ? 'bg-amber-50 border-amber-200' : ''}
                  ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200' : ''}
                  ${alert.type === 'info' ? 'bg-blue-50 border-blue-200' : ''}
                  hover:shadow-md
                `}
              >
                {alert.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                {alert.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
                {alert.type === 'info' && <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 font-medium">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white">
          <h3 className="text-lg font-bold mb-6">Health Score</h3>

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
                  strokeDasharray={`${2 * Math.PI * 56 * 0.75} ${2 * Math.PI * 56}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold">75</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-emerald-100">Complications Risk</span>
              <span className="text-sm font-bold">-22%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-emerald-100">Emergency Visits</span>
              <span className="text-sm font-bold">-28%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-emerald-100">Adherence Rate</span>
              <span className="text-sm font-bold">92%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Summary Chart Placeholder */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">7-Day Trends</h3>
        <div className="flex items-end justify-between h-48 space-x-4">
          {[68, 85, 72, 78, 92, 88, 75].map((height, index) => (
            <div key={index} className="flex-1 flex flex-col items-center space-y-2">
              <div className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-lg transition-all duration-300 hover:from-emerald-600 hover:to-teal-500"
                   style={{ height: `${height}%` }} />
              <span className="text-xs text-slate-500 font-medium">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
