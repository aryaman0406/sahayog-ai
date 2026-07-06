import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { translateText } from "../utils/translate.js";

// Extract a URL from how_to_apply text, or build a gov search fallback
function getApplyUrl(scheme) {
  const text = scheme.how_to_apply || "";
  const urlMatch = text.match(/https?:\/\/[^\s)]+/);
  if (urlMatch) return urlMatch[0];
  // Try known portals
  if (text.includes("pmkisan.gov.in")) return "https://pmkisan.gov.in";
  if (text.includes("pmjay")) return "https://mera.pmjay.gov.in";
  if (text.includes("pmay")) return "https://pmayg.nic.in";
  if (text.includes("myscheme")) return "https://www.myscheme.gov.in";
  // Default: search on India's official scheme portal
  const query = encodeURIComponent(scheme.name + " apply online");
  return `https://www.myscheme.gov.in/search?q=${query}`;
}

const CATEGORY_EMOJIS = {
  agriculture: "🌾",
  healthcare: "🏥",
  housing: "🏠",
  education: "🎓",
  household: "🔥",
  pension: "👵",
  general: "📜"
};

export default function SchemeCard({ item, isSaved, onToggleSave }) {
  const { t, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const { scheme, match_score, reasons } = item;

  // Local state for translating scheme content
  const [displayScheme, setDisplayScheme] = useState(scheme);
  const [displayReasons, setDisplayReasons] = useState(reasons || []);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    // Reset to English immediately if user toggles back
    if (language === "en") {
      setDisplayScheme(scheme);
      setDisplayReasons(reasons || []);
      return;
    }

    let active = true;
    async function doTranslation() {
      setTranslating(true);
      try {
        const [transName, transDesc, transBenefits, transHowTo] = await Promise.all([
          translateText(scheme.name, language),
          translateText(scheme.description, language),
          translateText(scheme.benefits, language),
          translateText(scheme.how_to_apply, language)
        ]);

        const docs = scheme.documents_required || [];
        const transDocs = await Promise.all(
          docs.map((doc) => translateText(doc, language))
        );

        const transReasons = await Promise.all(
          (reasons || []).map((r) => translateText(r, language))
        );

        if (active) {
          setDisplayScheme({
            ...scheme,
            name: transName,
            description: transDesc,
            benefits: transBenefits,
            how_to_apply: transHowTo,
            documents_required: transDocs
          });
          setDisplayReasons(transReasons);
        }
      } catch (err) {
        console.error("Failed to translate card data:", err);
      } finally {
        if (active) setTranslating(false);
      }
    }

    doTranslation();
    return () => {
      active = false;
    };
  }, [scheme, reasons, language]);

  const emoji = CATEGORY_EMOJIS[scheme.category] || CATEGORY_EMOJIS.general;

  const handleSaveClick = (e) => {
    e.stopPropagation();
    if (onToggleSave) {
      onToggleSave(scheme.id);
    }
  };

  return (
    <div className={`scheme-card animate-fade-in ${translating ? "translating-pulse" : ""}`}>
      <div 
        className="scheme-card-head" 
        onClick={() => setExpanded(!expanded)}
        role="button"
        aria-expanded={expanded}
      >
        <span className="scheme-icon" role="img" aria-label={displayScheme.category}>
          {emoji}
        </span>
        <div className="scheme-head-text">
          <span className="scheme-name">
            {translating ? "Translating..." : displayScheme.name}
          </span>
          <span className="scheme-desc">{displayScheme.description}</span>
        </div>
        {match_score !== undefined && (
          <span className="scheme-score">
            {t("matchScore")}: {match_score}%
          </span>
        )}
      </div>

      <div className={`scheme-card-body ${expanded ? "open" : ""}`}>
        {displayReasons && displayReasons.length > 0 && (
          <div className="scheme-detail-row">
            <strong>{t("schemeEligibility")}</strong>
            <ul className="reason-list">
              {displayReasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="scheme-detail-row">
          <strong>{t("schemeBenefits")}</strong>
          <p>{displayScheme.benefits}</p>
        </div>

        <div className="scheme-detail-row">
          <strong>{t("schemeDocuments")}</strong>
          <p>{displayScheme.documents_required?.join(", ")}</p>
        </div>

        <div className="scheme-card-actions">
          <Link to={`/scheme/${displayScheme.id}`} className="btn-ghost text-center">
            {t("navHome")} / Detail →
          </Link>
          <div className="scheme-action-right">
            <button 
              onClick={handleSaveClick} 
              className={`btn-save-bookmark ${isSaved ? "saved" : "btn-ghost"}`}
            >
              {isSaved ? `★ ${t("btnSaved")}` : `☆ ${t("btnSave")}`}
            </button>
            <a 
              href={getApplyUrl(displayScheme)} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-primary"
            >
              {t("btnApply")} ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
