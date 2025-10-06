import React, { useState, useEffect, useCallback } from "react";

// --- Device-Specific Configuration for Noise / Da Fit Watches ---
const DA_FIT_SERVICE_UUID = "0000fee9-0000-1000-8000-00805f9b34fb";
const DA_FIT_CHARACTERISTIC_UUID = "d44bc439-abfd-45a2-b575-325416c50fd5";

// Helper function to guess the device type from its name
function guessDeviceType(name: string | undefined): string {
    if (!name) return "Unknown";
    const n = name.toLowerCase();
    if (n.includes("phone")) return "Mobile Phone";
    if (n.includes("watch") || n.includes("fit") || n.includes("band")) return "Watch / Wearable";
    if (n.includes("laptop") || n.includes("macbook")) return "Laptop";
    return "Other Device";
}

const HealthDataDisplay = ({ heartRate, steps, calories, batteryLevel }: { heartRate: number | null, steps: number | null, calories: number | null, batteryLevel: number | null }) => {
    const data = [
        { label: "Heart Rate", value: heartRate, unit: "bpm", icon: "❤️" },
        { label: "Steps", value: steps, unit: "steps", icon: "👟" },
        { label: "Calories Burned", value: calories, unit: "kcal", icon: "🔥" }
    ];
    if (heartRate === null && steps === null && calories === null) return null;
    return (
        <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '16px' }}>Last Recorded Data</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                {data.map(item => (
                    <div key={item.label} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '24px', marginRight: '12px' }}>{item.icon}</span>
                            <div style={{ fontSize: '16px', color: '#555', fontWeight: 500 }}>{item.label}</div>
                        </div>
                        {item.value !== null ? (
                            <div>
                                <span style={{ fontSize: '28px', fontWeight: 700, color: '#2563eb' }}>{item.value.toLocaleString()}</span>
                                <span style={{ marginLeft: '6px', color: '#666', fontWeight: 500 }}>{item.unit}</span>
                            </div>
                        ) : <div style={{ fontSize: '18px', color: '#999' }}>N/A</div>}
                    </div>
                ))}
            </div>
            {batteryLevel !== null && <div style={{ marginTop: '16px', fontSize: '14px', color: '#555' }}>Device Battery: <span style={{ fontWeight: 600, color: '#2563eb' }}>{batteryLevel}%</span></div>}
        </div>
    );
};

function BluetoothConnect() {
    const [device, setDevice] = useState<BluetoothDevice | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState("");
    const [heartRate, setHeartRate] = useState<number | null>(null);
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [steps, setSteps] = useState<number | null>(null);
    const [calories, setCalories] = useState<number | null>(null);

    const resetState = () => {
        setDevice(null);
        setHeartRate(null);
        setBatteryLevel(null);
        setSteps(null);
        setCalories(null);
        setError("");
    };

    // This function will be called when the device sends new data
    const handleNotifications = useCallback((event: Event) => {
        const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
        const value = characteristic.value;
        if (!value) return;

        // --- Data Parsing for Da Fit Protocol ---
        // The data comes in a byte array. We need to extract the numbers from specific positions.
        // This format was found through reverse-engineering similar devices.
        
        // The first byte (index 0) is a header that tells us what kind of data this is.
        const header = value.getUint8(0);
        
        // Header 0x51 seems to contain the step and calorie data
        if (header === 0x51 && value.byteLength >= 12) {
            console.log("Received Fitness Data Packet:", value);
            // Steps are a 32-bit integer starting at byte 4
            const newSteps = value.getUint32(4, true); // 'true' for little-endian
            // Calories are a 32-bit integer starting at byte 8
            const newCalories = value.getUint32(8, true);
            
            setSteps(newSteps);
            setCalories(newCalories);
        }
    }, []);

    // Clean up the connection when the component is unmounted
    useEffect(() => {
        return () => {
            device?.gatt?.disconnect();
        };
    }, [device]);

    const scanDevices = async () => {
        resetState();
        setConnecting(true);

        if (!navigator.bluetooth) {
            setError("Web Bluetooth API is not supported. Please use a browser like Chrome.");
            setConnecting(false);
            return;
        }

        try {
            const btDevice = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    "battery_service", 
                    "heart_rate", 
                    DA_FIT_SERVICE_UUID // Important: Request permission for the custom service
                ]
            });
            
            setDevice(btDevice);

            const server = await btDevice.gatt?.connect();
            if (!server) throw new Error("Failed to connect to GATT server.");

            // --- Standard Data: Heart Rate & Battery ---
            try {
                const hrService = await server.getPrimaryService("heart_rate");
                const hrChar = await hrService.getCharacteristic("heart_rate_measurement");
                const hrValue = await hrChar.readValue();
                setHeartRate(hrValue.getUint8(1));
            } catch (e) { console.warn("Heart Rate service not found."); }

            try {
                const battService = await server.getPrimaryService("battery_service");
                const battChar = await battService.getCharacteristic("battery_level");
                const battValue = await battChar.readValue();
                setBatteryLevel(battValue.getUint8(0));
            } catch (e) { console.warn("Battery service not found."); }

            // --- Custom Data: Steps & Calories ---
            try {
                const customService = await server.getPrimaryService(DA_FIT_SERVICE_UUID);
                const customChar = await customService.getCharacteristic(DA_FIT_CHARACTERISTIC_UUID);
                
                // Subscribe to updates from the watch
                await customChar.startNotifications();
                customChar.addEventListener('characteristicvaluechanged', handleNotifications);
                console.log("Subscribed to Da Fit notifications for steps and calories!");

            } catch (e) {
                console.error("Could not find the custom Da Fit service. Steps/calories will not be available.", e);
                setError("Could not get fitness data. Is this a Noise/Da Fit watch?");
            }

        } catch (err: any) {
            if (err.name === "NotFoundError") {
                setError("No device selected. Please try again.");
            } else {
                setError(`Error: ${err.message}`);
                console.error("Bluetooth error:", err);
            }
        } finally {
            setConnecting(false);
        }
    };

    const deviceName = device?.name || "";
    const deviceType = guessDeviceType(deviceName);

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fbff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', margin: '16px 0', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ background: '#e6f0ff', borderRadius: '12px', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 18 }}>
                        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#2563eb"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7l10 10-5 5V2l5 5-10 10" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 18, color: '#222' }}>{deviceName ? `Connected to ${deviceName}` : "Add New Device"}</div>
                        <div style={{ color: '#4b5563', fontSize: 14, marginTop: 2 }}>{deviceName ? `Device Type: ${deviceType}` : "Connect your Noise Diva Fit"}</div>
                        {error && <div style={{ color: '#dc2626', marginTop: 6, fontSize: 14 }}>{error}</div>}
                    </div>
                </div>
                <button onClick={scanDevices} disabled={connecting} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 500, fontSize: 16, cursor: connecting ? 'not-allowed' : 'pointer', transition: 'background 0.2s', outline: 'none' }}>
                    {connecting ? 'Scanning...' : 'Scan Devices'}
                </button>
            </div>

            <HealthDataDisplay heartRate={heartRate} steps={steps} calories={calories} batteryLevel={batteryLevel} />
        </div>
    );
}

export default BluetoothConnect;

