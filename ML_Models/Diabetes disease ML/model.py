import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
from collections import Counter

# -------------------------
# 1. Load dataset
# -------------------------
df = pd.read_csv("diabetes.csv")  # Ensure the file exists

# -------------------------
# 2. Handle missing/zero values
# -------------------------
zero_cols = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
for col in zero_cols:
    df[col] = df[col].replace(0, np.nan)

num_imputer = SimpleImputer(strategy='median')
df[zero_cols] = num_imputer.fit_transform(df[zero_cols])

# -------------------------
# 3. Features & target (gender-neutral)
# -------------------------
features = ['Glucose', 'BloodPressure', 'SkinThickness',
            'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age']
target_col = 'Outcome'

X = df[features].copy()
y = df[target_col].copy()

# -------------------------
# 4. Train/test split
# -------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# -------------------------
# 5. Scale features
# -------------------------
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# -------------------------
# 6. Handle class imbalance
# -------------------------
counter = Counter(y_train)
scale_pos_weight = counter[0] / counter[1]

# -------------------------
# 7. Build ensemble model
# -------------------------
xgb_model = XGBClassifier(
    n_estimators=400,
    max_depth=4,
    learning_rate=0.05,
    use_label_encoder=False,
    eval_metric='logloss',
    random_state=42,
    scale_pos_weight=scale_pos_weight
)

rf_model = RandomForestClassifier(
    n_estimators=300,
    max_depth=6,
    random_state=42,
    class_weight='balanced'
)

# Ensemble: VotingClassifier (soft voting for probability averaging)
ensemble_model = VotingClassifier(
    estimators=[('xgb', xgb_model), ('rf', rf_model)],
    voting='soft'
)

ensemble_model.fit(X_train_scaled, y_train)

# -------------------------
# 8. Evaluate ensemble model
# -------------------------
y_pred = ensemble_model.predict(X_test_scaled)
y_prob = ensemble_model.predict_proba(X_test_scaled)[:, 1]

print("✅ Ensemble Model trained successfully!")
print(f"Test Accuracy: {accuracy_score(y_test, y_pred)*100:.2f}%")
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# Save model and preprocessing objects
joblib.dump(ensemble_model, "ensemble_diabetes_model.pkl")
joblib.dump(scaler, "scaler_diabetes.pkl")
joblib.dump(num_imputer, "num_imputer_diabetes.pkl")

# -------------------------
# 9. Safe float input
# -------------------------
def get_float_input(prompt):
    while True:
        try:
            value = float(input(prompt))
            return value
        except ValueError:
            print("❌ Invalid input. Please enter a valid number.")

# -------------------------
# 10. Predict from user input
# -------------------------
def predict_from_user():
    print("\nEnter patient details:")

    user_data = {}
    user_data['Glucose'] = get_float_input("Glucose level (mg/dL): ")
    user_data['BloodPressure'] = get_float_input("Blood Pressure (mm Hg): ")
    user_data['SkinThickness'] = get_float_input("Skin Thickness (mm): ")
    user_data['Insulin'] = get_float_input("Insulin level (mu U/ml): ")
    user_data['BMI'] = get_float_input("BMI: ")
    user_data['DiabetesPedigreeFunction'] = get_float_input("Diabetes Pedigree Function: ")
    user_data['Age'] = get_float_input("Age: ")

    user_df = pd.DataFrame([user_data])

    # Impute missing
    user_df[zero_cols] = num_imputer.transform(user_df[zero_cols])

    # Scale
    user_scaled = scaler.transform(user_df)

    # Predict probability
    pred_prob = ensemble_model.predict_proba(user_scaled)[0][1]
    prediction = ensemble_model.predict(user_scaled)[0]

    print("\n--- Prediction ---")
    print(f"Predicted Diabetes Risk Probability: {pred_prob*100:.2f}%")
    print("⚠️ HIGH RISK" if prediction == 1 else "✅ LOW RISK")

# Run prediction
predict_from_user()
