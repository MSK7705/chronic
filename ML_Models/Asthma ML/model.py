import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib, os
from collections import Counter

# -------------------------
# 1. Load dataset
# -------------------------
df = pd.read_csv("asthma_disease_data.csv")  # Your dataset file

# -------------------------
# 2. Select fewer user-friendly features
# -------------------------
selected_features = [
    "Age", "Gender", "BMI", "Smoking",
    "Wheezing", "ShortnessOfBreath", "Coughing", "ExerciseInduced"
]

target_col = "Diagnosis"

df = df[selected_features + [target_col]].copy()

# -------------------------
# 3. Handle missing values
# -------------------------
df.replace("?", np.nan, inplace=True)

# Separate numeric and categorical
numeric_cols = ["Age", "BMI"]
categorical_cols = ["Gender", "Smoking", "Wheezing", "ShortnessOfBreath", "Coughing", "ExerciseInduced"]

# Convert numeric
for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

num_imputer = SimpleImputer(strategy="median")
df[numeric_cols] = num_imputer.fit_transform(df[numeric_cols])

# Encode categoricals
label_encoders = {}
for col in categorical_cols + [target_col]:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    label_encoders[col] = le

# -------------------------
# 4. Split data
# -------------------------
X = df[selected_features]
y = df[target_col]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Scale
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Handle imbalance
counter = Counter(y_train)
scale_pos_weight = counter[0] / max(counter[1], 1)

# -------------------------
# 5. Train XGBoost
# -------------------------
model = XGBClassifier(
    n_estimators=400,
    max_depth=4,
    learning_rate=0.05,
    eval_metric="logloss",
    random_state=42,
    scale_pos_weight=scale_pos_weight,
    use_label_encoder=False
)
model.fit(X_train_scaled, y_train)

# -------------------------
# 6. Evaluate
# -------------------------
y_pred = model.predict(X_test_scaled)
print("✅ Asthma Model trained successfully!")
print(f"Test Accuracy: {accuracy_score(y_test, y_pred)*100:.2f}%")
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# Save
joblib.dump(model, "xgb_asthma_model.pkl")
joblib.dump(scaler, "scaler_asthma.pkl")
joblib.dump(num_imputer, "num_imputer_asthma.pkl")
joblib.dump(label_encoders, "encoders_asthma.pkl")

# -------------------------
# 7. User input function
# -------------------------
def get_input(prompt, valid_options=None):
    while True:
        val = input(prompt).strip()
        if valid_options:
            if val in valid_options:
                return val
            else:
                print(f"❌ Please enter one of {valid_options}")
        else:
            try:
                return float(val)
            except ValueError:
                print("❌ Enter a valid number.")

def predict_from_user():
    print("\n👋 Welcome! Let's check your asthma risk.")

    user_data = {}
    user_data["Age"] = get_input("Enter your Age: ")
    user_data["BMI"] = get_input("Enter your BMI: ")

    user_data["Gender"] = get_input("Gender (Male/Female): ", ["Male","Female"])
    user_data["Smoking"] = get_input("Do you smoke? (Yes/No): ", ["Yes","No"])
    user_data["Wheezing"] = get_input("Do you experience wheezing? (Yes/No): ", ["Yes","No"])
    user_data["ShortnessOfBreath"] = get_input("Do you have shortness of breath? (Yes/No): ", ["Yes","No"])
    user_data["Coughing"] = get_input("Do you often cough? (Yes/No): ", ["Yes","No"])
    user_data["ExerciseInduced"] = get_input("Asthma symptoms during exercise? (Yes/No): ", ["Yes","No"])

    user_df = pd.DataFrame([user_data])

    # Encode categorical
    for col in categorical_cols:
        le = label_encoders[col]
        user_df[col] = le.transform([user_df[col][0]]) if user_df[col][0] in le.classes_ else [0]

    # Impute + scale
    user_df[numeric_cols] = num_imputer.transform(user_df[numeric_cols])
    user_scaled = scaler.transform(user_df[selected_features])

    pred_prob = model.predict_proba(user_scaled)[0][1]
    prediction = model.predict(user_scaled)[0]

    print("\n--- Prediction ---")
    print(f"Asthma Risk Probability: {pred_prob*100:.2f}%")
    print("⚠️ HIGH RISK" if prediction == 1 else "✅ LOW RISK")

    # -------------------------
    # Retrain with feedback
    # -------------------------
    user_df[target_col] = prediction
    if os.path.exists("asthma_feedback.csv"):
        user_df.to_csv("asthma_feedback.csv", mode="a", index=False, header=False)
    else:
        user_df.to_csv("asthma_feedback.csv", index=False)

    feedback_df = pd.read_csv("asthma_feedback.csv")
    combined_df = pd.concat([df, feedback_df], ignore_index=True)

    X_comb = combined_df[selected_features]
    y_comb = combined_df[target_col]
    X_comb_scaled = scaler.fit_transform(X_comb)

    counter_comb = Counter(y_comb)
    scale_pos_weight_comb = counter_comb[0]/max(counter_comb[1],1)

    model.fit(X_comb_scaled, y_comb, sample_weight=None)
    joblib.dump(model, "xgb_asthma_model.pkl")
    print("🔄 Model retrained with your data!")

# Run
predict_from_user()
