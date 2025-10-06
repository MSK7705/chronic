# ML Model Integration with Risk Assessment Frontend

This integration connects multiple machine learning models for chronic disease prediction with the React frontend Risk Assessment page.

## 🚀 Quick Start

### 1. Start the ML Backend Server

```bash
cd ml_backend
python -m pip install -r requirements.txt
python main.py
```

Or use the batch file:
```bash
cd ml_backend
start_server.bat
```

The API will be available at `http://localhost:8000`

### 2. Start the Frontend

```bash
cd chronic
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🧠 Available ML Models

The system integrates the following disease prediction models:

1. **Heart Disease** - Predicts cardiovascular risk
2. **Diabetes** - Assesses diabetes risk
3. **Hypertension** - Evaluates blood pressure risks
4. **Chronic Kidney Disease (CKD)** - Kidney function assessment
5. **Asthma** - Respiratory condition prediction
6. **Arthritis** - Joint health evaluation
7. **COPD** - Chronic obstructive pulmonary disease
8. **Liver Disease** - Liver function assessment

## 📋 How to Use

1. Navigate to the Risk Assessment page in the frontend
2. Click "Start AI Assessment" in the purple card
3. Select a disease model from the dropdown
4. Fill in the required health parameters
5. Click "Calculate Risk" to get AI-powered predictions
6. View results with risk probability, confidence level, and recommendations

## 🔧 Features

- **Real-time Predictions**: Instant risk assessment using trained ML models
- **Multiple Disease Models**: Support for 8+ chronic disease predictions
- **Interactive UI**: User-friendly forms with validation
- **Risk Visualization**: Color-coded risk levels and progress bars
- **Medical Disclaimers**: Proper warnings about AI limitations
- **Responsive Design**: Works on desktop and mobile devices

## 🛠 Technical Architecture

### Frontend Components

- `MLPredictionForm.tsx` - Input form for health parameters
- `MLPredictionResults.tsx` - Display prediction results
- `mlService.ts` - API communication service
- Updated `RiskAssessment.tsx` - Main page integration

### Backend API

- FastAPI server with CORS support
- RESTful endpoints for each disease model
- Automatic model loading and preprocessing
- Mock predictions for development/testing

### API Endpoints

- `GET /` - Health check
- `GET /models` - List available models
- `POST /predict/{model_type}` - Get disease risk prediction

## 📊 Model Input Parameters

### Heart Disease
- Age, Sex, Resting BP, Cholesterol, Fasting Blood Sugar, Max Heart Rate

### Diabetes
- Glucose, Blood Pressure, Skin Thickness, Insulin, BMI, Diabetes Pedigree Function, Age

### Hypertension
- Age, Sex, Resting Blood Pressure, Cholesterol

## 🔒 Important Notes

- **Medical Disclaimer**: AI predictions are for informational purposes only
- **Professional Consultation**: Always consult healthcare providers for medical decisions
- **Data Privacy**: Health data is processed locally and not stored permanently
- **Model Accuracy**: Results depend on model training data and may vary

## 🚨 Troubleshooting

### Backend Issues
- Ensure Python 3.8+ is installed
- Check if port 8000 is available
- Verify all dependencies are installed

### Frontend Issues
- Ensure Node.js 16+ is installed
- Check if port 5173 is available
- Verify npm dependencies are installed

### Model Loading Issues
- Check if .pkl model files exist in respective directories
- Ensure proper file paths in backend configuration
- Fallback to mock predictions if models unavailable

## 🔄 Development Mode

The system includes fallback mock predictions for development:
- Random risk probabilities between 10-80%
- Simulated confidence scores
- All model types supported with mock data

This allows frontend development and testing without requiring all ML models to be properly loaded.

## 📈 Future Enhancements

- Real model integration with actual .pkl files
- User data persistence and history tracking
- Advanced visualization and trend analysis
- Integration with wearable device data
- Batch prediction capabilities
- Model performance monitoring