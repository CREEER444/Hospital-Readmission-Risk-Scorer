# ⚡ Quick Reference Guide

**Everything you need to know in 2 minutes**

---

## 🚀 Start the System

### Terminal 1: Backend
```bash
cd hospital-readmission-scorer
python -m venv venv
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate     # Windows

pip install -r requirements.txt
python app.py
```

**Expected output:**
```
🏥 Hospital Readmission Risk Scorer - Backend API
✓ API running on http://localhost:5000
```

### Terminal 2: Frontend
```bash
cd hospital-readmission-scorer
npm install
npm start
```

**Opens automatically at:** http://localhost:3000

---

## 📋 Patient Data Format

```json
{
  "patient_id": "P12345",        // Unique identifier
  "patient_name": "John Doe",    // Full name
  "age": 65,                     // Years (18-120)
  "length_of_stay": 5,           // Hospital days
  "num_medications": 8,          // Total medications
  "num_diagnoses": 3,            // Number of conditions
  "emergency_visits": 2,         // Past year ER visits
  "comorbidity_score": 5.0       // Disease burden (0-10)
}
```

---

## 🎯 Understanding Results

| Risk Level | Range | Action |
|-----------|-------|--------|
| ✓ LOW | 0-40% | Standard discharge |
| ⚠ MEDIUM | 40-70% | Enhanced planning |
| 🚨 HIGH | 70-100% | Intensive intervention |

---

## 📞 API Endpoints

### Health Check
```bash
GET http://localhost:5000/api/health
```

### Single Prediction
```bash
POST http://localhost:5000/api/predict
Content-Type: application/json

{patient data}
```

### Multiple Patients
```bash
POST http://localhost:5000/api/batch-predict

{"patients": [{patient1}, {patient2}, ...]}
```

### Feature Info
```bash
GET http://localhost:5000/api/feature-info
```

---

## 🛠️ Common Commands

| Command | Purpose |
|---------|---------|
| `python app.py` | Start backend server |
| `npm start` | Start frontend |
| `npm run build` | Build for production |
| `pip install -r requirements.txt` | Install Python packages |
| `npm install` | Install Node packages |

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 5000 in use | Change port or kill process |
| Cannot connect API | Check backend is running |
| npm not found | Install Node.js |
| Python module error | Run `pip install -r requirements.txt` |
| Blank dashboard | Check browser console (F12) |

---

## 📊 Example Patients

### Low Risk (Young, Few Issues)
```json
{
  "patient_id": "P001",
  "patient_name": "Alice Young",
  "age": 35,
  "length_of_stay": 1,
  "num_medications": 1,
  "num_diagnoses": 1,
  "emergency_visits": 0,
  "comorbidity_score": 0.5
}
```

### Medium Risk (Some Concerns)
```json
{
  "patient_id": "P002",
  "patient_name": "Bob Middle",
  "age": 60,
  "length_of_stay": 7,
  "num_medications": 6,
  "num_diagnoses": 3,
  "emergency_visits": 1,
  "comorbidity_score": 4.0
}
```

### High Risk (Multiple Issues)
```json
{
  "patient_id": "P003",
  "patient_name": "Charlie Old",
  "age": 80,
  "length_of_stay": 12,
  "num_medications": 14,
  "num_diagnoses": 6,
  "emergency_visits": 4,
  "comorbidity_score": 9.0
}
```

---

## 🔄 Workflow

1. **Enter patient data** in dashboard form
2. **Click "Predict Risk"** button
3. **Get instant risk assessment** (percentage + level)
4. **Read recommendations** for clinical action
5. **Check patient history** to review past predictions
6. **Take appropriate action** based on risk level

---

## 📱 Dashboard Tabs

| Tab | Purpose |
|-----|---------|
| 📋 New Prediction | Enter and predict single patient |
| 📊 Patient History | View all past predictions |
| ℹ️ User Guide | Learn how to use system |

---

## 🌐 API Response Format

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
    "🚨 Arrange home health monitoring"
  ],
  "details": {
    "timestamp": "2024-01-15T10:30:45",
    "model_confidence": "Very High"
  }
}
```

---

## 💾 Files You Edited

When customizing:
- `app.py` - Backend logic
- `Dashboard.jsx` - Frontend component
- `Dashboard.css` - Styling
- `requirements.txt` - Python packages
- `package.json` - Node packages

---

## 🔐 Before Production

- [ ] Add user authentication
- [ ] Use HTTPS/SSL
- [ ] Add database
- [ ] Implement logging
- [ ] Add rate limiting
- [ ] Secure API keys
- [ ] HIPAA compliance
- [ ] Backup system

---

## 📈 Performance Tips

- Cache predictions when possible
- Use batch processing for multiple patients
- Monitor API response times
- Optimize database queries
- Load balance across servers

---

## 🆘 Getting Help

1. **Check logs** - Look at terminal output
2. **Read docs** - See README.md
3. **Try examples** - Use test patient data
4. **Google error** - Most issues are common

---

## 🎓 Key Concepts

**Risk Probability**: ML model's confidence that patient will be readmitted (0-1)

**Risk Level**: Classification based on probability (LOW/MEDIUM/HIGH)

**Comorbidity Score**: Weighted measure of patient's multiple diseases

**Length of Stay**: Duration of current hospital admission

**Emergency Visits**: Unplanned ER visits in past 12 months

---

## 📞 Quick Links

- **Docs**: See README.md
- **Setup**: See SETUP_GUIDE.md
- **API**: See API endpoints section above
- **Troubleshoot**: Terminal logs + error messages

---

**Remember:** This is a demo system. Always follow institutional protocols and consult qualified healthcare professionals.

**Version**: 1.0.0  
**Last Updated**: January 2024
