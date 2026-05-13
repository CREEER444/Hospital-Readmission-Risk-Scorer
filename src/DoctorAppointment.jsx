import React, { useEffect, useMemo, useState } from "react";
import "./DoctorAppointment.css";

const STORAGE_KEY = "hospitalDoctorAppointments";

const DOCTORS = [
  { id: "D001", name: "Dr. Ananya Rao", department: "General Medicine", experience: "8 years", fee: 500, slots: ["09:30 AM", "10:30 AM", "11:30 AM", "03:00 PM"] },
  { id: "D002", name: "Dr. Rohan Shetty", department: "Cardiology", experience: "12 years", fee: 900, slots: ["10:00 AM", "12:00 PM", "04:00 PM", "05:00 PM"] },
  { id: "D003", name: "Dr. Meera Nair", department: "Diabetology", experience: "10 years", fee: 700, slots: ["09:00 AM", "11:00 AM", "02:30 PM", "04:30 PM"] },
  { id: "D004", name: "Dr. Arjun Bhat", department: "Pulmonology", experience: "9 years", fee: 750, slots: ["10:15 AM", "12:15 PM", "03:15 PM", "05:15 PM"] },
  { id: "D005", name: "Dr. Kavya Hegde", department: "Emergency Care", experience: "7 years", fee: 650, slots: ["08:30 AM", "01:00 PM", "06:00 PM", "08:00 PM"] }
];

export default function DoctorAppointment() {
  const [appointments, setAppointments] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  });

  const [filter, setFilter] = useState("All");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [form, setForm] = useState({
    patient_id: "",
    patient_name: "",
    patient_phone: "",
    appointment_date: "",
    reason: "Follow-up consultation"
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  }, [appointments]);

  const departments = ["All", ...new Set(DOCTORS.map((doctor) => doctor.department))];

  const filteredDoctors = useMemo(() => {
    if (filter === "All") return DOCTORS;
    return DOCTORS.filter((doctor) => doctor.department === filter);
  }, [filter]);

  const stats = {
    doctors: DOCTORS.length,
    booked: appointments.filter((a) => a.status === "booked").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const getAvailableSlots = (doctor) => {
    if (!form.appointment_date) return doctor.slots;
    return doctor.slots.filter((slot) => {
      return !appointments.some(
        (item) =>
          item.doctor_id === doctor.id &&
          item.appointment_date === form.appointment_date &&
          item.slot === slot &&
          item.status === "booked"
      );
    });
  };

  const bookAppointment = (e) => {
    e.preventDefault();

    if (!selectedDoctor) return setMessage("Please select a doctor.");
    if (!selectedSlot) return setMessage("Please select a time slot.");
    if (!form.patient_name || !form.patient_phone || !form.appointment_date) {
      return setMessage("Please fill patient name, phone and appointment date.");
    }

    const appointmentExists = appointments.some(
      (item) =>
        item.doctor_id === selectedDoctor.id &&
        item.appointment_date === form.appointment_date &&
        item.slot === selectedSlot &&
        item.status === "booked"
    );

    if (appointmentExists) {
      return setMessage("This slot is already booked. Please select another slot.");
    }

    const newAppointment = {
      id: Date.now(),
      patient_id: form.patient_id || "N/A",
      patient_name: form.patient_name,
      patient_phone: form.patient_phone,
      appointment_date: form.appointment_date,
      slot: selectedSlot,
      reason: form.reason,
      doctor_id: selectedDoctor.id,
      doctor_name: selectedDoctor.name,
      department: selectedDoctor.department,
      fee: selectedDoctor.fee,
      status: "booked",
      created_at: new Date().toISOString()
    };

    setAppointments((prev) => [newAppointment, ...prev]);
    setMessage(`Appointment booked with ${selectedDoctor.name} at ${selectedSlot}.`);
    setForm({ patient_id: "", patient_name: "", patient_phone: "", appointment_date: "", reason: "Follow-up consultation" });
    setSelectedDoctor(null);
    setSelectedSlot("");
  };

  const updateStatus = (id, status) => {
    setAppointments((prev) => prev.map((item) => item.id === id ? { ...item, status } : item));
  };

  return (
    <div className="appointment-page">
      <div className="appointment-hero">
        <div>
          <h2>👨‍⚕️ Live Doctor Appointment Booking</h2>
          <p>Book doctor slots, manage appointment status, and track patient consultations.</p>
        </div>
        <div className="appointment-stats">
          <div><strong>{stats.doctors}</strong><span>Doctors</span></div>
          <div><strong>{stats.booked}</strong><span>Booked</span></div>
          <div><strong>{stats.completed}</strong><span>Completed</span></div>
          <div><strong>{stats.cancelled}</strong><span>Cancelled</span></div>
        </div>
      </div>

      {message && (
        <div className="appointment-message">
          <span>{message}</span>
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      <div className="appointment-layout">
        <div className="doctor-panel">
          <div className="doctor-filter">
            <h3>Available Doctors</h3>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              {departments.map((dept) => <option key={dept}>{dept}</option>)}
            </select>
          </div>

          <div className="doctor-list">
            {filteredDoctors.map((doctor) => (
              <div
                className={`doctor-card ${selectedDoctor?.id === doctor.id ? "selected" : ""}`}
                key={doctor.id}
                onClick={() => { setSelectedDoctor(doctor); setSelectedSlot(""); }}
              >
                <div className="doctor-avatar">🩺</div>
                <div>
                  <h4>{doctor.name}</h4>
                  <p>{doctor.department}</p>
                  <small>{doctor.experience} · Fee ₹{doctor.fee}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form className="booking-panel" onSubmit={bookAppointment}>
          <h3>Book Appointment</h3>

          <div className="form-row">
            <div className="form-group">
              <label>Patient ID</label>
              <input name="patient_id" value={form.patient_id} onChange={handleChange} placeholder="P001" />
            </div>
            <div className="form-group">
              <label>Patient Name *</label>
              <input name="patient_name" value={form.patient_name} onChange={handleChange} placeholder="Patient name" required />
            </div>
          </div>

          <div className="form-group">
            <label>Patient Phone *</label>
            <input name="patient_phone" value={form.patient_phone} onChange={handleChange} placeholder="+919876543210" required />
          </div>

          <div className="form-group">
            <label>Appointment Date *</label>
            <input type="date" name="appointment_date" value={form.appointment_date} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Reason</label>
            <select name="reason" value={form.reason} onChange={handleChange}>
              <option>Follow-up consultation</option>
              <option>Emergency consultation</option>
              <option>Diabetes check-up</option>
              <option>Heart/BP consultation</option>
              <option>Respiratory problem</option>
              <option>General check-up</option>
              <option>Report review</option>
            </select>
          </div>

          {selectedDoctor ? (
            <div className="selected-doctor-box">
              <strong>{selectedDoctor.name}</strong>
              <span>{selectedDoctor.department} · ₹{selectedDoctor.fee}</span>
            </div>
          ) : (
            <div className="selected-doctor-box muted">Select a doctor from the left side.</div>
          )}

          {selectedDoctor && (
            <div className="slot-box">
              <label>Available Slots</label>
              <div className="slot-grid">
                {getAvailableSlots(selectedDoctor).map((slot) => (
                  <button type="button" className={selectedSlot === slot ? "active" : ""} key={slot} onClick={() => setSelectedSlot(slot)}>
                    {slot}
                  </button>
                ))}
                {getAvailableSlots(selectedDoctor).length === 0 && <p>No slots available for selected date.</p>}
              </div>
            </div>
          )}

          <button className="appointment-primary-btn" type="submit">✅ Book Appointment</button>
        </form>
      </div>

      <div className="appointments-card">
        <h3>Booked Appointments</h3>
        {appointments.length === 0 ? (
          <div className="empty-appointments"><div>📭</div><p>No appointments booked yet.</p></div>
        ) : (
          <div className="appointment-list">
            {appointments.map((item) => (
              <div className={`appointment-item ${item.status}`} key={item.id}>
                <div>
                  <h4>{item.patient_name}</h4>
                  <p>{item.patient_phone} · {item.patient_id}</p>
                  <small>{item.doctor_name} · {item.department}<br />{item.appointment_date} at {item.slot} · ₹{item.fee}<br />Reason: {item.reason}</small>
                </div>
                <div className="appointment-actions">
                  <span>{item.status.toUpperCase()}</span>
                  {item.status === "booked" && (
                    <>
                      <button onClick={() => updateStatus(item.id, "completed")}>Complete</button>
                      <button className="cancel" onClick={() => updateStatus(item.id, "cancelled")}>Cancel</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
