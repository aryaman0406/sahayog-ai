import React, { useState } from "react";
import SchemeCard from "./SchemeCard.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { translateText } from "../utils/translate.js";

// Helper function to generate clean print layout and open print/PDF dialog
function downloadChecklistPDF(matches, language) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to download the PDF guide.");
    return;
  }

  // Localized headings for PDF
  const labels = {
    en: {
      title: "Sahayog AI — Personalized Scheme Guide",
      subtitle: "List of matched government schemes based on your profile",
      benefits: "Benefits Offered",
      documents: "Required Documents Checklist",
      apply: "How to Apply",
      cscTip: "Tip: Print this document and take it to your nearest Common Service Centre (CSC) for help with applying.",
      printedOn: "Printed on",
      close: "Close",
      printBtn: "Print / Save PDF"
    },
    hi: {
      title: "सहयोग AI — आपकी व्यक्तिगत योजना गाइड",
      subtitle: "आपकी पात्रता प्रोफ़ाइल के आधार पर चुनी गई सरकारी योजनाएं",
      benefits: "योजना के लाभ",
      documents: "आवश्यक दस्तावेज़ चेकलिस्ट",
      apply: "आवेदन कैसे करें",
      cscTip: "सुझाव: इस दस्तावेज़ को प्रिंट करें और योजना आवेदन में मदद के लिए अपने निकटतम कॉमन सर्विस सेंटर (CSC) पर ले जाएं।",
      printedOn: "प्रिंट तिथि",
      close: "बंद करें",
      printBtn: "प्रिंट करें / PDF सेव करें"
    },
    ta: {
      title: "சஹயோக் AI — தனிப்பயனாக்கப்பட்ட திட்ட வழிகாட்டி",
      subtitle: "உங்கள் சுயவிவரத்தின் அடிப்படையில் பொருத்தப்பட்ட அரசு திட்டங்கள்",
      benefits: "வழங்கப்படும் நன்மைகள்",
      documents: "தேவையான ஆவணங்கள் சரிபார்ப்பு பட்டியல்",
      apply: "விண்ணப்பிப்பது எப்படி",
      cscTip: "குறிப்பு: இந்த ஆவணத்தை அச்சிட்டு, விண்ணப்பிக்க உதவி பெற உங்கள் அருகிலுள்ள பொது சேவை மையத்திற்கு (CSC) கொண்டு செல்லவும்.",
      printedOn: "அச்சிடப்பட்ட தேதி",
      close: "மூடு",
      printBtn: "அச்சிடுக / PDF சேமி"
    },
    mr: {
      title: "सहयोग AI — तुमची वैयक्तिकृत योजना मार्गदर्शिका",
      subtitle: "तुमच्या प्रोफाइलवर आधारित जुळणाऱ्या सरकारी योजनांची यादी",
      benefits: "मिळणारे फायदे",
      documents: "आवश्यक कागदपत्रांची चेकलिस्ट",
      apply: "अर्ज कसा करावा",
      cscTip: "टीप: हे दस्तऐवज प्रिंट करा आणि अर्ज करण्यासाठी तुमच्या जवळच्या कॉमन सर्व्हिस सेंटर (CSC) वर घेऊन जा.",
      printedOn: "प्रिंट तारीख",
      close: "बंद करा",
      printBtn: "प्रिंट करा / PDF जतन करा"
    },
    bn: {
      title: "সহযোগ AI — আপনার ব্যক্তিগতকৃত পরিকল্পনা নির্দেশিকা",
      subtitle: "আপনার প্রোফাইলের উপর ভিত্তি করে মিলে যাওয়া সরকারি পরিকল্পনাসমূহ",
      benefits: "প্রদেয় সুবিধাসমূহ",
      documents: "প্রয়োজনীয় নথির চেকলিস্ট",
      apply: "কিভাবে আবেদন করবেন",
      cscTip: "পরামর্শ: এই নথিটি প্রিন্ট করুন এবং আবেদনের সাহায্যের জন্য আপনার নিকটতম কমন সার্ভিস সেন্টারে (CSC) নিয়ে যান।",
      printedOn: "প্রিন্ট করার তারিখ",
      close: "বন্ধ করুন",
      printBtn: "প্রিন্ট করুন / PDF সংরক্ষণ করুন"
    },
    te: {
      title: "సహయోగ్ AI — మీ వ్యక్తిగతీకరించిన పథకాల గైడ్",
      subtitle: "మీ ప్రొఫైల్ ఆధారంగా సరిపోలిన ప్రభుత్వ పథకాల జాబితా",
      benefits: "లభించే ప్రయోజనాలు",
      documents: "కావలసిన పత్రాల చెక్‌లిస్ట్",
      apply: "దరఖాస్తు విధానం",
      cscTip: "చిట్కా: ఈ పత్రాన్ని ప్రింట్ చేసి, దరఖాస్తు చేయడంలో సహాయం కోసం మీ సమీప కామన్ సర్వీస్ సెంటర్ (CSC) కి తీసుకెళ్లండి.",
      printedOn: "ప్రింట్ చేసిన తేదీ",
      close: "మూసివేయి",
      printBtn: "ప్రింట్ చేయి / PDF సేవ్ చేయి"
    },
    gu: {
      title: "સહયોગ AI — તમારી વ્યક્તિગત યોજના માર્ગદર્શિકા",
      subtitle: "તમારી પ્રોફાઇલના આધારે મેળ ખાતી સરકારી યોજનાઓની સૂચિ",
      benefits: "યોજનાના લાભો",
      documents: "જરૂરી દસ્તાવેજોની ચેકલિસ્ટ",
      apply: "કેવી રીતે અરજી કરવી",
      cscTip: "ટીપ: આ દસ્તાવેજ પ્રિન્ટ કરો અને અરજી કરવામાં મદદ માટે તમારા નજીકના કોમન સર્વિસ સેન્ટર (CSC) પર લઈ જાઓ.",
      printedOn: "પ્રિન્ટ તારીખ",
      close: "બંધ કરો",
      printBtn: "પ્રિન્ટ કરો / PDF સાચવો"
    },
    kn: {
      title: "ಸಹಯೋಗ್ AI — ನಿಮ್ಮ ವೈಯಕ್ತಿಕಗೊಳಿಸಿದ ಯೋಜನೆಗಳ ಮಾರ್ಗದರ್ಶಿ",
      subtitle: "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಆಧಾರದ ಮೇಲೆ ಹೊಂದಿಕೆಯಾದ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಪಟ್ಟಿ",
      benefits: "ಯೋಜನೆಯ ಪ್ರಯೋಜನಗಳು",
      documents: "ಅಗತ್ಯ ದಾಖಲೆಗಳ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ",
      apply: "ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು ಹೇಗೆ",
      cscTip: "ಸಲಹೆ: ಈ ದಾಖಲೆಯನ್ನು ಪ್ರಿಂಟ್ ಮಾಡಿ ಮತ್ತು ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಸಹಾಯ ಪಡೆಯಲು ನಿಮ್ಮ ಹತ್ತಿರದ ಸಾಮಾನ್ಯ ಸೇವಾ ಕೇಂದ್ರಕ್ಕೆ (CSC) ಕೊಂಡೊಯ್ಯಿರಿ.",
      printedOn: "ಮುದ್ರಿತ ದಿನಾಂಕ",
      close: "ಮುಚ್ಚು",
      printBtn: "ಪ್ರಿಂಟ್ ಮಾಡಿ / PDF ಉಳಿಸಿ"
    }
  };

  const L = labels[language] || labels.en;

  const schemesHtml = matches.map((item, idx) => {
    const s = item.scheme;
    const docsList = s.documents_required || [];
    
    return `
      <div class="scheme-section">
        <h2>${idx + 1}. ${s.name}</h2>
        <div class="meta-row">
          <strong>Match score / योग्यता स्कोर:</strong> ${item.match_score || 100}% | 
          <strong>Category / श्रेणी:</strong> ${s.category.toUpperCase()}
        </div>
        
        <p><strong>${L.benefits}:</strong> ${s.benefits}</p>
        
        <h3>${L.documents}</h3>
        <ul class="doc-list">
          ${docsList.map(doc => `
            <li>
              <span class="checkbox"></span>
              <span class="doc-name">${doc}</span>
            </li>
          `).join("")}
        </ul>
        
        <h3>${L.apply}</h3>
        <p>${s.how_to_apply}</p>
      </div>
      <hr class="divider"/>
    `;
  }).join("");

  const html = `
    <html>
      <head>
        <title>${L.title}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #1a1a1a;
            margin: 40px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #E08E2C;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          h1 {
            color: #2A3563;
            margin: 0;
            font-size: 26px;
          }
          .sub {
            color: #6B7190;
            margin: 8px 0 0 0;
            font-size: 15px;
          }
          .tip-box {
            background: #FBF7EF;
            border-left: 4px solid #E08E2C;
            padding: 12px 16px;
            margin-bottom: 30px;
            font-size: 13px;
            color: #C3701A;
            border-radius: 0 4px 4px 0;
          }
          .scheme-section {
            page-break-inside: avoid;
            margin-bottom: 25px;
          }
          h2 {
            color: #2A3563;
            font-size: 19px;
            margin-top: 0;
            margin-bottom: 8px;
          }
          h3 {
            color: #1B2440;
            font-size: 13px;
            margin-top: 15px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .meta-row {
            font-size: 12px;
            color: #E08E2C;
            margin-bottom: 15px;
          }
          .doc-list {
            list-style: none;
            padding-left: 0;
            margin-bottom: 16px;
          }
          .doc-list li {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;
          }
          .checkbox {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 1.5px solid #6B7190;
            border-radius: 3px;
            margin-right: 10px;
            flex-shrink: 0;
          }
          .divider {
            border: 0;
            border-top: 1px solid #e0e0e0;
            margin: 25px 0;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #999;
            margin-top: 50px;
            border-top: 1px solid #eee;
            padding-top: 15px;
          }
          .controls {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(255,255,255,0.95);
            padding: 12px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            display: flex;
            gap: 10px;
          }
          button {
            padding: 10px 18px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            border: none;
            transition: opacity 0.2s;
          }
          button:hover {
            opacity: 0.9;
          }
          .btn-print {
            background: #E08E2C;
            color: white;
          }
          .btn-close {
            background: #e0e0e0;
            color: #333;
          }
          @media print {
            .controls {
              display: none;
            }
            body {
              margin: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${L.title}</h1>
          <p class="sub">${L.subtitle}</p>
        </div>
        
        <div class="tip-box">
          ${L.cscTip}
        </div>
        
        ${schemesHtml}
        
        <div class="footer">
          Sahayog AI &copy; 2026 · ${L.printedOn}: ${new Date().toLocaleDateString()}
        </div>
        
        <div class="controls">
          <button class="btn-close" onclick="window.close()">${L.close}</button>
          <button class="btn-print" onclick="window.print()">${L.printBtn}</button>
        </div>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function SchemeResults({ matches, savedSchemeIds, onToggleSave }) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  // Client-side case-insensitive free text filter
  const filteredMatches = matches.filter((item) => {
    const name = (item.scheme.name || "").toLowerCase();
    const desc = (item.scheme.description || "").toLowerCase();
    const category = (item.scheme.category || "").toLowerCase();
    const q = query.toLowerCase().trim();
    return name.includes(q) || desc.includes(q) || category.includes(q);
  });

  const handleDownloadPDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);

    try {
      // Translate all scheme fields to the selected language before generating the PDF
      const translatedMatches = await Promise.all(
        filteredMatches.map(async (item) => {
          if (language === "en") return item;
          
          const s = item.scheme;
          const [transName, transBenefits, transHowTo] = await Promise.all([
            translateText(s.name, language),
            translateText(s.benefits, language),
            translateText(s.how_to_apply, language)
          ]);
          
          const docs = s.documents_required || [];
          const transDocs = await Promise.all(
            docs.map((doc) => translateText(doc, language))
          );

          return {
            ...item,
            scheme: {
              ...s,
              name: transName,
              benefits: transBenefits,
              how_to_apply: transHowTo,
              documents_required: transDocs
            }
          };
        })
      );

      downloadChecklistPDF(translatedMatches, language);
    } catch (error) {
      console.error("PDF generation/translation failed:", error);
      // Fallback: print original matches
      downloadChecklistPDF(filteredMatches, language);
    } finally {
      setPdfLoading(false);
    }
  };

  const getPdfBtnText = () => {
    if (pdfLoading) {
      return t("pdfGenerating");
    }
    return t("pdfDownload");
  };

  return (
    <section className="card-panel results-panel animate-fade-in">
      <div className="results-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 className="panel-title">{t("resultsTitle")}</h2>
            <p className="panel-subtitle">{t("resultsSubtitle")}</p>
          </div>
          {filteredMatches.length > 0 && (
            <button 
              onClick={handleDownloadPDF} 
              className="btn-primary" 
              disabled={pdfLoading}
              style={{ padding: "8px 16px", fontSize: "0.85rem" }}
            >
              {getPdfBtnText()}
            </button>
          )}
        </div>
      </div>

      <div className="search-filter-row">
        <input
          type="text"
          className="search-input"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filteredMatches.length === 0 ? (
        <p className="empty-state">{t("noMatches")}</p>
      ) : (
        <div className="scheme-list">
          {filteredMatches.map((item) => (
            <SchemeCard
              key={item.scheme.id}
              item={item}
              isSaved={savedSchemeIds.includes(item.scheme.id)}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </section>
  );
}
