import React from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "mr", label: "मराठी" },
  { code: "bn", label: "বাংলা" },
  { code: "te", label: "తెలుగు" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "gu", label: "ગુજરાતી" }
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const handleChange = (e) => {
    setLanguage(e.target.value);
  };

  return (
    <div className="lang-switcher-wrapper">
      <span className="lang-globe-icon" role="img" aria-label="language">🌐</span>
      <select 
        value={language} 
        onChange={handleChange} 
        className="lang-select-dropdown"
        aria-label="Select Language"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
