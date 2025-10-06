import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# -------------------------
# 0. Setup folder paths (FINAL FIX for Liver ML)
# -------------------------
import os

# Get the absolute directory of this script file
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))

# Set this as the base folder (no extra "Liver_ML" will be created)
BASE_FOLDER = SCRIPT_DIR

# Create a "data" folder inside this same Liver_ML directory
DATA_FOLDER = os.path.join(BASE_FOLDER, "data")
os.makedirs(DATA_FOLDER, exist_ok=True)

# Define all file paths correctly within the same Liver_ML/data
DATASET_FILE = os.path.join(DATA_FOLDER, "synthetic_liver.csv")
MODEL_FILE = os.path.join(DATA_FOLDER, "xgb_liver.pkl")
SCALER_FILE = os.path.join(DATA_FOLDER, "scaler_liver.pkl")
NUM_IMPUTER_FILE = os.path.join(DATA_FOLDER, "num_imputer_liver.pkl")
ENCODER_FILE = os.path.join(DATA_FOLDER, "encoders_liver.pkl")
FEEDBACK_FILE = os.path.join(DATA_FOLDER, "liver_feedback.csv")

print(f"📁 Using data folder: {DATA_FOLDER}")


# -------------------------
# 1. Generate synthetic liver disease dataset
# -------------------------
def generate_synthetic_liver_data():
    np.random.seed(42)
    n_samples = 3000

    age = np.clip(np.random.normal(50, 15, n_samples), 18, 85).astype(int)
    bmi = np.clip(np.random.normal(27, 5, n_samples), 15, 40)
    alt = np.clip(np.random.normal(35, 20, n_samples), 5, 300)
    ast = np.clip(np.random.normal(30, 15, n_samples), 5, 300)
    bilirubin = np.clip(np.random.normal(1, 0.5, n_samples), 0.2, 5)

    # Symptoms
    fatigue = np.random.choice(['None', 'Mild', 'Severe'], n_samples)
    jaundice = np.random.choice(['None', 'Mild', 'Severe'], n_samples)
    nausea = np.random.choice(['None', 'Mild', 'Severe'], n_samples)
    abdominal_pain = np.random.choice(['None', 'Mild', 'Severe'], n_samples)

    # Simple risk calculation
    risk_score = 0.05*(age-50) + 0.1*(bmi-25) + 0.15*(alt/50) + 0.15*(ast/50) + 0.2*bilirubin + \
                 np.array([(f=='Mild')*1 + (f=='Severe')*2 for f in fatigue]) + \
                 np.array([(j=='Mild')*1 + (j=='Severe')*2 for j in jaundice]) + \
                 np.array([(n=='Mild')*1 + (n=='Severe')*2 for n in nausea]) + \
                 np.array([(a=='Mild')*1 + (a=='Severe')*2 for a in abdominal_pain]) + \
                 np.random.normal(0,1,n_samples)
    prob = 1 / (1 + np.exp(-risk_score))
    liver_disease = np.random.binomial(1, prob)

    df = pd.DataFrame({
        'Age': age,
        'BMI': bmi,
        'ALT': alt,
        'AST': ast,
        'Bilirubin': bilirubin,
        'Fatigue': fatigue,
        'Jaundice': jaundice,
        'Nausea': nausea,
        'Abdominal_Pain': abdominal_pain,
        'Liver_Disease': liver_disease
    })

    df.to_csv(DATASET_FILE, index=False)
    print(f"✅ Synthetic liver dataset saved to {DATASET_FILE}")
    return df

# Load or generate dataset
if not os.path.exists(DATASET_FILE):
    df = generate_synthetic_liver_data()
else:
    df = pd.read_csv(DATASET_FILE)
    expected_cols = ['Age','BMI','ALT','AST','Bilirubin','Fatigue','Jaundice','Nausea','Abdominal_Pain','Liver_Disease']
    if not all(col in df.columns for col in expected_cols):
        print("⚠️ Dataset corrupted, regenerating...")
        df = generate_synthetic_liver_data()
    else:
        print(f"✅ Loaded dataset from {DATASET_FILE}")

# -------------------------
# 2. Numeric imputation
# -------------------------
numeric_cols = ['Age','BMI','ALT','AST','Bilirubin']
if os.path.exists(NUM_IMPUTER_FILE):
    num_imputer = joblib.load(NUM_IMPUTER_FILE)
else:
    num_imputer = SimpleImputer(strategy='median')
    num_imputer.fit(df[numeric_cols])
    joblib.dump(num_imputer, NUM_IMPUTER_FILE)
df[numeric_cols] = num_imputer.transform(df[numeric_cols])

# -------------------------
# 3. Encode categorical
# -------------------------
categorical_cols = ['Fatigue','Jaundice','Nausea','Abdominal_Pain']
fixed_categories = {col:['None','Mild','Severe'] for col in categorical_cols}
label_encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    le.fit(fixed_categories[col])
    df[col] = df[col].apply(lambda x: x if x in fixed_categories[col] else 'None')
    df[col] = le.transform(df[col])
    label_encoders[col] = le
joblib.dump(label_encoders, ENCODER_FILE)
print(f"✅ Encoders fitted and saved to {ENCODER_FILE}")

# -------------------------
# 4. Scale features
# -------------------------
features = numeric_cols + categorical_cols
target = 'Liver_Disease'
X = df[features]
y = df[target]

if os.path.exists(SCALER_FILE):
    scaler = joblib.load(SCALER_FILE)
else:
    scaler = StandardScaler()
    scaler.fit(X)
    joblib.dump(scaler, SCALER_FILE)
X_scaled = scaler.transform(X)

# -------------------------
# 5. Train/load model + evaluate
# -------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, stratify=y, random_state=42
)

if os.path.exists(MODEL_FILE):
    model = joblib.load(MODEL_FILE)
    print(f"✅ Loaded model from {MODEL_FILE}")
else:
    model = XGBClassifier(
        n_estimators=800,
        max_depth=6,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42
    )
    model.fit(X_train, y_train)
    joblib.dump(model, MODEL_FILE)
    print("✅ Model trained and saved!")

# Evaluate
y_pred = model.predict(X_test)
print("\n📊 Initial Model Performance:")
print(f"✅ Accuracy: {accuracy_score(y_test, y_pred)*100:.2f}%")
print(classification_report(y_test, y_pred, target_names=['No Liver Disease','Liver Disease']))
print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# -------------------------
# 6. User Input + Feedback retraining (User-Friendly Version)
# -------------------------
def run_user_loop():
    symptom_map = {'None': 0, 'Mild': 1, 'Severe': 2}

    print("\n✅ Liver Disease Prediction (User-Friendly Mode)")
    print("Please answer the following questions as accurately as possible.")
    print("Type 'exit' anytime to quit.\n")

    while True:
        age_val = input("Enter your age: ").strip()
        if age_val.lower() == 'exit': break
        age_val = float(age_val)

        bmi_val = input("Enter your Body Mass Index (BMI): ").strip()
        if bmi_val.lower() == 'exit': break
        bmi_val = float(bmi_val)

        print("\n--- Symptoms ---")
        fatigue_text = input("Do you feel tired or fatigued often? (None/Mild/Severe): ").capitalize()
        jaundice_text = input("Any yellowing of eyes or skin? (None/Mild/Severe): ").capitalize()
        nausea_text = input("Do you feel nauseated or have vomiting? (None/Mild/Severe): ").capitalize()
        ab_pain_text = input("Do you experience abdominal discomfort or pain? (None/Mild/Severe): ").capitalize()

        # Convert to internal numeric representation
        fatigue = symptom_map.get(fatigue_text, 0)
        jaundice = symptom_map.get(jaundice_text, 0)
        nausea = symptom_map.get(nausea_text, 0)
        ab_pain = symptom_map.get(ab_pain_text, 0)

        # 💡 Simulate medical values based on symptoms
        # ALT, AST, and Bilirubin will be estimated from symptom severity for simplicity
        alt_val = 20 + 40 * (fatigue + jaundice + nausea + ab_pain) / 8
        ast_val = 18 + 35 * (fatigue + jaundice + nausea + ab_pain) / 8
        bilirubin_val = 0.8 + 1.5 * (jaundice / 2)

        user_data = {
            'Age': age_val,
            'BMI': bmi_val,
            'ALT': alt_val,
            'AST': ast_val,
            'Bilirubin': bilirubin_val,
            'Fatigue': fatigue,
            'Jaundice': jaundice,
            'Nausea': nausea,
            'Abdominal_Pain': ab_pain
        }

        user_df = pd.DataFrame([user_data])
        user_df[numeric_cols] = num_imputer.transform(user_df[numeric_cols])
        user_scaled = scaler.transform(user_df[features])

        pred_prob = model.predict_proba(user_scaled)[0][1]
        prediction = model.predict(user_scaled)[0]

        print("\n--- Prediction Result ---")
        print(f"Predicted Liver Disease Risk: {pred_prob*100:.2f}%")
        print("⚠️ HIGH RISK! Please consult a doctor." if prediction == 1 else "✅ Low Risk. Keep maintaining a healthy lifestyle.")

        # Feedback-based retraining (optional)
        actual_input = input("\nEnter actual diagnosis (Yes/No) for retraining or skip: ").capitalize()
        if actual_input not in ['Yes', 'No']:
            print("Skipping retraining for this case.")
            continue
        actual_val = 1 if actual_input == 'Yes' else 0
        user_df[target] = actual_val

        if os.path.exists(FEEDBACK_FILE):
            user_df.to_csv(FEEDBACK_FILE, mode='a', index=False, header=False)
        else:
            user_df.to_csv(FEEDBACK_FILE, index=False)

        print("📌 Feedback saved. Retraining model...")

        feedback_df = pd.read_csv(FEEDBACK_FILE)
        full_df = pd.concat([df, feedback_df], ignore_index=True).drop_duplicates()
        X_full = full_df[features]
        y_full = full_df[target]

        X_train_full, X_test_full, y_train_full, y_test_full = train_test_split(
            X_full, y_full, test_size=0.2, random_state=42, stratify=y_full
        )
        X_train_scaled_full = scaler.fit_transform(X_train_full)
        X_test_scaled_full = scaler.transform(X_test_full)

        model.fit(X_train_scaled_full, y_train_full)
        joblib.dump(model, MODEL_FILE)

        y_pred_full = model.predict(X_test_scaled_full)
        print("\n📊 Updated Model Accuracy After Retraining:")
        print(f"{accuracy_score(y_test_full, y_pred_full)*100:.2f}%")

# Run
print("\n✅ Liver Disease Model ready! Starting user input loop with feedback...")
run_user_loop()
