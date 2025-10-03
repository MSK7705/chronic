import React from "react";

const BluetoothConnectButton: React.FC = () => {
  const handleConnect = async () => {
    if (!navigator.bluetooth) {
      alert("Web Bluetooth API is not supported in this browser.");
      return;
    }
    try {
      // 1. Request device
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", "device_information"]
      });
      // 2. Connect to GATT server
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Failed to connect to GATT server.");
      // 3. Get battery service
      const service = await server.getPrimaryService("battery_service");
      // 4. Get battery level characteristic
      const characteristic = await service.getCharacteristic("battery_level");
      const value = await characteristic.readValue();
      const batteryLevel = value.getUint8(0);
      // 5. Show success alert
      alert(`Connected to ${device.name || "Unknown Device"}. Battery: ${batteryLevel}%`);
    } catch (error: any) {
      console.error("Bluetooth connection error:", error);
      alert(`Bluetooth connection failed: ${error.message || error}`);
    }
  };

  return (
    <button id="connectBtn" onClick={handleConnect} style={{padding: '10px 20px', fontSize: '16px'}}>
      Connect to Bluetooth
    </button>
  );
};

export default BluetoothConnectButton;
