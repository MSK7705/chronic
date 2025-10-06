import { useState, useEffect } from 'react';
import { Heart, Droplet, Activity, Thermometer, Weight, Save, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { mlService } from '../services/mlService';
import ReactSelect from "react-select";

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
  breakfast: string;   // NEW
  lunch: string;       // NEW
  dinner: string;      // NEW
}

function DataEntry({ onDataSubmit }: DataEntryProps) {
  // --- State ---
  const [formData, setFormData] = useState<VitalData>({
    bloodGlucose: '', systolic: '', diastolic: '', heartRate: '',
    temperature: '', weight: '', notes: '',
    // UPDATED: Default state for meals is now an empty array
    breakfast: [],
    lunch: [],
    dinner: []
  });

  const [foodOptions, setFoodOptions] = useState<FoodOption[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastEntryDate, setLastEntryDate] = useState<string | null>(null);

  // Fetch last entry + food items
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: last, error: lastErr } = await supabase
            .from('vital_signs')
            .select('recorded_at')
            .eq('user_id', user.id)
            .order('recorded_at', { ascending: false })
            .limit(1);

          if (lastErr) throw lastErr;
          if (last && last.length > 0) {
            setLastEntryDate(last[0].recorded_at);
          }
        }

        // Fetch food items
        const { data: foods, error: foodErr } = await supabase
          .from('food_items')
          .select('food_name');

        if (foodErr) {
            console.error("Error fetching food items:", foodErr);
            throw foodErr;
        }
        
        if (foods) {
          // THIS IS THE FIX:
          // Prepare the options array in the { value, label } format
          // and save it to the correct state variable.
          const options = foods.map((f: { food_name: string }) => ({
            value: f.food_name,
            label: f.food_name,
          }));
          setFoodOptions(options);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
   const handleMultiSelectChange = (name: keyof VitalData, selectedOptions: MultiValue<FoodOption>) => {
    const values = selectedOptions ? selectedOptions.map(option => option.value) : [];
    setFormData(prev => ({
      ...prev,
      [name]: values
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to submit data');

      const userName = user.user_metadata?.full_name || 'Unknown User';

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
          breakfast: formData.breakfast.join(', '),
          lunch: formData.lunch.join(', '),
          dinner: formData.dinner.join(', '),
          recorded_at: new Date().toISOString()
        });

      if (error) throw error;

      // Call health prediction model with the saved data
      try {
        const glucose = parseFloat(formData.bloodGlucose) || 0;
        const systolic = parseInt(formData.systolic) || 0;
        const diastolic = parseInt(formData.diastolic) || 0;
        const heart_rate = parseInt(formData.heartRate) || 0;
        const temperature = parseFloat(formData.temperature) || 0;
        const weight = parseFloat(formData.weight) || 0;

        if (glucose > 0 && systolic > 0 && diastolic > 0 && heart_rate > 0) {
          const prediction = await mlService.predictHealthOverall({
            glucose,
            systolic_bp: systolic,
            diastolic_bp: diastolic,
            heart_rate,
            temperature,
            weight,
          });

          // Store prediction in Supabase
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('health_predictions').insert({
              user_id: user.id,
              complication_risk: prediction.complication_risk,
              emergency_visits: prediction.emergency_visits,
              adherence_rate: prediction.adherence_rate,
              recorded_at: new Date().toISOString(),
            });
          }
        }
      } catch (predictionError) {
        console.warn('Health prediction failed:', predictionError);
      }

      setShowSuccess(true);
      onDataSubmit();

      // Reset form
     setFormData({
        bloodGlucose: '', systolic: '', diastolic: '', heartRate: '',
        temperature: '', weight: '', notes: '', breakfast: [], lunch: [], dinner: []
      });

      setTimeout(() => setShowSuccess(false), 3000);
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

          {/* New Section for Meals */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Meals</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Breakfast */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Breakfast</label>
                <ReactSelect
                  isMulti // <-- ADD THIS
                  options={foodOptions}
                  value={foodOptions.filter(option => formData.breakfast.includes(option.value))}
                  onChange={selected => handleMultiSelectChange('breakfast', selected)}
                  placeholder="Select foods..."
                  isClearable
                />
              </div>

              {/* Lunch */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lunch</label>
                <ReactSelect
                  isMulti // <-- ADD THIS
                  options={foodOptions}
                  value={foodOptions.filter(option => formData.lunch.includes(option.value))}
                  onChange={selected => handleMultiSelectChange('lunch', selected)}
                  placeholder="Select foods..."
                  isClearable
                />
              </div>

              {/* Dinner */}
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Dinner</label>
                <ReactSelect
                  isMulti // <-- ADD THIS
                  options={foodOptions}
                  value={foodOptions.filter(option => formData.dinner.includes(option.value))}
                  onChange={selected => handleMultiSelectChange('dinner', selected)}
                  placeholder="Select foods..."
                  isClearable
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
