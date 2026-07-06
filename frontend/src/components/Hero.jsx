import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Hero({ isLanding = true }) {
  const { t } = useLanguage();

  return (
    <header className={isLanding ? "hero hero-landing" : "hero hero-compact"}>
      <div className="hero-seal" aria-hidden="true">
        <svg viewBox="0 0 120 120" width="70" height="70">
          <circle cx="60" cy="60" r="56" fill="none" stroke="var(--marigold)" strokeWidth="2.5" />
          <circle cx="60" cy="60" r="44" fill="none" stroke="var(--marigold)" strokeWidth="1.25" strokeDasharray="2 4" />
          <text x="60" y="70" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="36" fill="var(--marigold)">स</text>
        </svg>
      </div>

      <p className="hero-eyebrow">{t("heroEyebrow")}</p>

      <h1 className="hero-title">
        {t("heroTitle")}
      </h1>

      <p className="hero-sub">
        {t("heroSubtitle")}
      </p>

      {isLanding && (
        <Link to="/dashboard" className="btn-primary hero-cta">
          {t("heroCTA")} <span className="btn-arrow">→</span>
        </Link>
      )}

      {isLanding && (
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-num">1200+</span>
            <span className="hero-stat-label">{t("statSchemes")}</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-num">Instant</span>
            <span className="hero-stat-label">{t("statTime")}</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-num">10k+</span>
            <span className="hero-stat-label">{t("statUsers")}</span>
          </div>
        </div>
      )}
    </header>
  );
}
