import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

## -------------------------
# 0. Setup folder paths (FINAL FIX)
# -------------------------
import os

# Always use the actual folder where this script is located
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))

# Set Arthritis_ML as the main base folder (the same as where model.py is)
BASE_FOLDER = SCRIPT_DIR

# Create a "data" folder directly inside Arthritis_ML (no nesting)
DATA_FOLDER = os.path.join(BASE_FOLDER, "data")
os.makedirs(DATA_FOLDER, exist_ok=True)

# Define all file paths (these will now stay in Arthritis_ML/data)
DATASET_FILE = os.path.join(DATA_FOLDER, "synthetic_arthritis_highacc.csv")
MODEL_FILE = os.path.join(DATA_FOLDER, "xgb_arthritis_highacc.pkl")
SCALER_FILE = os.path.join(DATA_FOLDER, "scaler_arthritis_highacc.pkl")
NUM_IMPUTER_FILE = os.path.join(DATA_FOLDER, "num_imputer_arthritis_highacc.pkl")
ENCODER_FILE = os.path.join(DATA_FOLDER, "encoders_arthritis_highacc.pkl")
FEEDBACK_FILE = os.path.join(DATA_FOLDER, "arthritis_feedback_highacc.csv")

print(f"📁 Using data folder: {DATA_FOLDER}")


# -------------------------
# 1. Generate or load synthetic dataset
# -------------------------
if not os.path.exists(DATASET_FILE):
    print("Creating synthetic dataset...")
    np.random.seed(42)
    n_samples = 3000
    age = np.clip(np.random.normal(50, 15, n_samples), 18, 80).astype(int)
    pain = np.clip(np.random.normal(3 + (age-18)/12, 2, n_samples), 1, 10)
    stiffness = np.clip(np.random.normal(pain*0.9, 1, n_samples), 0, 10)
    swelling = np.clip(np.random.normal(0.5*pain + 0.5*stiffness, 1, n_samples), 0, 10)
    mobility = np.clip(np.random.normal(100 - 5*pain - 3*stiffness, 5, n_samples), 20, 100)
    gender = np.random.choice(['Male', 'Female'], n_samples)
    logit = 0.6*pain + 0.3*stiffness + 0.3*swelling + 0.05*(age-50) - 4
    arthritis_prob = 1 / (1 + np.exp(-logit))
    arthritis = np.random.binomial(1, arthritis_prob)

    df = pd.DataFrame({
        'Pain_Level': pain.round(1),
        'Joint_Mobility': mobility.round(1),
        'Stiffness': stiffness.round(1),
        'Swelling': swelling.round(1),
        'Age': age,
        'Gender': gender,
        'Arthritis': np.where(arthritis==1,'Yes','No')
    })
    df.to_csv(DATASET_FILE, index=False)
    print(f"✅ Dataset saved to {DATASET_FILE}")
else:
    df = pd.read_csv(DATASET_FILE)
    print(f"✅ Loaded existing dataset from {DATASET_FILE}")

# -------------------------
# 2. Handle missing/zero values
# -------------------------
zero_cols = ['Pain_Level','Joint_Mobility','Stiffness','Swelling']
if os.path.exists(NUM_IMPUTER_FILE):
    num_imputer = joblib.load(NUM_IMPUTER_FILE)
    df[zero_cols] = num_imputer.transform(df[zero_cols])
else:
    num_imputer = SimpleImputer(strategy='median')
    df[zero_cols] = num_imputer.fit_transform(df[zero_cols])
    joblib.dump(num_imputer, NUM_IMPUTER_FILE)
    print(f"✅ Numerical imputer saved to {NUM_IMPUTER_FILE}")

# -------------------------
# 3. Encode categorical column: Gender
# -------------------------
categorical_cols = ['Gender']
if os.path.exists(ENCODER_FILE):
    label_encoders = joblib.load(ENCODER_FILE)
    for col in categorical_cols:
        df[col] = label_encoders[col].transform(df[col])
else:
    label_encoders = {}
    for col in categorical_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        label_encoders[col] = le
    joblib.dump(label_encoders, ENCODER_FILE)
    print(f"✅ Encoders saved to {ENCODER_FILE}")

# -------------------------
# 4. Encode target column
# -------------------------
df['Arthritis'] = df['Arthritis'].str.lower().map({'no':0,'yes':1})

# -------------------------
# 5. Create interaction features
# -------------------------
df['Pain_Stiffness'] = df['Pain_Level'] * df['Stiffness']
df['Pain_Swelling'] = df['Pain_Level'] * df['Swelling']
df['Stiffness_Swelling'] = df['Stiffness'] * df['Swelling']

features = zero_cols + ['Age'] + categorical_cols + ['Pain_Stiffness','Pain_Swelling','Stiffness_Swelling']
target_col = 'Arthritis'
X = df[features].copy()
y = df[target_col].copy()

# -------------------------
# 6. Train/test split & scaler
# -------------------------
if os.path.exists(SCALER_FILE):
    scaler = joblib.load(SCALER_FILE)
    X_scaled = scaler.transform(X)
else:
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    joblib.dump(scaler, SCALER_FILE)
    print(f"✅ Scaler saved to {SCALER_FILE}")

# -------------------------
# 7. Train or load XGBoost model
# -------------------------
if os.path.exists(MODEL_FILE):
    model = joblib.load(MODEL_FILE)
    print(f"✅ Loaded existing model from {MODEL_FILE}")
else:
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)
    model = XGBClassifier(
        n_estimators=1000,
        max_depth=6,
        learning_rate=0.01,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42
    )
    model.fit(X_train, y_train)
    joblib.dump(model, MODEL_FILE)
    print(f"✅ Model trained and saved to {MODEL_FILE}")

# -------------------------
# 8. Evaluate model before user input
# -------------------------
X_train_eval, X_test_eval, y_train_eval, y_test_eval = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, stratify=y
)
y_pred_eval = model.predict(X_test_eval)
print("\n📊 Current Model Performance before user input:")
print(f"Accuracy: {accuracy_score(y_test_eval, y_pred_eval)*100:.2f}%")
print("\nClassification Report:\n", classification_report(y_test_eval, y_pred_eval))

# -------------------------
# 9. User-friendly mapping
# -------------------------
pain_map = {'Low':2, 'Moderate':5, 'High':9}
mobility_map = {'Normal':90, 'Slightly Reduced':65, 'Severely Reduced':35}
stiffness_map = {'None':0, 'Mild':3, 'Moderate':6, 'Severe':9}
swelling_map = {'None':0, 'Mild':3, 'Moderate':6, 'Severe':9}

# -------------------------
# 10. User input + retrain + updated metrics
# -------------------------
def run_loop():
    while True:
        print("\nEnter patient details (or type 'exit' to quit):")
        pain_cat = input("Pain Level (Low/Moderate/High): ").strip().capitalize()
        if pain_cat.lower() == 'exit': break
        mobility_cat = input("Joint Mobility (Normal/Slightly Reduced/Severely Reduced): ").strip().capitalize()
        stiffness_cat = input("Stiffness (None/Mild/Moderate/Severe): ").strip().capitalize()
        swelling_cat = input("Swelling (None/Mild/Moderate/Severe): ").strip().capitalize()
        age_val = input("Age: ").strip()
        if age_val.lower() == 'exit': break
        gender_input = input("Gender (Male/Female): ").strip().capitalize()

        user_data = {
            'Pain_Level': pain_map.get(pain_cat,5),
            'Joint_Mobility': mobility_map.get(mobility_cat,65),
            'Stiffness': stiffness_map.get(stiffness_cat,3),
            'Swelling': swelling_map.get(swelling_cat,3),
            'Age': float(age_val),
            'Gender': label_encoders['Gender'].transform([gender_input])[0] if gender_input in label_encoders['Gender'].classes_ else 0
        }
        user_data['Pain_Stiffness'] = user_data['Pain_Level'] * user_data['Stiffness']
        user_data['Pain_Swelling'] = user_data['Pain_Level'] * user_data['Swelling']
        user_data['Stiffness_Swelling'] = user_data['Stiffness'] * user_data['Swelling']

        user_df = pd.DataFrame([user_data])
        user_df[zero_cols] = num_imputer.transform(user_df[zero_cols])
        user_scaled = scaler.transform(user_df)

        pred_prob = model.predict_proba(user_scaled)[0][1]
        prediction = model.predict(user_scaled)[0]

        print("\n--- Prediction ---")
        print(f"Predicted Arthritis Risk Probability: {pred_prob*100:.2f}%")
        print("⚠️ HIGH RISK" if prediction==1 else "✅ LOW RISK")

        # Get actual diagnosis
        while True:
            actual = input("Enter actual diagnosis (Yes/No) for retraining: ").strip().capitalize()
            if actual in ['Yes','No']:
                actual_val = 1 if actual=='Yes' else 0
                break
            else:
                print("Invalid input. Please type Yes or No.")

        # Save feedback
        user_df[target_col] = actual_val
        if os.path.exists(FEEDBACK_FILE):
            user_df.to_csv(FEEDBACK_FILE, mode='a', index=False, header=False)
        else:
            user_df.to_csv(FEEDBACK_FILE, index=False)

        # Retrain model on full data
        feedback_df = pd.read_csv(FEEDBACK_FILE)
        full_df = pd.concat([df, feedback_df], ignore_index=True).drop_duplicates()
        X_full = full_df[features]
        y_full = full_df[target_col]

        # Train/test split for evaluation
        X_train_full, X_test_full, y_train_full, y_test_full = train_test_split(
            X_full, y_full, test_size=0.2, random_state=42, stratify=y_full
        )

        X_train_scaled_full = scaler.fit_transform(X_train_full)
        X_test_scaled_full = scaler.transform(X_test_full)

        model.fit(X_train_scaled_full, y_train_full)
        joblib.dump(model, MODEL_FILE)

        # Evaluate after retraining
        y_pred_full = model.predict(X_test_scaled_full)
        print("\n📊 Updated Model Performance after user input:")
        print(f"Accuracy: {accuracy_score(y_test_full, y_pred_full)*100:.2f}%")
        print("\nClassification Report:\n", classification_report(y_test_full, y_pred_full))

# -------------------------
# Run the loop
# -------------------------
run_loop()
