import { useState } from "react";

function guessDeviceType(name: string | undefined): string {
  if (!name) return "Unknown";
  const n = name.toLowerCase();
  if (n.includes("phone") || n.includes("android") || n.includes("iphone")) return "Mobile Phone";
  if (n.includes("tab") || n.includes("ipad")) return "Tablet";
  if (n.includes("watch") || n.includes("fit") || n.includes("band") || n.includes("wear")) return "Watch / Wearable";
  if (n.includes("laptop") || n.includes("macbook") || n.includes("notebook")) return "Laptop";
  if (n.includes("pc") || n.includes("desktop")) return "Desktop";
  return "Other Device";
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.prototype.map.call(new Uint8Array(buffer), (x: number) => ('00' + x.toString(16)).slice(-2)).join(' ');
}

function BluetoothConnect() {
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [allData, setAllData] = useState<any[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const scanDevices = async () => {
    setConnecting(true);
    setError("");
    setAllData([]);
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", "heart_rate", "device_information"]
      });
      setDeviceName(device.name || "Unknown Device");
      setDeviceType(guessDeviceType(device.name));
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Failed to connect to GATT server.");

      // List of services to try
      const servicesToTry = [
        { name: "Heart Rate", uuid: "heart_rate", chars: ["heart_rate_measurement"] },
        { name: "Battery", uuid: "battery_service", chars: ["battery_level"] },
        { name: "Device Info", uuid: "device_information", chars: [
          "manufacturer_name_string", "model_number_string", "serial_number_string", "hardware_revision_string", "firmware_revision_string", "software_revision_string"
        ] }
      ];
      const results: any[] = [];
      for (const svc of servicesToTry) {
        try {
          const service = await server.getPrimaryService(svc.uuid);
          for (const charName of svc.chars) {
            try {
              const char = await service.getCharacteristic(charName);
              const value = await char.readValue();
              let parsed: any = bufferToHex(value.buffer);
              // Special parsing for known characteristics
              if (svc.uuid === "heart_rate" && charName === "heart_rate_measurement") {
                // Heart rate is in 2nd byte
                parsed = value.getUint8(1) + " bpm";
              } else if (svc.uuid === "battery_service" && charName === "battery_level") {
                parsed = value.getUint8(0) + "%";
              } else if (svc.uuid === "device_information") {
                // Device info strings
                const decoder = new TextDecoder("utf-8");
                parsed = decoder.decode(value.buffer);
              }
              results.push({ service: svc.name, characteristic: charName, value: parsed });
            } catch (e) {
              // Characteristic not available
            }
          }
        } catch (e) {
          // Service not available
        }
      }
      setAllData(results);
      alert(`Connected to ${device.name || "Unknown Device"}`);
    } catch (error: any) {
      if (error?.name === "NotFoundError") {
        setError("User cancelled device selection.");
      } else {
        setError(error.message || String(error));
        console.error("Bluetooth error:", error);
        alert("Bluetooth connection failed: " + (error.message || error));
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#f8fbff',
      borderRadius: '14px',
      padding: '24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      margin: '16px 0',
      justifyContent: 'space-between',
      minWidth: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <div style={{
          background: '#e6f0ff',
          borderRadius: '12px',
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 18
        }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7l10 10-5 5V2l5 5-10 10" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: '#222' }}>Add New Device</div>
          <div style={{ color: '#4b5563', fontSize: 14, marginTop: 2 }}>Connect additional wearables and health trackers</div>
          {deviceName && (
            <div style={{ marginTop: 8, color: '#222', fontSize: 15 }}>
              <b>Device:</b> {deviceName} <span style={{ color: '#888', fontWeight: 400 }}>({deviceType})</span>
            </div>
          )}
          {allData.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 15 }}>
              <b>Device Data:</b>
              <ul style={{ margin: 0, padding: '6px 0 0 18px' }}>
                {allData.map((d, i) => (
                  <li key={i}><b>{d.service}:</b> {d.characteristic.replace(/_/g, ' ')} = <span style={{ color: '#2563eb' }}>{d.value}</span></li>
                ))}
              </ul>
            </div>
          )}
          {error && (
            <div style={{ color: '#dc2626', marginTop: 6, fontSize: 14 }}>{error}</div>
          )}
        </div>
      </div>
      <button
        onClick={scanDevices}
        disabled={connecting}
        style={{
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 28px',
          fontWeight: 500,
          fontSize: 16,
          cursor: connecting ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          outline: 'none',
          boxShadow: '0 1px 2px rgba(37,99,235,0.08)'
        }}
      >
        {connecting ? 'Scanning...' : 'Scan Devices'}
      </button>
    </div>
  );
}

export default BluetoothConnect;
