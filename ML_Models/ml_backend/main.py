from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any
import os
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.multioutput import MultiOutputRegressor
from sklearn.ensemble import RandomForestRegressor
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier
from collections import Counter

app = FastAPI(title="Chronic Disease ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        "num_imputer_file": "num_imputer_hypertension.pkl",
        "features": ['Systolic_BP', 'Diastolic_BP', 'Heart_Rate', 'BMI', 'Age', 'Gender'],
        "categorical_cols": ['Gender'],
        "zero_cols": ['Systolic_BP', 'Diastolic_BP', 'Heart_Rate', 'BMI']
    },
    "ckd": {
        "path": "../Chronic Kidney disease(CKD) ML",
        "model_file": "xgb_ckd_simple_model.pkl",
        "scaler_file": "scaler_ckd_simple.pkl",
        "encoders_file": "encoders_ckd_simple.pkl",
        "num_imputer_file": "num_imputer_ckd_simple.pkl",
        "features": ['age', 'bp', 'bgr', 'bu', 'sc', 'hemo', 'htn'],
        "categorical_cols": ['htn']
    },
    "asthma": {
        "path": "../Asthma ML",
        "model_file": "xgb_asthma_model.pkl",
        "scaler_file": "scaler_asthma.pkl",
        "encoders_file": "encoders_asthma.pkl",
        "num_imputer_file": "num_imputer_asthma.pkl",
        "features": ['Age', 'Gender', 'BMI', 'Smoking', 'Wheezing', 'ShortnessOfBreath', 'Coughing', 'ExerciseInduced'],
        "categorical_cols": ['Gender', 'Smoking', 'Wheezing', 'ShortnessOfBreath', 'Coughing', 'ExerciseInduced']
    },
    "arthritis": {
        "path": "../Arthritis_ML/data/data",
        "model_file": "xgb_arthritis_highacc.pkl",
        "scaler_file": "scaler_arthritis_highacc.pkl",
        "encoders_file": "encoders_arthritis_highacc.pkl",
        "num_imputer_file": "num_imputer_arthritis_highacc.pkl",
        "features": ['Pain_Level', 'Joint_Mobility', 'Stiffness', 'Swelling', 'Age', 'Gender', 'Pain_Stiffness', 'Pain_Swelling', 'Stiffness_Swelling'],
        "categorical_cols": ['Gender'],
        "zero_cols": ['Pain_Level', 'Joint_Mobility', 'Stiffness', 'Swelling']
    },
    "copd": {
        "path": "../COPD_ML/data",
        "model_file": "xgb_copd_highacc.pkl",
        "scaler_file": "scaler_copd_highacc.pkl",
        "encoders_file": "encoders_copd_highacc.pkl",
        "num_imputer_file": "num_imputer_copd_highacc.pkl",
        "features": ['Age', 'Oxygen_Level', 'Oxygen_Low', 'Cough_SOB', 'Cough_Fatigue', 'Gender', 'Smoking_History', 'Cough', 'Shortness_of_Breath', 'Fatigue'],
        "categorical_cols": ['Gender', 'Smoking_History', 'Cough', 'Shortness_of_Breath', 'Fatigue']
    },
    "liver": {
        "path": "../Liver_ML/data/data",
        "model_file": "xgb_liver.pkl",
        "scaler_file": "scaler_liver.pkl",
        "encoders_file": "encoders_liver.pkl",
        "num_imputer_file": "num_imputer_liver.pkl",
        "features": ['Age', 'BMI', 'ALT', 'AST', 'Bilirubin', 'Fatigue', 'Jaundice', 'Nausea', 'Abdominal_Pain'],
        "categorical_cols": ['Fatigue', 'Jaundice', 'Nausea', 'Abdominal_Pain']
    }
}

# ---------------- Health Overall Model (Complications/Emergency/Adherence) ----------------
HEALTH_MODEL = None
HEALTH_SCALER = None

def train_health_model():
    global HEALTH_MODEL, HEALTH_SCALER
    try:
        data_path = Path(__file__).resolve().parents[2] / "health_data" / "health_risk_data_200.csv"
        if not data_path.exists():
            print(f"Health data CSV not found at {data_path}. Skipping health model training.")
            return
        df = pd.read_csv(data_path)
        feature_cols = ['glucose', 'systolic_bp', 'diastolic_bp', 'heart_rate', 'temperature', 'weight']
        target_cols = ['complication_risk', 'emergency_visits', 'adherence_rate']
        X = df[feature_cols].values
        y = df[target_cols].values
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        model = MultiOutputRegressor(RandomForestRegressor(n_estimators=250, random_state=42))
        model.fit(X_scaled, y)
        HEALTH_MODEL = model
        HEALTH_SCALER = scaler
        print("✅ Health model trained and ready")
    except Exception as e:
        print(f"Failed to train health model: {e}")

class HealthPredictionRequest(BaseModel):
    glucose: float
    systolic_bp: float
    diastolic_bp: float
    heart_rate: float
    temperature: float
    weight: float

class HealthPredictionResponse(BaseModel):
    complication_risk: float
    emergency_visits: float
    adherence_rate: float

# Enhance artifact loader with diagnostic logs
ARTIFACT_CACHE: Dict[str, Dict[str, Any]] = {}
CSV_MAP = {
    "heart": "heart.csv",
    "diabetes": "diabetes.csv",
    "ckd": "ckd.csv",
    "asthma": "asthma_disease_data.csv",
    "hypertension": "hypertension.csv",
}
def load_model_artifacts(model_type: str):
    """Load all model artifacts for a given model type"""
    # Serve from cache if available
    cached = ARTIFACT_CACHE.get(model_type)
    if cached:
        return cached
    config = MODEL_CONFIGS.get(model_type)
    if not config:
        return None
    
    artifacts = {}
    # Resolve artifact base path relative to this file to ensure correctness on Render
    base_path = (Path(__file__).resolve().parent / config["path"]).resolve()
    print(f"[{model_type}] Base path: {base_path}")
    
    try:
        # Load model
        model_path = base_path / config["model_file"]
        print(f"[{model_type}] Model path: {model_path} exists={model_path.exists()}")
        if model_path.exists():
            artifacts["model"] = joblib.load(model_path)
        
        # Load scaler
        if "scaler_file" in config:
            scaler_path = base_path / config["scaler_file"]
            print(f"[{model_type}] Scaler path: {scaler_path} exists={scaler_path.exists()}")
            if scaler_path.exists():
                artifacts["scaler"] = joblib.load(scaler_path)
        
        # Load encoders
        if "encoders_file" in config:
            encoders_path = base_path / config["encoders_file"]
            print(f"[{model_type}] Encoders path: {encoders_path} exists={encoders_path.exists()}")
            if encoders_path.exists():
                artifacts["encoders"] = joblib.load(encoders_path)
        
        # Load numerical imputer
        if "num_imputer_file" in config:
            num_imputer_path = base_path / config["num_imputer_file"]
            print(f"[{model_type}] Num imputer path: {num_imputer_path} exists={num_imputer_path.exists()}")
            if num_imputer_path.exists():
                artifacts["num_imputer"] = joblib.load(num_imputer_path)
        
        # Load categorical imputer
        if "cat_imputer_file" in config:
            cat_imputer_path = base_path / config["cat_imputer_file"]
            print(f"[{model_type}] Cat imputer path: {cat_imputer_path} exists={cat_imputer_path.exists()}")
            if cat_imputer_path.exists():
                artifacts["cat_imputer"] = joblib.load(cat_imputer_path)

        # If artifacts are missing, attempt fallback training (supported models)
        if "model" not in artifacts:
            print(f"[{model_type}] Pretrained artifacts missing. Starting fallback training from CSV...")
            fallback = train_model_fallback(model_type, base_path)
            if fallback:
                ARTIFACT_CACHE[model_type] = fallback
                return fallback
            else:
                print(f"[{model_type}] Fallback training could not run (CSV missing or error).")
                return None

        # Cache and return loaded artifacts
        if "model" in artifacts:
            ARTIFACT_CACHE[model_type] = artifacts
            return artifacts
        return None
    
    except Exception as e:
        print(f"Error loading {model_type} artifacts: {e}")
        return None

def encode_categorical_features(features: Dict[str, Any], model_type: str) -> Dict[str, Any]:
    """Convert user-friendly responses to numerical values for ML models.
    For the heart model, skip manual mapping for categorical columns so that
    the saved encoders (LabelEncoder/OneHotEncoder) can handle raw strings.
    """
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
        
        # Allergies
        'No allergies': 0, 'Mild allergies': 1, 'Moderate allergies': 2, 'Severe allergies': 3,
        
        # Salt intake
        'Low salt diet': 0, 'Normal amount': 1, 'High salt diet': 2
    }
    
    encoded_features: Dict[str, Any] = {}
    for key, value in features.items():
        # For heart model, let encoders handle raw categorical strings for columns like 'sex' and 'fbs'
        if model_type == "heart" and key in MODEL_CONFIGS.get("heart", {}).get("categorical_cols", []):
            encoded_features[key] = value
            continue
        
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
        raise ValueError(f"Model artifacts not available for '{model_type}'")
    
    try:
        # Encode categorical features first
        encoded_features = encode_categorical_features(features, model_type)
        config = MODEL_CONFIGS[model_type]
        
        if model_type == "heart":
            # Heart disease specific processing - handle encoders properly
            df = pd.DataFrame([encoded_features])
            
            # Helper: coerce values to match encoder classes
            def _coerce_for_encoder(col_name: str, encoder, series: pd.Series) -> pd.Series:
                classes = list(getattr(encoder, "classes_", []))
                if not classes:
                    return series
                # Numeric classes 0/1
                if all(isinstance(c, (int, np.integer)) for c in classes):
                    def _map_val(v):
                        if isinstance(v, str):
                            lv = v.strip().lower()
                            if lv in ["male", "m", "yes", "true", "1"]:
                                return 1
                            if lv in ["female", "f", "no", "false", "0"]:
                                return 0
                            # try int cast
                            try:
                                return int(v)
                            except Exception:
                                return v
                        if isinstance(v, bool):
                            return 1 if v else 0
                        return v
                    return series.apply(_map_val)
                # String classes like 'Male'/'Female' or 'True'/'False'
                if all(isinstance(c, str) for c in classes):
                    def _map_val(v):
                        if isinstance(v, bool):
                            return "True" if v else "False"
                        if isinstance(v, (int, np.integer)):
                            return classes[1] if int(v) == 1 else classes[0]
                        return v
                    return series.apply(_map_val)
                return series
            
            # Impute and encode
            if "encoders" in artifacts and "categorical_cols" in config:
                for col in config["categorical_cols"]:
                    if col in df.columns:
                        try:
                            coerced = _coerce_for_encoder(col, artifacts["encoders"][col], df[col])
                            df[col] = artifacts["encoders"][col].transform(coerced)
                        except ValueError as e:
                            if "previously unseen labels" in str(e):
                                print(f"Warning: Unseen label in {col}, using fallback value")
                                df[col] = 0
                            else:
                                raise e
            
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
                zero_cols = config.get("zero_cols", [])
                available_zero_cols = [col for col in zero_cols if col in df.columns]
                if available_zero_cols:
                    df[available_zero_cols] = artifacts["num_imputer"].transform(df[available_zero_cols])
            
            # Apply encoding if available - handle unseen labels gracefully
            if "encoders" in artifacts:
                for col, encoder in artifacts["encoders"].items():
                    if col in df.columns:
                        try:
                            df[col] = encoder.transform(df[col])
                        except ValueError as e:
                            if "previously unseen labels" in str(e):
                                # Handle unseen labels by using the most frequent class
                                print(f"Warning: Unseen label in {col}, using fallback value")
                                df[col] = 0  # Use 0 as fallback
                            else:
                                raise e
            
            # Create interaction features for arthritis model
            if model_type == "arthritis":
                df['Pain_Stiffness'] = df['Pain_Level'] * df['Stiffness']
                df['Pain_Swelling'] = df['Pain_Level'] * df['Swelling']
                df['Stiffness_Swelling'] = df['Stiffness'] * df['Swelling']
            
            # Scale features - only use the features that were used during training
            if "scaler" in artifacts:
                scaled_data = artifacts["scaler"].transform(df[config["features"]])
            else:
                scaled_data = df[config["features"]].values
        
        # Make prediction
        model = artifacts["model"]
        pred_prob = model.predict_proba(scaled_data)[0][1]
        prediction = model.predict(scaled_data)[0]
        
        return float(pred_prob), int(prediction), float(pred_prob)
    
    except Exception as e:
        print(f"Prediction error for {model_type}: {e}")
        raise

@app.get("/")
async def root():
    return {"message": "Chronic Disease ML API is running"}

@app.get("/models")
async def get_available_models():
    return {"models": list(MODEL_CONFIGS.keys())}

@app.post("/predict/disease/{model_type}", response_model=PredictionResponse)
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

@app.post("/predict/health_overall", response_model=HealthPredictionResponse)
async def predict_health_overall(request: HealthPredictionRequest):
    if HEALTH_MODEL is None or HEALTH_SCALER is None:
        raise HTTPException(status_code=503, detail="Health model not available")
    try:
        features = [[
            request.glucose,
            request.systolic_bp,
            request.diastolic_bp,
            request.heart_rate,
            request.temperature,
            request.weight,
        ]]
        X_scaled = HEALTH_SCALER.transform(features)
        pred = HEALTH_MODEL.predict(X_scaled)[0]
        return HealthPredictionResponse(
            complication_risk=float(max(0, min(100, pred[0]))),
            emergency_visits=float(max(0, min(100, pred[1]))),
            adherence_rate=float(max(0, min(100, pred[2])))
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
    train_health_model()

@app.get("/models_status")
async def get_models_status():
    status = {}
    for name, cfg in MODEL_CONFIGS.items():
        artifacts = load_model_artifacts(name)
        base_path = (Path(__file__).resolve().parent / cfg["path"]).resolve()
        status[name] = {
            "loaded": bool(artifacts),
            "base_path": str(base_path),
            "model_file": cfg.get("model_file"),
            "scaler_file": cfg.get("scaler_file"),
            "encoders_file": cfg.get("encoders_file"),
            "num_imputer_file": cfg.get("num_imputer_file"),
            "cat_imputer_file": cfg.get("cat_imputer_file"),
        }
    return status

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


def train_model_fallback(model_type: str, base_path: Path):
    """Generic fallback trainer for supported models when pretrained artifacts are missing.
    Uses CSV_MAP filenames and MODEL_CONFIGS to build a preprocessing + XGBClassifier pipeline.
    Returns artifacts dict or None if unavailable.
    """
    try:
        csv_name = CSV_MAP.get(model_type)
        if not csv_name:
            return None
        data_path = base_path / csv_name
        print(f"[{model_type}] Fallback training from CSV: {data_path} exists={data_path.exists()}")
        if not data_path.exists():
            print(f"[{model_type}] CSV not found; cannot fallback-train.")
            return None

        df = pd.read_csv(data_path)
        cfg = MODEL_CONFIGS[model_type]
        features = cfg["features"]
        X = df[features].copy()
        target_col = df.columns[-1]
        y = df[target_col].copy()
        # Convert target to binary if not already
        try:
            y = y.apply(lambda x: 1 if x > 0 else 0)
        except Exception:
            y = (y.astype(int) > 0).astype(int)

        categorical_cols = cfg.get("categorical_cols", [])
        numerical_cols = [c for c in features if c not in categorical_cols]

        # Impute
        num_imputer = SimpleImputer(strategy="median")
        if numerical_cols:
            X[numerical_cols] = num_imputer.fit_transform(X[numerical_cols])
        cat_imputer = SimpleImputer(strategy="most_frequent")
        if categorical_cols:
            X[categorical_cols] = cat_imputer.fit_transform(X[categorical_cols])

        # Encode categorical
        label_encoders = {}
        for col in categorical_cols:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col])
            label_encoders[col] = le

        # Scale
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X[features])

        # Class imbalance handling
        counter = Counter(y)
        pos = int(counter.get(1, 0))
        neg = int(counter.get(0, 0))
        scale_pos_weight = (neg / pos) if pos > 0 else 1.0

        # Train XGBClassifier
        model = XGBClassifier(
            n_estimators=300,
            max_depth=4,
            learning_rate=0.1,
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=42,
            scale_pos_weight=scale_pos_weight,
        )
        model.fit(X_scaled, y)
        print(f"✅ [{model_type}] Fallback model trained and in-memory artifacts created")
        artifacts = {
            "model": model,
            "scaler": scaler,
            "encoders": label_encoders,
            "num_imputer": num_imputer,
            "cat_imputer": cat_imputer,
        }
        return artifacts
    except Exception as e:
        print(f"[{model_type}] Fallback training failed: {e}")
        return None


def train_heart_model_fallback(base_path: Path):
    """Train heart model from CSV when pretrained artifacts are unavailable.
    Returns artifacts dict compatible with load_model_artifacts output or None on failure.
    """
    try:
        data_path = base_path / "heart.csv"
        print(f"[heart] Fallback training from CSV: {data_path} exists={data_path.exists()}")
        if not data_path.exists():
            print("[heart] heart.csv not found; cannot fallback-train.")
            return None

        df = pd.read_csv(data_path)
        features = MODEL_CONFIGS["heart"]["features"]
        target_col = df.columns[-1]
        X = df[features].copy()
        y = df[target_col].copy()
        # Convert target to binary
        y = y.apply(lambda x: 1 if x > 0 else 0)

        categorical_cols = MODEL_CONFIGS["heart"]["categorical_cols"]
        numerical_cols = [col for col in features if col not in categorical_cols]

        # Impute
        num_imputer = SimpleImputer(strategy="median")
        X[numerical_cols] = num_imputer.fit_transform(X[numerical_cols])
        cat_imputer = SimpleImputer(strategy="most_frequent")
        X[categorical_cols] = cat_imputer.fit_transform(X[categorical_cols])

        # Encode categorical
        label_encoders = {}
        for col in categorical_cols:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col])
            label_encoders[col] = le

        # Scale
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X[features])

        # Class imbalance handling
        counter = Counter(y)
        pos = counter.get(1, 0)
        neg = counter.get(0, 0)
        scale_pos_weight = (neg / pos) if pos > 0 else 1.0

        # Train model
        model = XGBClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.1,
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=42,
            scale_pos_weight=scale_pos_weight,
        )
        model.fit(X_scaled, y)

        print("✅ [heart] Fallback model trained and in-memory artifacts created")
        artifacts = {
            "model": model,
            "scaler": scaler,
            "encoders": label_encoders,
            "num_imputer": num_imputer,
            "cat_imputer": cat_imputer,
        }
        return artifacts
    except Exception as e:
        print(f"[heart] Fallback training failed: {e}")
        return None