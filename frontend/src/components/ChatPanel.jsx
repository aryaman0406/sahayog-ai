import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { translateText } from "../utils/translate.js";

const SPEECH_LOCALES = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  te: "te-IN",
  kn: "kn-IN",
  gu: "gu-IN"
};

const VOICE_SUGGESTIONS = {
  en: [
    "What schemes am I eligible for?",
    "Documents needed for PM-KISAN?",
    "How to apply for Ayushman Bharat?",
    "Are there scholarships for students?"
  ],
  hi: [
    "मैं किन योजनाओं के लिए पात्र हूँ?",
    "पीएम किसान के लिए क्या दस्तावेज चाहिए?",
    "आयुष्मान भारत के क्या फायदे हैं?",
    "छात्रवृत्ति योजनाओं की जानकारी दीजिए"
  ],
  ta: [
    "நான் எந்த திட்டங்களுக்கு தகுதியானவன்?",
    "விவசாய திட்டங்கள் பற்றி கூறுங்கள்",
    "மருத்துவ காப்பீட்டு திட்டங்கள் எவை?"
  ],
  mr: [
    "मी कोणत्या योजनांसाठी पात्र आहे?",
    "शेतकरी योजनांची माहिती द्या",
    "आरोग्य योजनांचे फायदे काय आहेत?"
  ],
  bn: [
    "আমি কোন প্রকল্পগুলির জন্য যোগ্য?",
    "কৃষক প্রকল্পের জন্য কী নথি প্রয়োজন?",
    "স্বাস্থ্য বীমা প্রকল্পের সুবিধা কী?"
  ],
  te: [
    "నేను ఏ పథకాలకు అర్హుడిని?",
    "రైతు పథకాల వివరాలు చెప్పండి",
    "ఆరోగ్య బీమా పథకాలు ఏమిటి?"
  ],
  kn: [
    "ನಾನು ಯಾವ ಯೋಜನೆಗಳಿಗೆ ಅರ್ಹನಾಗಿದ್ದೇನೆ?",
    "ರೈತ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ತಿಳಿಸಿ"
  ],
  gu: [
    "હું કઈ યોજનાઓ માટે પાત્ર છું?",
    "ખેડૂત યોજનાઓ વિશે જણાવો"
  ]
};

export default function ChatPanel({ profile, matches, onProfileExtracted }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const sessionId = user?.id || user?.email || "guest";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [extractedBanner, setExtractedBanner] = useState(null);

  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const wsRef = useRef(null);
  const voiceEnabledRef = useRef(voiceEnabled);
  const currentLangRef = useRef(language);

  // Sync refs
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    currentLangRef.current = language;
  }, [language]);

  // Load browser speech synthesis voices
  useEffect(() => {
    function loadVoices() {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    }
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Initialize Welcome Message
  useEffect(() => {
    let active = true;
    const welcomeEn = "Namaste! I am Sahayog AI. You can speak or type to check eligibility, required documents, or application steps. What would you like to know?";

    async function setWelcome() {
      if (language === "en") {
        setMessages([{ role: "assistant", text: welcomeEn }]);
        return;
      }
      try {
        const transWelcome = await translateText(welcomeEn, language);
        if (active) {
          setMessages([{ role: "assistant", text: transWelcome }]);
        }
      } catch (err) {
        console.error("Welcome message translation failed:", err);
        if (active) {
          setMessages([{ role: "assistant", text: welcomeEn }]);
        }
      }
    }

    setWelcome();
    return () => {
      active = false;
    };
  }, [language]);

  // Helper: Find best voice for active language
  const getBestVoice = useCallback((langCode) => {
    if (!availableVoices.length) return null;
    const targetLocale = SPEECH_LOCALES[langCode] || "en-IN";
    const langPrefix = targetLocale.split("-")[0];

    // 1. Exact match (e.g., hi-IN)
    let matched = availableVoices.find(
      (v) => v.lang === targetLocale || v.lang === targetLocale.replace("-", "_")
    );
    // 2. Prefix match (e.g., hi)
    if (!matched) {
      matched = availableVoices.find((v) => v.lang.startsWith(langPrefix));
    }
    // 3. Indian English fallback if regional missing
    if (!matched && langCode !== "en") {
      matched = availableVoices.find((v) => v.lang === "en-IN" || v.lang.includes("India"));
    }
    return matched || availableVoices[0] || null;
  }, [availableVoices]);

  // Helper: Speak reply aloud
  const speakReply = useCallback((text, index = null) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    if (!text) {
      setSpeakingIndex(null);
      return;
    }

    // Strip markdown symbols and URLs for clean speech
    const cleanText = text
      .replace(/[*#_`~>]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const targetLang = currentLangRef.current || "en";
    utterance.lang = SPEECH_LOCALES[targetLang] || "en-IN";
    
    const voice = getBestVoice(targetLang);
    if (voice) utterance.voice = voice;

    utterance.rate = 0.95; // Clearer pace
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setSpeakingIndex(index !== null ? index : "auto");
    };

    utterance.onend = () => {
      setSpeakingIndex(null);
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis notice:", e);
      setSpeakingIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [getBestVoice]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
    }
  }, []);

  // Connect WebSocket
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 8;

    function connect() {
      if (attempts >= MAX_ATTEMPTS) {
        console.warn("Chat WebSocket: max reconnect attempts reached.");
        return;
      }
      const apiEndpoint = import.meta.env.VITE_API_URL || "";
      let wsUrl;
      if (apiEndpoint) {
        const cleanEndpoint = apiEndpoint.replace(/^https?:\/\//, "");
        const protocol = apiEndpoint.startsWith("https") ? "wss:" : "ws:";
        wsUrl = `${protocol}//${cleanEndpoint}/ws/chat`;
      } else {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}/ws/chat`;
      }
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        attempts = 0;
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "token") {
            setMessages((prev) => {
              const list = [...prev];
              const last = list[list.length - 1];
              if (last && last.role === "assistant") {
                last.text += data.content;
              }
              return list;
            });
          } else if (data.type === "done") {
            setLoading(false);
            setMessages((prev) => {
              const list = [...prev];
              const lastIdx = list.length - 1;
              const last = list[lastIdx];
              if (last && last.role === "assistant" && voiceEnabledRef.current) {
                speakReply(last.text, lastIdx);
              }
              return list;
            });
          } else if (data.type === "profile_extracted") {
            // AI extracted profile fields from the user's natural language message
            const extracted = data.profile;
            if (extracted && Object.keys(extracted).length > 0) {
              // Show confirmation banner
              setExtractedBanner(extracted);
              // Auto-dismiss banner after 8 seconds
              setTimeout(() => setExtractedBanner(null), 8000);
              // Push extracted profile up to parent for saving + scheme matching
              if (onProfileExtracted) {
                onProfileExtracted(extracted);
              }
            }
          } else if (data.type === "error") {
            setLoading(false);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", text: `Error: ${data.message}` }
            ]);
          }
        } catch (e) {
          console.error("Failed to parse socket frame:", e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        attempts += 1;
        if (attempts < MAX_ATTEMPTS) {
          const delay = Math.min(1000 * 2 ** attempts, 30000);
          reconnectTimeout = setTimeout(connect, delay);
        }
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [speakReply]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimText]);

  // Clean TTS on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Send message function with WebSocket, HTTP REST, and offline fallback
  const sendMessageWithText = useCallback(async (textToSend) => {
    const text = (textToSend || "").trim();
    if (!text || loading) return;

    stopSpeaking();
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "assistant", text: "" }
    ]);
    setInput("");
    setInterimText("");
    setLoading(true);

    const payload = {
      message: text,
      profile: profile || {},
      matched_schemes: matches || [],
      language: currentLangRef.current || "en",
      session_id: sessionId
    };

    // 1. Try WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(payload));
        return;
      } catch (err) {
        console.warn("WebSocket send failed, falling back to HTTP:", err);
      }
    }

    // 2. Fallback to HTTP POST /api/chat/
    try {
      const res = await fetch("/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.reply || "I couldn't retrieve the scheme details right now. Please try again.";
        setMessages((prev) => {
          const list = [...prev];
          const lastIdx = list.length - 1;
          if (list[lastIdx] && list[lastIdx].role === "assistant") {
            list[lastIdx].text = replyText;
          }
          if (voiceEnabledRef.current) {
            speakReply(replyText, lastIdx);
          }
          return list;
        });
        return;
      }
    } catch (httpErr) {
      console.warn("HTTP chat request failed, generating intelligent fallback response:", httpErr);
    }

    // 3. Fallback: Offline Scheme Guidance Assistant
    let reply = `Based on our 1200+ scheme catalogue, here is guidance for "${text}": `;
    const lower = text.toLowerCase();
    if (lower.includes("student") || lower.includes("scholarship") || lower.includes("study") || lower.includes("education")) {
      reply = "For students, key government initiatives include the **PM Scholarship Scheme** (up to ₹50,000/yr), **Central Sector Scheme of Scholarships**, and **Post-Matric Scholarships for SC/ST/OBC**. You can verify your exact match in the Eligibility Checker.";
    } else if (lower.includes("farmer") || lower.includes("kisan") || lower.includes("agriculture") || lower.includes("crop")) {
      reply = "For farmers, major schemes include **PM-Kisan Samman Nidhi** (₹6,000/yr in 3 installments), **Pradhan Mantri Fasal Bima Yojana (PMFBY)** for crop insurance, and **Kisan Credit Card (KCC)** for subsidized loans.";
    } else if (lower.includes("house") || lower.includes("housing") || lower.includes("awas") || lower.includes("home")) {
      reply = "Under **Pradhan Mantri Awas Yojana (PMAY-Urban & Rural)**, eligible families can receive direct financial assistance and interest subsidies up to ₹2.5 Lakh for constructing a pucca house.";
    } else if (lower.includes("health") || lower.includes("ayushman") || lower.includes("hospital") || lower.includes("card")) {
      reply = "Under **Ayushman Bharat (PM-JAY)**, eligible low-income families get cashless health coverage up to ₹5,00,000 per family per year across empaneled hospitals nationwide.";
    } else if (lower.includes("women") || lower.includes("mahila") || lower.includes("girl") || lower.includes("daughter")) {
      reply = "Major welfare schemes for women include **Pradhan Mantri Matru Vandana Yojana (PMMVY)** (₹5,000 maternity assistance), **Sukanya Samriddhi Yojana**, and **Mudra Loan for Women Entrepreneurs**.";
    } else {
      reply = `Thank you for asking about "${text}". Sahayog AI indexes over 1200 central and state government welfare schemes. Check out your personalized dashboard or visit nearest CSC Seva Kendra for direct on-ground assistance.`;
    }

    setMessages((prev) => {
      const list = [...prev];
      const lastIdx = list.length - 1;
      if (list[lastIdx] && list[lastIdx].role === "assistant") {
        list[lastIdx].text = reply;
      }
      if (voiceEnabledRef.current) {
        speakReply(reply, lastIdx);
      }
      return list;
    });
    setLoading(false);
  }, [loading, matches, profile, sessionId, speakReply, stopSpeaking]);

  // Speech Recognition (Voice Input)
  const startVoiceInput = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome, Edge, or Android.");
      return;
    }

    stopSpeaking();

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = SPEECH_LOCALES[language] || "en-IN";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setListening(true);
        setInterimText("");
      };

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let currentInterim = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentInterim) {
          setInterimText(currentInterim);
        }

        if (finalTranscript.trim()) {
          setListening(false);
          setInterimText("");
          sendMessageWithText(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setListening(false);
        setInterimText("");
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start voice recognition:", err);
      setListening(false);
    }
  }, [language, sendMessageWithText, stopSpeaking]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  }, []);

  function handleFormSubmit(e) {
    e.preventDefault();
    sendMessageWithText(input);
  }

  const suggestions = VOICE_SUGGESTIONS[language] || VOICE_SUGGESTIONS.en;

  return (
    <section className="card-panel chat-panel animate-fade-in voice-chat-enhanced">
      {/* Header / Meta Row */}
      <div className="chat-meta-row">
        <div className="chat-badge-group">
          <span className="chat-meta-pill">
            <span className="live-indicator-dot"></span> {t("chatMeta") || "AI RAG Assistant"}
          </span>
          <span className="chat-lang-pill">
            🗣️ {SPEECH_LOCALES[language] || "en-IN"}
          </span>
        </div>

        <div className="chat-header-actions">
          {speakingIndex !== null && (
            <button
              type="button"
              className="btn-stop-audio animate-pulse"
              onClick={stopSpeaking}
              title="Stop Audio Speech"
            >
              ⏹ Stop Voice
            </button>
          )}

          <button
            type="button"
            className={`btn-ghost voice-toggle ${voiceEnabled ? "active" : ""}`}
            onClick={() => {
              if (voiceEnabled) stopSpeaking();
              setVoiceEnabled(!voiceEnabled);
            }}
            title="Toggle automatic voice read-aloud"
          >
            {voiceEnabled ? "🔊 Voice On" : "🔈 Voice Muted"}
          </button>
        </div>
      </div>

      {/* Profile Extraction Confirmation Banner */}
      {extractedBanner && (
        <div className="profile-extracted-banner animate-fade-in">
          <div className="extracted-banner-icon">✅</div>
          <div className="extracted-banner-content">
            <span className="extracted-banner-title">
              {t("chatProfileFilled") || "Profile auto-filled from your message"}
            </span>
            <div className="extracted-banner-fields">
              {extractedBanner.age && (
                <span className="extracted-field-chip">🎂 {t("profileAge") || "Age"}: {extractedBanner.age}</span>
              )}
              {extractedBanner.occupation && (
                <span className="extracted-field-chip">💼 {t(extractedBanner.occupation) || extractedBanner.occupation}</span>
              )}
              {extractedBanner.annual_income && (
                <span className="extracted-field-chip">💰 ₹{extractedBanner.annual_income.toLocaleString("en-IN")}</span>
              )}
              {extractedBanner.gender && (
                <span className="extracted-field-chip">👤 {t(extractedBanner.gender) || extractedBanner.gender}</span>
              )}
              {extractedBanner.location_type && (
                <span className="extracted-field-chip">📍 {t(extractedBanner.location_type) || extractedBanner.location_type}</span>
              )}
              {extractedBanner.state && (
                <span className="extracted-field-chip">🗺️ {extractedBanner.state}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="extracted-banner-dismiss"
            onClick={() => setExtractedBanner(null)}
            aria-label="Dismiss"
          >✕</button>
        </div>
      )}

      {/* Chat Conversation Window */}
      <div className="chat-window" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <div className="chat-bubble-content">
              {m.text || (loading && i === messages.length - 1 ? (
                <span className="chat-typing-dots">
                  <span>.</span><span>.</span><span>.</span>
                </span>
              ) : "")}
            </div>

            {m.role === "assistant" && m.text && (
              <div className="chat-bubble-actions">
                <button
                  type="button"
                  className={`btn-bubble-speaker ${speakingIndex === i ? "speaking" : ""}`}
                  onClick={() => {
                    if (speakingIndex === i) {
                      stopSpeaking();
                    } else {
                      speakReply(m.text, i);
                    }
                  }}
                  title={speakingIndex === i ? "Stop speaking" : "Listen aloud"}
                >
                  {speakingIndex === i ? "⏹ Stop" : "🔊 Listen"}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Live Speech Recognition Overlay */}
        {listening && interimText && (
          <div className="chat-bubble user interim-speech-bubble">
            <span className="mic-live-tag">🎙️ Listening...</span>
            <p className="interim-text">{interimText}</p>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      {messages.length <= 2 && (
        <div className="chat-suggestions-container">
          <p className="suggestions-title">💡 Try asking or speaking:</p>
          <div className="suggestions-scroll">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                className="suggestion-chip"
                onClick={() => sendMessageWithText(suggestion)}
                disabled={loading || !wsConnected}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice Status & Equalizer Bar */}
      <div className="chat-toolbar">
        <div className="chat-voice-visualizer">
          {listening ? (
            <div className="voice-wave-container active">
              <span className="voice-wave-bar bar-1"></span>
              <span className="voice-wave-bar bar-2"></span>
              <span className="voice-wave-bar bar-3"></span>
              <span className="voice-wave-bar bar-4"></span>
              <span className="voice-wave-bar bar-5"></span>
              <span className="voice-status-text">
                {t("chatListening") || "Listening in your language..."}
              </span>
            </div>
          ) : speakingIndex !== null ? (
            <div className="voice-wave-container speaking">
              <span className="speaker-wave-bar"></span>
              <span className="speaker-wave-bar"></span>
              <span className="speaker-wave-bar"></span>
              <span className="voice-status-text">Speaking answer...</span>
            </div>
          ) : (
            <span className="chat-status">
              {!wsConnected
                ? (t("chatConnecting") || "Connecting...")
                : (t("chatAskAny") || "Type or click mic to speak")}
            </span>
          )}
        </div>

        <div className="chat-toolbar-actions">
          <button
            type="button"
            className={`btn-mic-enhanced ${listening ? "recording" : ""}`}
            onClick={listening ? stopVoiceInput : startVoiceInput}
            disabled={!wsConnected}
            title={listening ? "Click to stop listening" : "Click to speak in your language"}
          >
            <span className="mic-icon-svg">
              {listening ? "⏹" : "🎙️"}
            </span>
            <span className="mic-label">
              {listening ? (t("chatMicStop") || "Stop") : (t("chatMicBtn") || "Speak")}
            </span>
            {listening && <span className="mic-pulse-wave"></span>}
          </button>
        </div>
      </div>

      {/* Text Input Row */}
      <form className="chat-input-row" onSubmit={handleFormSubmit}>
        <input
          type="text"
          placeholder={listening ? "Listening to your voice..." : (t("chatPlaceholder") || "Ask about schemes, documents...")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || !wsConnected}
        />
        <button
          type="submit"
          className="btn-primary chat-send"
          disabled={loading || !wsConnected || !input.trim()}
        >
          {t("chatSend") || "Send"}
        </button>
      </form>
    </section>
  );
}
