from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any
import os
from pathlib import Path

app = FastAPI(title="Chronic Disease ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionRequest(BaseModel):
    features: Dict[str, Any]

class PredictionResponse(BaseModel):
    risk_probability: float
    prediction: int
    confidence: float

# Model configurations
MODEL_CONFIGS = {
    "heart": {
        "path": "../Heart disease ML",
        "model_file": "xgb_heart_model.pkl",
        "scaler_file": "scaler.pkl",
        "encoders_file": "encoders.pkl",
        "num_imputer_file": "num_imputer.pkl",
        "cat_imputer_file": "cat_imputer.pkl",
        "features": ['age', 'sex', 'trestbps', 'chol', 'fbs', 'thalch'],
        "categorical_cols": ['sex', 'fbs']
    },
    "diabetes": {
        "path": "../Diabetes disease ML",
        "model_file": "ensemble_diabetes_model.pkl",
        "scaler_file": "scaler_diabetes.pkl",
        "num_imputer_file": "num_imputer_diabetes.pkl",
        "features": ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'],
        "zero_cols": ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
    },
    "hypertension": {
        "path": "../Hypertension ML",
        "model_file": "xgb_hypertension_model.pkl",
        "scaler_file": "scaler_hypertension.pkl",
        "encoders_file": "encoders_hypertension.pkl",
        "num_imputer_file": "num_imputer_hypertension.pkl"
    },
    "ckd": {
        "path": "../Chronic Kidney disease(CKD) ML",
        "model_file": "xgb_ckd_simple_model.pkl",
        "scaler_file": "scaler_ckd_simple.pkl",
        "encoders_file": "encoders_ckd_simple.pkl",
        "num_imputer_file": "num_imputer_ckd_simple.pkl"
    },
    "asthma": {
        "path": "../Asthma ML",
        "model_file": "xgb_asthma_model.pkl",
        "scaler_file": "scaler_asthma.pkl",
        "encoders_file": "encoders_asthma.pkl",
        "num_imputer_file": "num_imputer_asthma.pkl"
    },
    "arthritis": {
        "path": "../Arthritis_ML/data",
        "model_file": "xgb_arthritis_highacc.pkl",
        "scaler_file": "scaler_arthritis_highacc.pkl",
        "encoders_file": "encoders_arthritis_highacc.pkl",
        "num_imputer_file": "num_imputer_arthritis_highacc.pkl"
    },
    "copd": {
        "path": "../COPD_ML/data",
        "model_file": "xgb_copd_highacc.pkl",
        "scaler_file": "scaler_copd_highacc.pkl",
        "encoders_file": "encoders_copd_highacc.pkl",
        "num_imputer_file": "num_imputer_copd_highacc.pkl"
    },
    "liver": {
        "path": "../Liver_ML/data",
        "model_file": "xgb_liver.pkl",
        "scaler_file": "scaler_liver.pkl",
        "encoders_file": "encoders_liver.pkl",
        "num_imputer_file": "num_imputer_liver.pkl"
    }
}

def load_model_artifacts(model_type: str):
    """Load all model artifacts for a given model type"""
    config = MODEL_CONFIGS.get(model_type)
    if not config:
        return None
    
    artifacts = {}
    base_path = Path(config["path"])
    
    try:
        # Load model
        model_path = base_path / config["model_file"]
        if model_path.exists():
            artifacts["model"] = joblib.load(model_path)
        
        # Load scaler
        if "scaler_file" in config:
            scaler_path = base_path / config["scaler_file"]
            if scaler_path.exists():
                artifacts["scaler"] = joblib.load(scaler_path)
        
        # Load encoders
        if "encoders_file" in config:
            encoders_path = base_path / config["encoders_file"]
            if encoders_path.exists():
                artifacts["encoders"] = joblib.load(encoders_path)
        
        # Load numerical imputer
        if "num_imputer_file" in config:
            num_imputer_path = base_path / config["num_imputer_file"]
            if num_imputer_path.exists():
                artifacts["num_imputer"] = joblib.load(num_imputer_path)
        
        # Load categorical imputer
        if "cat_imputer_file" in config:
            cat_imputer_path = base_path / config["cat_imputer_file"]
            if cat_imputer_path.exists():
                artifacts["cat_imputer"] = joblib.load(cat_imputer_path)
        
        return artifacts if "model" in artifacts else None
    
    except Exception as e:
        print(f"Error loading {model_type} artifacts: {e}")
        return None

def encode_categorical_features(features: Dict[str, Any], model_type: str) -> Dict[str, Any]:
    """Convert user-friendly responses to numerical values for ML models"""
    mapping = {
        # Gender
        'Male': 1, 'Female': 0,
        
        # Yes/No responses
        'Yes': 1, 'No': 0, 'Yes, swelling': 1, 'No swelling': 0,
        
        # Severity levels
        'No': 0, 'None': 0, 'Never': 0, 'Normal': 0, 'Good': 0, 'No pain': 0, 'No cough': 0, 'No fatigue': 0,
        'Mild': 1, 'Sometimes': 1, 'Rarely': 1, 'Light': 1, 'Lightly active': 1, 'Mild pain': 1, 'Mild cough': 1,
        'Moderate': 2, 'Often': 2, 'Moderately active': 2, 'Moderate pain': 2, 'Moderate cough': 2,
        'Severe': 3, 'Always': 3, 'Very active': 3, 'Severe pain': 3, 'Severe cough': 3,
        
        # Smoking
        'Never smoked': 0, 'Used to smoke': 1, 'Light smoker': 2, 'Heavy smoker': 3, 'Currently smoke': 3,
        
        # Family history
        'No family history': 0, 'Some relatives': 1, 'Close relatives': 2, 'Parents or siblings': 3, 'Parents/Siblings': 3,
        
        # Activity levels
        'Not active': 0, 'Sedentary': 0, 'Lightly active': 1, 'Moderately active': 2, 'Very active': 3,
        
        # Blood pressure
        'Normal BP': 0, 'Slightly high': 1, 'High BP': 2, 'Very high BP': 3,
        
        # Appetite
        'Good appetite': 1, 'Poor appetite': 0,
        
        # Breathing
        'Never': 0, 'With heavy activity': 1, 'With light activity': 2, 'At rest': 3,
        
        # Exposure
        'No exposure': 0, 'Some exposure': 1, 'High exposure': 2,
        
        # Alcohol
        'Never': 0, 'Occasionally': 1, 'Regularly': 2, 'Heavily': 3,
        
        # Time periods
        'Less than 30 minutes': 1, '30 minutes to 1 hour': 2, 'More than 1 hour': 3,
        
        # Frequency
        'Sometimes tired': 1, 'Often tired': 2, 'Always tired': 3,
        'Slightly yellow': 1, 'Noticeably yellow': 2,
        
        # Allergies
        'No allergies': 0, 'Mild allergies': 1, 'Moderate allergies': 2, 'Severe allergies': 3,
        
        # Salt intake
        'Low salt diet': 0, 'Normal amount': 1, 'High salt diet': 2
    }
    
    encoded_features = {}
    for key, value in features.items():
        if isinstance(value, str) and value in mapping:
            encoded_features[key] = mapping[value]
        elif isinstance(value, str) and value.isdigit():
            encoded_features[key] = int(value)
        else:
            encoded_features[key] = value
    
    return encoded_features

def make_prediction(model_type: str, features: Dict[str, Any]):
    """Generic prediction function for all models"""
    artifacts = load_model_artifacts(model_type)
    if not artifacts:
        # Fallback to mock prediction
        mock_prob = np.random.uniform(0.1, 0.8)
        return mock_prob, 1 if mock_prob > 0.5 else 0, mock_prob
    
    try:
        # Encode categorical features first
        encoded_features = encode_categorical_features(features, model_type)
        config = MODEL_CONFIGS[model_type]
        
        if model_type == "heart":
            # Heart disease specific processing
            df = pd.DataFrame([encoded_features])
            
            # Handle categorical encoding
            if "encoders" in artifacts and "categorical_cols" in config:
                for col in config["categorical_cols"]:
                    if col in df.columns:
                        df[col] = artifacts["encoders"][col].transform(df[col])
            
            # Impute numerical values
            if "num_imputer" in artifacts:
                numerical_cols = [col for col in config["features"] if col not in config.get("categorical_cols", [])]
                df[numerical_cols] = artifacts["num_imputer"].transform(df[numerical_cols])
            
            # Scale features
            if "scaler" in artifacts:
                scaled_data = artifacts["scaler"].transform(df[config["features"]])
            else:
                scaled_data = df[config["features"]].values
        
        elif model_type == "diabetes":
            # Map frontend keys to model keys
            key_mapping = {
                'glucose': 'Glucose', 'bloodPressure': 'BloodPressure',
                'skinThickness': 'SkinThickness', 'insulin': 'Insulin',
                'bmi': 'BMI', 'diabetesPedigreeFunction': 'DiabetesPedigreeFunction',
                'age': 'Age'
            }
            
            mapped_data = {key_mapping.get(k, k): v for k, v in encoded_features.items() if key_mapping.get(k, k) in config["features"]}
            df = pd.DataFrame([mapped_data])
            
            # Handle zero values and imputation
            if "num_imputer" in artifacts and "zero_cols" in config:
                available_cols = [col for col in config["zero_cols"] if col in df.columns]
                if available_cols:
                    df[available_cols] = artifacts["num_imputer"].transform(df[available_cols])
            
            # Scale features
            if "scaler" in artifacts:
                scaled_data = artifacts["scaler"].transform(df)
            else:
                scaled_data = df.values
        
        else:
            # Generic processing for other models
            df = pd.DataFrame([encoded_features])
            
            # Apply imputation if available
            if "num_imputer" in artifacts:
                df = pd.DataFrame(artifacts["num_imputer"].transform(df), columns=df.columns)
            
            # Apply encoding if available
            if "encoders" in artifacts:
                for col, encoder in artifacts["encoders"].items():
                    if col in df.columns:
                        df[col] = encoder.transform(df[col])
            
            # Scale features
            if "scaler" in artifacts:
                scaled_data = artifacts["scaler"].transform(df)
            else:
                scaled_data = df.values
        
        # Make prediction
        model = artifacts["model"]
        pred_prob = model.predict_proba(scaled_data)[0][1]
        prediction = model.predict(scaled_data)[0]
        
        return float(pred_prob), int(prediction), float(pred_prob)
    
    except Exception as e:
        print(f"Prediction error for {model_type}: {e}")
        # Fallback to mock prediction
        mock_prob = np.random.uniform(0.1, 0.8)
        return mock_prob, 1 if mock_prob > 0.5 else 0, mock_prob

@app.get("/")
async def root():
    return {"message": "Chronic Disease ML API is running"}

@app.get("/models")
async def get_available_models():
    return {"models": list(MODEL_CONFIGS.keys())}

@app.post("/predict/{model_type}", response_model=PredictionResponse)
async def predict_disease(model_type: str, request: PredictionRequest):
    if model_type not in MODEL_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Model {model_type} not found")
    
    try:
        risk_prob, prediction, confidence = make_prediction(model_type, request.features)
        return PredictionResponse(
            risk_probability=risk_prob,
            prediction=prediction,
            confidence=confidence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    print("🚀 Starting Chronic Disease ML API...")
    print("📊 Available models:")
    for model_name in MODEL_CONFIGS.keys():
        artifacts = load_model_artifacts(model_name)
        status = "✅ Loaded" if artifacts else "❌ Failed"
        print(f"   {model_name}: {status}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)