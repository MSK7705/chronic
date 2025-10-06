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

  const modelConfigs = {
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
        { key: 'glucose', label: 'Blood Sugar Level', type: 'number', min: 50, max: 300, help: 'Your glucose level from blood test (mg/dL)' },
        { key: 'bloodPressure', label: 'Blood Pressure', type: 'number', min: 60, max: 180, help: 'Your diastolic blood pressure (bottom number)' },
        { key: 'bmi', label: 'Body Mass Index (BMI)', type: 'number', min: 15, max: 50, help: 'Calculate: weight(kg) ÷ height(m)²' },
        { key: 'age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'pregnancies', label: 'Number of Pregnancies', type: 'number', min: 0, max: 20, help: 'Total pregnancies (0 if male or never pregnant)' },
        { key: 'family_history', label: 'Family History of Diabetes', type: 'select', options: ['No family history', 'Grandparents/Aunts/Uncles', 'Parents/Siblings'], help: 'Any blood relatives with diabetes?' }
      ]
    },
    hypertension: {
      name: 'High Blood Pressure Risk',
      fields: [
        { key: 'age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'sex', label: 'Gender', type: 'select', options: ['Male', 'Female'], help: 'Select your gender' },
        { key: 'trestbps', label: 'Blood Pressure (Top Number)', type: 'number', min: 80, max: 200, help: 'Your systolic blood pressure reading' },
        { key: 'chol', label: 'Cholesterol Level', type: 'number', min: 100, max: 600, help: 'Total cholesterol from blood test (mg/dl)' },
        { key: 'family_history', label: 'Family History of High BP', type: 'select', options: ['No family history', 'Some relatives', 'Close relatives'], help: 'Any family members with high blood pressure?' },
        { key: 'salt_intake', label: 'How much salt do you eat?', type: 'select', options: ['Low salt diet', 'Normal amount', 'High salt diet'], help: 'Your typical salt consumption' }
      ]
    },
    ckd: {
      name: 'Kidney Disease Risk',
      fields: [
        { key: 'age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'bp', label: 'Do you have high blood pressure?', type: 'select', options: ['Normal BP', 'Slightly high', 'High BP', 'Very high BP'], help: 'Your blood pressure status' },
        { key: 'dm', label: 'Do you have diabetes?', type: 'select', options: ['No', 'Yes'], help: 'Have you been diagnosed with diabetes?' },
        { key: 'appetite', label: 'How is your appetite?', type: 'select', options: ['Good appetite', 'Poor appetite'], help: 'Your eating appetite recently' },
        { key: 'pe', label: 'Do you have swollen feet/ankles?', type: 'select', options: ['No swelling', 'Yes, swelling'], help: 'Swelling in feet or ankles' },
        { key: 'ane', label: 'Do you feel weak/tired often?', type: 'select', options: ['No', 'Yes'], help: 'Unusual weakness or fatigue' }
      ]
    },
    asthma: {
      name: 'Asthma Risk',
      fields: [
        { key: 'age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'sex', label: 'Gender', type: 'select', options: ['Male', 'Female'], help: 'Select your gender' },
        { key: 'smoking', label: 'Do you smoke?', type: 'select', options: ['Never smoked', 'Used to smoke', 'Currently smoke'], help: 'Your smoking history' },
        { key: 'allergies', label: 'Do you have allergies?', type: 'select', options: ['No allergies', 'Mild allergies', 'Moderate allergies', 'Severe allergies'], help: 'Any known allergies (food, pollen, dust, etc.)' },
        { key: 'wheezing', label: 'Do you wheeze?', type: 'select', options: ['Never', 'Sometimes', 'Often', 'Always'], help: 'Whistling sound when breathing' },
        { key: 'coughing', label: 'Do you have persistent cough?', type: 'select', options: ['No cough', 'Mild cough', 'Moderate cough', 'Severe cough'], help: 'Ongoing cough, especially at night' },
        { key: 'shortness_of_breath', label: 'Do you get short of breath?', type: 'select', options: ['Never', 'Rarely', 'Sometimes', 'Often'], help: 'Difficulty breathing during normal activities' }
      ]
    },
    arthritis: {
      name: 'Arthritis Risk',
      fields: [
        { key: 'age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'sex', label: 'Gender', type: 'select', options: ['Male', 'Female'], help: 'Select your gender' },
        { key: 'joint_pain', label: 'Do you have joint pain?', type: 'select', options: ['No pain', 'Mild pain', 'Moderate pain', 'Severe pain'], help: 'Pain in joints like knees, hands, hips' },
        { key: 'morning_stiffness', label: 'Morning joint stiffness?', type: 'select', options: ['No stiffness', 'Less than 30 minutes', '30 minutes to 1 hour', 'More than 1 hour'], help: 'How long do joints feel stiff in the morning?' },
        { key: 'family_history', label: 'Family history of arthritis?', type: 'select', options: ['No family history', 'Some relatives', 'Parents or siblings'], help: 'Any family members with arthritis?' },
        { key: 'physical_activity', label: 'How active are you?', type: 'select', options: ['Not active', 'Lightly active', 'Moderately active', 'Very active'], help: 'Your typical physical activity level' }
      ]
    },
    copd: {
      name: 'COPD Risk',
      fields: [
        { key: 'age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'sex', label: 'Gender', type: 'select', options: ['Male', 'Female'], help: 'Select your gender' },
        { key: 'smoking_status', label: 'Do you smoke?', type: 'select', options: ['Never smoked', 'Used to smoke', 'Light smoker', 'Heavy smoker'], help: 'Your smoking history' },
        { key: 'chronic_cough', label: 'Do you have a persistent cough?', type: 'select', options: ['No cough', 'Sometimes', 'Daily cough', 'Constant cough'], help: 'Ongoing cough that produces mucus' },
        { key: 'shortness_of_breath', label: 'Do you get short of breath?', type: 'select', options: ['Never', 'With heavy activity', 'With light activity', 'At rest'], help: 'Difficulty breathing during activities' },
        { key: 'occupational_exposure', label: 'Work exposure to dust/chemicals?', type: 'select', options: ['No exposure', 'Some exposure', 'High exposure'], help: 'Workplace exposure to dust, fumes, or chemicals' }
      ]
    },
    liver: {
      name: 'Liver Disease Risk',
      fields: [
        { key: 'age', label: 'Your Age', type: 'number', min: 1, max: 120, help: 'Enter your current age' },
        { key: 'sex', label: 'Gender', type: 'select', options: ['Male', 'Female'], help: 'Select your gender' },
        { key: 'alcohol_consumption', label: 'Do you drink alcohol?', type: 'select', options: ['Never', 'Occasionally', 'Regularly', 'Heavily'], help: 'Your alcohol consumption habits' },
        { key: 'fatigue', label: 'Do you feel tired often?', type: 'select', options: ['No fatigue', 'Sometimes tired', 'Often tired', 'Always tired'], help: 'Unusual tiredness or weakness' },
        { key: 'jaundice', label: 'Yellow skin or eyes?', type: 'select', options: ['No', 'Slightly yellow', 'Noticeably yellow'], help: 'Yellowing of skin or whites of eyes' },
        { key: 'abdominal_pain', label: 'Stomach/belly pain?', type: 'select', options: ['No pain', 'Mild pain', 'Moderate pain', 'Severe pain'], help: 'Pain in upper right belly area' }
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
                    {field.options?.map((option) => (
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