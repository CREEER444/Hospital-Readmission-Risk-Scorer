"""
Hospital Readmission Risk Scorer - Backend API
================================================
A Flask-based API that predicts patient readmission risk using Machine Learning.

This is the brain of the system. It:
1. Loads pre-trained ML models
2. Accepts patient data from the frontend
3. Performs real-time predictions
4. Returns risk scores and recommendations

No complex setup needed - just install requirements and run!
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import pickle
import os
import json
from datetime import datetime
import joblib
import sqlite3

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable cross-origin requests for React frontend

# ============================================================================
# CONFIGURATION
# ============================================================================

MODEL_PATH = 'models/readmission_model.pkl'
SCALER_PATH = 'models/scaler.pkl'
FEATURE_NAMES = [
    'age',
    'length_of_stay',
    'num_medications',
    'num_diagnoses',
    'emergency_visits',
    'comorbidity_score',
    'diabetes',
    'heart_disease',
    'smoking'
]

# Risk thresholds
RISK_THRESHOLDS = {
    'low': (0, 0.4),
    'medium': (0.4, 0.7),
    'high': (0.7, 1.0)
}

DATA_FILE = 'patients_data.json'
DATABASE_FILE = 'hospital.db'

def load_patient_records():
    """Load saved patient records from JSON file."""
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_patient_record(record):
    """Save or update patient record using phone number or patient ID."""
    records = load_patient_records()
    phone = normalize_phone_number(record.get('patient', {}).get('phone', ''))
    patient_id = record.get('patient', {}).get('id', '')

    updated = False
    for i, old in enumerate(records):
        old_phone = normalize_phone_number(old.get('patient', {}).get('phone', ''))
        old_id = old.get('patient', {}).get('id', '')
        if (phone and old_phone == phone) or (patient_id and old_id == patient_id):
            records[i] = record
            updated = True
            break

    if not updated:
        records.insert(0, record)

    records = records[:200]  # keep latest 200 records
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2)

def find_patient_by_phone(phone):
    """Find a patient record by phone number."""
    normalized = normalize_phone_number(phone)
    for record in load_patient_records():
        record_phone = normalize_phone_number(record.get('patient', {}).get('phone', ''))
        if record_phone == normalized:
            return record
    return None

def build_payment_receipt(record):
    """Create demo payment receipt data."""
    patient = record.get('patient', {})
    prediction = record.get('prediction', {})
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return {
        'receipt_no': 'REC-' + datetime.now().strftime('%Y%m%d%H%M%S'),
        'date': now,
        'patient_id': patient.get('id', 'Unknown'),
        'patient_name': patient.get('name', 'Unknown'),
        'phone': patient.get('phone', ''),
        'risk_level': prediction.get('risk_level', ''),
        'risk_percentage': prediction.get('risk_percentage', ''),
        'items': [
            {'name': 'Consultation Fee', 'amount': 500},
            {'name': 'AI Risk Report Fee', 'amount': 100}
        ],
        'total': 600,
        'payment_status': 'Paid'
    }



# ============================================================================
# SQLITE DATABASE FUNCTIONS
# ============================================================================

def init_database():
    """Create SQLite database and required tables automatically."""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT UNIQUE,
            patient_name TEXT,
            patient_phone TEXT,
            age INTEGER,
            length_of_stay INTEGER,
            num_medications INTEGER,
            num_diagnoses INTEGER,
            emergency_visits INTEGER,
            comorbidity_score REAL,
            diabetes INTEGER,
            heart_disease INTEGER,
            smoking INTEGER,
            risk_probability REAL,
            risk_level TEXT,
            risk_percentage REAL,
            ai_explanation TEXT,
            risk_factor_ranking TEXT,
            recommendations TEXT,
            created_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT,
            patient_name TEXT,
            patient_phone TEXT,
            doctor_name TEXT,
            department TEXT,
            appointment_date TEXT,
            slot TEXT,
            status TEXT DEFAULT 'booked',
            created_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bed_reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT,
            patient_name TEXT,
            patient_phone TEXT,
            bed_type TEXT,
            bed_number TEXT,
            status TEXT DEFAULT 'reserved',
            created_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS medicine_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT,
            patient_name TEXT,
            patient_phone TEXT,
            medicine_name TEXT,
            quantity INTEGER,
            price REAL,
            status TEXT DEFAULT 'ordered',
            created_at TEXT
        )
    """)

    conn.commit()
    conn.close()


def save_patient_to_database(response, raw_data):
    """Save or update prediction result in SQLite database."""
    patient = response.get("patient", {})
    prediction = response.get("prediction", {})
    details = response.get("details", {})
    features = details.get("features_used", {})

    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT OR REPLACE INTO patients (
            patient_id,
            patient_name,
            patient_phone,
            age,
            length_of_stay,
            num_medications,
            num_diagnoses,
            emergency_visits,
            comorbidity_score,
            diabetes,
            heart_disease,
            smoking,
            risk_probability,
            risk_level,
            risk_percentage,
            ai_explanation,
            risk_factor_ranking,
            recommendations,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        patient.get("id"),
        patient.get("name"),
        patient.get("phone"),
        int(float(features.get("age", raw_data.get("age", 0)))),
        int(float(features.get("length_of_stay", raw_data.get("length_of_stay", 0)))),
        int(float(features.get("num_medications", raw_data.get("num_medications", 0)))),
        int(float(features.get("num_diagnoses", raw_data.get("num_diagnoses", 0)))),
        int(float(features.get("emergency_visits", raw_data.get("emergency_visits", 0)))),
        float(features.get("comorbidity_score", raw_data.get("comorbidity_score", 0))),
        int(float(features.get("diabetes", raw_data.get("diabetes", 0)))),
        int(float(features.get("heart_disease", raw_data.get("heart_disease", 0)))),
        int(float(features.get("smoking", raw_data.get("smoking", 0)))),
        float(prediction.get("risk_probability", 0)),
        prediction.get("risk_level"),
        float(prediction.get("risk_percentage", 0)),
        json.dumps(response.get("ai_explanation", [])),
        json.dumps(response.get("risk_factor_ranking", [])),
        json.dumps(response.get("recommendations", [])),
        details.get("timestamp", datetime.now().isoformat())
    ))

    conn.commit()
    conn.close()


def database_row_to_patient_record(row):
    """Convert database row into same format frontend already understands."""
    try:
        ai_explanation = json.loads(row["ai_explanation"] or "[]")
    except Exception:
        ai_explanation = []

    try:
        risk_factor_ranking = json.loads(row["risk_factor_ranking"] or "[]")
    except Exception:
        risk_factor_ranking = []

    try:
        recommendations = json.loads(row["recommendations"] or "[]")
    except Exception:
        recommendations = []

    return {
        "patient": {
            "id": row["patient_id"],
            "name": row["patient_name"],
            "phone": row["patient_phone"]
        },
        "prediction": {
            "risk_probability": row["risk_probability"],
            "risk_level": row["risk_level"],
            "risk_percentage": row["risk_percentage"]
        },
        "recommendations": recommendations,
        "ai_explanation": ai_explanation,
        "risk_factor_ranking": risk_factor_ranking,
        "details": {
            "timestamp": row["created_at"],
            "features_used": {
                "age": row["age"],
                "length_of_stay": row["length_of_stay"],
                "num_medications": row["num_medications"],
                "num_diagnoses": row["num_diagnoses"],
                "emergency_visits": row["emergency_visits"],
                "comorbidity_score": row["comorbidity_score"],
                "diabetes": row["diabetes"],
                "heart_disease": row["heart_disease"],
                "smoking": row["smoking"]
            },
            "model_confidence": "Saved in SQLite Database"
        }
    }


def get_patient_from_database_by_phone(phone):
    """Find patient from SQLite database by phone number."""
    normalized = normalize_phone_number(phone)
    if not normalized:
        return None

    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM patients
        WHERE patient_phone = ?
        ORDER BY id DESC
        LIMIT 1
    """, (normalized,))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return database_row_to_patient_record(row)


def get_all_patients_from_database():
    """Return all patient records from SQLite database."""
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM patients
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return [database_row_to_patient_record(row) for row in rows]


# ============================================================================
# MOCK DATA - For demo without actual models
# ============================================================================
# In production, you'd load real trained models from disk

def create_mock_model():
    """
    Create a simple mock predictor for demo purposes.
    In production, this would load a real trained XGBoost/RandomForest model.
    """
    class MockPredictor:
        def predict_proba(self, X):
            # Simple formula: older age + longer stay + more meds = higher risk
            risk_scores = []
            for row in X:
                age, los, meds, diags, emerg, comorbid = row[:6]
                diabetes = row[6] if len(row) > 6 else 0
                heart_disease = row[7] if len(row) > 7 else 0
                smoking = row[8] if len(row) > 8 else 0

                # Simplified disease-aware risk calculation for demo
                risk = (
                    (age / 100 * 0.16) +
                    (min(los, 30) / 30 * 0.22) +
                    (min(meds, 15) / 15 * 0.16) +
                    (min(emerg, 5) / 5 * 0.12) +
                    (comorbid / 10 * 0.20) +
                    (diabetes * 0.05) +
                    (heart_disease * 0.06) +
                    (smoking * 0.03)
                )
                risk = min(max(risk, 0), 1)  # Clamp between 0 and 1
                risk_scores.append([1 - risk, risk])
            return np.array(risk_scores)
    
    return MockPredictor()

# Load or create model
try:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
except FileNotFoundError:
    print("⚠️  Models not found. Using mock predictor for demo.")
    model = create_mock_model()
    scaler = None

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_risk_category(probability):
    """Determine risk level based on probability."""
    if probability < RISK_THRESHOLDS['low'][1]:
        return 'LOW'
    elif probability < RISK_THRESHOLDS['medium'][1]:
        return 'MEDIUM'
    else:
        return 'HIGH'

def get_recommendations(risk_level, patient_data):
    """Generate clinical recommendations based on risk level."""
    recommendations = {
        'LOW': [
            '✓ Standard discharge protocols',
            '✓ Routine follow-up in 2 weeks',
            '✓ Standard medication management'
        ],
        'MEDIUM': [
            '⚠ Enhanced discharge planning',
            '⚠ Follow-up within 5-7 days',
            '⚠ Consider home health services',
            '⚠ Review medication compliance'
        ],
        'HIGH': [
            '🚨 Intensive discharge planning required',
            '🚨 Follow-up within 24-48 hours',
            '🚨 Arrange home health monitoring',
            '🚨 Consider extended observation',
            '🚨 Schedule specialist follow-up',
            '🚨 Review all medications and comorbidities'
        ]
    }
    return recommendations.get(risk_level, [])




def explain_risk(patient_data):
    """Explain why the patient may have readmission risk."""
    factors = []

    if float(patient_data.get("age", 0)) >= 60:
        factors.append("Older age increases readmission risk")

    if float(patient_data.get("length_of_stay", 0)) >= 7:
        factors.append("Long hospital stay indicates serious condition")

    if float(patient_data.get("num_medications", 0)) >= 8:
        factors.append("Many medications may increase complication risk")

    if float(patient_data.get("emergency_visits", 0)) >= 2:
        factors.append("Frequent emergency visits show unstable health")

    if float(patient_data.get("comorbidity_score", 0)) >= 5:
        factors.append("High comorbidity score shows multiple health issues")

    if int(float(patient_data.get("diabetes", 0))) == 1:
        factors.append("Diabetes may delay recovery and increase readmission risk")

    if int(float(patient_data.get("heart_disease", 0))) == 1:
        factors.append("Heart disease increases complication risk")

    if int(float(patient_data.get("smoking", 0))) == 1:
        factors.append("Smoking history can affect lung function and recovery")

    if not factors:
        factors.append("Patient has fewer major risk factors")

    return factors


def rank_risk_factors(patient_data):
    """Rank patient risk factors based on simple clinical weights."""
    scores = {
        "Comorbidity Score": float(patient_data.get("comorbidity_score", 0)) / 10,
        "Length of Stay": float(patient_data.get("length_of_stay", 0)) / 30,
        "Emergency Visits": float(patient_data.get("emergency_visits", 0)) / 5,
        "Medications": float(patient_data.get("num_medications", 0)) / 15,
        "Age": float(patient_data.get("age", 0)) / 100,
        "Diagnoses": float(patient_data.get("num_diagnoses", 0)) / 10,
        "Diabetes": int(float(patient_data.get("diabetes", 0))) * 0.75,
        "Heart Disease": int(float(patient_data.get("heart_disease", 0))) * 0.85,
        "Smoking History": int(float(patient_data.get("smoking", 0))) * 0.65
    }

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    return [
        {
            "factor": factor,
            "impact_score": round(score, 2)
        }
        for factor, score in ranked
    ]


def normalize_phone_number(phone):
    """Basic phone validation for demo SMS sending."""
    if not phone:
        return None
    cleaned = str(phone).replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    if cleaned.startswith('+'):
        digits = cleaned[1:]
    else:
        digits = cleaned
    if not digits.isdigit() or len(digits) < 10 or len(digits) > 15:
        return None
    return cleaned

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health():
    """
    Health check endpoint.
    Use this to verify the API is running.
    """
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'service': 'Hospital Readmission Risk Scorer API'
    }), 200

@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Main prediction endpoint.
    
    Expected JSON input:
    {
        "age": 65,
        "length_of_stay": 5,
        "num_medications": 8,
        "num_diagnoses": 3,
        "emergency_visits": 2,
        "comorbidity_score": 5,
        "patient_id": "P12345",
        "patient_name": "John Doe"
    }
    
    Returns:
    {
        "risk_probability": 0.82,
        "risk_level": "HIGH",
        "recommendations": [...],
        "details": {...}
    }
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract patient info (for display)
        patient_id = data.get('patient_id', 'Unknown')
        patient_name = data.get('patient_name', 'Unknown')
        patient_phone = normalize_phone_number(data.get('patient_phone') or data.get('phone') or '')
        
        # Extract features in correct order
        features = []
        for feature in FEATURE_NAMES:
            value = data.get(feature)
            if value is None:
                return jsonify({
                    'error': f'Missing required field: {feature}',
                    'required_fields': FEATURE_NAMES
                }), 400
            features.append(float(value))
        
        # Prepare data for model
        features_array = np.array([features])
        
        # Scale features if scaler available
        if scaler:
            features_scaled = scaler.transform(features_array)
        else:
            features_scaled = features_array
        
        # Get prediction from model
        prediction_probs = model.predict_proba(features_scaled)
        risk_probability = float(prediction_probs[0][1])  # Probability of readmission
        
        # Determine risk level
        risk_level = get_risk_category(risk_probability)
        
        # Generate recommendations
        recommendations = get_recommendations(risk_level, data)
        
        # Build response
        response = {
            'patient': {
                'id': patient_id,
                'name': patient_name,
                'phone': patient_phone
            },
            'prediction': {
                'risk_probability': round(risk_probability, 3),
                'risk_level': risk_level,
                'risk_percentage': round(risk_probability * 100, 1)
            },
            'recommendations': recommendations,
            'ai_explanation': explain_risk(data),
            'risk_factor_ranking': rank_risk_factors(data),
            'details': {
                'timestamp': datetime.now().isoformat(),
                'features_used': dict(zip(FEATURE_NAMES, features)),
                'model_confidence': 'High' if 0.3 < risk_probability < 0.7 else 'Very High'
            }
        }
        
        save_patient_record(response)
        save_patient_to_database(response, data)
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'An error occurred during prediction'
        }), 500

@app.route('/api/batch-predict', methods=['POST'])
def batch_predict():
    """
    Process multiple patients at once.
    
    Expected JSON input:
    {
        "patients": [
            {"patient_id": "P1", "age": 65, ...},
            {"patient_id": "P2", "age": 72, ...}
        ]
    }
    """
    try:
        data = request.get_json()
        patients = data.get('patients', [])
        
        if not patients:
            return jsonify({'error': 'No patients provided'}), 400
        
        results = []
        for patient in patients:
            # Simulate API call for each patient
            response = predict_patient(patient)
            results.append(response)
        
        return jsonify({
            'total_patients': len(results),
            'predictions': results,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/send-sms-report', methods=['POST'])
def send_sms_report():
    """
    Send patient risk report by SMS.

    Demo mode works without any SMS account and returns success.
    Real SMS mode works if Twilio credentials are added as environment variables:
    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        phone = normalize_phone_number(data.get('phone'))
        message = data.get('message', '').strip()

        if not phone:
            return jsonify({'error': 'Invalid phone number. Use format like +919876543210'}), 400
        if not message:
            return jsonify({'error': 'SMS message cannot be empty'}), 400
        if len(message) > 1000:
            return jsonify({'error': 'SMS message is too long. Keep it under 1000 characters'}), 400

        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        twilio_number = os.getenv('TWILIO_PHONE_NUMBER')

        if account_sid and auth_token and twilio_number:
            try:
                from twilio.rest import Client
                client = Client(account_sid, auth_token)
                sms = client.messages.create(
                    body=message,
                    from_=twilio_number,
                    to=phone
                )
                return jsonify({
                    'status': 'sent',
                    'mode': 'twilio',
                    'message': 'SMS report sent successfully',
                    'sms_id': sms.sid,
                    'phone': phone,
                    'timestamp': datetime.now().isoformat()
                }), 200
            except ImportError:
                return jsonify({
                    'error': 'Twilio credentials found, but twilio package is not installed. Run: pip install twilio'
                }), 500

        # Demo mode for hackathon presentation when no SMS gateway is configured
        print('\n📱 DEMO SMS REPORT')
        print('To:', phone)
        print('Message:')
        print(message)
        print('=' * 50)

        return jsonify({
            'status': 'demo_sent',
            'mode': 'demo',
            'message': 'Demo SMS report generated successfully. Check backend terminal output.',
            'phone': phone,
            'preview': message,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'An error occurred while sending SMS report'
        }), 500

@app.route('/api/feature-info', methods=['GET'])
def feature_info():
    """
    Returns information about expected input features.
    Useful for frontend to understand what data is needed.
    """
    features_info = {
        'age': {
            'type': 'integer',
            'range': '18-120',
            'description': 'Patient age in years',
            'example': 65
        },
        'length_of_stay': {
            'type': 'integer',
            'range': '1-365',
            'description': 'Days spent in hospital',
            'example': 5
        },
        'num_medications': {
            'type': 'integer',
            'range': '0-50',
            'description': 'Number of medications prescribed',
            'example': 8
        },
        'num_diagnoses': {
            'type': 'integer',
            'range': '1-20',
            'description': 'Number of diagnosed conditions',
            'example': 3
        },
        'emergency_visits': {
            'type': 'integer',
            'range': '0-50',
            'description': 'Recent emergency visits in past year',
            'example': 2
        },
        'comorbidity_score': {
            'type': 'float',
            'range': '0-10',
            'description': 'Weighted score of comorbidities (0=none, 10=severe)',
            'example': 5
        },
        'diabetes': {
            'type': 'integer',
            'range': '0-1',
            'description': 'Whether patient has diabetes (0=No, 1=Yes)',
            'example': 1
        },
        'heart_disease': {
            'type': 'integer',
            'range': '0-1',
            'description': 'Whether patient has heart disease (0=No, 1=Yes)',
            'example': 1
        },
        'smoking': {
            'type': 'integer',
            'range': '0-1',
            'description': 'Smoking history (0=No, 1=Yes)',
            'example': 0
        }
    }
    
    return jsonify({
        'required_features': FEATURE_NAMES,
        'feature_details': features_info,
        'risk_thresholds': {
            'low': f"{RISK_THRESHOLDS['low'][0]}-{RISK_THRESHOLDS['low'][1]}",
            'medium': f"{RISK_THRESHOLDS['medium'][0]}-{RISK_THRESHOLDS['medium'][1]}",
            'high': f"{RISK_THRESHOLDS['high'][0]}-{RISK_THRESHOLDS['high'][1]}"
        }
    }), 200

def predict_patient(patient_data):
    """Helper function to predict a single patient."""
    features = [patient_data.get(feature, 0) for feature in FEATURE_NAMES]
    features_array = np.array([features])
    
    if scaler:
        features_scaled = scaler.transform(features_array)
    else:
        features_scaled = features_array
    
    prediction_probs = model.predict_proba(features_scaled)
    risk_probability = float(prediction_probs[0][1])
    risk_level = get_risk_category(risk_probability)
    
    return {
        'patient_id': patient_data.get('patient_id', 'Unknown'),
        'risk_probability': round(risk_probability, 3),
        'risk_level': risk_level,
        'risk_percentage': round(risk_probability * 100, 1),
        'ai_explanation': explain_risk(patient_data),
        'risk_factor_ranking': rank_risk_factors(patient_data)
    }



@app.route('/api/patient-by-phone', methods=['POST'])
def patient_by_phone():
    """Lookup saved patient report by phone number."""
    try:
        data = request.get_json()
        phone = normalize_phone_number(data.get('phone', '') if data else '')
        if not phone:
            return jsonify({'error': 'Enter a valid phone number, example +919876543210'}), 400

        record = get_patient_from_database_by_phone(phone)

        if not record:
            record = find_patient_by_phone(phone)

        if not record:
            return jsonify({'error': 'No patient found for this phone number'}), 404

        return jsonify({
            'patient_record': record,
            'payment_receipt': build_payment_receipt(record)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/all-patients', methods=['GET'])
def all_patients():
    """Return saved patient records from SQLite database and JSON fallback."""
    db_patients = get_all_patients_from_database()
    json_patients = load_patient_records()

    combined = db_patients if db_patients else json_patients

    return jsonify({
        'patients': combined,
        'source': 'sqlite' if db_patients else 'json',
        'count': len(combined)
    }), 200

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    init_database()
    print('✓ SQLite database ready: hospital.db')
    print("🏥 Hospital Readmission Risk Scorer - Backend API")
    print("=" * 50)
    print("✓ Starting Flask server...")
    print("✓ API running on http://localhost:5000")
    print("✓ Frontend connect to: http://localhost:3000")
    print("\nAPI Endpoints:")
    print("  GET  /api/health           - Health check")
    print("  POST /api/predict          - Single patient prediction")
    print("  POST /api/batch-predict    - Multiple patients")
    print("  POST /api/send-sms-report  - Send SMS report")
    print("  POST /api/patient-by-phone - Lookup patient by phone")
    print("  GET  /api/all-patients     - Saved patient records")
    print("  GET  /api/feature-info     - Feature documentation")
    print("=" * 50)
    
    app.run(debug=True, port=5000, host='0.0.0.0')
