import React, { useState, useEffect, useCallback } from "react";
import { wearableService, DeviceInfo, WearableData } from '../services/wearableService';
import { Bluetooth, Battery, Heart, Activity, Thermometer, Zap, Clock, TrendingUp } from 'lucide-react';

const WearableDashboard: React.FC = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [wearableData, setWearableData] = useState<Partial<WearableData>>({});
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [dataHistory, setDataHistory] = useState<WearableData[]>([]);
  const [autoSync, setAutoSync] = useState(true);

  const updateStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
  }, []);

  // Load data history on component mount
  useEffect(() => {
    loadDataHistory();
  }, []);

  const loadDataHistory = async () => {
    try {
      const history = await wearableService.getWearableDataHistory(7);
      setDataHistory(history);
    } catch (error) {
      console.error('Error loading data history:', error);
    }
  };

  // Store wearable data to Supabase
  const storeData = async (data: Partial<WearableData>) => {
    if (!deviceInfo) return;

    try {
      const wearableEntry = {
        device_name: deviceInfo.name || 'Unknown Device',
        device_type: wearableService.getDeviceType(deviceInfo.name),
        heart_rate: data.heart_rate,
        steps: data.steps,
        calories: data.calories,
        spo2: data.spo2,
        battery_level: data.battery_level,
        temperature: data.temperature,
        sleep_hours: data.sleep_hours,
        stress_level: data.stress_level,
        recorded_at: new Date().toISOString(),
      };

      await wearableService.storeWearableData(wearableEntry);
      
      // Auto-sync to health predictions if enabled
      if (autoSync) {
        await wearableService.syncToHealthPredictions(wearableEntry as WearableData);
      }
      
      await loadDataHistory(); // Refresh history
      updateStatus('✅ Data stored successfully');
    } catch (error) {
      console.error('Error storing wearable data:', error);
      updateStatus('❌ Failed to store data');
    }
  };

  const connectToDevice = useCallback(async (dev: BluetoothDevice) => {
    try {
      setIsConnecting(true);
      updateStatus(`🔄 Connecting to ${dev.name ?? "device"}...`);

      const server = await dev.gatt?.connect();
      if (!server) throw new Error("No GATT server found.");

      const services = await server.getPrimaryServices();
      const supportedServices = services.map((s) => s.uuid);

      const newDeviceInfo: DeviceInfo = {
        id: dev.id,
        name: dev.name ?? "Unnamed Device",
        connected: true,
        supportedServices,
        lastSync: new Date().toISOString(),
      };
      
      setDeviceInfo(newDeviceInfo);

      // Heart Rate Service
      if (supportedServices.includes("0000180d-0000-1000-8000-00805f9b34fb")) {
        try {
          const hrService = await server.getPrimaryService("heart_rate");
          const hrChar = await hrService.getCharacteristic("heart_rate_measurement");
          await hrChar.startNotifications();
          hrChar.addEventListener("characteristicvaluechanged", (e: any) => {
            const val = wearableService.parseHeartRate(e.target.value);
            setWearableData(prev => ({ ...prev, heart_rate: val }));
          });
        } catch (e) { console.warn("Heart Rate service error:", e); }
      }

      // Battery Service
      if (supportedServices.includes("0000180f-0000-1000-8000-00805f9b34fb")) {
        try {
          const batService = await server.getPrimaryService("battery_service");
          const batChar = await batService.getCharacteristic("battery_level");
          const batVal = await batChar.readValue();
          const batteryLevel = batVal.getUint8(0);
          setWearableData(prev => ({ ...prev, battery_level: batteryLevel }));
        } catch (e) { console.warn("Battery service error:", e); }
      }

      // SpO₂ Service
      if (supportedServices.includes("00001822-0000-1000-8000-00805f9b34fb")) {
        try {
          const plxService = await server.getPrimaryService("pulse_oximeter");
          const plxChar = await plxService.getCharacteristic(0x2a5f);
          await plxChar.startNotifications();
          plxChar.addEventListener("characteristicvaluechanged", (e: any) => {
            const spo2Value = wearableService.parseSpO2(e.target.value);
            setWearableData(prev => ({ ...prev, spo2: spo2Value }));
          });
        } catch (e) { console.warn("SpO2 service error:", e); }
      }

      // Da Fit Custom Service (for steps and calories)
      if (supportedServices.includes("0000fee9-0000-1000-8000-00805f9b34fb")) {
        try {
          const customService = await server.getPrimaryService("0000fee9-0000-1000-8000-00805f9b34fb");
          const customChar = await customService.getCharacteristic("d44bc439-abfd-45a2-b575-325416c50fd5");
          await customChar.startNotifications();
          customChar.addEventListener('characteristicvaluechanged', (e: any) => {
            const fitnessData = wearableService.parseDaFitData(e.target.value);
            setWearableData(prev => ({ ...prev, ...fitnessData }));
          });
        } catch (e) { console.warn("Da Fit service error:", e); }
      }

      // Health Thermometer Service
      if (supportedServices.includes("00001809-0000-1000-8000-00805f9b34fb")) {
        try {
          const tempService = await server.getPrimaryService("health_thermometer");
          const tempChar = await tempService.getCharacteristic("temperature_measurement");
          await tempChar.startNotifications();
          tempChar.addEventListener("characteristicvaluechanged", (e: any) => {
            const tempValue = e.target.value.getFloat32(1, true);
            setWearableData(prev => ({ ...prev, temperature: tempValue }));
          });
        } catch (e) { console.warn("Temperature service error:", e); }
      }

      updateStatus(`✅ Connected to ${dev.name}`);
    } catch (err) {
      updateStatus(`❌ Connection failed: ${(err as Error).message}`);
    } finally {
      setIsConnecting(false);
    }
  }, [updateStatus]);

  const handlePairDevice = async () => {
    if (!wearableService.isBluetoothSupported()) {
      updateStatus("❌ Web Bluetooth API is not supported in this browser");
      return;
    }

    try {
      const dev = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: wearableService.getSupportedServices(),
      });
      await connectToDevice(dev);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("cancelled")) updateStatus("🔕 Pairing cancelled by user");
      else updateStatus(`⚠️ Error: ${msg}`);
    }
  };

  const handleSyncData = async () => {
    if (Object.keys(wearableData).length === 0) {
      updateStatus("⚠️ No data to sync");
      return;
    }
    await storeData(wearableData);
  };

  const getHealthMetrics = () => [
    { 
      label: "Heart Rate", 
      value: wearableData.heart_rate, 
      unit: "bpm", 
      icon: Heart, 
      color: "text-red-500",
      bgColor: "bg-red-50"
    },
    { 
      label: "Steps", 
      value: wearableData.steps, 
      unit: "steps", 
      icon: Activity, 
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    },
    { 
      label: "Calories", 
      value: wearableData.calories, 
      unit: "kcal", 
      icon: Zap, 
      color: "text-orange-500",
      bgColor: "bg-orange-50"
    },
    { 
      label: "SpO₂", 
      value: wearableData.spo2, 
      unit: "%", 
      icon: TrendingUp, 
      color: "text-green-500",
      bgColor: "bg-green-50"
    },
    { 
      label: "Temperature", 
      value: wearableData.temperature, 
      unit: "°F", 
      icon: Thermometer, 
      color: "text-purple-500",
      bgColor: "bg-purple-50"
    },
    { 
      label: "Battery", 
      value: wearableData.battery_level, 
      unit: "%", 
      icon: Battery, 
      color: "text-gray-500",
      bgColor: "bg-gray-50"
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Bluetooth className="text-blue-600" />
          Smart Device Dashboard
        </h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="rounded"
            />
            Auto-sync to Health
          </label>
        </div>
      </div>

      {/* Connection Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Device Connection</h3>
          <button
            onClick={handlePairDevice}
            disabled={isConnecting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? "Connecting..." : "🔍 Scan Devices"}
          </button>
        </div>
        
        {statusMessage && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{statusMessage}</p>
          </div>
        )}

        {deviceInfo && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg text-gray-800">📱 {deviceInfo.name}</h4>
                <p className="text-sm text-gray-600">
                  Type: {wearableService.getDeviceType(deviceInfo.name)} • 
                  Status: <span className="text-green-600 font-medium">🟢 Connected</span>
                </p>
                {deviceInfo.lastSync && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last sync: {new Date(deviceInfo.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={handleSyncData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Sync Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Health Metrics Grid */}
      {Object.keys(wearableData).length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Real-time Health Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getHealthMetrics().map((metric) => {
              const IconComponent = metric.icon;
              return (
                <div key={metric.label} className={`${metric.bgColor} rounded-lg p-4 border border-gray-200`}>
                  <div className="flex items-center justify-between mb-2">
                    <IconComponent className={`w-5 h-5 ${metric.color}`} />
                    <span className="text-sm font-medium text-gray-600">{metric.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {metric.value !== null && metric.value !== undefined 
                      ? `${metric.value.toLocaleString()} ${metric.unit}`
                      : "—"
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data History */}
      {dataHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Data History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Device</th>
                  <th className="text-left py-2">Heart Rate</th>
                  <th className="text-left py-2">Steps</th>
                  <th className="text-left py-2">Calories</th>
                  <th className="text-left py-2">SpO₂</th>
                  <th className="text-left py-2">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {dataHistory.slice(0, 10).map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{entry.device_name}</td>
                    <td className="py-2">{entry.heart_rate ? `${entry.heart_rate} bpm` : '—'}</td>
                    <td className="py-2">{entry.steps ? entry.steps.toLocaleString() : '—'}</td>
                    <td className="py-2">{entry.calories ? `${entry.calories} kcal` : '—'}</td>
                    <td className="py-2">{entry.spo2 ? `${entry.spo2}%` : '—'}</td>
                    <td className="py-2 text-gray-500">
                      {new Date(entry.recorded_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WearableDashboard;
