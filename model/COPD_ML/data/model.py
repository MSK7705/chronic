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
# 0. Setup folder paths
# -------------------------
BASE_FOLDER = "COPD_ML"
DATA_FOLDER = os.path.join(BASE_FOLDER, "data")
os.makedirs(DATA_FOLDER, exist_ok=True)

DATASET_FILE = os.path.join(DATA_FOLDER, "synthetic_copd_highacc.csv")
MODEL_FILE = os.path.join(DATA_FOLDER, "xgb_copd_highacc.pkl")
SCALER_FILE = os.path.join(DATA_FOLDER, "scaler_copd_highacc.pkl")
NUM_IMPUTER_FILE = os.path.join(DATA_FOLDER, "num_imputer_copd_highacc.pkl")
ENCODER_FILE = os.path.join(DATA_FOLDER, "encoders_copd_highacc.pkl")
FEEDBACK_FILE = os.path.join(DATA_FOLDER, "copd_feedback_highacc.csv")

# -------------------------
# 1. Generate synthetic dataset
# -------------------------
def generate_synthetic_copd_data():
    np.random.seed(42)
    n_samples = 3000

    age = np.clip(np.random.normal(60, 12, n_samples), 30, 90).astype(int)
    oxygen = np.clip(np.random.normal(95, 5, n_samples), 80, 100)
    gender = np.random.choice(['Male', 'Female'], n_samples)
    smoking = np.random.choice(['Never', 'Former', 'Current'], n_samples)
    cough = np.random.choice(['None', 'Mild', 'Severe'], n_samples)
    sob = np.random.choice(['None', 'Mild', 'Severe'], n_samples)
    fatigue = np.random.choice(['None', 'Mild', 'Severe'], n_samples)

    oxygen_low = np.clip(100 - oxygen, 0, 20)
    cough_sob = np.array([(c == 'Severe')*2 + (c == 'Mild')*1 for c in cough]) * \
                np.array([(s == 'Severe')*2 + (s == 'Mild')*1 for s in sob])
    cough_fatigue = np.array([(c == 'Severe')*2 + (c == 'Mild')*1 for c in cough]) * \
                     np.array([(f == 'Severe')*2 + (f == 'Mild')*1 for f in fatigue])

    logit = 0.05*(age-60) + 0.1*oxygen_low + 0.25*cough_sob + 0.2*cough_fatigue + np.random.normal(0,1,n_samples)
    prob = 1 / (1 + np.exp(-logit))
    copd = np.random.binomial(1, prob)

    df_new = pd.DataFrame({
        'Age': age,
        'Oxygen_Level': oxygen,
        'Gender': gender,
        'Smoking_History': smoking,
        'Cough': cough,
        'Shortness_of_Breath': sob,
        'Fatigue': fatigue,
        'Oxygen_Low': oxygen_low,
        'Cough_SOB': cough_sob,
        'Cough_Fatigue': cough_fatigue,
        'COPD': copd
    })

    df_new.to_csv(DATASET_FILE, index=False)
    print(f"✅ Regenerated dataset and saved to {DATASET_FILE}")
    return df_new

# Load dataset
if not os.path.exists(DATASET_FILE):
    df = generate_synthetic_copd_data()
else:
    df = pd.read_csv(DATASET_FILE)
    expected_cols = ['Age','Oxygen_Level','Gender','Smoking_History','Cough',
                     'Shortness_of_Breath','Fatigue','Oxygen_Low','Cough_SOB',
                     'Cough_Fatigue','COPD']
    if not all(col in df.columns for col in expected_cols):
        print("⚠️ Dataset corrupted, regenerating...")
        df = generate_synthetic_copd_data()
    else:
        print(f"✅ Loaded dataset from {DATASET_FILE}")

# -------------------------
# 2. Impute numeric columns
# -------------------------
numeric_cols = ['Age','Oxygen_Level','Oxygen_Low','Cough_SOB','Cough_Fatigue']
if os.path.exists(NUM_IMPUTER_FILE):
    num_imputer = joblib.load(NUM_IMPUTER_FILE)
else:
    num_imputer = SimpleImputer(strategy='median')
    num_imputer.fit(df[numeric_cols])
    joblib.dump(num_imputer, NUM_IMPUTER_FILE)
df[numeric_cols] = num_imputer.transform(df[numeric_cols])

# -------------------------
# 3. Encode categorical columns (force overwrite)
# -------------------------
categorical_cols = ['Gender','Smoking_History','Cough','Shortness_of_Breath','Fatigue']
fixed_categories = {
    'Gender':['Male','Female'],
    'Smoking_History':['Never','Former','Current'],
    'Cough':['None','Mild','Severe'],
    'Shortness_of_Breath':['None','Mild','Severe'],
    'Fatigue':['None','Mild','Severe']
}
label_encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    le.fit(fixed_categories[col])
    df[col] = df[col].apply(lambda x: x if x in fixed_categories[col] else fixed_categories[col][0])
    df[col] = le.transform(df[col])
    label_encoders[col] = le
joblib.dump(label_encoders, ENCODER_FILE)
print(f"✅ Encoders fitted and saved fresh to {ENCODER_FILE}")

# -------------------------
# 4. Scale features
# -------------------------
features = numeric_cols + categorical_cols
target = 'COPD'
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
# 5. Train or load model + Evaluate
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

# Evaluate model
y_pred = model.predict(X_test)
print("\n📊 Initial Model Performance:")
print(f"✅ Accuracy: {accuracy_score(y_test, y_pred)*100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['No COPD','COPD']))
print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# -------------------------
# 6. User Input Loop with Feedback-based Retraining
# -------------------------
def run_user_loop_with_feedback():
    oxygen_map = {'Low':85,'Normal':95,'High':100}
    while True:
        print("\nEnter patient details (type 'exit' anytime to quit):")

        age_val = input("Age: ").strip()
        if age_val.lower()=='exit': break
        age_val = float(age_val)

        while True:
            oxygen_text = input("Oxygen Level (Low/Normal/High): ").capitalize()
            if oxygen_text.lower()=='exit': return
            if oxygen_text in oxygen_map:
                oxygen_val = oxygen_map[oxygen_text]
                break
            else:
                print("Invalid! Enter Low/Normal/High.")

        gender_text = input("Gender (Male/Female): ").capitalize()
        smoking_text = input("Smoking History (Never/Former/Current): ").capitalize()
        cough_text = input("Cough (None/Mild/Severe): ").capitalize()
        sob_text = input("Shortness of Breath (None/Mild/Severe): ").capitalize()
        fatigue_text = input("Fatigue (None/Mild/Severe): ").capitalize()

        # Encode input
        gender_num = label_encoders['Gender'].transform([gender_text])[0]
        smoking_num = label_encoders['Smoking_History'].transform([smoking_text])[0]
        cough_num = label_encoders['Cough'].transform([cough_text])[0]
        sob_num = label_encoders['Shortness_of_Breath'].transform([sob_text])[0]
        fatigue_num = label_encoders['Fatigue'].transform([fatigue_text])[0]

        # Prepare user row
        user_data = {
            'Age':age_val,
            'Oxygen_Level':oxygen_val,
            'Oxygen_Low':100-oxygen_val,
            'Cough_SOB':cough_num*sob_num,
            'Cough_Fatigue':cough_num*fatigue_num,
            'Gender':gender_num,
            'Smoking_History':smoking_num,
            'Cough':cough_num,
            'Shortness_of_Breath':sob_num,
            'Fatigue':fatigue_num
        }

        user_df = pd.DataFrame([user_data])
        user_df[numeric_cols] = num_imputer.transform(user_df[numeric_cols])
        user_scaled = scaler.transform(user_df[features])

        # Prediction
        pred_prob = model.predict_proba(user_scaled)[0][1]
        prediction = model.predict(user_scaled)[0]

        print("\n--- Prediction ---")
        print(f"Predicted COPD Risk Probability: {pred_prob*100:.2f}%")
        print("⚠️ HIGH RISK" if prediction==1 else "✅ LOW RISK")

        # Ask for actual diagnosis for feedback
        actual_input = input("Enter actual diagnosis (Yes/No) for retraining or skip: ").strip().capitalize()
        if actual_input.lower()=='exit': break
        if actual_input not in ['Yes','No']:
            print("Skipping retraining for this case.")
            continue

        actual_val = 1 if actual_input=='Yes' else 0
        user_df[target] = actual_val

        # Append to feedback CSV
        if os.path.exists(FEEDBACK_FILE):
            user_df.to_csv(FEEDBACK_FILE, mode='a', index=False, header=False)
        else:
            user_df.to_csv(FEEDBACK_FILE, index=False)

        print("📌 Feedback saved. Retraining model...")

        # Retrain on combined dataset
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

        # Evaluate updated model
        y_pred_full = model.predict(X_test_scaled_full)
        print("\n📊 Updated Model Performance after Retraining:")
        print(f"✅ Accuracy: {accuracy_score(y_test_full, y_pred_full)*100:.2f}%")
        print("\nClassification Report:")
        print(classification_report(y_test_full, y_pred_full, target_names=['No COPD','COPD']))

# -------------------------
# 7. Run
# -------------------------
print("\n✅ Model ready! Now starting user input loop with feedback...")
run_user_loop_with_feedback()
