import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
from collections import Counter

# -------------------------
# 1. Load dataset
# -------------------------
df = pd.read_csv("heart.csv")

# -------------------------
# 2. Use key features only
# -------------------------
features = ['age', 'sex', 'trestbps', 'chol', 'fbs', 'thalch']
target_col = df.columns[-1]

X = df[features].copy()
y = df[target_col].copy()

# -------------------------
# 3. Convert target to binary
# -------------------------
y = y.apply(lambda x: 1 if x > 0 else 0)  # 0 = no disease, 1 = disease

# -------------------------
# 4. Handle missing values
# -------------------------
categorical_cols = ['sex', 'fbs']
numerical_cols = [col for col in features if col not in categorical_cols]

num_imputer = SimpleImputer(strategy='median')
X[numerical_cols] = num_imputer.fit_transform(X[numerical_cols])

cat_imputer = SimpleImputer(strategy='most_frequent')
X[categorical_cols] = cat_imputer.fit_transform(X[categorical_cols])

# Encode categorical columns
label_encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    X[col] = le.fit_transform(X[col])
    label_encoders[col] = le

# -------------------------
# 5. Train/test split
# -------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# -------------------------
# 6. Scale features
# -------------------------
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# -------------------------
# 7. Handle class imbalance
# -------------------------
counter = Counter(y_train)
scale_pos_weight = counter[0] / counter[1]  # ratio of majority/minority

# -------------------------
# 8. Train XGBoost Classifier
# -------------------------
model = XGBClassifier(
    n_estimators=500,
    max_depth=4,
    learning_rate=0.1,
    use_label_encoder=False,
    eval_metric='logloss',
    random_state=42,
    scale_pos_weight=scale_pos_weight
)
model.fit(X_train_scaled, y_train)

# -------------------------
# 9. Evaluate Model
# -------------------------
y_pred = model.predict(X_test_scaled)
y_prob = model.predict_proba(X_test_scaled)[:, 1]

print("✅ Model trained successfully!")
print("Test Accuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# -------------------------
# 10. Save Model & Preprocessing Objects
# -------------------------
joblib.dump(model, "xgb_heart_model.pkl")
joblib.dump(scaler, "scaler.pkl")
joblib.dump(label_encoders, "encoders.pkl")
joblib.dump(num_imputer, "num_imputer.pkl")
joblib.dump(cat_imputer, "cat_imputer.pkl")

# -------------------------
# 11. Predict from user input
# -------------------------
def predict_from_user():
    print("\nEnter patient details:")

    user_data = {}
    user_data['age'] = float(input("Age: "))

    sex_input = input("Sex (Male/Female): ").strip().lower()
    user_data['sex'] = 'Male' if sex_input in ['male', 'm'] else 'Female'

    user_data['trestbps'] = float(input("Resting Blood Pressure: "))
    user_data['chol'] = float(input("Cholesterol: "))

    fbs_input = input("Fasting Blood Sugar >120mg/dl? (Yes/No): ").strip().lower()
    user_data['fbs'] = True if fbs_input in ['yes', 'true', '1'] else False

    user_data['thalch'] = float(input("Maximum Heart Rate Achieved: "))

    user_df = pd.DataFrame([user_data])

    # Impute missing
    user_df[numerical_cols] = num_imputer.transform(user_df[numerical_cols])
    user_df[categorical_cols] = cat_imputer.transform(user_df[categorical_cols])

    # Encode categorical
    for col in categorical_cols:
        user_df[col] = label_encoders[col].transform(user_df[col])

    # Scale
    user_scaled = scaler.transform(user_df)

    # Predict probability
    pred_prob = model.predict_proba(user_scaled)[0][1]  # probability of heart disease
    prediction = model.predict(user_scaled)[0]

    print("\n--- Prediction Result ---")
    print(f"Predicted Risk Probability: {pred_prob*100:.2f}%")
    if prediction == 1:
        print("⚠️ HIGH RISK of Heart Disease")
    else:
        print("✅ LOW RISK (No Heart Disease)")

# Run prediction
predict_from_user()
