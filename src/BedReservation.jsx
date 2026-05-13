import React, { useEffect, useMemo, useState } from "react";
import "./BedReservation.css";

const STORAGE_KEY = "hospitalBedReservations";

const DEFAULT_BEDS = [
  { id: "G-101", type: "General", status: "available" },
  { id: "G-102", type: "General", status: "available" },
  { id: "G-103", type: "General", status: "available" },
  { id: "G-104", type: "General", status: "available" },
  { id: "P-201", type: "Private", status: "available" },
  { id: "P-202", type: "Private", status: "available" },
  { id: "ICU-1", type: "ICU", status: "available" },
  { id: "ICU-2", type: "ICU", status: "available" },
  { id: "ER-1", type: "Emergency", status: "available" },
  { id: "ER-2", type: "Emergency", status: "available" }
];

export default function BedReservation() {
  const [beds, setBeds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return saved.length ? saved : DEFAULT_BEDS;
    } catch {
      return DEFAULT_BEDS;
    }
  });

  const [form, setForm] = useState({
    patient_name: "",
    patient_phone: "",
    patient_id: "",
    bed_type: "General"
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(beds));
  }, [beds]);

  const availableBeds = useMemo(() => {
    return beds.filter((bed) => bed.status === "available" && bed.type === form.bed_type);
  }, [beds, form.bed_type]);

  const stats = {
    total: beds.length,
    available: beds.filter((bed) => bed.status === "available").length,
    reserved: beds.filter((bed) => bed.status === "reserved").length,
    occupied: beds.filter((bed) => bed.status === "occupied").length
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const reserveBed = (e) => {
    e.preventDefault();

    if (!form.patient_name || !form.patient_phone) {
      setMessage("Please enter patient name and phone number.");
      return;
    }

    if (!availableBeds.length) {
      setMessage(`No ${form.bed_type} beds available right now.`);
      return;
    }

    const selectedBed = availableBeds[0];

    setBeds((prev) =>
      prev.map((bed) =>
        bed.id === selectedBed.id
          ? {
              ...bed,
              status: "reserved",
              patient_name: form.patient_name,
              patient_phone: form.patient_phone,
              patient_id: form.patient_id || "N/A",
              reserved_at: new Date().toISOString(),
              checked_in_at: null
            }
          : bed
      )
    );

    setMessage(`Bed ${selectedBed.id} reserved for ${form.patient_name}.`);

    setForm({
      patient_name: "",
      patient_phone: "",
      patient_id: "",
      bed_type: "General"
    });
  };

  const checkInPatient = (bedId) => {
    setBeds((prev) =>
      prev.map((bed) =>
        bed.id === bedId
          ? { ...bed, status: "occupied", checked_in_at: new Date().toISOString() }
          : bed
      )
    );
    setMessage(`Patient checked in to bed ${bedId}.`);
  };

  const releaseBed = (bedId) => {
    setBeds((prev) =>
      prev.map((bed) =>
        bed.id === bedId
          ? {
              ...bed,
              status: "available",
              patient_name: "",
              patient_phone: "",
              patient_id: "",
              reserved_at: null,
              checked_in_at: null
            }
          : bed
      )
    );
    setMessage(`Bed ${bedId} released and available again.`);
  };

  const resetBeds = () => {
    if (!window.confirm("Reset all beds to available?")) return;
    setBeds(DEFAULT_BEDS);
    setMessage("All beds reset to available.");
  };

  return (
    <div className="bed-page">
      <div className="bed-hero">
        <div>
          <h2>🛏️ Bed Reservation & Check-in</h2>
          <p>Reserve beds, check in patients, and release beds after discharge.</p>
        </div>

        <div className="bed-stats">
          <div><strong>{stats.total}</strong><span>Total</span></div>
          <div><strong>{stats.available}</strong><span>Available</span></div>
          <div><strong>{stats.reserved}</strong><span>Reserved</span></div>
          <div><strong>{stats.occupied}</strong><span>Occupied</span></div>
        </div>
      </div>

      {message && (
        <div className="bed-message">
          <span>{message}</span>
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      <div className="bed-layout">
        <form className="bed-form-card" onSubmit={reserveBed}>
          <h3>Reserve Bed for Check-in</h3>

          <div className="form-group">
            <label>Patient ID</label>
            <input name="patient_id" value={form.patient_id} onChange={handleChange} placeholder="P001" />
          </div>

          <div className="form-group">
            <label>Patient Name *</label>
            <input name="patient_name" value={form.patient_name} onChange={handleChange} placeholder="Patient name" required />
          </div>

          <div className="form-group">
            <label>Patient Phone *</label>
            <input name="patient_phone" value={form.patient_phone} onChange={handleChange} placeholder="+919876543210" required />
          </div>

          <div className="form-group">
            <label>Bed Type</label>
            <select name="bed_type" value={form.bed_type} onChange={handleChange}>
              <option>General</option>
              <option>Private</option>
              <option>ICU</option>
              <option>Emergency</option>
            </select>
          </div>

          <div className="bed-availability-note">
            Available {form.bed_type} beds: <strong>{availableBeds.length}</strong>
          </div>

          <button className="bed-primary-btn" type="submit">🛏️ Reserve Bed</button>
          <button className="bed-reset-btn" type="button" onClick={resetBeds}>Reset Bed Data</button>
        </form>

        <div className="bed-list-card">
          <h3>Live Bed Status</h3>

          <div className="bed-type-summary">
            {["General", "Private", "ICU", "Emergency"].map((type) => (
              <div key={type}>
                <strong>{type}</strong>
                <span>{beds.filter((bed) => bed.type === type && bed.status === "available").length} available</span>
              </div>
            ))}
          </div>

          <div className="bed-list">
            {beds.map((bed) => (
              <div className={`bed-item ${bed.status}`} key={bed.id}>
                <div className="bed-info">
                  <h4>{bed.id}</h4>
                  <p>{bed.type}</p>
                  {bed.patient_name && <small>{bed.patient_id} · {bed.patient_name} · {bed.patient_phone}</small>}
                </div>

                <div className="bed-actions">
                  <span className={`bed-status ${bed.status}`}>{bed.status.toUpperCase()}</span>

                  {bed.status === "reserved" && <button onClick={() => checkInPatient(bed.id)}>✅ Check-in</button>}
                  {bed.status === "occupied" && <button onClick={() => releaseBed(bed.id)}>🚪 Discharge</button>}
                  {bed.status === "reserved" && <button className="cancel" onClick={() => releaseBed(bed.id)}>Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
