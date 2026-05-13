# 🏥 Hospital Readmission Risk Scorer - Installation Guide

> **Easy to understand. Easy to run. Easy to deploy.**

---

## 📋 What You're Getting

This is a **complete hospital readmission risk prediction system** with:
- 🧠 **Smart AI Backend** - Predicts which patients are likely to be readmitted
- 🎨 **Beautiful Dashboard** - User-friendly interface for doctors
- 📊 **Real-time Predictions** - Instant risk scores for patient data
- 📈 **Patient History** - Track all past predictions
- 📖 **Built-in Guide** - Help right inside the app

---

## ⚡ Quick Start (5 minutes)

### Step 1: Install Python & Node.js

**For Windows:**
1. Download Python from https://www.python.org/downloads/
2. Download Node.js from https://nodejs.org/
3. Run both installers, check "Add to PATH" during installation

**For Mac:**
```bash
# Install using Homebrew
brew install python node
```

**For Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install python3 nodejs npm
```

### Step 2: Setup Backend (API Server)

```bash
# Navigate to the project folder
cd hospital-readmission-scorer

# Create a virtual environment (keeps things clean)
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install required packages
pip install flask flask-cors numpy pandas scikit-learn joblib

# Run the backend server
python app.py
```

You should see:
```
🏥 Hospital Readmission Risk Scorer - Backend API
==================================================
✓ Starting Flask server...
✓ API running on http://localhost:5000
```

**Keep this terminal open!**

### Step 3: Setup Frontend (Dashboard)

Open a **new terminal** and run:

```bash
# Navigate to the project folder
cd hospital-readmission-scorer

# Install React dependencies
npm install

# Start the dashboard
npm start
```

The app should automatically open in your browser at `http://localhost:3000`

---

## 🎯 Using the System

### Predicting Patient Risk

1. **Enter Patient Information**
   - Patient ID (e.g., P12345)
   - Patient Name

2. **Enter Clinical Data**
   - **Age**: Patient's age in years
   - **Length of Stay**: How many days in hospital
   - **Number of Medications**: Total medications prescribed
   - **Number of Diagnoses**: Coded diagnosis conditions
   - **Emergency Visits**: ER visits in past 12 months
   - **Comorbidity Score**: 0 (no conditions) to 10 (severe)

3. **Click "Predict Risk"**
   - The AI analyzes the data
   - Returns a risk percentage
   - Shows clinical recommendations

### Understanding Results

| Risk Level | Percentage | What It Means | Action |
|-----------|-----------|---------------|--------|
| **✓ LOW** | 0-40% | Very unlikely to be readmitted | Standard discharge |
| **⚠ MEDIUM** | 40-70% | Possible readmission risk | Enhanced monitoring |
| **🚨 HIGH** | 70-100% | High readmission risk | Intensive planning |

---

## 📁 Project Structure

```
hospital-readmission-scorer/
│
├── app.py                          # Backend API server
├── Dashboard.jsx                   # Frontend React component
├── Dashboard.css                   # Dashboard styling
├── requirements.txt                # Python dependencies
├── package.json                    # Node.js dependencies
│
├── public/
│   └── index.html                  # Main HTML file
│
├── src/
│   ├── index.js                    # React entry point
│   └── App.js                      # Main app component
│
└── models/                         # (Optional) Trained ML models
    ├── readmission_model.pkl       # Trained XGBoost model
    └── scaler.pkl                  # Data scaler
```

---

## 🔧 Troubleshooting

### "Port 5000 already in use"
The backend server is already running. Either:
- Close the other process
- Change port in `app.py`: Replace `port=5000` with `port=5001`

### "Cannot connect to API"
Make sure:
1. Backend is running (see terminal output)
2. API is accessible at `http://localhost:5000/api/health`
3. Frontend is trying to connect to correct port

### "npm not found"
Node.js wasn't installed properly. Try:
```bash
node --version
npm --version
```

If these don't work, reinstall Node.js from nodejs.org

### "ModuleNotFoundError: No module named 'flask'"
Python packages not installed. Run:
```bash
pip install flask flask-cors numpy pandas scikit-learn joblib
```

---

## 📚 API Endpoints (For Developers)

If you want to integrate with other systems:

### Health Check
```bash
GET /api/health
```

### Single Prediction
```bash
POST /api/predict
Content-Type: application/json

{
    "patient_id": "P12345",
    "patient_name": "John Doe",
    "age": 65,
    "length_of_stay": 5,
    "num_medications": 8,
    "num_diagnoses": 3,
    "emergency_visits": 2,
    "comorbidity_score": 5.0
}
```

Response:
```json
{
    "patient": {
        "id": "P12345",
        "name": "John Doe"
    },
    "prediction": {
        "risk_probability": 0.82,
        "risk_level": "HIGH",
        "risk_percentage": 82.0
    },
    "recommendations": [
        "🚨 Intensive discharge planning required",
        "🚨 Follow-up within 24-48 hours",
        ...
    ]
}
```

### Batch Predictions
```bash
POST /api/batch-predict

{
    "patients": [
        {"patient_id": "P1", "age": 65, ...},
        {"patient_id": "P2", "age": 72", ...}
    ]
}
```

### Feature Information
```bash
GET /api/feature-info
```

Returns information about all input features.

---

## 🚀 Deployment

### Deploy Backend to Render.com

1. Push code to GitHub
2. Sign up at render.com
3. Create new "Web Service"
4. Connect your GitHub repo
5. Set environment: Python
6. Set build command: `pip install -r requirements.txt`
7. Set start command: `gunicorn app:app`

### Deploy Frontend to Netlify

1. Build the React app:
   ```bash
   npm run build
   ```

2. Drag the `build/` folder to Netlify.com
3. Or connect your GitHub repo to Netlify for automatic deploys

### Environment Variables

Create a `.env` file in the frontend folder:
```
REACT_APP_API_URL=https://your-backend-url.onrender.com
```

---

## 🎓 Understanding the Code

### Backend (`app.py`)

The backend is simple Python:

```python
@app.route('/api/predict', methods=['POST'])
def predict():
    # 1. Get patient data from request
    data = request.get_json()
    
    # 2. Prepare features for the ML model
    features = [data['age'], data['length_of_stay'], ...]
    
    # 3. Run prediction
    risk_probability = model.predict_proba(features)
    
    # 4. Return risk level and recommendations
    return jsonify({
        'risk_probability': risk_probability,
        'risk_level': 'HIGH',
        'recommendations': [...]
    })
```

### Frontend (`Dashboard.jsx`)

The frontend is React:

```javascript
// 1. User enters patient data in form
const [formData, setFormData] = useState({...})

// 2. Submit form
const handlePredict = async (e) => {
    const response = await fetch('/api/predict', {
        method: 'POST',
        body: JSON.stringify(formData)
    })
    
    // 3. Display results
    const data = await response.json()
    setPrediction(data)
}

// 4. Render risk level and recommendations
return <div className="risk-badge">{prediction.risk_level}</div>
```

---

## 📊 Customizing the Model

The current system uses a **mock predictor** for demo purposes.

To use a real trained model:

1. **Train your own model** using scikit-learn or XGBoost:
   ```python
   import joblib
   from xgboost import XGBClassifier
   
   model = XGBClassifier()
   model.fit(X_train, y_train)
   joblib.dump(model, 'models/readmission_model.pkl')
   ```

2. **Place in `models/` folder**
   ```
   models/
   ├── readmission_model.pkl
   └── scaler.pkl
   ```

3. The app will automatically use your trained model!

---

## 🔐 Security Notes

- This is a **demo system**. For production:
  - Add user authentication (login system)
  - Encrypt patient data
  - Use HTTPS/SSL
  - Comply with HIPAA/GDPR
  - Add database for data persistence
  - Implement audit logging

---

## 📞 Support

If you have issues:

1. **Check logs** - Look at terminal output
2. **Try examples** - See example patient data below
3. **Read error messages** - They usually tell you what's wrong
4. **Check network** - Make sure ports aren't blocked

### Example Patient Data

**Low Risk Patient:**
```json
{
    "patient_id": "P001",
    "patient_name": "Alice Johnson",
    "age": 45,
    "length_of_stay": 2,
    "num_medications": 2,
    "num_diagnoses": 1,
    "emergency_visits": 0,
    "comorbidity_score": 1.0
}
```

**High Risk Patient:**
```json
{
    "patient_id": "P002",
    "patient_name": "Bob Smith",
    "age": 78,
    "length_of_stay": 10,
    "num_medications": 12,
    "num_diagnoses": 5,
    "emergency_visits": 3,
    "comorbidity_score": 8.5
}
```

---

## 📄 License

This project is provided as-is for educational and clinical use. 

---

**Happy predicting! 🏥**
