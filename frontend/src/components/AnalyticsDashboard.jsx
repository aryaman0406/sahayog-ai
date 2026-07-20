import React, { useMemo } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AnalyticsDashboard({ matches }) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const CATEGORY_LABELS = {
    agriculture: t("catAgriculture") || "Agriculture 🌾",
    healthcare: t("catHealthcare") || "Healthcare 🏥",
    housing: t("catHousing") || "Housing 🏠",
    education: t("catEducation") || "Education 🎓",
    household: t("catHousehold") || "Household 🔥",
    pension: t("catPension") || "Pension 👵",
    general: t("catGeneral") || "General 📜",
  };

  // Compute insights
  const stats = useMemo(() => {
    if (!matches || matches.length === 0) {
      return { total: 0, topCategory: "None", bplEligible: false, chartData: [] };
    }

    const counts = {};
    matches.forEach((item) => {
      const cat = item.scheme.category || "general";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    // Find top category
    let topCat = "general";
    let maxVal = -1;
    Object.entries(counts).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val;
        topCat = cat;
      }
    });

    const total = matches.length;
    const bplEligible = user?.annual_income <= 250000;

    // Format chart data
    const chartData = Object.entries(counts).map(([cat, val]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      count: val,
      percentage: Math.round((val / total) * 100)
    })).sort((a, b) => b.count - a.count);

    return {
      total,
      topCategory: CATEGORY_LABELS[topCat] || topCat,
      bplEligible,
      chartData
    };
  }, [matches, user]);

  return (
    <section className="card-panel analytics-panel animate-fade-in">
      <h2 className="panel-title">{t("analyticsTitle")}</h2>
      <p className="panel-subtitle">{t("analyticsSubtitle")}</p>

      {stats.total === 0 ? (
      <p className="empty-state">{t("analyticsEmpty") || "Complete your profile on the Dashboard to see your analytics."}</p>
      ) : (
        <>
          <div className="analytics-grid">
            <div className="analytics-card">
              <span className="analytics-card-label">{t("analyticsTotalMatched")}</span>
              <span className="analytics-card-val count-highlight">{stats.total}</span>
            </div>

            <div className="analytics-card">
              <span className="analytics-card-label">{t("analyticsTopCategory")}</span>
              <span className="analytics-card-val">{stats.topCategory}</span>
            </div>

            <div className="analytics-card">
              <span className="analytics-card-label">{t("analyticsIncomeStatus")}</span>
              <span className="analytics-card-val">
                {stats.bplEligible ? t("analyticsIncomeBelow") : t("analyticsIncomeAbove")}
              </span>
            </div>
          </div>

          <div className="chart-section">
            <h3 className="chart-title">{t("analyticsChartTitle")}</h3>
            <div className="css-bar-chart">
              {stats.chartData.map((item) => (
                <div key={item.category} className="chart-row">
                  <span className="chart-label">{item.label}</span>
                  <div className="chart-bar-container">
                    <div
                      className="chart-bar-fill"
                      style={{ "--bar-width": `${item.percentage}%` }}
                    >
                      <span className="chart-bar-text">{item.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
