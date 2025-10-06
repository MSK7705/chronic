import joblib
import pandas as pd
import numpy as np
from pathlib import Path
import sys
import os

def test_model_loading():
    """Test loading all ML models to verify they work correctly"""
    
    models_to_test = {
        "heart": "../Heart disease ML/xgb_heart_model.pkl",
        "diabetes": "../Diabetes disease ML/ensemble_diabetes_model.pkl", 
        "hypertension": "../Hypertension ML/xgb_hypertension_model.pkl",
        "ckd": "../Chronic Kidney disease(CKD) ML/xgb_ckd_simple_model.pkl",
        "asthma": "../Asthma ML/xgb_asthma_model.pkl",
        "arthritis": "../Arthritis_ML/data/xgb_arthritis_highacc.pkl",
        "copd": "../COPD_ML/data/xgb_copd_highacc.pkl",
        "liver": "../Liver_ML/data/xgb_liver.pkl"
    }
    
    print("🔍 Testing ML Model Loading...")
    print("=" * 50)
    
    loaded_models = {}
    
    for model_name, model_path in models_to_test.items():
        try:
            if Path(model_path).exists():
                model = joblib.load(model_path)
                loaded_models[model_name] = model
                print(f"✅ {model_name.upper()}: Successfully loaded")
                print(f"   Type: {type(model).__name__}")
                
                # Test prediction with dummy data
                if hasattr(model, 'predict_proba'):
                    # Create dummy input based on expected features
                    if model_name == "heart":
                        dummy_input = np.array([[45, 1, 130, 250, 0, 150]])  # age, sex, bp, chol, fbs, thalch
                    elif model_name == "diabetes":
                        dummy_input = np.array([[120, 80, 25, 100, 28.5, 0.5, 35]])  # glucose, bp, skin, insulin, bmi, dpf, age
                    else:
                        # Generic dummy input
                        n_features = getattr(model, 'n_features_in_', 8)
                        dummy_input = np.random.rand(1, n_features)
                    
                    try:
                        prob = model.predict_proba(dummy_input)[0][1]
                        pred = model.predict(dummy_input)[0]
                        print(f"   Test Prediction: {prob:.3f} probability, class {pred}")
                    except Exception as e:
                        print(f"   ⚠️  Prediction test failed: {e}")
                
            else:
                print(f"❌ {model_name.upper()}: File not found at {model_path}")
                
        except Exception as e:
            print(f"❌ {model_name.upper()}: Loading failed - {e}")
    
    print("=" * 50)
    print(f"📊 Summary: {len(loaded_models)}/{len(models_to_test)} models loaded successfully")
    
    if len(loaded_models) > 0:
        print("🚀 Ready to start the ML API server!")
    else:
        print("⚠️  No models loaded. API will use mock predictions.")
    
    return loaded_models

if __name__ == "__main__":
    test_model_loading()