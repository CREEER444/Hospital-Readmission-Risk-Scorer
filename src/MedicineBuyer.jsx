import React, { useMemo, useState } from "react";
import "./MedicineBuyer.css";

const MEDICINES = [
  { id: 1, name: "Paracetamol 500mg", category: "Fever / Pain", use: "Fever, headache and mild body pain", warning: "Avoid overdose. Consult doctor for liver disease.", price: 25, query: "paracetamol 500" },
  { id: 2, name: "Metformin 500mg", category: "Diabetes", use: "Common medicine for type 2 diabetes management", warning: "Use only with doctor prescription. Monitor sugar levels.", price: 45, query: "metformin 500" },
  { id: 3, name: "Amlodipine 5mg", category: "Heart / BP", use: "High blood pressure control", warning: "Use only as prescribed. Do not stop suddenly.", price: 38, query: "amlodipine 5" },
  { id: 4, name: "Pantoprazole 40mg", category: "Acidity", use: "Acidity, gastritis and acid reflux", warning: "Take before food if prescribed.", price: 55, query: "pantoprazole 40" },
  { id: 5, name: "Azithromycin 500mg", category: "Antibiotic", use: "Bacterial infection treatment", warning: "Prescription required. Do not self-medicate antibiotics.", price: 85, query: "azithromycin 500" },
  { id: 6, name: "Atorvastatin 10mg", category: "Cholesterol / Heart", use: "Cholesterol management and heart risk reduction", warning: "Use only under medical supervision.", price: 70, query: "atorvastatin 10" },
  { id: 7, name: "Salbutamol Inhaler", category: "Respiratory", use: "Breathing difficulty and asthma support", warning: "Use only as directed by doctor.", price: 160, query: "salbutamol inhaler" },
  { id: 8, name: "ORS Sachet", category: "Dehydration", use: "Dehydration and electrolyte replacement", warning: "Mix with clean water as instructed.", price: 20, query: "ors" }
];

const makeLinks = (query) => ({
  "Tata 1mg": `https://www.1mg.com/search/all?name=${encodeURIComponent(query)}`,
  "Apollo": `https://www.apollopharmacy.in/search-medicines/${encodeURIComponent(query)}`,
  "PharmEasy": `https://pharmeasy.in/search/all?name=${encodeURIComponent(query)}`,
  "Netmeds": `https://www.netmeds.com/catalogsearch/result/${encodeURIComponent(query)}/all`
});

export default function MedicineBuyer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [patientType, setPatientType] = useState("general");

  const categories = ["All", ...new Set(MEDICINES.map((m) => m.category))];

  const filteredMedicines = useMemo(() => {
    return MEDICINES.filter((medicine) => {
      const matchQuery =
        medicine.name.toLowerCase().includes(query.toLowerCase()) ||
        medicine.category.toLowerCase().includes(query.toLowerCase()) ||
        medicine.use.toLowerCase().includes(query.toLowerCase());
      const matchCategory = category === "All" || medicine.category === category;
      return matchQuery && matchCategory;
    });
  }, [query, category]);

  const recommendedMedicines = useMemo(() => {
    if (patientType === "diabetes") return MEDICINES.filter((m) => ["Diabetes", "Heart / BP", "Cholesterol / Heart"].includes(m.category));
    if (patientType === "heart") return MEDICINES.filter((m) => ["Heart / BP", "Cholesterol / Heart"].includes(m.category));
    if (patientType === "respiratory") return MEDICINES.filter((m) => ["Respiratory", "Fever / Pain"].includes(m.category));
    return MEDICINES.slice(0, 4);
  }, [patientType]);

  const addToCart = (medicine) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === medicine.id);
      if (exists) return prev.map((item) => item.id === medicine.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...medicine, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((item) => item.id !== id));
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const openBuyLink = (url) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div className="medicine-page">
      <div className="medicine-hero">
        <div>
          <h2>💊 Online Medicine Buyer</h2>
          <p>Search medicines, view safety notes, add to cart and buy through trusted pharmacy platforms.</p>
        </div>
        <div className="medicine-hero-stats">
          <div><strong>{MEDICINES.length}</strong><span>Medicines</span></div>
          <div><strong>{cart.length}</strong><span>Cart Items</span></div>
          <div><strong>4</strong><span>Platforms</span></div>
        </div>
      </div>

      <div className="medicine-warning">
        ⚠️ Demo feature for hackathon. Prescription medicines should be taken only after doctor consultation.
      </div>

      <div className="medicine-layout">
        <div className="medicine-left">
          <div className="medicine-controls">
            <input type="text" placeholder="Search medicine, disease or use..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((cat) => <option key={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="ai-recommend-card">
            <div className="ai-recommend-head">
              <h3>🤖 Smart Medicine Suggestions</h3>
              <select value={patientType} onChange={(e) => setPatientType(e.target.value)}>
                <option value="general">General patient</option>
                <option value="diabetes">Diabetes patient</option>
                <option value="heart">Heart/BP patient</option>
                <option value="respiratory">Respiratory patient</option>
              </select>
            </div>
            <div className="recommend-pills">
              {recommendedMedicines.map((medicine) => (
                <button key={medicine.id} onClick={() => addToCart(medicine)}>+ {medicine.name}</button>
              ))}
            </div>
          </div>

          <div className="medicine-grid">
            {filteredMedicines.map((medicine) => {
              const links = makeLinks(medicine.query);
              return (
                <div className="medicine-card" key={medicine.id}>
                  <div className="medicine-card-top">
                    <div className="medicine-icon">💊</div>
                    <span>{medicine.category}</span>
                  </div>
                  <h3>{medicine.name}</h3>
                  <p>{medicine.use}</p>
                  <div className="medicine-alert">{medicine.warning}</div>
                  <div className="medicine-price-row">
                    <strong>₹{medicine.price}</strong>
                    <button onClick={() => addToCart(medicine)}>Add to Cart</button>
                  </div>
                  <div className="buy-links">
                    {Object.entries(links).map(([platform, url]) => (
                      <button key={platform} onClick={() => openBuyLink(url)}>Buy on {platform}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="medicine-cart-card">
          <h3>🛒 Medicine Cart</h3>
          {cart.length === 0 ? (
            <div className="empty-cart"><div>🛒</div><p>No medicines added yet.</p></div>
          ) : (
            <>
              <div className="cart-list">
                {cart.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div><strong>{item.name}</strong><span>Qty: {item.qty} · ₹{item.price * item.qty}</span></div>
                    <button onClick={() => removeFromCart(item.id)}>×</button>
                  </div>
                ))}
              </div>
              <div className="cart-total"><span>Total Estimate</span><strong>₹{cartTotal}</strong></div>
              <button className="checkout-btn" onClick={() => openBuyLink("https://www.1mg.com")}>Continue on Tata 1mg</button>
              <button className="checkout-secondary" onClick={() => openBuyLink("https://www.apollopharmacy.in")}>Continue on Apollo</button>
            </>
          )}
          <div className="prescription-box">
            <h4>📄 Prescription Note</h4>
            <p>For antibiotics, BP, diabetes and heart medicines, upload prescription on pharmacy website during checkout.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
