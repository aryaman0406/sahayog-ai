import React, { createContext, useContext, useState, useEffect } from "react";
import { en } from "../i18n/en.js";
import { hi } from "../i18n/hi.js";
import { ta } from "../i18n/ta.js";
import { mr } from "../i18n/mr.js";
import { bn } from "../i18n/bn.js";
import { te, gu, kn } from "../i18n/te_gu_kn.js";

const LanguageContext = createContext(null);

const dictionary = { en, hi, ta, mr, bn, te, gu, kn };

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem("language");
    return dictionary[saved] ? saved : "en";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const t = (key) => {
    const langDict = dictionary[language] || dictionary.en;
    return langDict[key] || dictionary.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
