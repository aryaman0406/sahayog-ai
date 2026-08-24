import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import IndiaMap from "./IndiaMap.jsx";

export default function Hero({ isLanding = true }) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      id: "initial",
      sender: "assistant",
      text: "Hello! I'm your AI assistant. How can I help you today?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatListening, setIsChatListening] = useState(false);
  const chatBottomRef = useRef(null);

  // Popular Schemes List
  const popularSchemes = [
    {
      id: "1",
      name: "PM Scholarship Scheme",
      category: "Education",
      icon: "🎓",
      iconColor: "#10B981",
      iconBg: "rgba(16, 185, 129, 0.15)",
      description: "Financial assistance for meritorious students pursuing higher education.",
      benefit: "₹50,000",
      benefitLabel: "Max Benefit",
      matchScore: 92,
    },
    {
      id: "2",
      name: "PM Awas Yojana (Urban)",
      category: "Housing",
      icon: "🏠",
      iconColor: "#F59E0B",
      iconBg: "rgba(245, 158, 11, 0.15)",
      description: "Affordable housing for urban poor with pucca house financial assistance.",
      benefit: "₹2,50,000",
      benefitLabel: "Max Benefit",
      matchScore: 89,
    },
    {
      id: "3",
      name: "Ayushman Bharat Yojana",
      category: "Health",
      icon: "💙",
      iconColor: "#3B82F6",
      iconBg: "rgba(59, 130, 246, 0.15)",
      description: "Health coverage up to ₹5 lakh per family per year for secondary care.",
      benefit: "₹5,00,000",
      benefitLabel: "Coverage",
      matchScore: 95,
    },
    {
      id: "4",
      name: "PM Kisan Samman Nidhi",
      category: "Agriculture",
      icon: "🚜",
      iconColor: "#10B981",
      iconBg: "rgba(16, 185, 129, 0.15)",
      description: "Income support of ₹6,000 per year to all landholding farmers in 3 installments.",
      benefit: "₹6,000 / year",
      benefitLabel: "Benefit",
      matchScore: 90,
    },
  ];

  const [activePopularIndex, setActivePopularIndex] = useState(0);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatLoading]);

  // Voice Input Handler (Web Speech API)
  const handleVoiceInput = (target = "search") => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    if (target === "search") {
      setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      setIsChatListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        setIsChatListening(false);
      };
      recognition.onerror = () => setIsChatListening(false);
      recognition.onend = () => setIsChatListening(false);
      recognition.start();
    }
  };

  // Submit Search to Chat or Schemes
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    // Send to embedded chat
    handleSendChatMessage(searchQuery);
    setSearchQuery("");

    // Scroll to chatbot
    const chatEl = document.getElementById("ai-assistant-card");
    if (chatEl) {
      chatEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Send Chat Message
  const handleSendChatMessage = async (customText = null) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || isChatLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend.trim(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          profile: user ? {
            age: user.age,
            occupation: user.occupation,
            annual_income: user.annual_income,
            location_type: user.location_type,
            state: user.state,
          } : {},
          session_id: user?.id || "guest-session",
          language: language || "en",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "assistant",
            text: data.reply || "I couldn't retrieve the scheme details right now. Please try again.",
          },
        ]);
      } else {
        throw new Error("Chat request failed");
      }
    } catch (err) {
      console.warn("Using fallback assistant response:", err);
      // Fallback assistant response
      setTimeout(() => {
        let reply = "I found relevant government schemes matching your inquiry. ";
        if (textToSend.toLowerCase().includes("student") || textToSend.toLowerCase().includes("scholarship")) {
          reply = "For students, popular options include the **PM Scholarship Scheme** (up to ₹50,000/yr), **Central Sector Scheme of Scholarships**, and **Post Matric Scholarships**. Would you like to check your exact eligibility?";
        } else if (textToSend.toLowerCase().includes("farmer") || textToSend.toLowerCase().includes("kisan")) {
          reply = "For agricultural support, key schemes are **PM-Kisan Samman Nidhi** (₹6,000/year direct cash transfer), **PM Fasal Bima Yojana** (Crop Insurance), and **Kisan Credit Card (KCC)** for low-interest loans.";
        } else if (textToSend.toLowerCase().includes("housing") || textToSend.toLowerCase().includes("awas")) {
          reply = "Under **Pradhan Mantri Awas Yojana (PMAY)**, eligible urban and rural families can receive financial subsidies up to ₹2.5 Lakh for constructing or buying a pucca house.";
        } else if (textToSend.toLowerCase().includes("महिला") || textToSend.toLowerCase().includes("women")) {
          reply = "महिलाओं के लिए प्रमुख योजनाएं: **प्रधानमंत्री मातृ वंदना योजना (PMMVY)** (₹5,000 वित्तीय सहायता), **सुकन्या समृद्धि योजना**, और **मुद्रा लोन महिला योजना**।";
        } else {
          reply = `Based on our 700+ scheme catalogue, there are several welfare initiatives for "${textToSend}". You can fill in your age, income, and state in the Eligibility Checker to see verified matches.`;
        }

        setChatMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "assistant",
            text: reply,
          },
        ]);
      }, 500);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleResetChat = () => {
    setChatMessages([
      {
        id: "initial",
        sender: "assistant",
        text: "Hello! I'm your AI assistant. How can I help you today?",
      },
    ]);
  };

  const handleCategorySelect = (categoryId) => {
    navigate("/dashboard");
  };

  return (
    <div className="hero-page-wrapper">
      {/* ── TOP HERO SECTION (2-Column Grid) ────────────────────────── */}
      <section className="hero-main-grid">
        {/* LEFT COLUMN: Headlines, Search, Glowing India Map & Stats */}
        <div className="hero-left-column">
          {/* AI Discovery Badge */}
          <div className="hero-discovery-badge">
            <span className="badge-sparkle">✦</span>
            <span>AI-Powered Government Scheme Discovery</span>
          </div>

          {/* Main Hero Heading */}
          <h1 className="hero-main-title">
            Find Government<br />
            Schemes You're<br />
            <span className="hero-highlight-gold">Eligible For</span>
          </h1>

          {/* Subheading */}
          <p className="hero-main-subtitle">
            Discover, understand and apply for 1200+ government welfare schemes using the power of AI in your language.
          </p>

          {/* Main Search Bar with Ask AI & Mic */}
          <form className="hero-search-bar" onSubmit={handleSearchSubmit}>
            <span className="search-bar-icon">🔍</span>
            <input
              type="text"
              className="search-bar-input"
              placeholder="Ask anything about government schemes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search government schemes"
            />
            <button
              type="button"
              className={`search-mic-btn ${isListening ? "listening" : ""}`}
              onClick={() => handleVoiceInput("search")}
              title="Voice Search"
              aria-label="Voice Search"
            >
              🎙️
            </button>
            <button type="submit" className="search-ask-btn">
              Ask AI <span className="ask-sparkle">✨</span>
            </button>
          </form>

          {/* Try Asking Suggestion Pills */}
          <div className="hero-try-asking-row">
            <span className="try-label">Try asking:</span>
            <button
              type="button"
              className="try-pill"
              onClick={() => handleSendChatMessage("I am a student, which scholarships can I get?")}
            >
              🎓 I am a student, which scholarships can I get?
            </button>
            <button
              type="button"
              className="try-pill"
              onClick={() => handleSendChatMessage("Schemes for farmers")}
            >
              🚜 Schemes for farmers
            </button>
            <button
              type="button"
              className="try-pill"
              onClick={() => handleSendChatMessage("Housing schemes for families")}
            >
              🏠 Housing schemes for families
            </button>
          </div>

          {/* FUTURISTIC GLOWING INDIA MAP WITH CONSTELLATION & MONUMENT */}
          <div className="hero-map-backdrop-wrapper">
            <IndiaMap onSelectCategory={handleCategorySelect} />
          </div>

          {/* 4 CORE METRICS CARDS */}
          <div className="hero-metrics-grid">
            {/* Metric 1 */}
            <div className="metric-card">
              <div className="metric-icon-wrap icon-purple">
                <span>📄</span>
              </div>
              <div className="metric-info">
                <div className="metric-val">1200+</div>
                <div className="metric-title">Schemes Catalogued</div>
                <div className="metric-desc">From Central & State Governments</div>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="metric-card">
              <div className="metric-icon-wrap icon-green">
                <span>⚡</span>
              </div>
              <div className="metric-info">
                <div className="metric-val">Instant Results</div>
                <div className="metric-desc">AI matches your profile with relevant schemes in seconds</div>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="metric-card">
              <div className="metric-icon-wrap icon-red">
                <span>👥</span>
              </div>
              <div className="metric-info">
                <div className="metric-val">10K+</div>
                <div className="metric-title">Active Users</div>
                <div className="metric-desc">Citizens across India trusting Sahayog AI</div>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="metric-card">
              <div className="metric-icon-wrap icon-gold">
                <span>🛡️</span>
              </div>
              <div className="metric-info">
                <div className="metric-val">100% Secure</div>
                <div className="metric-desc">Your data is safe and private with us</div>
              </div>
            </div>
          </div>

          {/* POPULAR SCHEMES CAROUSEL / GRID */}
          <div className="popular-schemes-section">
            <div className="popular-schemes-header">
              <div className="popular-heading-group">
                <span className="popular-fire-emoji">🔥</span>
                <h3 className="popular-heading-text">Popular Schemes</h3>
              </div>
              <Link to="/dashboard" className="popular-view-all-link">
                View all schemes →
              </Link>
            </div>

            <div className="popular-schemes-cards-row">
              {popularSchemes.map((scheme) => (
                <div key={scheme.id} className="popular-scheme-card">
                  <div className="scheme-card-top-row">
                    <div
                      className="scheme-category-icon"
                      style={{
                        backgroundColor: scheme.iconBg,
                        borderColor: scheme.iconColor,
                      }}
                    >
                      <span>{scheme.icon}</span>
                    </div>
                    <div className="scheme-title-col">
                      <h4 className="scheme-title-text">{scheme.name}</h4>
                      <span className="scheme-category-badge">{scheme.category}</span>
                    </div>
                  </div>

                  <p className="scheme-card-desc">{scheme.description}</p>

                  <div className="scheme-card-bottom-row">
                    <div className="scheme-benefit-col">
                      <span className="benefit-value-text">{scheme.benefit}</span>
                      <span className="benefit-label-sub">{scheme.benefitLabel}</span>
                    </div>
                    <div className="scheme-match-pill">
                      {scheme.matchScore}% Match
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Feature Highlights & Embedded AI Assistant */}
        <div className="hero-right-column">
          {/* Top Feature Highlights Stack */}
          <div className="feature-highlights-stack">
            <div className="feature-highlight-card">
              <div className="feature-badge-icon icon-purple">
                <span>🤖</span>
              </div>
              <div className="feature-content">
                <h4 className="feature-name">AI Assistant</h4>
                <p className="feature-summary">Get instant answers in your language</p>
              </div>
            </div>

            <div className="feature-highlight-card">
              <div className="feature-badge-icon icon-green">
                <span>🎯</span>
              </div>
              <div className="feature-content">
                <h4 className="feature-name">Smart Scheme Matching</h4>
                <p className="feature-summary">AI matches schemes perfectly for you</p>
              </div>
            </div>

            <div className="feature-highlight-card">
              <div className="feature-badge-icon icon-blue">
                <span>📄</span>
              </div>
              <div className="feature-content">
                <h4 className="feature-name">Step-by-Step Guidance</h4>
                <p className="feature-summary">Understand documents, process & how to apply</p>
              </div>
            </div>

            <div className="feature-highlight-card">
              <div className="feature-badge-icon icon-red">
                <span>🔖</span>
              </div>
              <div className="feature-content">
                <h4 className="feature-name">Save & Track</h4>
                <p className="feature-summary">Save schemes and track your application progress</p>
              </div>
            </div>
          </div>

          {/* Embedded Live AI Assistant Chat Panel */}
          <div className="ai-assistant-card-panel" id="ai-assistant-card">
            {/* Chat Header */}
            <div className="chat-card-header">
              <div className="chat-bot-brand">
                <div className="chat-bot-avatar">🤖</div>
                <span className="chat-bot-title">AI Assistant</span>
              </div>
              <button
                type="button"
                className="btn-new-chat"
                onClick={handleResetChat}
                title="Start a new chat conversation"
              >
                New Chat
              </button>
            </div>

            {/* Chat Message Stream */}
            <div className="chat-messages-viewport">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-bubble-row ${msg.sender === "user" ? "user-row" : "bot-row"}`}
                >
                  {msg.sender === "assistant" && (
                    <div className="bot-bubble-avatar">🤖</div>
                  )}
                  <div className={`chat-bubble ${msg.sender === "user" ? "user-bubble" : "bot-bubble"}`}>
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="chat-bubble-row bot-row">
                  <div className="bot-bubble-avatar">🤖</div>
                  <div className="chat-bubble bot-bubble loading-dots">
                    <span>•</span><span>•</span><span>•</span>
                  </div>
                </div>
              )}

              {/* Suggested Quick Prompt Bubbles inside Chat */}
              {chatMessages.length <= 2 && (
                <div className="chat-quick-suggestions">
                  <button
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleSendChatMessage("Which schemes can I apply for as a student?")}
                  >
                    <span className="chip-icon">📄</span>
                    <span>Which schemes can I apply for as a student?</span>
                  </button>

                  <button
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleSendChatMessage("I'm a farmer from MP, what schemes are for me?")}
                  >
                    <span className="chip-icon">❓</span>
                    <span>I'm a farmer from MP, what schemes are for me?</span>
                  </button>

                  <button
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleSendChatMessage("मैं एक महिला हूँ, मेरे लिए कौन सी योजनाएं हैं?")}
                  >
                    <span className="chip-icon">💬</span>
                    <span>मैं एक महिला हूँ, मेरे लिए कौन सी योजनाएं हैं?</span>
                  </button>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Powered By Gemini Footer Tag */}
            <div className="chat-gemini-badge">
              <span>⚡ Powered by Gemini AI</span>
            </div>

            {/* Chat Input Bar */}
            <form
              className="chat-input-wrapper"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
            >
              <input
                type="text"
                className="chat-text-input"
                placeholder="Type your question..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatLoading}
                aria-label="Type your question to AI Assistant"
              />
              <button
                type="button"
                className={`chat-mic-icon-btn ${isChatListening ? "listening" : ""}`}
                onClick={() => handleVoiceInput("chat")}
                title="Speak question"
                aria-label="Voice input"
              >
                🎙️
              </button>
              <button
                type="submit"
                className="chat-send-icon-btn"
                disabled={!chatInput.trim() || isChatLoading}
                title="Send message"
                aria-label="Send message"
              >
                <span>➤</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── BOTTOM TRUST & METRICS TICKER BAR ────────────────────────── */}
      <section className="hero-trust-bar">
        <div className="trust-metric-item">
          <span className="trust-icon">🌐</span>
          <div className="trust-text-col">
            <span className="trust-main-val">8 Languages</span>
            <span className="trust-sub-label">Supported</span>
          </div>
        </div>

        <div className="trust-metric-item">
          <span className="trust-icon">💬</span>
          <div className="trust-text-col">
            <span className="trust-main-val">24/7 AI Assistant</span>
            <span className="trust-sub-label">Available</span>
          </div>
        </div>

        <div className="trust-metric-item">
          <span className="trust-icon">🗺️</span>
          <div className="trust-text-col">
            <span className="trust-main-val">All India</span>
            <span className="trust-sub-label">Coverage</span>
          </div>
        </div>

        <div className="trust-metric-item">
          <span className="trust-icon">🛡️</span>
          <div className="trust-text-col">
            <span className="trust-main-val">Zero</span>
            <span className="trust-sub-label">Hidden Charges</span>
          </div>
        </div>

        <div className="trust-metric-item">
          <span className="trust-icon">⚡</span>
          <div className="trust-text-col">
            <span className="trust-main-val">99.5%</span>
            <span className="trust-sub-label">Uptime</span>
          </div>
        </div>
      </section>
    </div>
  );
}
