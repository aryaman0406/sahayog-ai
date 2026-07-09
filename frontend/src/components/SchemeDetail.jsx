import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { translateText } from "../utils/translate.js";

const CATEGORY_EMOJIS = {
  agriculture: "🌾",
  healthcare: "🏥",
  housing: "🏠",
  education: "🎓",
  household: "🔥",
  pension: "👵",
  general: "📜"
};

// Extract a real URL from how_to_apply text
function getApplyUrl(scheme) {
  const text = scheme?.how_to_apply || "";
  const urlMatch = text.match(/https?:\/\/[^\s)]+/);
  if (urlMatch) return urlMatch[0];
  if (text.includes("pmkisan.gov.in")) return "https://pmkisan.gov.in";
  if (text.includes("pmjay")) return "https://mera.pmjay.gov.in";
  if (text.includes("pmay")) return "https://pmayg.nic.in";
  const query = encodeURIComponent((scheme?.name || "") + " apply online");
  return `https://www.myscheme.gov.in/search?q=${query}`;
}

// Language labels for eligibility fields
const ELIGIBILITY_LABELS = {
  en: { occupation: "Occupation", age: "Age Limit", income: "Max Annual Income", gender: "Gender", location: "Location", years: "years", upTo: "Up to ₹", translationActive: "Automatic translation active.", loadingTranslation: "Translating details..." },
  hi: { occupation: "व्यवसाय", age: "आयु सीमा", income: "अधिकतम वार्षिक आय", gender: "लिंग", location: "क्षेत्र", years: "वर्ष", upTo: "अधिकतम ₹", translationActive: "🇮🇳 स्वचालित अनुवाद सक्रिय है।", loadingTranslation: "विवरण का अनुवाद किया जा रहा है..." },
  ta: { occupation: "தொழில்", age: "வயது வரம்பு", income: "அதிகபட்ச ஆண்டு வருமானம்", gender: "பாலினம்", location: "இருப்பிடம்", years: "ஆண்டுகள்", upTo: "அதிகபட்சம் ₹", translationActive: "🇮🇳 தானியங்கி மொழிபெயர்ப்பு செயலில் உள்ளது.", loadingTranslation: "விவரங்களை மொழிபெயர்க்கிறது..." },
  mr: { occupation: "व्यवसाय", age: "वय मर्यादा", income: "कमाल वार्षिक उत्पन्न", gender: "लिंग", location: "स्थान", years: "वर्षे", upTo: "कमाल ₹", translationActive: "🇮🇳 स्वयंचलित भाषांतर सक्रिय आहे.", loadingTranslation: "तपशील भाषांतरित करत आहे..." },
  bn: { occupation: "পেশা", age: "বয়সসীমা", income: "সর্বোচ্চ বার্ষিক আয়", gender: "লিঙ্গ", location: "অবস্থান", years: "বছর", upTo: "সর্বোচ্চ ₹", translationActive: "🇮🇳 স্বয়ংক্রিয় অনুবাদ সক্রিয় আছে।", loadingTranslation: "অনুবাদ করা হচ্ছে..." },
  te: { occupation: "వృత్తి", age: "వయోపరిమితి", income: "గరిష్ట వార్షిక ఆదాయం", gender: "లింగం", location: "ప్రాంతం", years: "సంవత్సరాలు", upTo: "గరిష్టంగా ₹", translationActive: "🇮🇳 స్వయంచాలక అనువాదం అందుబాటులో ఉంది.", loadingTranslation: "అనువదిస్తోంది..." },
  gu: { occupation: "વ્યવસાય", age: "વય મર્યાદા", income: "મહત્તમ વાર્ષિક આવક", gender: "લિંગ", location: "વિસ્તાર", years: "વર્ષ", upTo: "મહત્તમ ₹", translationActive: "🇮🇳 સ્વચાલિત અનુવાદ સક્રિય છે.", loadingTranslation: "અનુવાદ થઈ રહ્યો છે..." },
  kn: { occupation: "ಉದ್ಯೋಗ", age: "ವಯೋಮಿತಿ", income: "ಗರಿಷ್ಠ ವಾರ್ಷಿಕ ಆದಾಯ", gender: "ಲಿಂಗ", location: "ಸ್ಥಳ", years: "ವರ್ಷಗಳು", upTo: "ಗರಿಷ್ಠ ₹", translationActive: "🇮🇳 ಸ್ವಯಂಚಾಲಿತ ಅನುವಾದ ಸಕ್ರಿಯವಾಗಿದೆ.", loadingTranslation: "ಅನುವಾದಿಸಲಾಗುತ್ತಿದೆ..." }
};

const CATEGORY_LABELS = {
  en: { agriculture: "Agriculture", healthcare: "Healthcare", housing: "Housing", education: "Education", household: "Household", pension: "Pension", general: "General" },
  hi: { agriculture: "कृषि", healthcare: "स्वास्थ्य", housing: "आवास", education: "शिक्षा", household: "घरेलू", pension: "पेंशन", general: "सामान्य" },
  ta: { agriculture: "வேளாண்மை", healthcare: "சுகாதாரம்", housing: "வீட்டுவசதி", education: "கல்வி", household: "வீட்டு உபயோகம்", pension: "ஓய்வூதியம்", general: "பொதுவான" },
  mr: { agriculture: "कृषि", healthcare: "आरोग्य सेवा", housing: "गृहनिर्माण", education: "शिक्षण", household: "घरगुती", pension: "पेन्शन", general: "सामान्य" },
  bn: { agriculture: "কৃষি", healthcare: "স্বাস্থ্যসেবা", housing: "আবাসন", education: "শিক্ষা", household: "গৃহস্থালী", pension: "পেনশন", general: "সাধারণ" },
  te: { agriculture: "వ్యవసాయం", healthcare: "ఆరోగ్య సంరక్షణ", housing: "గృహనిర్మాణం", education: "విద్య", household: "గృహావసరాలు", pension: "పెన్షన్", general: "సాధారణం" },
  gu: { agriculture: "કૃષિ", healthcare: "આરોગ્ય સંભાળ", housing: "આવાસ", education: "શિક્ષણ", household: "ઘરગથ્થુ", pension: "પેન્શન", general: "સામાન્ય" },
  kn: { agriculture: "ಕೃಷಿ", healthcare: "ಆರೋಗ್ಯ ರಕ್ಷಣೆ", housing: "ವಸತಿ", education: "ಶಿಕ್ಷಣ", household: "ಗೃಹೋಪಯೋಗಿ", pension: "ಪಿಂಚಣಿ", general: "ಸಾಮಾನ್ಯ" }
};

export default function SchemeDetail({ onCheckEligibility }) {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // States for dynamic translation
  const [displayScheme, setDisplayScheme] = useState(null);
  const [translating, setTranslating] = useState(false);

  const L = ELIGIBILITY_LABELS[language] || ELIGIBILITY_LABELS.en;
  const CL = CATEGORY_LABELS[language] || CATEGORY_LABELS.en;

  // 1. Fetch scheme details
  useEffect(() => {
    async function fetchScheme() {
      try {
        setLoading(true);
        const baseUrl = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${baseUrl}/api/schemes/${id}`);
        if (!res.ok) throw new Error("Scheme not found");
        const data = await res.json();
        setScheme(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load scheme details.");
      } finally {
        setLoading(false);
      }
    }
    fetchScheme();
  }, [id]);

  // 2. Perform translation when scheme or language changes
  useEffect(() => {
    if (!scheme) return;

    if (language === "en") {
      setDisplayScheme(scheme);
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

        // Translate similar schemes list if any
        let transSimilar = [];
        if (scheme.similar_schemes) {
          transSimilar = await Promise.all(
            scheme.similar_schemes.map(async (s) => ({
              ...s,
              name: await translateText(s.name, language)
            }))
          );
        }

        if (active) {
          setDisplayScheme({
            ...scheme,
            name: transName,
            description: transDesc,
            benefits: transBenefits,
            how_to_apply: transHowTo,
            documents_required: transDocs,
            similar_schemes: transSimilar
          });
        }
      } catch (err) {
        console.error("Failed to translate details page:", err);
      } finally {
        if (active) setTranslating(false);
      }
    }

    doTranslation();
    return () => {
      active = false;
    };
  }, [scheme, language]);

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/scheme/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCheckEligibility = () => {
    if (onCheckEligibility) onCheckEligibility(scheme);
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <section className="card-panel detail-panel animate-fade-in text-center">
        <p className="empty-state">{language === "hi" ? "योजना विवरण लोड हो रहा है..." : "Loading scheme details..."}</p>
      </section>
    );
  }

  if (error || !scheme || !displayScheme) {
    return (
      <section className="card-panel detail-panel animate-fade-in text-center">
        <h2 className="panel-title">{t("schemeDetailTitle")}</h2>
        <p className="error-message">{error || "Failed to load scheme."}</p>
        <Link to="/" className="btn-ghost">{t("btnBack")}</Link>
      </section>
    );
  }

  const emoji = CATEGORY_EMOJIS[displayScheme.category] || CATEGORY_EMOJIS.general;
  const applyUrl = getApplyUrl(displayScheme);
  const categoryLabel = CL[displayScheme.category] || displayScheme.category;

  return (
    <section className="card-panel detail-panel animate-fade-in">
      {/* Dynamic translation banner */}
      {language !== "en" && (
        <div className="lang-notice-banner">
          {translating ? L.loadingTranslation : L.translationActive}
        </div>
      )}

      <div className="detail-header-row">
        <span className="detail-emoji-large">{emoji}</span>
        <div className="detail-title-col">
          <span className="detail-cat-pill">{categoryLabel}</span>
          <h2 className="panel-title font-serif">
            {translating ? "Translating title..." : displayScheme.name}
          </h2>
        </div>
      </div>

      <p className="detail-description">{displayScheme.description}</p>

      <hr className="detail-divider" />

      <div className="detail-grid">
        <div className="detail-block">
          <h3>{t("schemeBenefits")}</h3>
          <p>{displayScheme.benefits}</p>
        </div>

        <div className="detail-block">
          <h3>{t("schemeEligibility")}</h3>
          <ul className="detail-list">
            <li>
              <strong>{L.occupation}:</strong>{" "}
              {displayScheme.eligibility.occupation?.join(", ")}
            </li>
            <li>
              <strong>{L.age}:</strong>{" "}
              {displayScheme.eligibility.min_age} - {displayScheme.eligibility.max_age} {L.years}
            </li>
            <li>
              <strong>{L.income}:</strong>{" "}
              {L.upTo}{displayScheme.eligibility.max_income?.toLocaleString("en-IN")}
            </li>
            {displayScheme.eligibility.gender && (
              <li>
                <strong>{L.gender}:</strong>{" "}
                {displayScheme.eligibility.gender?.join(", ")}
              </li>
            )}
            <li>
              <strong>{L.location}:</strong>{" "}
              {displayScheme.eligibility.location_type?.join(", ")}
            </li>
          </ul>
        </div>

        <div className="detail-block">
          <h3>{t("schemeDocuments")}</h3>
          <ul className="detail-list">
            {displayScheme.documents_required?.map((doc, idx) => (
              <li key={idx}>{doc}</li>
            ))}
          </ul>
        </div>

        <div className="detail-block">
          <h3>{t("schemeApply")}</h3>
          <p>{displayScheme.how_to_apply}</p>
        </div>
      </div>

      <div className="detail-actions-row">
        <button onClick={handleShare} className="btn-ghost">
          {copied ? t("copiedLink") : `🔗 ${t("btnShare")}`}
        </button>
        <button onClick={handleCheckEligibility} className="btn-ghost">
          {language === "hi" ? "पात्रता जाँचें →" : "Check my eligibility →"}
        </button>
        <a
          href={applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          {t("btnApply")} ↗
        </a>
      </div>

      {/* Similar schemes */}
      {displayScheme.similar_schemes?.length > 0 && (
        <div className="similar-schemes-section">
          <h3>{language === "hi" ? "समान योजनाएं" : "Similar Schemes"}</h3>
          <div className="similar-schemes-list">
            {displayScheme.similar_schemes.map((s) => (
              <Link key={s.id} to={`/scheme/${s.id}`} className="similar-scheme-chip">
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
