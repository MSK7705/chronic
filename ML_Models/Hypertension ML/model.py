import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# -------------------------
# 1. Load dataset
# -------------------------
df = pd.read_csv("hypertension.csv")  # Replace with your dataset path

# -------------------------
# 2. Handle missing/zero values
# -------------------------
zero_cols = ['Systolic_BP', 'Diastolic_BP', 'Heart_Rate', 'BMI']
for col in zero_cols:
    df[col] = df[col].replace(0, np.nan)

num_imputer = SimpleImputer(strategy='median')
df[zero_cols] = num_imputer.fit_transform(df[zero_cols])

# -------------------------
# 3. Encode categorical column: Gender
# -------------------------
categorical_cols = ['Gender']
label_encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    label_encoders[col] = le

# -------------------------
# 4. Encode target column
# -------------------------
df['Hypertension'] = df['Hypertension'].str.lower().map({'low':0, 'high':1})

# -------------------------
# 5. Features & target
# -------------------------
features = zero_cols + ['Age'] + categorical_cols
target_col = 'Hypertension'

X = df[features].copy()
y = df[target_col].copy()

# -------------------------
# 6. Train/test split
# -------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# -------------------------
# 7. Scale features
# -------------------------
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# -------------------------
# 8. Train XGBoost Classifier
# -------------------------
model = XGBClassifier(
    n_estimators=500,
    max_depth=4,
    learning_rate=0.05,
    use_label_encoder=False,
    eval_metric='logloss',
    random_state=42
)
model.fit(X_train_scaled, y_train)

# -------------------------
# 9. Evaluate model
# -------------------------
y_pred = model.predict(X_test_scaled)
print("✅ Model trained successfully!")
print(f"Test Accuracy: {accuracy_score(y_test, y_pred)*100:.2f}%")
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# -------------------------
# 10. Save model & preprocessing
# -------------------------
joblib.dump(model, "xgb_hypertension_model.pkl")
joblib.dump(scaler, "scaler_hypertension.pkl")
joblib.dump(num_imputer, "num_imputer_hypertension.pkl")
joblib.dump(label_encoders, "encoders_hypertension.pkl")

# -------------------------
# 11. Safe float input
# -------------------------
def get_float_input(prompt):
    while True:
        try:
            value = float(input(prompt))
            return value
        except ValueError:
            print("❌ Invalid input. Please enter a number.")

# -------------------------
# 12. Predict from user input & store for retraining
# -------------------------
FEEDBACK_FILE = "hypertension_feedback.csv"

def predict_from_user():
    print("\nEnter your essential health details:")

    user_data = {}
    user_data['Systolic_BP'] = get_float_input("Systolic Blood Pressure (mmHg): ")
    user_data['Diastolic_BP'] = get_float_input("Diastolic Blood Pressure (mmHg): ")
    user_data['Heart_Rate'] = get_float_input("Heart Rate (bpm): ")
    user_data['BMI'] = get_float_input("BMI: ")
    user_data['Age'] = get_float_input("Age: ")

    gender_input = input("Gender (Male/Female): ").strip().capitalize()
    if gender_input in label_encoders['Gender'].classes_:
        user_data['Gender'] = label_encoders['Gender'].transform([gender_input])[0]
    else:
        print("❌ Invalid Gender, defaulting to Male")
        user_data['Gender'] = 0

    user_df = pd.DataFrame([user_data])

    # Impute missing
    user_df[zero_cols] = num_imputer.transform(user_df[zero_cols])

    # Scale
    user_scaled = scaler.transform(user_df)

    # Predict
    pred_prob = model.predict_proba(user_scaled)[0][1]
    prediction = model.predict(user_scaled)[0]

    print("\n--- Prediction ---")
    print(f"Predicted Hypertension Risk Probability: {pred_prob*100:.2f}%")
    print("⚠️ HIGH RISK" if prediction == 1 else "✅ LOW RISK")

    # -------------------------
    # Save user input for retraining
    # -------------------------
    user_df[target_col] = prediction
    if os.path.exists(FEEDBACK_FILE):
        user_df.to_csv(FEEDBACK_FILE, mode='a', index=False, header=False)
    else:
        user_df.to_csv(FEEDBACK_FILE, index=False)

    # -------------------------
    # Retrain model with historical + new data
    # -------------------------
    full_df = pd.concat([df, pd.read_csv(FEEDBACK_FILE)], ignore_index=True)
    X_full = full_df[features]
    y_full = full_df[target_col]

    X_train_full, X_test_full, y_train_full, y_test_full = train_test_split(
        X_full, y_full, test_size=0.2, random_state=42, stratify=y_full
    )
    X_train_scaled_full = scaler.fit_transform(X_train_full)
    X_test_scaled_full = scaler.transform(X_test_full)
    model.fit(X_train_scaled_full, y_train_full)
    print("✅ Model retrained with all historical user data!")

# Run user prediction
predict_from_user()
