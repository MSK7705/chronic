import { supabase } from '../lib/supabase';

export interface WearableData {
  id?: string;
  user_id: string;
  device_name: string;
  device_type: string;
  heart_rate?: number;
  steps?: number;
  calories?: number;
  spo2?: number;
  battery_level?: number;
  temperature?: number;
  sleep_hours?: number;
  stress_level?: number;
  recorded_at: string;
}

export interface DeviceInfo {
  id: string;
  name?: string;
  connected: boolean;
  supportedServices: string[];
  lastSync?: string;
}

class WearableService {
  // Store wearable data to Supabase
  async storeWearableData(data: Omit<WearableData, 'id' | 'user_id'>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const wearableData: Omit<WearableData, 'id'> = {
        ...data,
        user_id: user.id,
      };

      const { error } = await supabase
        .from('wearable_data')
        .insert([wearableData]);

      if (error) throw error;
    } catch (error) {
      console.error('Error storing wearable data:', error);
      throw error;
    }
  }

  // Get latest wearable data for a user
  async getLatestWearableData(): Promise<WearableData | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('wearable_data')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching latest wearable data:', error);
      return null;
    }
  }

  // Get wearable data history
  async getWearableDataHistory(days: number = 7): Promise<WearableData[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('wearable_data')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching wearable data history:', error);
      return [];
    }
  }

  // Parse heart rate data from Bluetooth characteristic
  parseHeartRate(value: DataView): number {
    const flags = value.getUint8(0);
    const rate16Bits = flags & 0x1;
    return rate16Bits ? value.getUint16(1, true) : value.getUint8(1);
  }

  // Parse SpO2 data from Bluetooth characteristic
  parseSpO2(value: DataView): number {
    return value.getUint8(1);
  }

  // Parse steps and calories from Da Fit protocol
  parseDaFitData(value: DataView): { steps?: number; calories?: number } {
    const header = value.getUint8(0);
    
    if (header === 0x51 && value.byteLength >= 12) {
      const steps = value.getUint32(4, true);
      const calories = value.getUint32(8, true);
      return { steps, calories };
    }
    
    return {};
  }

  // Get device type from name
  getDeviceType(name: string | undefined): string {
    if (!name) return "Unknown";
    const n = name.toLowerCase();
    if (n.includes("phone")) return "Mobile Phone";
    if (n.includes("watch") || n.includes("fit") || n.includes("band")) return "Smartwatch";
    if (n.includes("laptop") || n.includes("macbook")) return "Laptop";
    if (n.includes("scale")) return "Smart Scale";
    if (n.includes("thermometer")) return "Thermometer";
    return "Other Device";
  }

  // Check if Web Bluetooth is supported
  isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  // Get supported Bluetooth services for different device types
  getSupportedServices(): string[] {
    return [
      "heart_rate",
      "battery_service",
      "pulse_oximeter",
      "device_information",
      "0000fee9-0000-1000-8000-00805f9b34fb", // Da Fit service
      "health_thermometer",
      "body_composition",
      "cycling_power",
      "running_speed_and_cadence",
    ];
  }

  // Auto-sync data to health predictions
  async syncToHealthPredictions(wearableData: WearableData): Promise<void> {
    try {
      if (!wearableData.heart_rate && !wearableData.steps && !wearableData.spo2) {
        return; // No relevant health data to sync
      }

      // Create a basic health entry from wearable data
      const healthEntry = {
        heart_rate: wearableData.heart_rate || 70,
        temperature: wearableData.temperature || 98.6,
        // Use defaults for missing data
        glucose: 100,
        systolic_bp: 120,
        diastolic_bp: 80,
        weight: 150,
      };

      // Import mlService to trigger health prediction
      const { mlService } = await import('./mlService');
      await mlService.predictHealthOverall(healthEntry);
    } catch (error) {
      console.error('Error syncing wearable data to health predictions:', error);
    }
  }
}

export const wearableService = new WearableService();