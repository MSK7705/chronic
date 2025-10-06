import React, { useState, useEffect, useCallback } from "react";

interface DeviceInfo {
  id: string;
  name?: string;
  connected: boolean;
  supportedServices: string[];
}

const WearableDashboard: React.FC = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);

  const updateStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
  }, []);

  const parseHeartRate = (value: DataView) => {
    let flags = value.getUint8(0);
    let rate16Bits = flags & 0x1;
    return rate16Bits ? value.getUint16(1, true) : value.getUint8(1);
  };

  const connectToDevice = useCallback(async (dev: BluetoothDevice) => {
    try {
      setIsConnecting(true);
      updateStatus(`🔄 Connecting to ${dev.name ?? "device"}...`);

      const server = await dev.gatt?.connect();
      if (!server) throw new Error("No GATT server found.");

      const services = await server.getPrimaryServices();
      const supportedServices = services.map((s) => s.uuid);

      setDeviceInfo({
        id: dev.id,
        name: dev.name ?? "Unnamed Device",
        connected: true,
        supportedServices,
      });

      // Heart Rate
      if (supportedServices.includes("0000180d-0000-1000-8000-00805f9b34fb")) {
        const hrService = await server.getPrimaryService("heart_rate");
        const hrChar = await hrService.getCharacteristic("heart_rate_measurement");
        await hrChar.startNotifications();
        hrChar.addEventListener("characteristicvaluechanged", (e: any) => {
          const val = parseHeartRate(e.target.value);
          setHeartRate(val);
        });
      }

      // Battery
      if (supportedServices.includes("0000180f-0000-1000-8000-00805f9b34fb")) {
        const batService = await server.getPrimaryService("battery_service");
        const batChar = await batService.getCharacteristic("battery_level");
        const batVal = await batChar.readValue();
        setBattery(batVal.getUint8(0));
      }

      // SpO₂ (if available)
      if (supportedServices.includes("00001822-0000-1000-8000-00805f9b34fb")) {
        const plxService = await server.getPrimaryService("pulse_oximeter");
        const plxChar = await plxService.getCharacteristic(0x2a5f);
        await plxChar.startNotifications();
        plxChar.addEventListener("characteristicvaluechanged", (e: any) => {
          const data = e.target.value;
          const spo2Value = data.getUint8(1);
          setSpo2(spo2Value);
        });
      }

      updateStatus(`✅ Connected to ${dev.name}`);
    } catch (err) {
      updateStatus(`❌ Connection failed: ${(err as Error).message}`);
    } finally {
      setIsConnecting(false);
    }
  }, [updateStatus]);

  const handlePairDevice = async () => {
    try {
      const dev = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "heart_rate",
          "battery_service",
          "pulse_oximeter",
          "device_information",
        ],
      });
      await connectToDevice(dev);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("cancelled")) updateStatus("🔕 Pairing cancelled by user");
      else updateStatus(`⚠️ Error: ${msg}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">🩺 Wearable Health Dashboard</h2>

      <div className="flex items-center space-x-4">
        <button
          onClick={handlePairDevice}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting..." : "🔍 Scan Devices"}
        </button>
        <span className="text-gray-700">{statusMessage}</span>
      </div>

      {deviceInfo && (
        <div className="p-4 bg-gray-100 rounded-lg shadow">
          <h3 className="font-semibold text-lg">📱 {deviceInfo.name}</h3>
          <p className="text-sm mt-1">
            Status:{" "}
            {deviceInfo.connected ? (
              <span className="text-green-600">🟢 Connected</span>
            ) : (
              <span className="text-red-600">🔴 Disconnected</span>
            )}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <p className="text-gray-600 text-sm">❤️ Heart Rate</p>
              <p className="text-xl font-semibold">{heartRate ?? "—"} bpm</p>
            </div>

            <div className="p-3 bg-white rounded-lg shadow-sm">
              <p className="text-gray-600 text-sm">🔋 Battery</p>
              <p className="text-xl font-semibold">{battery ?? "—"}%</p>
            </div>

            <div className="p-3 bg-white rounded-lg shadow-sm">
              <p className="text-gray-600 text-sm">🫁 SpO₂</p>
              <p className="text-xl font-semibold">{spo2 ?? "—"}%</p>
            </div>

            <div className="p-3 bg-white rounded-lg shadow-sm col-span-2">
              <p className="text-gray-600 text-sm">Supported Services</p>
              <ul className="list-disc ml-5 text-sm mt-1 text-gray-700">
                {deviceInfo.supportedServices.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WearableDashboard;
