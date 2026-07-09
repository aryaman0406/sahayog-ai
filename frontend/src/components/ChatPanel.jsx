import React, { useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
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

export default function ChatPanel({ profile, matches }) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const wsRef = useRef(null);

  // Initialize Welcome Message when language or profile changes
  useEffect(() => {
    let active = true;
    const welcomeEn = "Namaste! I can help explain any of your matched schemes, list required documents, or guide you through applying. What would you like to know?";
    
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

  // Connect WebSocket
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    function connect() {
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
        console.log("Chat WebSocket connected");
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
              const last = list[list.length - 1];
              if (last && last.role === "assistant" && voiceEnabled) {
                speakReply(last.text);
              }
              return list;
            });
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
        console.log("Chat WebSocket closed. Reconnecting...");
        setWsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [voiceEnabled]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // TTS cleanup
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function speakReply(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_]/g, ""); // Strip markdown symbols
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = SPEECH_LOCALES[language] || SPEECH_LOCALES.en;
    window.speechSynthesis.speak(utterance);
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || listening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LOCALES[language] || SPEECH_LOCALES.en;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((res) => res[0].transcript)
        .join(" ")
        .trim();
      if (transcript) {
        setInput(transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopVoiceInput() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Chat server disconnected. Reconnecting, please wait..." }
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "assistant", text: "" } // Placeholder for streaming
    ]);
    setInput("");
    setLoading(true);

    const payload = {
      message: text,
      profile: profile || {},
      matched_schemes: matches || [],
      language: language
    };

    wsRef.current.send(JSON.stringify(payload));
  }

  return (
    <section className="card-panel chat-panel animate-fade-in">
      <p className="panel-label">{t("chatTitle")}</p>
      
      <div className="chat-meta-row">
        <span className="chat-meta-pill">
          {language === "hi" ? "हिन्दी में जवाब" : "Replies in English"}
        </span>
        <button 
          type="button" 
          className={`btn-ghost voice-toggle ${voiceEnabled ? "active" : ""}`}
          onClick={() => setVoiceEnabled(!voiceEnabled)}
        >
          {voiceEnabled ? t("chatVoiceOn") : t("chatVoiceOff")}
        </button>
      </div>

      <div className="chat-window" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.text || (loading && i === messages.length - 1 ? "..." : "")}
          </div>
        ))}
      </div>

      <div className="chat-toolbar">
        <div className="chat-voice-visualizer">
          {listening ? (
            <div className="voice-wave-container">
              <span className="voice-wave-bar"></span>
              <span className="voice-wave-bar"></span>
              <span className="voice-wave-bar"></span>
              <span className="voice-wave-bar"></span>
              <span className="voice-status-text">{t("chatListening")}</span>
            </div>
          ) : (
            <span className="chat-status">
              {!wsConnected ? "Connecting to chat server..." : "Ask questions in your preferred language."}
            </span>
          )}
        </div>
        <div className="chat-toolbar-actions">
          <button 
            type="button" 
            className={`btn-ghost btn-mic ${listening ? "recording" : ""}`} 
            onClick={listening ? stopVoiceInput : startVoiceInput}
            disabled={!wsConnected}
          >
            {listening ? t("chatMicStop") : t("chatMicBtn")}
          </button>
        </div>
      </div>

      <form className="chat-input-row" onSubmit={sendMessage}>
        <input 
          type="text" 
          placeholder={t("chatPlaceholder")} 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          disabled={loading || !wsConnected}
        />
        <button 
          type="submit" 
          className="btn-primary chat-send" 
          disabled={loading || !wsConnected || !input.trim()}
        >
          {t("chatSend")}
        </button>
      </form>
    </section>
  );
}
