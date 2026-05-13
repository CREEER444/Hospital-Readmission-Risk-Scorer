import FollowupScheduler from './FollowupScheduler';
import BedReservation from './BedReservation';
import MedicineBuyer from './MedicineBuyer';
import DoctorAppointment from './DoctorAppointment';
import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

/**
 * Hospital Readmission Risk Scorer - Frontend Dashboard
 * 
 * This React component provides an intuitive interface for doctors to:
 * 1. Enter patient information
 * 2. Get instant readmission risk predictions
 * 3. View recommendations based on risk level
 * 
 * Features:
 * - Clean, professional medical UI
 * - Real-time predictions
 * - Color-coded risk levels (Green/Yellow/Red)
 * - Actionable clinical recommendations
 * - Patient history tracking
 */

const Dashboard = () => {
  // =====================================================================
  // STATE MANAGEMENT
  // =====================================================================
  
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    patient_phone: '',
    age: '',
    length_of_stay: '',
    num_medications: '',
    num_diagnoses: '',
    emergency_visits: '',
    comorbidity_score: '',
    diabetes: '0',
    heart_disease: '0',
    smoking: '0'
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patientHistory, setPatientHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('patientHistory') || '[]');
    } catch {
      return [];
    }
  });
  const [importedPatients, setImportedPatients] = useState([]);
  const [importedExcelPatients, setImportedExcelPatients] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('importedExcelPatients') || '[]');
    } catch {
      return [];
    }
  });
  const [importStatus, setImportStatus] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [smsData, setSmsData] = useState({ phone: '', message: '' });
  const [smsStatus, setSmsStatus] = useState(null);
  const [smsLoading, setSmsLoading] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('doctorLoggedIn') === 'true');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    localStorage.setItem('patientHistory', JSON.stringify(patientHistory));
  }, [patientHistory]);

  useEffect(() => {
    localStorage.setItem('importedExcelPatients', JSON.stringify(importedExcelPatients));
  }, [importedExcelPatients]);

  useEffect(() => {
    localStorage.setItem('doctorLoggedIn', isLoggedIn ? 'true' : 'false');
  }, [isLoggedIn]);

  // =====================================================================
  // API CONFIGURATION
  // =====================================================================
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // =====================================================================
  // EVENT HANDLERS
  // =====================================================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      const requiredFields = [
        'patient_id', 'patient_name', 'patient_phone', 'age', 'length_of_stay',
        'num_medications', 'num_diagnoses', 'emergency_visits', 'comorbidity_score',
        'diabetes', 'heart_disease', 'smoking'
      ];
      
      for (let field of requiredFields) {
        if (!formData[field]) {
          throw new Error(`Please fill in all fields. Missing: ${field}`);
        }
      }

      // Make API request
      const response = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: formData.patient_id,
          patient_name: formData.patient_name,
          patient_phone: formData.patient_phone,
          age: parseInt(formData.age),
          length_of_stay: parseInt(formData.length_of_stay),
          num_medications: parseInt(formData.num_medications),
          num_diagnoses: parseInt(formData.num_diagnoses),
          emergency_visits: parseInt(formData.emergency_visits),
          comorbidity_score: parseFloat(formData.comorbidity_score),
          diabetes: parseInt(formData.diabetes),
          heart_disease: parseInt(formData.heart_disease),
          smoking: parseInt(formData.smoking)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Prediction failed');
      }

      const data = await response.json();
      setPrediction(data);

      // Add to history
      setPatientHistory(prev => [
        { ...data, id: Date.now() },
        ...prev
      ].slice(0, 10)); // Keep last 10 predictions

    } catch (err) {
      setError(err.message);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    setFormData({
      patient_id: '',
      patient_name: '',
      patient_phone: '',
      age: '',
      length_of_stay: '',
      num_medications: '',
      num_diagnoses: '',
      emergency_visits: '',
      comorbidity_score: '',
    diabetes: '0',
    heart_disease: '0',
    smoking: '0'
    });
    setPrediction(null);
    setError(null);
  };

  const loadFromHistory = (historyItem) => {
    setFormData({
      patient_id: historyItem.patient.id,
      patient_name: historyItem.patient.name,
      patient_phone: historyItem.patient.phone || '',
      age: historyItem.details.features_used.age,
      length_of_stay: historyItem.details.features_used.length_of_stay,
      num_medications: historyItem.details.features_used.num_medications,
      num_diagnoses: historyItem.details.features_used.num_diagnoses,
      emergency_visits: historyItem.details.features_used.emergency_visits,
      comorbidity_score: historyItem.details.features_used.comorbidity_score,
      diabetes: String(historyItem.details.features_used.diabetes ?? '0'),
      heart_disease: String(historyItem.details.features_used.heart_disease ?? '0'),
      smoking: String(historyItem.details.features_used.smoking ?? '0')
    });
    setActiveTab('predict');
  };

  const createSmsReport = () => {
    if (!prediction) return '';

    const recs = prediction.recommendations
      .map((rec) => rec.replace(/[✓⚠🚨]/g, '').trim())
      .slice(0, 2)
      .join('; ');

    return `Hospital Readmission Report
Patient: ${prediction.patient.name} (${prediction.patient.id})
Risk: ${prediction.prediction.risk_level} - ${prediction.prediction.risk_percentage}%
Advice: ${recs}
- Hospital Risk Scorer`;
  };

  const handleSmsInputChange = (e) => {
    const { name, value } = e.target;
    setSmsData(prev => ({ ...prev, [name]: value }));
    setSmsStatus(null);
  };

  const handleSendSms = async (e) => {
    e.preventDefault();
    setSmsLoading(true);
    setSmsStatus(null);

    try {
      if (!prediction) {
        throw new Error('Please create a prediction first, then send the report.');
      }
      if (!smsData.phone.trim()) {
        throw new Error('Please enter patient phone number.');
      }

      const reportMessage = smsData.message.trim() || createSmsReport();

      const response = await fetch(`${API_URL}/api/send-sms-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: smsData.phone,
          message: reportMessage,
          patient: prediction.patient,
          prediction: prediction.prediction,
          recommendations: prediction.recommendations
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'SMS sending failed');
      }

      setSmsStatus({ type: 'success', text: data.message || 'SMS report sent successfully.' });
      setSmsData(prev => ({ ...prev, message: reportMessage }));
    } catch (err) {
      setSmsStatus({ type: 'error', text: err.message });
    } finally {
      setSmsLoading(false);
    }
  };



  const normalizeImportedPatient = (row, index) => {
    return {
      patient_id: String(row.patient_id || row.Patient_ID || row['Patient ID'] || `PX${index + 1}`).trim(),
      patient_name: String(row.patient_name || row.Patient_Name || row['Patient Name'] || '').trim(),
      patient_phone: String(row.patient_phone || row.Patient_Phone || row['Patient Phone'] || row.phone || row.Phone || '').trim(),
      age: row.age || row.Age || '',
      length_of_stay: row.length_of_stay || row.Length_of_Stay || row['Length of Stay'] || '',
      num_medications: row.num_medications || row.Num_Medications || row['Number of Medications'] || '',
      num_diagnoses: row.num_diagnoses || row.Num_Diagnoses || row['Number of Diagnoses'] || '',
      emergency_visits: row.emergency_visits || row.Emergency_Visits || row['Emergency Visits'] || '',
      comorbidity_score: row.comorbidity_score || row.Comorbidity_Score || row['Comorbidity Score'] || '',
      diabetes: row.diabetes ?? row.Diabetes ?? row['Diabetes'] ?? 0,
      heart_disease: row.heart_disease ?? row.Heart_Disease ?? row['Heart Disease'] ?? row['heart_disease'] ?? 0,
      smoking: row.smoking ?? row.Smoking ?? row['Smoking'] ?? row['Smoking History'] ?? 0
    };
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    setImportedPatients([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);

      if (!rows.length) {
        throw new Error('Excel file is empty.');
      }

      const patients = rows.map(normalizeImportedPatient).filter(p =>
        p.patient_name &&
        p.patient_phone &&
        p.age !== '' &&
        p.length_of_stay !== '' &&
        p.num_medications !== '' &&
        p.num_diagnoses !== '' &&
        p.emergency_visits !== '' &&
        p.comorbidity_score !== ''
      );

      if (!patients.length) {
        throw new Error('No valid rows found. Check Excel column names.');
      }

      setImportedPatients(patients);
      setImportedExcelPatients(patients);
      localStorage.setItem('importedExcelPatients', JSON.stringify(patients));
      setImportStatus({ type: 'success', text: `${patients.length} patients imported and saved locally. You can now search them in Patient Lookup.` });
    } catch (err) {
      setImportStatus({ type: 'error', text: err.message });
    } finally {
      e.target.value = '';
    }
  };

  const handleBatchPredictImported = async () => {
    setBatchLoading(true);
    setImportStatus(null);

    try {
      if (!importedPatients.length) {
        throw new Error('Import Excel data first.');
      }

      const results = [];

      for (const patient of importedPatients) {
        const response = await fetch(`${API_URL}/api/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...patient,
            age: parseInt(patient.age),
            length_of_stay: parseInt(patient.length_of_stay),
            num_medications: parseInt(patient.num_medications),
            num_diagnoses: parseInt(patient.num_diagnoses),
            emergency_visits: parseInt(patient.emergency_visits),
            comorbidity_score: parseFloat(patient.comorbidity_score),
            diabetes: parseInt(patient.diabetes ?? 0),
            heart_disease: parseInt(patient.heart_disease ?? 0),
            smoking: parseInt(patient.smoking ?? 0)
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Prediction failed for ${patient.patient_name}`);
        }
        results.push({ ...data, id: Date.now() + results.length });
      }

      setPatientHistory(prev => [...results, ...prev].slice(0, 200));
      setImportStatus({ type: 'success', text: `${results.length} imported patients predicted and stored locally.` });
      setActiveTab('history');
    } catch (err) {
      setImportStatus({ type: 'error', text: err.message });
    } finally {
      setBatchLoading(false);
    }
  };

  const downloadExcelTemplate = () => {
    const sampleRows = [
      {
        patient_id: 'P001',
        patient_name: 'John Doe',
        patient_phone: '+919876543210',
        age: 65,
        length_of_stay: 5,
        num_medications: 8,
        num_diagnoses: 3,
        emergency_visits: 2,
        comorbidity_score: 5,
        diabetes: 1,
        heart_disease: 0,
        smoking: 0
      },
      {
        patient_id: 'P002',
        patient_name: 'Anita Rao',
        patient_phone: '+919123456789',
        age: 45,
        length_of_stay: 2,
        num_medications: 4,
        num_diagnoses: 1,
        emergency_visits: 0,
        comorbidity_score: 2,
        diabetes: 0,
        heart_disease: 0,
        smoking: 0
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients');
    XLSX.writeFile(workbook, 'patient_import_template.xlsx');
  };

  const clearLocalPatientData = () => {
    if (window.confirm('Clear all locally stored patient history?')) {
      localStorage.removeItem('patientHistory');
      setPatientHistory([]);
    }
  };


  const downloadTextFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const createPatientDataText = (record) => {
    const patient = record.patient || {};
    const predictionData = record.prediction || {};
    const details = record.details || {};
    const features = details.features_used || {};
    const recommendations = record.recommendations || [];

    return `HOSPITAL READMISSION RISK REPORT
===================================

Patient ID: ${patient.id || 'N/A'}
Patient Name: ${patient.name || 'N/A'}
Phone: ${patient.phone || 'N/A'}
Date: ${details.timestamp || new Date().toISOString()}

CLINICAL DATA
-------------
Age: ${features.age ?? 'N/A'}
Length of Stay: ${features.length_of_stay ?? 'N/A'} days
Medications: ${features.num_medications ?? 'N/A'}
Diagnoses: ${features.num_diagnoses ?? 'N/A'}
Emergency Visits: ${features.emergency_visits ?? 'N/A'}
Comorbidity Score: ${features.comorbidity_score ?? 'N/A'}

RISK RESULT
-----------
Risk Level: ${predictionData.risk_level || 'N/A'}
Risk Percentage: ${predictionData.risk_percentage ?? 'N/A'}%
Model Confidence: ${details.model_confidence || 'N/A'}

RECOMMENDATIONS
---------------
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Generated by Hospital Readmission Risk Scorer`;
  };

  const createReceiptText = (receipt) => {
    const items = receipt.items || [];
    return `PAYMENT RECEIPT
===============

Receipt No: ${receipt.receipt_no}
Date: ${receipt.date}
Patient ID: ${receipt.patient_id}
Patient Name: ${receipt.patient_name}
Phone: ${receipt.phone}

PAYMENT DETAILS
---------------
${items.map(item => `${item.name}: ₹${item.amount}`).join('\n')}

Total Amount: ₹${receipt.total}
Payment Status: ${receipt.payment_status}

Thank you.
Hospital Readmission Risk Scorer`;
  };


  const createRecordFromExcelPatient = (patient) => {
    return {
      patient: {
        id: patient.patient_id || 'N/A',
        name: patient.patient_name || 'N/A',
        phone: patient.patient_phone || 'N/A'
      },
      prediction: {
        risk_level: 'NOT PREDICTED',
        risk_percentage: 'N/A'
      },
      recommendations: [
        'Patient data imported from Excel.',
        'Run prediction to generate AI readmission risk.',
        'Verify patient details before clinical use.'
      ],
      details: {
        timestamp: new Date().toISOString(),
        model_confidence: 'N/A',
        features_used: {
          age: patient.age || 'N/A',
          length_of_stay: patient.length_of_stay || 'N/A',
          num_medications: patient.num_medications || 'N/A',
          num_diagnoses: patient.num_diagnoses || 'N/A',
          emergency_visits: patient.emergency_visits || 'N/A',
          comorbidity_score: patient.comorbidity_score || 'N/A',
          diabetes: patient.diabetes ?? 0,
          heart_disease: patient.heart_disease ?? 0,
          smoking: patient.smoking ?? 0
        }
      }
    };
  };

  const createReceiptForRecord = (record) => {
    return {
      receipt_no: 'LOCAL-' + Date.now(),
      date: new Date().toLocaleString(),
      patient_id: record.patient.id,
      patient_name: record.patient.name,
      phone: record.patient.phone,
      risk_level: record.prediction.risk_level,
      risk_percentage: record.prediction.risk_percentage,
      items: [
        { name: 'Consultation Fee', amount: 500 },
        { name: 'Patient Data Report Fee', amount: 100 }
      ],
      total: 600,
      payment_status: 'Paid'
    };
  };


  const handleLookupPatient = async (e) => {
    e.preventDefault();
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      if (!lookupPhone.trim()) {
        throw new Error('Please enter patient phone number.');
      }

      const clean = (value) => String(value || '').replace(/\D/g, '');
      const searchPhone = clean(lookupPhone);

      const savedExcelPatients = JSON.parse(localStorage.getItem('importedExcelPatients') || '[]');

      // 1) Search directly in Excel-imported patient data
      const excelMatch = [...importedExcelPatients, ...importedPatients, ...savedExcelPatients].find(patient => {
        const storedPhone = clean(patient?.patient_phone || patient?.phone || patient?.Phone);
        return storedPhone && (
          storedPhone === searchPhone ||
          storedPhone.endsWith(searchPhone) ||
          searchPhone.endsWith(storedPhone)
        );
      });

      if (excelMatch) {
        const record = createRecordFromExcelPatient(excelMatch);
        setLookupResult({
          patient_record: record,
          payment_receipt: createReceiptForRecord(record)
        });
        return;
      }

      // 2) Search predicted patient history also
      const localMatch = patientHistory.find(item => {
        const storedPhone = clean(item?.patient?.phone);
        return storedPhone && (
          storedPhone === searchPhone ||
          storedPhone.endsWith(searchPhone) ||
          searchPhone.endsWith(storedPhone)
        );
      });

      if (localMatch) {
        setLookupResult({
          patient_record: localMatch,
          payment_receipt: createReceiptForRecord(localMatch)
        });
        return;
      }

      // 3) Backend fallback
      const response = await fetch(`${API_URL}/api/patient-by-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: lookupPhone })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error('No patient found. Import Excel first, then search the same phone number.');
      }

      setLookupResult(data);
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  };



  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
    setLoginError('');
  };

  const handleDoctorLogin = (e) => {
    e.preventDefault();
    const username = loginData.username.trim().toLowerCase();
    const password = loginData.password.trim();

    if ((username === 'doctor' || username === 'admin') && password === '1234') {
      setIsLoggedIn(true);
      setLoginError('');
      setLoginData({ username: '', password: '' });
    } else {
      setLoginError('Invalid login. Use username: doctor and password: 1234');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveTab('predict');
  };

  const getAllPatientRecords = () => {
    const excelRecords = importedExcelPatients.map(createRecordFromExcelPatient);
    const combined = [...patientHistory, ...excelRecords];

    const seen = new Set();
    return combined.filter(record => {
      const key = `${record?.patient?.id || ''}-${record?.patient?.phone || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const getDashboardStats = () => {
    const records = getAllPatientRecords();
    const predicted = records.filter(r => r.prediction?.risk_level && r.prediction.risk_level !== 'NOT PREDICTED');
    const low = predicted.filter(r => r.prediction.risk_level === 'LOW').length;
    const medium = predicted.filter(r => r.prediction.risk_level === 'MEDIUM').length;
    const high = predicted.filter(r => r.prediction.risk_level === 'HIGH').length;

    return {
      total: records.length,
      predicted: predicted.length,
      imported: importedExcelPatients.length,
      low,
      medium,
      high
    };
  };

  const getRiskChartData = () => {
    const stats = getDashboardStats();
    const total = Math.max(stats.predicted, 1);
    return [
      { label: 'Low', count: stats.low, percent: Math.round((stats.low / total) * 100), className: 'low' },
      { label: 'Medium', count: stats.medium, percent: Math.round((stats.medium / total) * 100), className: 'medium' },
      { label: 'High', count: stats.high, percent: Math.round((stats.high / total) * 100), className: 'high' }
    ];
  };

  const downloadPdfReport = (record, receipt = null) => {
    const patient = record.patient || {};
    const predictionData = record.prediction || {};
    const details = record.details || {};
    const features = details.features_used || {};
    const recommendations = record.recommendations || [];
    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text('Hospital Readmission Risk Report', 14, 20);

    pdf.setFontSize(11);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    pdf.setFontSize(14);
    pdf.text('Patient Details', 14, 45);
    pdf.setFontSize(11);
    pdf.text(`Patient ID: ${patient.id || 'N/A'}`, 14, 55);
    pdf.text(`Name: ${patient.name || 'N/A'}`, 14, 63);
    pdf.text(`Phone: ${patient.phone || 'N/A'}`, 14, 71);

    pdf.setFontSize(14);
    pdf.text('Clinical Data', 14, 88);
    pdf.setFontSize(11);
    pdf.text(`Age: ${features.age ?? 'N/A'}`, 14, 98);
    pdf.text(`Length of Stay: ${features.length_of_stay ?? 'N/A'} days`, 14, 106);
    pdf.text(`Medications: ${features.num_medications ?? 'N/A'}`, 14, 114);
    pdf.text(`Diagnoses: ${features.num_diagnoses ?? 'N/A'}`, 14, 122);
    pdf.text(`Emergency Visits: ${features.emergency_visits ?? 'N/A'}`, 14, 130);
    pdf.text(`Comorbidity Score: ${features.comorbidity_score ?? 'N/A'}`, 14, 138);

    pdf.setFontSize(14);
    pdf.text('Risk Result', 14, 155);
    pdf.setFontSize(12);
    pdf.text(`Risk Level: ${predictionData.risk_level || 'N/A'}`, 14, 165);
    pdf.text(`Risk Percentage: ${predictionData.risk_percentage ?? 'N/A'}%`, 14, 174);
    pdf.text(`Model Confidence: ${details.model_confidence || 'N/A'}`, 14, 183);

    pdf.setFontSize(14);
    pdf.text('Recommendations', 14, 200);
    pdf.setFontSize(10);
    let y = 210;
    recommendations.slice(0, 6).forEach((rec, index) => {
      const cleanRec = String(rec).replace(/[✓⚠🚨📞💊🏥]/g, '').trim();
      pdf.text(`${index + 1}. ${cleanRec}`, 14, y);
      y += 8;
    });

    if (receipt) {
      pdf.addPage();
      pdf.setFontSize(18);
      pdf.text('Payment Receipt', 14, 20);
      pdf.setFontSize(11);
      pdf.text(`Receipt No: ${receipt.receipt_no || 'N/A'}`, 14, 35);
      pdf.text(`Date: ${receipt.date || new Date().toLocaleString()}`, 14, 43);
      pdf.text(`Patient: ${receipt.patient_name || patient.name || 'N/A'}`, 14, 51);
      pdf.text(`Phone: ${receipt.phone || patient.phone || 'N/A'}`, 14, 59);

      pdf.setFontSize(14);
      pdf.text('Payment Details', 14, 76);
      pdf.setFontSize(11);
      let receiptY = 88;
      (receipt.items || []).forEach(item => {
        pdf.text(`${item.name}: Rs. ${item.amount}`, 14, receiptY);
        receiptY += 8;
      });
      pdf.text(`Total: Rs. ${receipt.total || 0}`, 14, receiptY + 4);
      pdf.text(`Status: ${receipt.payment_status || 'Paid'}`, 14, receiptY + 12);
    }

    pdf.setFontSize(8);
    pdf.text('Educational demo system. Not a substitute for professional medical judgment.', 14, 285);

    pdf.save(`patient_report_${patient.id || 'patient'}.pdf`);
  };


  // =====================================================================
  // RENDER HELPERS
  // =====================================================================

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'LOW':
        return '#10b981';
      case 'MEDIUM':
        return '#f59e0b';
      case 'HIGH':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'LOW':
        return '✓';
      case 'MEDIUM':
        return '⚠';
      case 'HIGH':
        return '🚨';
      default:
        return '?';
    }
  };

  // =====================================================================
  // RENDER
  // =====================================================================


  if (!isLoggedIn) {
    return (
      <div className="login-page">
        <div className="login-background-glow"></div>
        <div className="login-card">
          <div className="login-logo">🏥</div>
          <h1>Hospital Readmission Risk Scorer</h1>
          <p>Doctor Login Portal</p>

          {loginError && <div className="login-error">❌ {loginError}</div>}

          <form onSubmit={handleDoctorLogin}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={loginData.username}
                onChange={handleLoginChange}
                placeholder="doctor"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={loginData.password}
                onChange={handleLoginChange}
                placeholder="1234"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary login-btn">
              Login to Dashboard
            </button>
          </form>

          <div className="demo-login-hint">
            Demo Login: <strong>doctor</strong> / <strong>1234</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo">🏥</div>
            <div>
              <h1>Readmission Risk Scorer</h1>
              <p>AI-Powered Patient Risk Assessment</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="model-badge">ML Engine: Demo Mode</span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Tab Navigation */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-top">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle menu"
            >
              ☰
            </button>

            <div className="sidebar-profile">
              <div className="sidebar-profile-icon">🏥</div>
              <div>
                <strong>Hospital</strong>
                <span>Admin Panel</span>
              </div>
            </div>
          </div>

          <div className="sidebar-buttons">
            <button
                        className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                      >
                        🧭 Dashboard
                      </button>

            <button
                        className={`tab-button ${activeTab === 'predict' ? 'active' : ''}`}
                        onClick={() => setActiveTab('predict')}
                      >
                        📋 New Prediction
                      </button>

            <button
                        className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                      >
                        📊 Patient History ({patientHistory.length})
                      </button>

            <button
                        className={`tab-button ${activeTab === 'sms' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sms')}
                      >
                        📱 Send SMS Report
                      </button>

            <button
                        className={`tab-button ${activeTab === 'lookup' ? 'active' : ''}`}
                        onClick={() => setActiveTab('lookup')}
                      >
                        🔎 Patient Lookup
                      </button>

            <button
                        className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
                        onClick={() => setActiveTab('import')}
                      >
                        📥 Excel Import
                      </button>

            <button
                        className={`tab-button ${activeTab === 'bed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bed')}
                      >
                        🛏️ Bed Reservation
                      </button>

            <button
                        className={`tab-button ${activeTab === 'scheduler' ? 'active' : ''}`}
                        onClick={() => setActiveTab('scheduler')}
                      >
                        📅 Follow-up Scheduler
                      </button>

            <button
                        className={`tab-button ${activeTab === 'medicine' ? 'active' : ''}`}
                        onClick={() => setActiveTab('medicine')}
                      >
                        💊 Medicine Buyer
                      </button>

            <button
                        className={`tab-button ${activeTab === 'appointment' ? 'active' : ''}`}
                        onClick={() => setActiveTab('appointment')}
                      >
                        👨‍⚕️ Doctor Appointment
                      </button>

            <button
                        className={`tab-button ${activeTab === 'guide' ? 'active' : ''}`}
                        onClick={() => setActiveTab('guide')}
                      >
                        ℹ️ User Guide
                      </button>

          </div>

          <button
            className="sidebar-collapse"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '‹ Collapse' : '›'}
          </button>
        </aside>

        {/* TAB 0: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <div className="overview-grid">
              <div className="stat-card total">
                <div className="stat-icon">👥</div>
                <div>
                  <span>Total Patients</span>
                  <strong>{getDashboardStats().total}</strong>
                </div>
              </div>
              <div className="stat-card high">
                <div className="stat-icon">🚨</div>
                <div>
                  <span>High Risk</span>
                  <strong>{getDashboardStats().high}</strong>
                </div>
              </div>
              <div className="stat-card medium">
                <div className="stat-icon">⚠️</div>
                <div>
                  <span>Medium Risk</span>
                  <strong>{getDashboardStats().medium}</strong>
                </div>
              </div>
              <div className="stat-card low">
                <div className="stat-icon">✅</div>
                <div>
                  <span>Low Risk</span>
                  <strong>{getDashboardStats().low}</strong>
                </div>
              </div>
            </div>

            <div className="analytics-grid">
              <div className="chart-card">
                <div className="section-title-row">
                  <div>
                    <h2>Risk Distribution</h2>
                    <p>Based on predicted patients</p>
                  </div>
                  <span className="mini-badge">{getDashboardStats().predicted} Predicted</span>
                </div>

                <div className="risk-chart">
                  {getRiskChartData().map(item => (
                    <div className="chart-row" key={item.label}>
                      <div className="chart-label">
                        <span>{item.label}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div className="chart-track">
                        <div
                          className={`chart-fill ${item.className}`}
                          style={{ width: `${item.percent}%` }}
                        ></div>
                      </div>
                      <span className="chart-percent">{item.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="quick-actions-card">
                <h2>Quick Actions</h2>
                <button className="quick-action" onClick={() => setActiveTab('predict')}>➕ New Prediction</button>
                <button className="quick-action" onClick={() => setActiveTab('import')}>📥 Import Excel</button>
                <button className="quick-action" onClick={() => setActiveTab('lookup')}>🔎 Lookup Patient</button>
                <button className="quick-action" onClick={() => setActiveTab('history')}>📊 View History</button>
                <button className="quick-action" onClick={() => setActiveTab('scheduler')}>📅 Schedule Follow-up</button>
                <button className="quick-action" onClick={() => setActiveTab('bed')}>🛏️ Reserve Bed</button>
                <button className="quick-action" onClick={() => setActiveTab('medicine')}>💊 Buy Medicine</button>
              </div>
            </div>
          </div>
        )}


        {/* TAB 1: PREDICTION FORM */}
        {activeTab === 'predict' && (
          <div className="tab-content">
            <div className="content-grid">
              {/* Form Section */}
              <div className="form-section">
                <h2>Patient Information</h2>

                {error && (
                  <div className="error-alert">
                    <span>❌ {error}</span>
                  </div>
                )}

                <form onSubmit={handlePredict}>
                  {/* Patient Identity */}
                  <div className="form-group">
                    <label htmlFor="patient_id">Patient ID *</label>
                    <input
                      type="text"
                      id="patient_id"
                      name="patient_id"
                      value={formData.patient_id}
                      onChange={handleInputChange}
                      placeholder="e.g., P12345"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="patient_name">Patient Name *</label>
                    <input
                      type="text"
                      id="patient_name"
                      name="patient_name"
                      value={formData.patient_name}
                      onChange={handleInputChange}
                      placeholder="e.g., John Doe"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="patient_phone">Patient Phone Number *</label>
                    <input
                      type="tel"
                      id="patient_phone"
                      name="patient_phone"
                      value={formData.patient_phone}
                      onChange={handleInputChange}
                      placeholder="e.g., +919876543210"
                      required
                    />
                    <small>This number is used to search and download patient report/receipt later.</small>
                  </div>

                  {/* Demographics & Clinical Data */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="age">Age (years) *</label>
                      <input
                        type="number"
                        id="age"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        min="18"
                        max="120"
                        placeholder="65"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="length_of_stay">Length of Stay (days) *</label>
                      <input
                        type="number"
                        id="length_of_stay"
                        name="length_of_stay"
                        value={formData.length_of_stay}
                        onChange={handleInputChange}
                        min="1"
                        max="365"
                        placeholder="5"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="num_medications">Number of Medications *</label>
                      <input
                        type="number"
                        id="num_medications"
                        name="num_medications"
                        value={formData.num_medications}
                        onChange={handleInputChange}
                        min="0"
                        max="50"
                        placeholder="8"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="num_diagnoses">Number of Diagnoses *</label>
                      <input
                        type="number"
                        id="num_diagnoses"
                        name="num_diagnoses"
                        value={formData.num_diagnoses}
                        onChange={handleInputChange}
                        min="1"
                        max="20"
                        placeholder="3"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="emergency_visits">Emergency Visits (past year) *</label>
                      <input
                        type="number"
                        id="emergency_visits"
                        name="emergency_visits"
                        value={formData.emergency_visits}
                        onChange={handleInputChange}
                        min="0"
                        max="50"
                        placeholder="2"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="comorbidity_score">Comorbidity Score (0-10) *</label>
                      <input
                        type="number"
                        id="comorbidity_score"
                        name="comorbidity_score"
                        value={formData.comorbidity_score}
                        onChange={handleInputChange}
                        min="0"
                        max="10"
                        step="0.1"
                        placeholder="5.0"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row disease-row">
                    <div className="form-group">
                      <label htmlFor="diabetes">Diabetes</label>
                      <select
                        id="diabetes"
                        name="diabetes"
                        value={formData.diabetes}
                        onChange={handleInputChange}
                      >
                        <option value="0">No</option>
                        <option value="1">Yes</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="heart_disease">Heart Disease</label>
                      <select
                        id="heart_disease"
                        name="heart_disease"
                        value={formData.heart_disease}
                        onChange={handleInputChange}
                      >
                        <option value="0">No</option>
                        <option value="1">Yes</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="smoking">Smoking History</label>
                    <select
                      id="smoking"
                      name="smoking"
                      value={formData.smoking}
                      onChange={handleInputChange}
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                    <small>Disease inputs help the AI model make better readmission predictions.</small>
                  </div>


                  {/* Action Buttons */}
                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? '🔄 Analyzing...' : '🔍 Predict Risk'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleClearForm}
                    >
                      Clear Form
                    </button>
                  </div>
                </form>
              </div>

              {/* Prediction Result Section */}
              <div className="result-section">
                {prediction ? (
                  <div className="prediction-card">
                    <div className="patient-header">
                      <h3>{prediction.patient.name}</h3>
                      <span className="patient-id">{prediction.patient.id}</span>
                    </div>

                    {/* Risk Level Display */}
                    <div
                      className="risk-badge"
                      style={{ backgroundColor: getRiskColor(prediction.prediction.risk_level) }}
                    >
                      <div className="risk-icon">
                        {getRiskIcon(prediction.prediction.risk_level)}
                      </div>
                      <div>
                        <div className="risk-level">
                          {prediction.prediction.risk_level} RISK
                        </div>
                        <div className="risk-percentage">
                          {prediction.prediction.risk_percentage}% Readmission Probability
                        </div>
                      </div>
                    </div>

                    {/* Risk Meter */}
                    <div className="risk-meter">
                      <div
                        className="risk-bar"
                        style={{
                          width: `${prediction.prediction.risk_percentage}%`,
                          backgroundColor: getRiskColor(prediction.prediction.risk_level)
                        }}
                      />
                    </div>

                    {/* Clinical Recommendations */}
                    <div className="recommendations">
                      <h4>Clinical Recommendations</h4>
                      <ul>
                        {prediction.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="quick-sms-action">
                      <button
                        type="button"
                        className="btn btn-primary btn-wide"
                        onClick={() => {
                          setSmsData(prev => ({ ...prev, message: createSmsReport() }));
                          setActiveTab('sms');
                        }}
                      >
                        📱 Send This Report by SMS
                      </button>
                    </div>

                    {/* Prediction Details */}
                    <div className="prediction-details">
                      <h4>Prediction Details</h4>
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Model Confidence</span>
                          <span className="detail-value">{prediction.details.model_confidence}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Timestamp</span>
                          <span className="detail-value">
                            {new Date(prediction.details.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <p>Enter patient data and click "Predict Risk"</p>
                    <p className="empty-subtext">
                      AI will analyze the data and provide a readmission risk score
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PATIENT HISTORY */}
        {activeTab === 'history' && (
          <div className="tab-content">
            <h2>Recent Predictions</h2>
            {patientHistory.length === 0 ? (
              <div className="empty-state">
                <p>No prediction history yet</p>
              </div>
            ) : (
              <div className="history-list">
                {patientHistory.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-header">
                      <div>
                        <h4>{item.patient.name}</h4>
                        <span className="patient-id">{item.patient.id}</span>
                      </div>
                      <div
                        className="risk-badge-small"
                        style={{ backgroundColor: getRiskColor(item.prediction.risk_level) }}
                      >
                        {item.prediction.risk_level}
                      </div>
                    </div>
                    <div className="history-details">
                      <span>{item.prediction.risk_percentage}% Risk</span>
                      <span>{new Date(item.details.timestamp).toLocaleString()}</span>
                    </div>
                    <button
                      className="btn btn-small"
                      onClick={() => loadFromHistory(item)}
                    >
                      Load
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SEND SMS REPORT */}
        {activeTab === 'sms' && (
          <div className="tab-content">
            <div className="sms-page">
              <div className="sms-card">
                <div className="sms-header">
                  <div className="sms-icon">📱</div>
                  <div>
                    <h2>Send Patient Report by SMS</h2>
                    <p>Enter the patient's phone number and send the latest risk report.</p>
                  </div>
                </div>

                {!prediction && (
                  <div className="info-alert">
                    First create a prediction in the <strong>New Prediction</strong> tab. Then come here to send the report.
                  </div>
                )}

                {smsStatus && (
                  <div className={`sms-alert ${smsStatus.type}`}>
                    {smsStatus.type === 'success' ? '✅' : '❌'} {smsStatus.text}
                  </div>
                )}

                <form onSubmit={handleSendSms}>
                  <div className="form-group">
                    <label htmlFor="phone">Patient Phone Number *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={smsData.phone}
                      onChange={handleSmsInputChange}
                      placeholder="e.g., +919876543210"
                      required
                    />
                    <small>Use country code format for real SMS, for example +91XXXXXXXXXX.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">SMS Report Message</label>
                    <textarea
                      id="message"
                      name="message"
                      value={smsData.message || createSmsReport()}
                      onChange={handleSmsInputChange}
                      rows="7"
                      placeholder="Report message will appear after prediction"
                      disabled={!prediction}
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSmsData(prev => ({ ...prev, message: createSmsReport() }))}
                      disabled={!prediction}
                    >
                      Generate Report Text
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={smsLoading || !prediction}
                    >
                      {smsLoading ? '📨 Sending...' : '📨 Send SMS Report'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="sms-preview-card">
                <h3>Report Preview</h3>
                {prediction ? (
                  <>
                    <div className="preview-patient">
                      <strong>{prediction.patient.name}</strong>
                      <span>{prediction.patient.id}</span>
                    </div>
                    <div
                      className="risk-badge preview-risk"
                      style={{ backgroundColor: getRiskColor(prediction.prediction.risk_level) }}
                    >
                      <div className="risk-icon">{getRiskIcon(prediction.prediction.risk_level)}</div>
                      <div>
                        <div className="risk-level">{prediction.prediction.risk_level} RISK</div>
                        <div className="risk-percentage">{prediction.prediction.risk_percentage}% Readmission Probability</div>
                      </div>
                    </div>
                    <div className="sms-message-preview">
                      {(smsData.message || createSmsReport()).split('\n').map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state compact">
                    <p>No report available yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}



        {/* TAB 4: EXCEL IMPORT + LOCAL STORAGE */}
        {activeTab === 'import' && (
          <div className="tab-content">
            <div className="import-page">
              <div className="import-card">
                <div className="sms-header">
                  <div className="sms-icon">📥</div>
                  <div>
                    <h2>Import Patient Data from Excel</h2>
                    <p>Upload an Excel file and store patient data locally. Lookup will work immediately after import.</p>
                  </div>
                </div>

                {importStatus && (
                  <div className={`sms-alert ${importStatus.type}`}>
                    {importStatus.type === 'success' ? '✅' : '❌'} {importStatus.text}
                  </div>
                )}

                <div className="excel-actions">
                  <button className="btn btn-secondary" onClick={downloadExcelTemplate}>
                    ⬇ Download Excel Template
                  </button>

                  <label className="file-upload-btn">
                    📤 Choose Excel File
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelImport}
                      hidden
                    />
                  </label>
                </div>

                <div className="excel-format-box">
                  <h3>Required Excel Columns</h3>
                  <code>patient_id, patient_name, patient_phone, age, length_of_stay, num_medications, num_diagnoses, emergency_visits, comorbidity_score, diabetes, heart_disease, smoking</code>
                </div>

                {importedPatients.length > 0 && (
                  <>
                    <div className="import-summary">
                      <strong>{importedPatients.length}</strong> patients ready for prediction.
                    </div>

                    <div className="import-table-wrapper">
                      <table className="import-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Age</th>
                            <th>LOS</th>
                            <th>Meds</th>
                            <th>Diagnoses</th>
                            <th>Diabetes</th>
                            <th>Heart</th>
                            <th>Smoking</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importedPatients.slice(0, 8).map((p, index) => (
                            <tr key={index}>
                              <td>{p.patient_id}</td>
                              <td>{p.patient_name}</td>
                              <td>{p.patient_phone}</td>
                              <td>{p.age}</td>
                              <td>{p.length_of_stay}</td>
                              <td>{p.num_medications}</td>
                              <td>{p.num_diagnoses}</td>
                              <td>{p.diabetes}</td>
                              <td>{p.heart_disease}</td>
                              <td>{p.smoking}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importedPatients.length > 8 && <p className="table-note">Showing first 8 rows only.</p>}
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={handleBatchPredictImported}
                      disabled={batchLoading}
                    >
                      {batchLoading ? 'Predicting...' : 'Predict Imported Patients'}
                    </button>
                  </>
                )}
              </div>

              <div className="local-storage-card">
                <h3>Local Storage Status</h3>
                <p>Excel imported patients: <strong>{importedExcelPatients.length}</strong></p>
                <p>Predicted patient records: <strong>{patientHistory.length}</strong></p>
                <p className="muted-text">Lookup searches Excel imported data first, then predicted history.</p>
              </div>
            </div>
          </div>
        )}


        {/* TAB 5: PATIENT LOOKUP + DOWNLOAD */}
        {activeTab === 'lookup' && (
          <div className="tab-content">
            <div className="lookup-page">
              <div className="lookup-card">
                <div className="sms-header">
                  <div className="sms-icon">🔎</div>
                  <div>
                    <h2>Patient Lookup & Downloads</h2>
                    <p>Enter patient phone number to search Excel-imported/local stored patient data and download receipt.</p>
                  </div>
                </div>

                {lookupError && (
                  <div className="sms-alert error">❌ {lookupError}</div>
                )}

                <form onSubmit={handleLookupPatient}>
                  <div className="form-group">
                    <label htmlFor="lookupPhone">Patient Phone Number *</label>
                    <input
                      type="tel"
                      id="lookupPhone"
                      value={lookupPhone}
                      onChange={(e) => setLookupPhone(e.target.value)}
                      placeholder="e.g., +919876543210"
                      required
                    />
                    <small>Use the same phone number from your Excel sheet. It can search with or without +91.</small>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={lookupLoading}>
                      {lookupLoading ? 'Searching...' : 'Search Patient'}
                    </button>
                  </div>
                </form>
              </div>

              {lookupResult && (
                <div className="lookup-result-card">
                  <h3>Patient Found</h3>

                  <div className="lookup-summary">
                    <p><strong>Name:</strong> {lookupResult.patient_record.patient.name}</p>
                    <p><strong>Patient ID:</strong> {lookupResult.patient_record.patient.id}</p>
                    <p><strong>Phone:</strong> {lookupResult.patient_record.patient.phone}</p>
                    <p><strong>Risk:</strong> {lookupResult.patient_record.prediction.risk_level} ({lookupResult.patient_record.prediction.risk_percentage}%)</p>
                    <p><strong>Payment:</strong> ₹{lookupResult.payment_receipt.total} - {lookupResult.payment_receipt.payment_status}</p>
                  </div>

                  <div className="download-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => downloadTextFile(
                        `patient_report_${lookupResult.patient_record.patient.id}.txt`,
                        createPatientDataText(lookupResult.patient_record)
                      )}
                    >
                      ⬇ Download Patient Data
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={() => downloadTextFile(
                        `payment_receipt_${lookupResult.patient_record.patient.id}.txt`,
                        createReceiptText(lookupResult.payment_receipt)
                      )}
                    >
                      🧾 Download Payment Receipt
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={() => downloadPdfReport(lookupResult.patient_record, lookupResult.payment_receipt)}
                    >
                      📄 Download PDF Report
                    </button>
                  </div>

                  <div className="receipt-preview">
                    <h4>Receipt Preview</h4>
                    <p><strong>Receipt No:</strong> {lookupResult.payment_receipt.receipt_no}</p>
                    <p><strong>Total:</strong> ₹{lookupResult.payment_receipt.total}</p>
                    <p><strong>Status:</strong> {lookupResult.payment_receipt.payment_status}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}




        {/* TAB: BED RESERVATION */}
        {activeTab === 'bed' && (
          <div className="tab-content">
            <BedReservation />
          </div>
        )}

        {/* TAB 6: FOLLOW-UP SCHEDULER */}
        {activeTab === 'scheduler' && (
          <div className="tab-content">
            <FollowupScheduler />
          </div>
        )}


        {/* TAB: ONLINE MEDICINE BUYER */}
        {activeTab === 'medicine' && (
          <div className="tab-content">
            <MedicineBuyer />
          </div>
        )}


        {/* TAB: DOCTOR APPOINTMENT BOOKING */}
        {activeTab === 'appointment' && (
          <div className="tab-content">
            <DoctorAppointment />
          </div>
        )}

        {/* TAB 7: USER GUIDE */}
        {activeTab === 'guide' && (
          <div className="tab-content guide-content">
            <h2>User Guide</h2>

            <section className="guide-section">
              <h3>📋 How to Use</h3>
              <ol>
                <li>Fill in patient information (ID, Name)</li>
                <li>Enter clinical data (age, medications, diagnoses, etc.)</li>
                <li>Click "Predict Risk" to get AI-powered assessment</li>
                <li>Review recommendations for discharge planning</li>
              </ol>
            </section>

            <section className="guide-section">
              <h3>🎯 Understanding Risk Levels</h3>
              <div className="risk-guide">
                <div className="risk-guide-item low">
                  <strong>✓ LOW RISK (0-40%)</strong>
                  <p>Standard discharge protocols apply. Routine follow-up recommended.</p>
                </div>
                <div className="risk-guide-item medium">
                  <strong>⚠ MEDIUM RISK (40-70%)</strong>
                  <p>Enhanced planning needed. Closer monitoring and earlier follow-up advised.</p>
                </div>
                <div className="risk-guide-item high">
                  <strong>🚨 HIGH RISK (70-100%)</strong>
                  <p>Intensive intervention required. Consider extended observation or home health.</p>
                </div>
              </div>
            </section>

            <section className="guide-section">
              <h3>📊 About the Data</h3>
              <ul>
                <li><strong>Age:</strong> Patient age in years</li>
                <li><strong>Length of Stay:</strong> Days in hospital during current admission</li>
                <li><strong>Medications:</strong> Total number of prescribed medications</li>
                <li><strong>Diagnoses:</strong> Number of coded diagnosis conditions</li>
                <li><strong>Emergency Visits:</strong> ER visits in past 12 months</li>
                <li><strong>Comorbidity Score:</strong> Weighted measure of multiple conditions (0=none, 10=severe)</li>
              </ul>
            </section>

            <section className="guide-section">
              <h3>⚡ Pro Tips</h3>
              <ul>
                <li>Use accurate comorbidity scores for best predictions</li>
                <li>Check patient history to review past assessments</li>
                <li>High-risk patients may benefit from specialist consultation</li>
                <li>Follow local discharge protocols in addition to AI recommendations</li>
              </ul>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>🏥 Hospital Readmission Risk Scorer v1.0 | AI-Powered Clinical Decision Support</p>
      </footer>
    </div>
  );
};

export default Dashboard;
