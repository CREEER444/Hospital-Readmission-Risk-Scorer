import React, { useEffect, useMemo, useState } from "react";
import "./FollowupScheduler.css";

const AUTO_SCHEDULE_KEY = "hospitalAutoFollowupSchedules";
const PATIENT_HISTORY_KEY = "patientHistory";
const IMPORTED_PATIENTS_KEY = "importedExcelPatients";

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d;
}

function getFeatureValue(record, key, fallback = 0) {
  return Number(record?.details?.features_used?.[key] ?? record?.[key] ?? fallback);
}

function getPatientInfo(record) {
  return {
    id: record?.patient?.id || record?.patient_id || "N/A",
    name: record?.patient?.name || record?.patient_name || "Unknown Patient",
    phone: record?.patient?.phone || record?.patient_phone || ""
  };
}

function calculateFollowupPlan(record) {
  const riskLevel = record?.prediction?.risk_level || "NOT PREDICTED";
  const riskPercentage = Number(record?.prediction?.risk_percentage ?? 0);

  const diabetes = getFeatureValue(record, "diabetes");
  const heartDisease = getFeatureValue(record, "heart_disease");
  const smoking = getFeatureValue(record, "smoking");
  const emergencyVisits = getFeatureValue(record, "emergency_visits");
  const comorbidityScore = getFeatureValue(record, "comorbidity_score");
  const lengthOfStay = getFeatureValue(record, "length_of_stay");

  let days = 14;
  let reason = "Routine follow-up visit";
  let priority = "LOW";

  if (riskLevel === "HIGH" || riskPercentage >= 70) {
    days = 2;
    reason = "High readmission risk follow-up";
    priority = "HIGH";
  } else if (riskLevel === "MEDIUM" || riskPercentage >= 40) {
    days = 7;
    reason = "Medium readmission risk follow-up";
    priority = "MEDIUM";
  }

  if (heartDisease === 1) {
    days = Math.min(days, 3);
    reason = "Heart disease follow-up";
    priority = "HIGH";
  }

  if (diabetes === 1) {
    days = Math.min(days, 7);
    if (priority !== "HIGH") priority = "MEDIUM";
    if (reason === "Routine follow-up visit") reason = "Diabetes recovery check-up";
  }

  if (smoking === 1) {
    days = Math.min(days, 10);
    if (reason === "Routine follow-up visit") reason = "Respiratory recovery follow-up";
  }

  if (emergencyVisits >= 2 || comorbidityScore >= 6 || lengthOfStay >= 8) {
    days = Math.min(days, 5);
    if (priority !== "HIGH") priority = "MEDIUM";
    if (reason === "Routine follow-up visit") reason = "Clinical stability follow-up";
  }

  const baseDate = record?.details?.timestamp || record?.created_at || new Date().toISOString();
  const visitDate = addDays(baseDate, days);

  return {
    days,
    reason,
    priority,
    visit_datetime: visitDate.toISOString()
  };
}

export default function FollowupScheduler() {
  const [schedules, setSchedules] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTO_SCHEDULE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [message, setMessage] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(0);

  useEffect(() => {
    localStorage.setItem(AUTO_SCHEDULE_KEY, JSON.stringify(schedules));
  }, [schedules]);

  const loadPatientRecords = () => {
    let history = [];
    let imported = [];

    try {
      history = JSON.parse(localStorage.getItem(PATIENT_HISTORY_KEY) || "[]");
    } catch {
      history = [];
    }

    try {
      imported = JSON.parse(localStorage.getItem(IMPORTED_PATIENTS_KEY) || "[]");
    } catch {
      imported = [];
    }

    const importedRecords = imported.map((patient) => ({
      patient: {
        id: patient.patient_id || "N/A",
        name: patient.patient_name || "Unknown Patient",
        phone: patient.patient_phone || ""
      },
      prediction: {
        risk_level: "NOT PREDICTED",
        risk_percentage: 0
      },
      details: {
        timestamp: new Date().toISOString(),
        features_used: {
          age: patient.age,
          length_of_stay: patient.length_of_stay,
          num_medications: patient.num_medications,
          num_diagnoses: patient.num_diagnoses,
          emergency_visits: patient.emergency_visits,
          comorbidity_score: patient.comorbidity_score,
          diabetes: patient.diabetes ?? 0,
          heart_disease: patient.heart_disease ?? 0,
          smoking: patient.smoking ?? 0
        }
      }
    }));

    return [...history, ...importedRecords];
  };

  const autoGenerateSchedules = () => {
    const records = loadPatientRecords();

    if (!records.length) {
      setMessage("No patient records found. First create prediction or import Excel data.");
      return;
    }

    const existingKeys = new Set(
      schedules.map((item) => `${item.patient_id}-${item.patient_phone}`)
    );

    const newSchedules = [];

    records.forEach((record) => {
      const patient = getPatientInfo(record);
      const key = `${patient.id}-${patient.phone}`;

      if (existingKeys.has(key)) return;

      const plan = calculateFollowupPlan(record);

      newSchedules.push({
        id: Date.now() + Math.random(),
        patient_id: patient.id,
        patient_name: patient.name,
        patient_phone: patient.phone,
        risk_level: record?.prediction?.risk_level || "NOT PREDICTED",
        risk_percentage: record?.prediction?.risk_percentage ?? 0,
        reason: plan.reason,
        priority: plan.priority,
        visit_datetime: plan.visit_datetime,
        days_after_discharge: plan.days,
        status: "scheduled",
        alert_sent: false,
        created_at: new Date().toISOString()
      });
    });

    if (!newSchedules.length) {
      setMessage("All available patients already have automatic follow-up schedules.");
      return;
    }

    setSchedules((prev) => [...newSchedules, ...prev]);
    setMessage(`${newSchedules.length} automatic follow-up schedules created.`);
  };

  const clearSchedules = () => {
    if (!window.confirm("Clear all automatic schedules?")) return;
    setSchedules([]);
    localStorage.removeItem(AUTO_SCHEDULE_KEY);
    setMessage("All automatic schedules cleared.");
  };

  const markCompleted = (id) => {
    setSchedules((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "completed" } : item
      )
    );
  };

  const deleteSchedule = (id) => {
    setSchedules((prev) => prev.filter((item) => item.id !== id));
  };

  const generateSmsText = (item) => {
    const visitDate = new Date(item.visit_datetime).toLocaleString();
    return `Hospital Reminder: Dear ${item.patient_name}, your follow-up visit is scheduled on ${visitDate}. Reason: ${item.reason}. Please visit on time.`;
  };

  const sendAlert = async (item) => {
    try {
      const response = await fetch("http://localhost:5000/api/send-sms-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone: item.patient_phone,
          message: generateSmsText(item)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Alert failed.");
      }

      setSchedules((prev) =>
        prev.map((schedule) =>
          schedule.id === item.id
            ? { ...schedule, alert_sent: true, alert_sent_at: new Date().toISOString() }
            : schedule
        )
      );

      setMessage("Alert sent/generated successfully. Check backend terminal for demo SMS.");
    } catch (error) {
      setMessage(`Could not send alert: ${error.message}`);
    }
  };

  const getTimeLabel = (dateTime) => {
    const visitTime = new Date(dateTime);
    const diffMinutes = Math.round((visitTime - new Date()) / (1000 * 60));

    if (diffMinutes > 1440) return `${Math.ceil(diffMinutes / 1440)} days left`;
    if (diffMinutes > 60) return `${Math.ceil(diffMinutes / 60)} hours left`;
    if (diffMinutes > 0) return `${diffMinutes} min left`;
    if (diffMinutes >= -240) return "Due now";
    return "Overdue";
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setAutoRefresh((value) => value + 1);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const activeSchedules = useMemo(() => {
    return [...schedules]
      .filter((item) => item.status !== "completed")
      .sort((a, b) => new Date(a.visit_datetime) - new Date(b.visit_datetime));
  }, [schedules, autoRefresh]);

  const dueSchedules = useMemo(() => {
    const now = new Date();
    return activeSchedules.filter((item) => {
      const visitTime = new Date(item.visit_datetime);
      const diffMinutes = (visitTime - now) / (1000 * 60);
      return diffMinutes <= 60 && diffMinutes >= -240;
    });
  }, [activeSchedules, autoRefresh]);

  const completedSchedules = schedules.filter((item) => item.status === "completed");

  const sendAllDueAlerts = async () => {
    for (const item of dueSchedules) {
      if (!item.alert_sent) {
        await sendAlert(item);
      }
    }
  };

  return (
    <div className="followup-page">
      <div className="followup-hero">
        <div>
          <h2>🤖 Automatic Follow-up Scheduler</h2>
          <p>
            The system estimates follow-up dates automatically using risk level,
            diabetes, heart disease, smoking, emergency visits and comorbidity score.
          </p>
        </div>

        <div className="followup-stats">
          <div>
            <strong>{activeSchedules.length}</strong>
            <span>Active</span>
          </div>
          <div>
            <strong>{dueSchedules.length}</strong>
            <span>Due</span>
          </div>
          <div>
            <strong>{completedSchedules.length}</strong>
            <span>Completed</span>
          </div>
        </div>
      </div>

      {message && (
        <div className="followup-message">
          <span>{message}</span>
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      <div className="auto-scheduler-actions">
        <button className="schedule-main-btn" onClick={autoGenerateSchedules}>
          ⚡ Generate Automatic Schedules
        </button>

        <button
          className="schedule-secondary-btn"
          onClick={sendAllDueAlerts}
          disabled={dueSchedules.length === 0}
        >
          📱 Send All Due Alerts
        </button>

        <button className="schedule-danger-btn" onClick={clearSchedules}>
          🗑 Clear Schedules
        </button>
      </div>

      <div className="auto-rule-card">
        <h3>How estimated date is calculated</h3>
        <div className="rule-grid">
          <div><strong>High risk</strong><span>2 days</span></div>
          <div><strong>Medium risk</strong><span>7 days</span></div>
          <div><strong>Low risk</strong><span>14 days</span></div>
          <div><strong>Heart disease</strong><span>within 3 days</span></div>
          <div><strong>Diabetes</strong><span>within 7 days</span></div>
          <div><strong>High comorbidity / ER visits</strong><span>within 5 days</span></div>
        </div>
      </div>

      {dueSchedules.length > 0 && (
        <div className="due-alert-card">
          <h3>🚨 Automatic Alerts Due Now</h3>
          {dueSchedules.map((item) => (
            <div className="due-alert-row" key={item.id}>
              <div>
                <strong>{item.patient_name}</strong>
                <span>{item.patient_phone}</span>
              </div>
              <span className="due-pill">{getTimeLabel(item.visit_datetime)}</span>
              <button onClick={() => sendAlert(item)}>
                {item.alert_sent ? "Resend Alert" : "Send Alert"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="schedule-list-card full-width">
        <h3>Auto Scheduled Patient Visits</h3>

        {activeSchedules.length === 0 ? (
          <div className="empty-scheduler">
            <div>📭</div>
            <p>No automatic schedules yet. Click Generate Automatic Schedules.</p>
          </div>
        ) : (
          activeSchedules.map((item) => (
            <div className={`schedule-card priority-${item.priority.toLowerCase()}`} key={item.id}>
              <div className="schedule-top">
                <div>
                  <h4>{item.patient_name}</h4>
                  <p>{item.patient_id || "No ID"} · {item.patient_phone || "No phone"}</p>
                </div>
                <span className="schedule-time">{getTimeLabel(item.visit_datetime)}</span>
              </div>

              <div className="schedule-details">
                <p><strong>Estimated Visit:</strong> {new Date(item.visit_datetime).toLocaleString()}</p>
                <p><strong>Auto Reason:</strong> {item.reason}</p>
                <p><strong>Risk:</strong> {item.risk_level} ({item.risk_percentage}%)</p>
                <p><strong>Follow-up gap:</strong> {item.days_after_discharge} days after prediction/discharge</p>
                <p><strong>Alert:</strong> {item.alert_sent ? "Sent" : "Not sent"}</p>
              </div>

              <div className="schedule-actions">
                <button onClick={() => sendAlert(item)}>📱 Send Alert</button>
                <button onClick={() => markCompleted(item.id)}>✅ Completed</button>
                <button className="danger" onClick={() => deleteSchedule(item.id)}>🗑 Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
