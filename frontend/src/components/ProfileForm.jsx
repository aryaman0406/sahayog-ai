import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

const OCCUPATIONS = ["farmer", "student", "self-employed", "unemployed", "salaried", "any"];
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" }
];

export default function ProfileForm({ onSubmit }) {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  
  const [form, setForm] = useState({
    age: "",
    occupation: "farmer",
    annual_income: "",
    location_type: "rural",
    gender: "male",
    language: "en",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load existing profile from user context if available
  useEffect(() => {
    if (user) {
      setForm({
        age: user.age !== undefined ? user.age.toString() : "",
        occupation: user.occupation || "farmer",
        annual_income: user.annual_income !== undefined ? user.annual_income.toString() : "",
        location_type: user.location_type || "rural",
        gender: user.gender || "male",
        language: user.language || "en",
      });
    }
  }, [user]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.age || !form.annual_income) return;

    setSubmitting(true);
    setError("");
    const formattedProfile = {
      ...form,
      age: Number.parseInt(form.age, 10),
      annual_income: Number.parseInt(form.annual_income, 10),
    };

    try {
      // Save profile persistently in MongoDB
      await updateProfile(formattedProfile);
      
      // Trigger schemes match matching logic
      if (onSubmit) {
        onSubmit(formattedProfile);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card-panel form-panel animate-fade-in">
      <p className="panel-label">{t("profileFormTitle")}</p>
      <h2 className="panel-title">{t("profileFormSubtitle")}</h2>

      {error && <div className="error-message">{error}</div>}

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="field-row">
          <label className="field">
            <span>{t("profileAge")}</span>
            <input
              type="number"
              min="0"
              max="120"
              placeholder="e.g. 34"
              value={form.age}
              onChange={(e) => update("age", e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>{t("profileIncome")}</span>
            <input
              type="number"
              min="0"
              placeholder="e.g. 120000"
              value={form.annual_income}
              onChange={(e) => update("annual_income", e.target.value)}
              required
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>{t("profileOccupation")}</span>
            <select value={form.occupation} onChange={(e) => update("occupation", e.target.value)}>
              {OCCUPATIONS.map((o) => (
                <option key={o} value={o}>
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("profileArea")}</span>
            <div className="toggle-group">
              <button
                type="button"
                className={form.location_type === "rural" ? "toggle active" : "toggle"}
                onClick={() => update("location_type", "rural")}
              >
                Rural
              </button>
              <button
                type="button"
                className={form.location_type === "urban" ? "toggle active" : "toggle"}
                onClick={() => update("location_type", "urban")}
              >
                Urban
              </button>
            </div>
          </label>
        </div>

        <label className="field">
          <span>{t("profileGender")}</span>
          <div className="toggle-group">
            {["male", "female", "other"].map((g) => (
              <button
                key={g}
                type="button"
                className={form.gender === g ? "toggle active" : "toggle"}
                onClick={() => update("gender", g)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </label>

        <label className="field">
          <span>{t("profileLanguage")}</span>
          <select value={form.language} onChange={(e) => update("language", e.target.value)}>
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="form-actions">
          <button type="submit" className="btn-primary w-full justify-center" disabled={submitting}>
            {submitting ? t("profileUpdating") : t("profileSubmit")} <span className="btn-arrow">→</span>
          </button>
        </div>
      </form>
    </section>
  );
}
