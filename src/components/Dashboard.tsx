import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Heart, Droplet, Wind, AlertCircle, CheckCircle, Clock } from 'lucide-react';

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
  const [metrics, setMetrics] = useState<HealthMetric[]>([
    {
      label: 'Blood Glucose',
      value: '142',
      unit: 'mg/dL',
      status: 'warning',
      trend: 'up',
      icon: Droplet,
      color: 'text-amber-600'
    },
    {
      label: 'Blood Pressure',
      value: '128/82',
      unit: 'mmHg',
      status: 'normal',
      trend: 'stable',
      icon: Heart,
      color: 'text-rose-600'
    },
    {
      label: 'Heart Rate',
      value: '74',
      unit: 'bpm',
      status: 'normal',
      trend: 'down',
      icon: Activity,
      color: 'text-red-600'
    },
    {
      label: 'SpO2',
      value: '98',
      unit: '%',
      status: 'normal',
      trend: 'stable',
      icon: Wind,
      color: 'text-blue-600'
    },
  ]);

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
        <h2 className="text-2xl font-bold text-slate-900">Welcome back, Patient</h2>
        <p className="text-slate-600 mt-1">Here's your health overview for today</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
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
        ))}
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
