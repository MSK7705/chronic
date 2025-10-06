import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os
from collections import Counter

# -------------------------
# 1. Load dataset
# -------------------------
df = pd.read_csv("ckd.csv")  # Replace with your CSV path
df.replace('?', np.nan, inplace=True)

# -------------------------
# 2. Simplified user-friendly features
# -------------------------
numeric_cols = ['age', 'bp', 'bgr', 'bu', 'sc', 'hemo']
categorical_cols = ['htn']  # Hypertension: Yes/No

# Convert numeric
for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors='coerce')

# Impute numeric
num_imputer = SimpleImputer(strategy='median')
df[numeric_cols] = num_imputer.fit_transform(df[numeric_cols])

# Encode categorical
df['htn'] = df['htn'].map({'yes':1, 'no':0})
label_encoders = {}
le = LabelEncoder()
df['htn'] = le.fit_transform(df['htn'].astype(str))
label_encoders['htn'] = le

# -------------------------
# 3. Target
# -------------------------
# Ensure target has no missing values
df = df.dropna(subset=['classification'])

features = numeric_cols + categorical_cols
target_col = 'classification'
df[target_col] = df[target_col].apply(lambda x: 1 if x=='ckd' else 0)

X = df[features].copy()
y = df[target_col].copy()

# -------------------------
# 4. Train/test split
# -------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# -------------------------
# 5. Scale numeric features
# -------------------------
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# -------------------------
# 6. Handle class imbalance
# -------------------------
counter = Counter(y_train)
scale_pos_weight = counter[0]/max(counter[1],1)

# -------------------------
# 7. Train XGBoost Classifier
# -------------------------
model = XGBClassifier(
    n_estimators=500,
    max_depth=4,
    learning_rate=0.05,
    use_label_encoder=False,
    eval_metric='logloss',
    random_state=42,
    scale_pos_weight=scale_pos_weight
)
model.fit(X_train_scaled, y_train)

# -------------------------
# 8. Evaluate model
# -------------------------
y_pred = model.predict(X_test_scaled)
print("✅ CKD Model trained successfully!")
print(f"Test Accuracy: {accuracy_score(y_test, y_pred)*100:.2f}%")
print(classification_report(y_test, y_pred))

# -------------------------
# 9. Save model & preprocessing
# -------------------------
joblib.dump(model, "xgb_ckd_simple_model.pkl")
joblib.dump(scaler, "scaler_ckd_simple.pkl")
joblib.dump(num_imputer, "num_imputer_ckd_simple.pkl")
joblib.dump(label_encoders, "encoders_ckd_simple.pkl")

# -------------------------
# 10. User-friendly input
# -------------------------
def get_float_input(prompt):
    while True:
        try:
            return float(input(prompt))
        except ValueError:
            print("❌ Please enter a valid number.")

def get_binary_input(prompt):
    while True:
        val = input(prompt + " (yes/no): ").strip().lower()
        if val in ['yes','y']:
            return 1
        elif val in ['no','n']:
            return 0
        else:
            print("❌ Please enter yes or no.")

# -------------------------
# 11. Prediction with self-retraining
# -------------------------
def predict_from_user():
    print("\n👋 Let's check your CKD risk.")
    user_data = {}
    user_data['age'] = get_float_input("Age (years): ")
    user_data['bp'] = get_float_input("Blood Pressure (mmHg): ")
    user_data['bgr'] = get_float_input("Random Blood Glucose (mg/dL): ")
    user_data['bu'] = get_float_input("Blood Urea (mg/dL): ")
    user_data['sc'] = get_float_input("Serum Creatinine (mg/dL): ")
    user_data['hemo'] = get_float_input("Hemoglobin (g/dL): ")
    user_data['htn'] = get_binary_input("Do you have Hypertension?")

    user_df = pd.DataFrame([user_data])
    user_df[numeric_cols] = num_imputer.transform(user_df[numeric_cols])
    user_scaled = scaler.transform(user_df)

    # Predict
    pred_prob = model.predict_proba(user_scaled)[0][1]
    prediction = model.predict(user_scaled)[0]

    print("\n--- Prediction ---")
    print(f"Predicted CKD Risk Probability: {pred_prob*100:.2f}%")
    print("⚠️ HIGH RISK" if prediction==1 else "✅ LOW RISK")

    # -------------------------
    # Self-retrain: append new data & retrain
    # -------------------------
    user_df[target_col] = prediction
    feedback_file = "ckd_feedback.csv"
    if os.path.exists(feedback_file):
        user_df.to_csv(feedback_file, mode='a', index=False, header=False)
    else:
        user_df.to_csv(feedback_file, index=False)

    # Combine original data + feedback
    combined_df = pd.concat([df, pd.read_csv(feedback_file)], ignore_index=True)
    X_comb = combined_df[features]
    y_comb = combined_df[target_col]

    # Retrain model
    X_comb_scaled = scaler.fit_transform(X_comb)
    counter_comb = Counter(y_comb)
    scale_pos_weight_comb = counter_comb[0]/max(counter_comb[1],1)
    model.fit(X_comb_scaled, y_comb)
    joblib.dump(model, "xgb_ckd_simple_model.pkl")
    print("🔄 Model retrained with new user data!")

# Run prediction
predict_from_user()
