import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

const LANGUAGES = [
  { code: "en", flag: "🇺🇸", native: "English", english: "English" },
  { code: "hi", flag: "🇮🇳", native: "हिन्दी", english: "Hindi" },
  { code: "bn", flag: "🇮🇳", native: "বাংলা", english: "Bengali" },
  { code: "ta", flag: "🇮🇳", native: "தமிழ்", english: "Tamil" },
  { code: "te", flag: "🇮🇳", native: "తెలుగు", english: "Telugu" },
  { code: "kn", flag: "🇮🇳", native: "ಕನ್ನಡ", english: "Kannada" },
  { code: "gu", flag: "🇮🇳", native: "ગુજરાતી", english: "Gujarati" },
  { code: "ml", flag: "🇮🇳", native: "മലയാളം", english: "Malayalam" },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="custom-lang-selector" ref={dropdownRef}>
      <button
        type="button"
        className={`lang-trigger-btn ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="lang-trigger-globe">🌐</span>
        <span className="lang-trigger-label">{currentLang.english}</span>
        <span className={`lang-chevron ${isOpen ? "rotate" : ""}`}>▾</span>
      </button>

      {isOpen && (
        <div className="lang-dropdown-menu animate-fade-in" role="listbox">
          <div className="lang-options-list">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  className={`lang-option-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelect(lang.code)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="lang-flag">{lang.flag}</span>
                  <span className="lang-native-text">{lang.native}</span>
                  <span className="lang-english-text">{lang.english}</span>
                  {isSelected && <span className="lang-check">✓</span>}
                </button>
              );
            })}
          </div>
          <div className="lang-dropdown-footer">
            <span>More Languages Coming Soon</span>
          </div>
        </div>
      )}
    </div>
  );
}
