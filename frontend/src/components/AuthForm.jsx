import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function AuthForm({ isRegister = false }) {
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    age: 25,
    occupation: "farmer",
    annual_income: 100000,
    location_type: "rural",
    gender: "other"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    if (isRegister && !form.name) return;

    setLoading(true);
    setError("");

    try {
      if (isRegister) {
        await register(form);
      } else {
        await login(form.email, form.password);
      }
      // Redirect to protected dashboard on success
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card-panel auth-panel animate-fade-in">
      <h2 className="panel-title text-center">
        {isRegister ? t("authRegisterTitle") : t("authLoginTitle")}
      </h2>
      <p className="panel-subtitle text-center">
        {isRegister ? t("authRegisterSubtitle") : t("authLoginSubtitle")}
      </p>

      {error && <div className="error-message">{error}</div>}

      <form className="profile-form" onSubmit={handleSubmit}>
        {isRegister && (
          <>
            <label className="field">
              <span>{t("authNameLabel") || "Full Name"}</span>
              <input
                type="text"
                placeholder="e.g. Rahul Kumar"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label className="field">
                <span>{t("profileAge")}</span>
                <input
                  type="number"
                  min="18" max="120"
                  value={form.age}
                  onChange={(e) => update("age", parseInt(e.target.value) || 0)}
                  required
                />
              </label>
              <label className="field">
                <span>{t("profileIncome")}</span>
                <input
                  type="number"
                  min="0"
                  value={form.annual_income}
                  onChange={(e) => update("annual_income", parseInt(e.target.value) || 0)}
                  required
                />
              </label>
            </div>
            <label className="field">
              <span>{t("profileOccupation")}</span>
              <select value={form.occupation} onChange={(e) => update("occupation", e.target.value)}>
                <option value="farmer">{t("farmer")}</option>
                <option value="student">{t("student")}</option>
                <option value="unemployed">{t("unemployed")}</option>
                <option value="self-employed">{t("self-employed")}</option>
                <option value="salaried">{t("salaried")}</option>
                <option value="any">{t("any")}</option>
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label className="field">
                <span>{t("profileArea")}</span>
                <select value={form.location_type} onChange={(e) => update("location_type", e.target.value)}>
                  <option value="rural">{t("rural")}</option>
                  <option value="urban">{t("urban")}</option>
                </select>
              </label>
              <label className="field">
                <span>{t("profileGender")}</span>
                <select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                  <option value="other">{t("other")}</option>
                </select>
              </label>
            </div>
          </>
        )}

        <label className="field">
          <span>{t("authEmailLabel")}</span>
          <input
            type="email"
            placeholder="e.g. rahul@example.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>{t("authPasswordLabel")}</span>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
          />
        </label>

        <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
          {loading ? t("profileUpdating") : isRegister ? t("authRegisterBtn") : t("authLoginBtn")}
        </button>

        <div className="auth-footer-link text-center">
          {isRegister ? (
            <>
              {t("authHaveAccount")}{" "}
              <Link to="/login" className="link-highlight">
                {t("navLogin")}
              </Link>
            </>
          ) : (
            <>
              {t("authNoAccount")}{" "}
              <Link to="/register" className="link-highlight">
                {t("navRegister")}
              </Link>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
