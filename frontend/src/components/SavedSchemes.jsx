import React from "react";
import SchemeCard from "./SchemeCard.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function SavedSchemes({ savedSchemes, onToggleSave }) {
  const { t } = useLanguage();

  // Filter out any entries where scheme data couldn't be loaded
  const validItems = savedSchemes.filter((item) => item.scheme);

  return (
    <section className="card-panel saved-panel animate-fade-in">
      <h2 className="panel-title">{t("savedTitle")}</h2>
      <p className="panel-subtitle">{t("savedSubtitle")}</p>

      {validItems.length === 0 ? (
        <div className="empty-state-container">
          <p className="empty-state">{t("noSaved")}</p>
        </div>
      ) : (
        <div className="scheme-list">
          {validItems.map((item) => (
            <SchemeCard
              key={item.scheme_id}
              item={{
                scheme: item.scheme,
                match_score: 100,
                reasons: []
              }}
              isSaved={true}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </section>
  );
}
