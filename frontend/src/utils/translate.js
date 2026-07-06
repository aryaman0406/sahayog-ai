// Cache to store translations and prevent redundant API requests
const translationCache = {};

/**
 * Translates English text to a target language on-the-fly using the free Google Translate API.
 * Uses a local cache to prevent rate-limiting and ensure instant re-loads.
 * 
 * @param {string} text - The English text to translate
 * @param {string} targetLang - The ISO language code (e.g. 'hi', 'ta', 'mr')
 * @returns {Promise<string>} The translated text, or the original text if translation fails.
 */
export async function translateText(text, targetLang) {
  if (!text || !targetLang || targetLang === "en") {
    return text;
  }

  // Clean / normalize input
  const textStr = String(text).trim();
  if (!textStr) return "";

  const cacheKey = `${targetLang}:${textStr}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(textStr)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Translation request failed");
    }

    const data = await response.json();
    
    // Google Translate returns sentences in data[0]
    if (data && data[0]) {
      const translated = data[0].map((sentence) => sentence[0]).join("");
      translationCache[cacheKey] = translated;
      return translated;
    }
    
    return textStr;
  } catch (error) {
    console.warn("Translation service offline, falling back to English. Error:", error);
    return textStr; // Silent fallback to English on failure
  }
}
