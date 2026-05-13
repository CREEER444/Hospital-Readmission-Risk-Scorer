import pandas as pd
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

df = pd.read_csv("hospital_data.csv")

FEATURES = [
    "age",
    "length_of_stay",
    "num_medications",
    "num_diagnoses",
    "emergency_visits",
    "comorbidity_score",
    "diabetes",
    "heart_disease",
    "smoking"
]

X = df[FEATURES]
y = df["readmitted"]

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = RandomForestClassifier(n_estimators=150, random_state=42)
model.fit(X_scaled, y)

os.makedirs("models", exist_ok=True)
joblib.dump(model, "models/readmission_model.pkl")
joblib.dump(scaler, "models/scaler.pkl")
joblib.dump(FEATURES, "models/feature_names.pkl")

print("Disease-aware AI model trained and saved successfully!")
print("Model used:", type(model))
print("Features used:", FEATURES)
