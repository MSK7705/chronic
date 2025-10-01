import { useState } from 'react';
import { Smartphone, Watch, Bluetooth, Activity, RefreshCw, CheckCircle, Wifi, BatteryCharging } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'syncing';
  battery: number;
  lastSync: string;
  icon: any;
  metrics: string[];
}

interface WearableSyncProps {
  onSync: () => void;
}

function WearableSync({ onSync }: WearableSyncProps) {
  const [devices, setDevices] = useState<Device[]>([
    {
      id: '1',
      name: 'Apple Watch Series 9',
      type: 'Smartwatch',
      status: 'connected',
      battery: 87,
      lastSync: '5 minutes ago',
      icon: Watch,
      metrics: ['Heart Rate', 'Activity', 'SpO2', 'Sleep']
    },
    {
      id: '2',
      name: 'Fitbit Charge 6',
      type: 'Fitness Tracker',
      status: 'connected',
      battery: 62,
      lastSync: '1 hour ago',
      icon: Activity,
      metrics: ['Steps', 'Heart Rate', 'Sleep', 'Stress']
    },
    {
      id: '3',
      name: 'Continuous Glucose Monitor',
      type: 'Medical Device',
      status: 'connected',
      battery: 45,
      lastSync: '10 minutes ago',
      icon: Smartphone,
      metrics: ['Blood Glucose', 'Trends']
    }
  ]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const handleSync = async (deviceId?: string) => {
    setIsSyncing(true);

    if (deviceId) {
      setDevices(prev => prev.map(device =>
        device.id === deviceId ? { ...device, status: 'syncing' as const } : device
      ));
    }

    // Simulate sync delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (deviceId) {
      setDevices(prev => prev.map(device =>
        device.id === deviceId
          ? { ...device, status: 'connected' as const, lastSync: 'Just now' }
          : device
      ));
    } else {
      setDevices(prev => prev.map(device => ({
        ...device,
        status: 'connected' as const,
        lastSync: 'Just now'
      })));
    }

    setIsSyncing(false);
    setLastSyncTime(new Date());
    onSync();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        text: 'text-emerald-700'
      };
      case 'syncing': return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        text: 'text-blue-700'
      };
      case 'disconnected': return {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
        text: 'text-slate-600'
      };
      default: return {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
        text: 'text-slate-600'
      };
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-emerald-600';
    if (level > 20) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Sync Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Connected Devices</h2>
            <p className="text-slate-600 mt-1">Manage your wearable devices and health trackers</p>
            {lastSyncTime && (
              <p className="text-sm text-emerald-600 mt-2 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Last synced: {lastSyncTime.toLocaleTimeString()}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => handleSync()}
            disabled={isSyncing}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync All'}</span>
          </button>
        </div>
      </div>

      {/* Connected Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {devices.map((device) => {
          const colors = getStatusColor(device.status);
          return (
            <div
              key={device.id}
              className={`${colors.bg} border-2 ${colors.border} rounded-2xl p-6 transition-all duration-200 hover:shadow-lg`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className={`${colors.bg} p-3 rounded-xl border-2 ${colors.border}`}>
                    <device.icon className={`w-8 h-8 ${colors.text}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{device.name}</h3>
                    <p className="text-sm text-slate-600 mt-0.5">{device.type}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${colors.dot} ${device.status === 'syncing' ? 'animate-pulse' : ''}`} />
                  <span className={`text-xs font-medium ${colors.text} capitalize`}>{device.status}</span>
                </div>
              </div>

              {/* Device Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <BatteryCharging className={`w-4 h-4 ${getBatteryColor(device.battery)}`} />
                    <span className="text-xs font-medium text-slate-600">Battery</span>
                  </div>
                  <span className={`text-lg font-bold ${getBatteryColor(device.battery)}`}>{device.battery}%</span>
                </div>

                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <Wifi className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-slate-600">Last Sync</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{device.lastSync}</span>
                </div>
              </div>

              {/* Tracked Metrics */}
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-600 mb-2">TRACKED METRICS</p>
                <div className="flex flex-wrap gap-2">
                  {device.metrics.map((metric, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white rounded-full text-xs font-medium text-slate-700 border border-slate-200"
                    >
                      {metric}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleSync(device.id)}
                  disabled={device.status === 'syncing'}
                  className={`flex-1 px-4 py-2 ${colors.text} font-medium text-sm rounded-lg hover:bg-white transition-colors duration-200 border-2 ${colors.border} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {device.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                </button>
                <button className="px-4 py-2 text-slate-600 font-medium text-sm rounded-lg hover:bg-white transition-colors duration-200 border-2 border-slate-200">
                  Settings
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Device */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Bluetooth className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Add New Device</h3>
              <p className="text-sm text-slate-600 mt-0.5">Connect additional wearables and health trackers</p>
            </div>
          </div>
          <button className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors duration-200">
            Scan Devices
          </button>
        </div>
      </div>

      {/* Sync Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Syncs Today</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">24</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-xl">
              <RefreshCw className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Data Points Collected</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">1,847</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Connected Devices</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{devices.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <Smartphone className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Device Activity</h3>
        <div className="space-y-3">
          {[
            { device: 'Apple Watch', action: 'Synced heart rate data', time: '5 min ago', icon: Watch },
            { device: 'CGM', action: 'Updated glucose readings', time: '10 min ago', icon: Smartphone },
            { device: 'Fitbit', action: 'Uploaded activity data', time: '1 hour ago', icon: Activity },
            { device: 'Apple Watch', action: 'Sleep data synced', time: '2 hours ago', icon: Watch },
          ].map((activity, idx) => (
            <div key={idx} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200">
              <div className="bg-slate-100 p-2 rounded-lg">
                <activity.icon className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{activity.device}</p>
                <p className="text-xs text-slate-600">{activity.action}</p>
              </div>
              <span className="text-xs text-slate-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WearableSync;
