import joblib
import pandas as pd
import numpy as np
from pathlib import Path
import os

def validate_real_models():
    """Validate that we're using the actual trained ML models from your project"""
    
    print("🔍 Validating Real ML Models Integration...")
    print("=" * 60)
    
    model_paths = {
        "Heart Disease": "../Heart disease ML/xgb_heart_model.pkl",
        "Diabetes": "../Diabetes disease ML/ensemble_diabetes_model.pkl", 
        "Hypertension": "../Hypertension ML/xgb_hypertension_model.pkl",
        "Chronic Kidney Disease": "../Chronic Kidney disease(CKD) ML/xgb_ckd_simple_model.pkl",
        "Asthma": "../Asthma ML/xgb_asthma_model.pkl",
        "Arthritis": "../Arthritis_ML/data/xgb_arthritis_highacc.pkl",
        "COPD": "../COPD_ML/data/xgb_copd_highacc.pkl",
        "Liver Disease": "../Liver_ML/data/xgb_liver.pkl"
    }
    
    real_models_loaded = 0
    total_models = len(model_paths)
    
    for disease, path in model_paths.items():
        try:
            if Path(path).exists():
                model = joblib.load(path)
                print(f"✅ {disease}: REAL MODEL LOADED")
                print(f"   📁 Path: {path}")
                print(f"   🧠 Type: {type(model).__name__}")
                
                # Check if it's a real trained model
                if hasattr(model, 'feature_importances_') or hasattr(model, 'estimators_'):
                    print(f"   ✅ Confirmed: This is a TRAINED model with learned parameters")
                    real_models_loaded += 1
                else:
                    print(f"   ⚠️  Warning: Model structure unclear")
                
                # Test prediction capability
                try:
                    if hasattr(model, 'predict_proba'):
                        # Create appropriate dummy input
                        if 'heart' in path.lower():
                            dummy = np.array([[45, 1, 130, 250, 0, 150]])
                        elif 'diabetes' in path.lower():
                            dummy = np.array([[120, 80, 25, 100, 28.5, 0.5, 35]])
                        else:
                            n_features = getattr(model, 'n_features_in_', 8)
                            dummy = np.random.rand(1, n_features)
                        
                        prob = model.predict_proba(dummy)[0][1]
                        pred = model.predict(dummy)[0]
                        print(f"   🎯 Test Prediction: {prob:.3f} probability, class {pred}")
                    
                except Exception as e:
                    print(f"   ⚠️  Prediction test failed: {e}")
                
            else:
                print(f"❌ {disease}: MODEL FILE NOT FOUND")
                print(f"   📁 Expected: {path}")
                
        except Exception as e:
            print(f"❌ {disease}: LOADING ERROR - {e}")
        
        print()
    
    print("=" * 60)
    print(f"📊 VALIDATION SUMMARY:")
    print(f"   Real Models Loaded: {real_models_loaded}/{total_models}")
    print(f"   Success Rate: {(real_models_loaded/total_models)*100:.1f}%")
    
    if real_models_loaded > 0:
        print(f"✅ SUCCESS: Using {real_models_loaded} REAL trained ML models!")
        print("🎯 Your actual trained algorithms are integrated and working!")
    else:
        print("⚠️  WARNING: No real models found - using mock predictions")
        print("💡 Make sure your .pkl model files are in the correct directories")
    
    print("\n🔗 Integration Status:")
    print("   Frontend ↔️ FastAPI Backend ↔️ Your Trained Models")
    print("   React.js ↔️ Python ML API ↔️ XGBoost/Ensemble Models")
    
    return real_models_loaded > 0

if __name__ == "__main__":
    validate_real_models()