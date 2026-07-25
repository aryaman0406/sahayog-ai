/**
 * Utility helper to map raw scheme category strings from the backend
 * into localized, translated display labels.
 */

export function getCategoryKey(rawCategory) {
  if (!rawCategory) return "catGeneral";
  const cat = String(rawCategory).toLowerCase();

  if (cat.includes("employment") || cat.includes("skills") || cat.includes("job")) {
    return "catEmployment";
  }
  if (cat.includes("social welfare") || cat.includes("empowerment")) {
    return "catSocialWelfare";
  }
  if (cat.includes("business") || cat.includes("entrepreneurship")) {
    return "catBusiness";
  }
  if (cat.includes("agriculture") || cat.includes("rural") || cat.includes("environment")) {
    return "catAgriculture";
  }
  if (cat.includes("health") || cat.includes("wellness") || cat.includes("medical")) {
    return "catHealthcare";
  }
  if (cat.includes("housing") || cat.includes("shelter")) {
    return "catHousing";
  }
  if (cat.includes("education") || cat.includes("learning") || cat.includes("school")) {
    return "catEducation";
  }
  if (cat.includes("banking") || cat.includes("financial") || cat.includes("insurance")) {
    return "catBanking";
  }
  if (cat.includes("women") || cat.includes("child")) {
    return "catWomenChild";
  }
  if (cat.includes("utility") || cat.includes("sanitation") || cat.includes("water")) {
    return "catUtility";
  }
  if (cat.includes("transport") || cat.includes("infrastructure")) {
    return "catTransport";
  }
  if (cat.includes("travel") || cat.includes("tourism")) {
    return "catTravel";
  }
  if (cat.includes("sports") || cat.includes("culture")) {
    return "catSports";
  }
  if (cat.includes("science") || cat.includes("it") || cat.includes("tech")) {
    return "catScience";
  }
  if (cat.includes("safety") || cat.includes("law") || cat.includes("justice")) {
    return "catSafety";
  }
  if (cat.includes("household")) {
    return "catHousehold";
  }
  if (cat.includes("pension")) {
    return "catPension";
  }

  return "catGeneral";
}

export function getCategoryLabel(rawCategory, t) {
  const key = getCategoryKey(rawCategory);
  return t(key) || rawCategory || "General 📜";
}

export const CATEGORY_EMOJIS = {
  catAgriculture: "🌾",
  catHealthcare: "🏥",
  catHousing: "🏠",
  catEducation: "🎓",
  catEmployment: "💼",
  catSocialWelfare: "🤝",
  catBusiness: "🏢",
  catBanking: "🏦",
  catWomenChild: "👩‍👧",
  catUtility: "🧹",
  catTransport: "🚜",
  catTravel: "🧳",
  catSports: "🏆",
  catScience: "💻",
  catSafety: "⚖️",
  catHousehold: "🔥",
  catPension: "👵",
  catGeneral: "📜"
};
