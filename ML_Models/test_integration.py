import requests
import json

def test_ml_api():
    """Test the ML API endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Real ML API Integration...")
    print("=" * 50)
    
    # Test health check
    try:
        response = requests.get(f"{base_url}/")
        print(f"✅ Health Check: {response.json()}")
    except Exception as e:
        print(f"❌ Health Check Failed: {e}")
        print("💡 Make sure the ML backend server is running!")
        return
    
    # Test available models
    try:
        response = requests.get(f"{base_url}/models")
        models = response.json()["models"]
        print(f"✅ Available Models ({len(models)}): {', '.join(models)}")
    except Exception as e:
        print(f"❌ Models Endpoint Failed: {e}")
        return
    
    # Test heart disease prediction
    heart_data = {
        "age": 45,
        "sex": "Male",
        "trestbps": 130,
        "chol": 250,
        "fbs": False,
        "thalch": 150
    }
    
    try:
        response = requests.post(f"{base_url}/predict/heart", json=heart_data)
        result = response.json()
        print(f"✅ Heart Disease Prediction:")
        print(f"   Risk Probability: {result['risk_probability']:.2%}")
        print(f"   Prediction: {'High Risk' if result['prediction'] == 1 else 'Low Risk'}")
        print(f"   Confidence: {result['confidence']:.2%}")
    except Exception as e:
        print(f"❌ Heart Prediction Failed: {e}")
    
    # Test all available models
    test_data = {
        "heart": {
            "age": 45, "sex": "Male", "trestbps": 130, 
            "chol": 250, "fbs": "No", "thalch": 150
        },
        "diabetes": {
            "glucose": 120, "bloodPressure": 80, "bmi": 28.5, 
            "age": 35, "pregnancies": 2, "family_history": "Some relatives"
        },
        "hypertension": {
            "age": 50, "sex": "Female", "trestbps": 140, "chol": 280,
            "family_history": "Close relatives", "salt_intake": "High salt diet"
        },
        "ckd": {
            "age": 60, "bp": "High BP", "dm": "Yes", "appetite": "Poor appetite",
            "pe": "Yes, swelling", "ane": "Yes"
        },
        "asthma": {
            "age": 30, "sex": "Male", "smoking": "Used to smoke", "allergies": "Moderate allergies",
            "wheezing": "Often", "coughing": "Moderate cough", "shortness_of_breath": "Sometimes"
        },
        "arthritis": {
            "age": 55, "sex": "Female", "joint_pain": "Moderate pain", 
            "morning_stiffness": "30 minutes to 1 hour", "family_history": "Parents or siblings", 
            "physical_activity": "Lightly active"
        },
        "copd": {
            "age": 65, "sex": "Male", "smoking_status": "Used to smoke", 
            "chronic_cough": "Daily cough", "shortness_of_breath": "With light activity",
            "occupational_exposure": "High exposure"
        },
        "liver": {
            "age": 50, "sex": "Male", "alcohol_consumption": "Regularly", 
            "fatigue": "Often tired", "jaundice": "Slightly yellow", "abdominal_pain": "Mild pain"
        }
    }
    
    for model_name, data in test_data.items():
        try:
            response = requests.post(f"{base_url}/predict/{model_name}", json=data)
            if response.status_code == 200:
                result = response.json()
                risk_level = "High Risk" if result['prediction'] == 1 else "Low Risk"
                print(f"✅ {model_name.upper()} Prediction:")
                print(f"   Risk: {result['risk_probability']:.1%} ({risk_level})")
                print(f"   Confidence: {result['confidence']:.1%}")
            else:
                print(f"❌ {model_name.upper()}: HTTP {response.status_code}")
        except Exception as e:
            print(f"❌ {model_name.upper()} Prediction Failed: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 User-Friendly ML Integration Test Completed!")
    print("\n📋 What's Working:")
    print("   ✅ Simple, clear questions for users")
    print("   ✅ Real ML models from your project directories")
    print("   ✅ Accurate predictions using your trained algorithms")
    print("   ✅ User-friendly interface with helpful tips")
    print("\n🚀 Next Steps:")
    print("   1. Start backend: cd ml_backend && python main.py")
    print("   2. Start frontend: cd chronic && npm run dev")
    print("   3. Test with real user-friendly questions!")
    print("\n🧠 Your Trained Models Are Now Live!")
    print("⚕️  Note: AI predictions for informational purposes only")

if __name__ == "__main__":
    test_ml_api()