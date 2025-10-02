import { useState, useEffect } from 'react';
import { Heart, Droplet, Activity, Thermometer, Weight, Save, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DataEntryProps {
  onDataSubmit: () => void;
}

interface VitalData {
  bloodGlucose: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  temperature: string;
  weight: string;
  notes: string;
}

function DataEntry({ onDataSubmit }: DataEntryProps) {
  const [formData, setFormData] = useState<VitalData>({
    bloodGlucose: '',
    systolic: '',
    diastolic: '',
    heartRate: '',
    temperature: '',
    weight: '',
    notes: ''
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastEntryDate, setLastEntryDate] = useState<string | null>(null);

  useEffect(() => {
    const fetchLastEntry = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('vital_signs')
            .select('recorded_at')
            .eq('user_id', user.id)
            .order('recorded_at', { ascending: false })
            .limit(1);

          if (error) throw error;

          if (data && data.length > 0) {
            setLastEntryDate(data[0].recorded_at);
          }
        }
      } catch (error) {
        console.error('Error fetching last entry:', error);
      }
    };

    fetchLastEntry();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to submit data');
      }

      // Get user's full name from metadata
      const userName = user.user_metadata?.full_name || 'Unknown User';
      
      // Save data to Supabase
      const { error } = await supabase
        .from('vital_signs')
        .insert({
          user_id: user.id,
          user_name: userName,
          blood_glucose: parseFloat(formData.bloodGlucose) || null,
          systolic: parseInt(formData.systolic) || null,
          diastolic: parseInt(formData.diastolic) || null,
          heart_rate: parseInt(formData.heartRate) || null,
          temperature: parseFloat(formData.temperature) || null,
          weight: parseFloat(formData.weight) || null,
          notes: formData.notes,
          recorded_at: new Date().toISOString()
        });

      if (error) throw error;

      setShowSuccess(true);
      onDataSubmit();

      // Reset form
      setFormData({
        bloodGlucose: '',
        systolic: '',
        diastolic: '',
        heartRate: '',
        temperature: '',
        weight: '',
        notes: ''
      });

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error: any) {
      alert(error.message || 'Error saving data');
      console.error('Error saving data:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 flex items-center space-x-3 animate-slideDown">
          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-900">Data recorded successfully!</p>
            <p className="text-sm text-emerald-700">Your health metrics have been updated.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Record Vitals</h2>
          <p className="text-slate-600 mt-2">Enter your daily health measurements</p>
          {lastEntryDate && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Last entry:</span> {new Date(lastEntryDate).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Blood Glucose Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Droplet className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Blood Glucose</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reading (mg/dL)
                </label>
                <input
                  type="number"
                  name="bloodGlucose"
                  value={formData.bloodGlucose}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 outline-none"
                  placeholder="e.g., 120"
                  required
                />
              </div>
            </div>
          </div>

          {/* Blood Pressure Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-rose-100 p-2 rounded-lg">
                <Heart className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Blood Pressure</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Systolic (mmHg)
                </label>
                <input
                  type="number"
                  name="systolic"
                  value={formData.systolic}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 outline-none"
                  placeholder="e.g., 120"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Diastolic (mmHg)
                </label>
                <input
                  type="number"
                  name="diastolic"
                  value={formData.diastolic}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 outline-none"
                  placeholder="e.g., 80"
                  required
                />
              </div>
            </div>
          </div>

          {/* Heart Rate Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <Activity className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Heart Rate</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  BPM
                </label>
                <input
                  type="number"
                  name="heartRate"
                  value={formData.heartRate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 outline-none"
                  placeholder="e.g., 72"
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Vitals */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Additional Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center space-x-2">
                  <Thermometer className="w-4 h-4" />
                  <span>Temperature (°F)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="temperature"
                  value={formData.temperature}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 outline-none"
                  placeholder="e.g., 98.6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center space-x-2">
                  <Weight className="w-4 h-4" />
                  <span>Weight (lbs)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 outline-none"
                  placeholder="e.g., 165"
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Notes</h3>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 outline-none resize-none"
              placeholder="Add any notes about your condition, symptoms, or activities..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setFormData({
                bloodGlucose: '',
                systolic: '',
                diastolic: '',
                heartRate: '',
                temperature: '',
                weight: '',
                notes: ''
              })}
              className="px-6 py-3 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-200"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Data</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DataEntry;
