import { useState } from 'react';
import { Brain, Calculator, TrendingUp } from 'lucide-react';
import { mlService, MLPredictionResponse } from '../services/mlService';

interface MLPredictionFormProps {
  onPredictionResult: (result: MLPredictionResponse & { modelType: string }) => void;
}

function MLPredictionForm({ onPredictionResult }: MLPredictionFormProps) {
  const [selectedModel, setSelectedModel] = useState<string>('heart');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Define field config type to satisfy TypeScript unions for fields and options
  type FieldConfig =
    | { key: string; label: string; type: 'number'; min: number; max: number; help: string; step?: number }
    | { key: string; label: string; type: 'select'; options: string[]; help: string }
    | { key: string; label: string; type: 'boolean'; help: string }
    | { key: string; label: string; type: 'text'; help: string };

  const modelConfigs: Record<string, { name: string; fields: FieldConfig[] }> = {
    heart: {
      name: 'Heart Disease Risk',
      fields: [
        { key: 'age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age in years' },
        { key: 'sex', label: 'Gender', type: 'select', options: ['Male', 'Female'], help: 'Select your gender' },
        { key: 'trestbps', label: 'Blood Pressure (Top Number)', type: 'number', min: 80, max: 200, help: 'Your systolic blood pressure (e.g., 120)' },
        { key: 'chol', label: 'Cholesterol Level', type: 'number', min: 100, max: 600, help: 'Total cholesterol from recent blood test (mg/dl)' },
        { key: 'fbs', label: 'High Blood Sugar?', type: 'select', options: ['No', 'Yes'], help: 'Is your fasting blood sugar above 120 mg/dl?' },
        { key: 'thalch', label: 'Maximum Heart Rate', type: 'number', min: 60, max: 220, help: 'Highest heart rate you can achieve during exercise' }
      ]
    },
    diabetes: {
      name: 'Diabetes Risk',
      fields: [
        { key: 'glucose', label: 'Glucose (mg/dL)', type: 'number', min: 0, max: 300, help: 'Your glucose level from blood test (mg/dL)' },
        { key: 'bloodPressure', label: 'Diastolic Blood Pressure (mm Hg)', type: 'number', min: 40, max: 150, help: 'Your diastolic blood pressure (bottom number)' },
        { key: 'skinThickness', label: 'Skin Thickness (mm)', type: 'number', min: 0, max: 100, help: 'Triceps skin fold thickness' },
        { key: 'insulin', label: 'Insulin (mu U/ml)', type: 'number', min: 0, max: 900, help: '2-Hour serum insulin' },
        { key: 'bmi', label: 'Body Mass Index (BMI)', type: 'number', min: 10, max: 60, help: 'Calculate: weight(kg) ÷ height(m)²' },
        { key: 'diabetesPedigreeFunction', label: 'Diabetes Pedigree Function', type: 'number', min: 0, max: 2, help: 'A function indicating diabetes likelihood based on family history' },
        { key: 'age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' }
      ]
    },
    hypertension: {
      name: 'High Blood Pressure Risk',
      fields: [
        { key: 'Age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'Gender', label: 'Gender', type: 'select', options: ['Male', 'Female'], help: 'Select your gender' },
        { key: 'Systolic_BP', label: 'Systolic Blood Pressure (mm Hg)', type: 'number', min: 80, max: 250, help: 'Your systolic blood pressure (top number)' },
        { key: 'Diastolic_BP', label: 'Diastolic Blood Pressure (mm Hg)', type: 'number', min: 40, max: 150, help: 'Your diastolic blood pressure (bottom number)' },
        { key: 'Heart_Rate', label: 'Heart Rate (bpm)', type: 'number', min: 40, max: 200, help: 'Your resting heart rate' },
        { key: 'BMI', label: 'Body Mass Index (BMI)', type: 'number', min: 10, max: 60, help: 'Calculate: weight(kg) ÷ height(m)²' }
      ]
    },
    ckd: {
      name: 'Kidney Disease Risk',
      fields: [
        { key: 'age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'bp', label: 'Blood Pressure (mm Hg)', type: 'number', min: 60, max: 200, help: 'Your blood pressure (mm Hg)' },
        { key: 'bgr', label: 'Random Blood Glucose (mg/dL)', type: 'number', min: 50, max: 400, help: 'Random blood glucose level' },
        { key: 'bu', label: 'Blood Urea (mg/dL)', type: 'number', min: 5, max: 300, help: 'Blood urea level from lab tests' },
        { key: 'sc', label: 'Serum Creatinine (mg/dL)', type: 'number', min: 0.1, max: 15, help: 'Serum creatinine level', step: 0.1 },
        { key: 'hemo', label: 'Hemoglobin (g/dL)', type: 'number', min: 5, max: 20, help: 'Hemoglobin level from lab tests', step: 0.1 },
        { key: 'htn', label: 'Hypertension', type: 'select', options: ['No', 'Yes'], help: 'Have you been diagnosed with hypertension?' }
      ]
    },
    asthma: {
      name: 'Asthma Risk',
      fields: [
        { key: 'Age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'Gender', label: 'Gender', type: 'select', options: ['Male', 'Female'], help: 'Select your gender' },
        { key: 'BMI', label: 'Body Mass Index (BMI)', type: 'number', min: 10, max: 60, help: 'Calculate: weight(kg) ÷ height(m)²' },
        { key: 'Smoking', label: 'Do you smoke?', type: 'select', options: ['Never smoked', 'Used to smoke', 'Light smoker', 'Heavy smoker'], help: 'Your smoking history' },
        { key: 'Wheezing', label: 'Do you wheeze?', type: 'select', options: ['Never', 'Sometimes', 'Often', 'Always'], help: 'Whistling sound when breathing' },
        { key: 'ShortnessOfBreath', label: 'Do you get short of breath?', type: 'select', options: ['Never', 'Sometimes', 'Often', 'Always'], help: 'Difficulty breathing during normal activities' },
        { key: 'Coughing', label: 'Do you have persistent cough?', type: 'select', options: ['No cough', 'Mild cough', 'Moderate cough', 'Severe cough'], help: 'Ongoing cough, especially at night' },
        { key: 'ExerciseInduced', label: 'Exercise-induced symptoms?', type: 'select', options: ['No', 'Yes'], help: 'Symptoms triggered by exercise' }
      ]
    },
    arthritis: {
      name: 'Arthritis Risk',
      fields: [
        { key: 'Age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'Gender', label: 'Gender', type: 'select', options: ['Male', 'Female'], help: 'Select your gender' },
        { key: 'Pain_Level', label: 'Joint Pain Level', type: 'select', options: ['No pain', 'Mild pain', 'Moderate pain', 'Severe pain'], help: 'Pain in joints like knees, hands, hips' },
        { key: 'Joint_Mobility', label: 'Joint Mobility (0-10)', type: 'number', min: 0, max: 10, step: 1, help: 'How easily your joints move (higher is better)' },
        { key: 'Stiffness', label: 'Morning joint stiffness', type: 'select', options: ['No', 'Mild', 'Moderate', 'Severe'], help: 'Stiffness experienced in the morning' },
        { key: 'Swelling', label: 'Joint Swelling', type: 'select', options: ['No', 'Mild', 'Moderate', 'Severe'], help: 'Swelling in your joints' }
      ]
    },
    copd: {
      name: 'COPD Risk',
      fields: [
        { key: 'Age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'Gender', label: 'Gender', type: 'select', options: ['Male', 'Female'], help: 'Select your gender' },
        { key: 'Smoking_History', label: 'Smoking History', type: 'select', options: ['Never smoked', 'Used to smoke', 'Light smoker', 'Heavy smoker'], help: 'Your smoking history' },
        { key: 'Oxygen_Level', label: 'Oxygen Level (%)', type: 'number', min: 50, max: 100, step: 1, help: 'Your blood oxygen saturation (SpO2)' },
        { key: 'Oxygen_Low', label: 'Is Oxygen Level Low?', type: 'select', options: ['No', 'Yes'], help: 'Low oxygen level (e.g., SpO2 < 92%)' },
        { key: 'Cough', label: 'Cough frequency', type: 'select', options: ['Never', 'Sometimes', 'Often', 'Always'], help: 'Frequency of coughing' },
        { key: 'Shortness_of_Breath', label: 'Shortness of Breath', type: 'select', options: ['Never', 'Sometimes', 'Often', 'Always'], help: 'Difficulty breathing during activities' },
        { key: 'Fatigue', label: 'Fatigue', type: 'select', options: ['No fatigue', 'Sometimes tired', 'Often tired', 'Always tired'], help: 'Tiredness or weakness' },
        { key: 'Cough_SOB', label: 'Cough with Shortness of Breath', type: 'select', options: ['No', 'Yes'], help: 'Cough and SOB occurring together' },
        { key: 'Cough_Fatigue', label: 'Cough with Fatigue', type: 'select', options: ['No', 'Yes'], help: 'Cough and fatigue occurring together' }
      ]
    },
    liver: {
      name: 'Liver Disease Risk',
      fields: [
        { key: 'Age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'BMI', label: 'Body Mass Index (BMI)', type: 'number', min: 10, max: 60, help: 'Calculate: weight(kg) ÷ height(m)²' },
        { key: 'ALT', label: 'ALT (U/L)', type: 'number', min: 0, max: 500, help: 'Alanine transaminase level' },
        { key: 'AST', label: 'AST (U/L)', type: 'number', min: 0, max: 500, help: 'Aspartate transaminase level' },
        { key: 'Bilirubin', label: 'Bilirubin (mg/dL)', type: 'number', min: 0, max: 20, help: 'Bilirubin level' },
        { key: 'Fatigue', label: 'Fatigue', type: 'select', options: ['No fatigue', 'Sometimes tired', 'Often tired', 'Always tired'], help: 'Unusual tiredness or weakness' },
        { key: 'Jaundice', label: 'Jaundice', type: 'select', options: ['No', 'Slightly yellow', 'Noticeably yellow'], help: 'Yellowing of skin or eyes' },
        { key: 'Nausea', label: 'Nausea', type: 'select', options: ['No', 'Mild', 'Moderate', 'Severe'], help: 'Nausea severity' },
        { key: 'Abdominal_Pain', label: 'Abdominal Pain', type: 'select', options: ['No pain', 'Mild pain', 'Moderate pain', 'Severe pain'], help: 'Pain in upper right belly area' }
      ]
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await mlService.predictRisk({
        modelType: selectedModel as any,
        features: formData
      });

      onPredictionResult({ ...result, modelType: selectedModel });
    } catch (error) {
      console.error('Prediction error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentConfig = modelConfigs[selectedModel as keyof typeof modelConfigs];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div className="flex items-center justify-center space-x-3 mb-8">
        <Brain className="w-8 h-8 text-blue-600" />
        <h3 className="text-2xl font-bold text-slate-900">AI Risk Assessment</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 w-full">
        <div className="text-center">
          <label className="block text-lg font-semibold text-slate-700 mb-4">
            Select Disease Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              setFormData({});
            }}
            className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(modelConfigs).map(([key, config]) => (
              <option key={key} value={key}>{config.name}</option>
            ))}
          </select>
        </div>

        {currentConfig && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentConfig.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="block text-base font-semibold text-slate-700">
                  {field.label}
                  {field.help && (
                    <div className="text-sm text-slate-500 font-normal mt-2">
                      {field.help}
                    </div>
                  )}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map((option: string) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : field.type === 'boolean' ? (
                  <select
                    value={formData[field.key] !== undefined ? formData[field.key].toString() : ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value === 'true')}
                    className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    value={formData[field.key] !== undefined ? formData[field.key] : ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value === '' ? '' : parseFloat(e.target.value))}
                    min={field.min}
                    max={field.max}
                    step={(field as any).step || 1}
                    className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                ) : (
                  <input
                    type="text"
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 text-base rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[48px]"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5" />
                <span>Calculate Risk</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MLPredictionForm;