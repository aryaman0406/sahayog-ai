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
      name: t("scheme1Name") || "PM Scholarship Scheme",
      category: t("scheme1Cat") || "Education",
      icon: "🎓",
      iconColor: "#10B981",
      iconBg: "rgba(16, 185, 129, 0.15)",
      description: t("scheme1Desc") || "Financial assistance for meritorious students pursuing higher education.",
      benefit: "₹50,000",
      benefitLabel: t("popularMaxBenefit") || "Max Benefit",
      matchScore: 92,
    },
    {
      id: "2",
      name: t("scheme2Name") || "PM Awas Yojana (Urban)",
      category: t("scheme2Cat") || "Housing",
      icon: "🏠",
      iconColor: "#F59E0B",
      iconBg: "rgba(245, 158, 11, 0.15)",
      description: t("scheme2Desc") || "Affordable housing for urban poor with pucca house financial assistance.",
      benefit: "₹2,50,000",
      benefitLabel: t("popularMaxBenefit") || "Max Benefit",
      matchScore: 89,
    },
    {
      id: "3",
      name: t("scheme3Name") || "Ayushman Bharat Yojana",
      category: t("scheme3Cat") || "Health",
      icon: "💙",
      iconColor: "#3B82F6",
      iconBg: "rgba(59, 130, 246, 0.15)",
      description: t("scheme3Desc") || "Health coverage up to ₹5 lakh per family per year for secondary care.",
      benefit: "₹5,00,000",
      benefitLabel: t("popularCoverage") || "Coverage",
      matchScore: 95,
    },
    {
      id: "4",
      name: t("scheme4Name") || "PM Kisan Samman Nidhi",
      category: t("scheme4Cat") || "Agriculture",
      icon: "🚜",
      iconColor: "#10B981",
      iconBg: "rgba(16, 185, 129, 0.15)",
      description: t("scheme4Desc") || "Income support of ₹6,000 per year to all landholding farmers in 3 installments.",
      benefit: "₹6,000 / year",
      benefitLabel: t("popularBenefit") || "Benefit",
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
    if (!user) {
      navigate("/login");
      return;
    }

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

    if (!user) {
      navigate("/login");
      return;
    }

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
          {/* Discovery Badge */}
          <div className="hero-discovery-badge">
            <span className="badge-sparkle">✦</span>
            <span>{user ? (t("heroBadgeAI") || "AI-Powered Government Scheme Discovery") : (t("heroBadge") || "Government Welfare Schemes Portal")}</span>
          </div>

          {/* Main Hero Heading */}
          <h1 className="hero-main-title">
            {t("heroTitle1") || "Find Government"}<br />
            {t("heroTitle2") || "Schemes You're"}<br />
            <span className="hero-highlight-gold">{t("heroTitle3") || "Eligible For"}</span>
          </h1>

          {/* Subheading */}
          <p className="hero-main-subtitle">
            {user
              ? (t("heroSubtitleAI") || "Discover, understand and apply for 1200+ government welfare schemes using the power of AI in your language.")
              : (t("heroSubtitle") || "Discover, understand and apply for 1200+ central and state government welfare schemes in your preferred language.")}
          </p>

          {/* Main Search Bar */}
          <form className="hero-search-bar" onSubmit={handleSearchSubmit}>
            <span className="search-bar-icon">🔍</span>
            <input
              type="text"
              className="search-bar-input"
              placeholder={user ? (t("heroSearchPlaceholderAI") || "Ask anything about government schemes...") : (t("heroSearchPlaceholder") || "Search government schemes by name, category, or benefit...")}
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
              {user ? (
                <>{t("heroSearchBtnAI") || "Ask AI"} <span className="ask-sparkle">✨</span></>
              ) : (
                <>{t("heroSearchBtn") || "Search"} <span className="ask-sparkle">🔍</span></>
              )}
            </button>
          </form>

          {/* Try Asking / Quick Topics */}
          <div className="hero-try-asking-row">
            <span className="try-label">{user ? (t("heroTryLabelAI") || "Try asking:") : (t("heroTryLabel") || "Popular topics:")}</span>
            <button
              type="button"
              className="try-pill"
              onClick={() => {
                if (!user) {
                  navigate("/login");
                } else {
                  handleSendChatMessage("I am a student, which scholarships can I get?");
                }
              }}
            >
              {t("heroPillStudent") || "🎓 Student Scholarships"}
            </button>
            <button
              type="button"
              className="try-pill"
              onClick={() => {
                if (!user) {
                  navigate("/login");
                } else {
                  handleSendChatMessage("Schemes for farmers");
                }
              }}
            >
              {t("heroPillFarmer") || "🚜 Farmer Welfare Schemes"}
            </button>
            <button
              type="button"
              className="try-pill"
              onClick={() => {
                if (!user) {
                  navigate("/login");
                } else {
                  handleSendChatMessage("Housing schemes for families");
                }
              }}
            >
              {t("heroPillHousing") || "🏠 Housing Schemes for Families"}
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
                <div className="metric-title">{t("statSchemes") || "Schemes Catalogued"}</div>
                <div className="metric-desc">{t("statSchemesDesc") || "From Central & State Governments"}</div>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="metric-card">
              <div className="metric-icon-wrap icon-green">
                <span>⚡</span>
              </div>
              <div className="metric-info">
                <div className="metric-val">{t("statInstant") || "Instant Results"}</div>
                <div className="metric-desc">{t("statInstantDesc") || "Match your profile with relevant schemes in seconds"}</div>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="metric-card">
              <div className="metric-icon-wrap icon-red">
                <span>👥</span>
              </div>
              <div className="metric-info">
                <div className="metric-val">10K+</div>
                <div className="metric-title">{t("statUsers") || "Active Users"}</div>
                <div className="metric-desc">{t("statUsersDesc") || "Citizens across India trusting Sahayog"}</div>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="metric-card">
              <div className="metric-icon-wrap icon-gold">
                <span>🛡️</span>
              </div>
              <div className="metric-info">
                <div className="metric-val">{t("statSecure") || "100% Secure"}</div>
                <div className="metric-desc">{t("statSecureDesc") || "Your data is safe and private with us"}</div>
              </div>
            </div>
          </div>

          {/* POPULAR SCHEMES CAROUSEL / GRID */}
          <div className="popular-schemes-section">
            <div className="popular-schemes-header">
              <div className="popular-heading-group">
                <span className="popular-fire-emoji">🔥</span>
                <h3 className="popular-heading-text">{t("popularTitle") || "Popular Schemes"}</h3>
              </div>
              <Link to="/dashboard" className="popular-view-all-link">
                {t("popularViewAll") || "View all schemes →"}
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
                      {scheme.matchScore}% {t("popularMatch") || "Match"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Feature Highlights & Interactive Panels */}
        <div className="hero-right-column">
          {/* Top Feature Highlights Stack */}
          <div className="feature-highlights-stack">
            {user ? (
              <div
                className="feature-highlight-card"
                onClick={() => {
                  const el = document.getElementById("ai-assistant-card");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="feature-badge-icon icon-purple">
                  <span>🤖</span>
                </div>
                <div className="feature-content">
                  <h4 className="feature-name">{t("featAI") || "AI Assistant"}</h4>
                  <p className="feature-summary">{t("featAIDesc") || "Get instant answers in your language"}</p>
                </div>
              </div>
            ) : (
              <div
                className="feature-highlight-card"
                onClick={() => navigate("/login")}
                style={{ cursor: "pointer" }}
              >
                <div className="feature-badge-icon icon-purple">
                  <span>🌐</span>
                </div>
                <div className="feature-content">
                  <h4 className="feature-name">{t("featMultilingual") || "Multilingual Support"}</h4>
                  <p className="feature-summary">{t("featMultilingualDesc") || "Available in 8 Indian regional languages"}</p>
                </div>
              </div>
            )}

            <div
              className="feature-highlight-card"
              onClick={() => navigate(user ? "/dashboard" : "/login")}
              style={{ cursor: "pointer" }}
            >
              <div className="feature-badge-icon icon-green">
                <span>🎯</span>
              </div>
              <div className="feature-content">
                <h4 className="feature-name">{t("featMatching") || "Smart Scheme Matching"}</h4>
                <p className="feature-summary">{t("featMatchingDesc") || "Matches schemes perfectly for your profile"}</p>
              </div>
            </div>

            <div
              className="feature-highlight-card"
              onClick={() => navigate(user ? "/dashboard" : "/login")}
              style={{ cursor: "pointer" }}
            >
              <div className="feature-badge-icon icon-blue">
                <span>📄</span>
              </div>
              <div className="feature-content">
                <h4 className="feature-name">{t("featGuidance") || "Step-by-Step Guidance"}</h4>
                <p className="feature-summary">{t("featGuidanceDesc") || "Understand documents, process & how to apply"}</p>
              </div>
            </div>

            <div
              className="feature-highlight-card"
              onClick={() => navigate(user ? "/saved" : "/login")}
              style={{ cursor: "pointer" }}
            >
              <div className="feature-badge-icon icon-red">
                <span>🔖</span>
              </div>
              <div className="feature-content">
                <h4 className="feature-name">{t("featSave") || "Save & Track"}</h4>
                <p className="feature-summary">{t("featSaveDesc") || "Save schemes and track your application progress"}</p>
              </div>
            </div>
          </div>

          {/* Embedded Live AI Assistant (When Logged In) OR Eligibility Checker Card (When Guest) */}
          {user ? (
            <div className="ai-assistant-card-panel animate-fade-in" id="ai-assistant-card">
              {/* Chat Header */}
              <div className="chat-card-header">
                <div className="chat-bot-brand">
                  <div className="chat-bot-avatar">🤖</div>
                  <span className="chat-bot-title">{t("featAI") || "AI Assistant"}</span>
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
          ) : (
            <div className="ai-assistant-card-panel hero-eligibility-gate-panel animate-fade-in" id="eligibility-card">
              <div className="chat-card-header">
                <div className="chat-bot-brand">
                  <div className="chat-bot-avatar" style={{ background: "rgba(245, 158, 11, 0.2)", borderColor: "rgba(245, 158, 11, 0.4)" }}>
                    📋
                  </div>
                  <span className="chat-bot-title">{t("checkerTitle") || "Eligibility Checker"}</span>
                </div>
                <span className="locked-badge" style={{ background: "rgba(16, 185, 129, 0.15)", borderColor: "rgba(16, 185, 129, 0.4)", color: "#34D399" }}>
                  ⚡ {t("checkerBadge") || "Free Instant Scan"}
                </span>
              </div>

              <div className="locked-card-body">
                <div className="locked-icon-wrapper">
                  <div className="locked-bot-icon" style={{ background: "radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(217, 119, 6, 0.15) 100%)", borderColor: "rgba(245, 158, 11, 0.5)", boxShadow: "0 0 24px rgba(245, 158, 11, 0.3)" }}>
                    🏛️
                  </div>
                  <span className="locked-sparkle-badge" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                    {t("checkerBadgeSchemes") || "1200+ Schemes"}
                  </span>
                </div>

                <h3 className="locked-card-title">{t("checkerHeading") || "Check Your Scheme Eligibility"}</h3>
                <p className="locked-card-desc">
                  {t("checkerDesc") || "Find out which central and state government welfare schemes you and your family qualify for in less than 2 minutes."}
                </p>

                <div className="locked-features-list">
                  <div className="locked-feature-item">
                    <span className="locked-check-icon">✓</span>
                    <span>{t("checkerFeat1") || "100% Free & Secure Profile Matching"}</span>
                  </div>
                  <div className="locked-feature-item">
                    <span className="locked-check-icon">✓</span>
                    <span>{t("checkerFeat2") || "Verified Criteria & Required Documents List"}</span>
                  </div>
                  <div className="locked-feature-item">
                    <span className="locked-check-icon">✓</span>
                    <span>{t("checkerFeat3") || "Direct Application Steps & Portal Links"}</span>
                  </div>
                </div>

                <div className="locked-actions-group">
                  <Link to="/login" className="btn-locked-login">
                    {t("checkerBtn") || "Check Eligibility Now →"}
                  </Link>
                  <Link to="/register" className="btn-locked-register">
                    {t("checkerRegister") || "Create Free Account"}
                  </Link>
                </div>
              </div>

              <div className="chat-gemini-badge" style={{ color: "#94A3B8" }}>
                <span>🇮🇳 {t("checkerFooter") || "Official Central & State Welfare Schemes"}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── BOTTOM TRUST & METRICS TICKER BAR ────────────────────────── */}
      <section className="hero-trust-bar">
        <div className="trust-metric-item">
          <span className="trust-icon">🌐</span>
          <div className="trust-text-col">
            <span className="trust-main-val">{t("trustLangVal") || "8 Languages"}</span>
            <span className="trust-sub-label">{t("trustLangLabel") || "Supported"}</span>
          </div>
        </div>

        <div className="trust-metric-item">
          <span className="trust-icon">💬</span>
          <div className="trust-text-col">
            <span className="trust-main-val">{user ? (t("trustAssistValAI") || "24/7 AI Assistant") : (t("trustAssistVal") || "24/7 Assistance")}</span>
            <span className="trust-sub-label">{t("trustAssistLabel") || "Available"}</span>
          </div>
        </div>

        <div className="trust-metric-item">
          <span className="trust-icon">🗺️</span>
          <div className="trust-text-col">
            <span className="trust-main-val">{t("trustIndiaVal") || "All India"}</span>
            <span className="trust-sub-label">{t("trustIndiaLabel") || "Coverage"}</span>
          </div>
        </div>

        <div className="trust-metric-item">
          <span className="trust-icon">🛡️</span>
          <div className="trust-text-col">
            <span className="trust-main-val">{t("trustZeroVal") || "Zero"}</span>
            <span className="trust-sub-label">{t("trustZeroLabel") || "Hidden Charges"}</span>
          </div>
        </div>

        <div className="trust-metric-item">
          <span className="trust-icon">⚡</span>
          <div className="trust-text-col">
            <span className="trust-main-val">{t("trustUptimeVal") || "99.5%"}</span>
            <span className="trust-sub-label">{t("trustUptimeLabel") || "Uptime"}</span>
          </div>
        </div>
      </section>

      {/* ── ABOUT US SECTION ────────────────────────────────────────── */}
      <section className="hero-about-section" id="about-section">
        <div className="about-header-group">
          <h2 className="about-main-title">{t("aboutTitle") || "About Sahayog"}</h2>
          <p className="about-main-desc">
            {t("aboutDesc") || "Sahayog is a citizen-first digital platform designed to bridge the gap between government welfare programs and eligible citizens across India. Our goal is to ensure every family discovers, understands, and receives the benefits they are entitled to."}
          </p>
        </div>

        <div className="about-features-grid">
          <div className="about-feature-card">
            <div className="about-card-icon">🏛️</div>
            <h3 className="about-card-title">{t("aboutCard1Title") || "100% Free & Transparent"}</h3>
            <p className="about-card-desc">{t("aboutCard1Desc") || "Zero hidden fees. Direct links to official government application portals."}</p>
          </div>
          <div className="about-feature-card">
            <div className="about-card-icon">🌐</div>
            <h3 className="about-card-title">{t("aboutCard2Title") || "Multilingual Access"}</h3>
            <p className="about-card-desc">{t("aboutCard2Desc") || "Read scheme benefits and requirements in 8 Indian regional languages."}</p>
          </div>
          <div className="about-feature-card">
            <div className="about-card-icon">🛡️</div>
            <h3 className="about-card-title">{t("aboutCard3Title") || "Secure & Private"}</h3>
            <p className="about-card-desc">{t("aboutCard3Desc") || "Your personal and eligibility data is kept strictly confidential."}</p>
          </div>
        </div>
      </section>

      {/* ── CONTACT & CITIZEN HELPDESK SECTION ──────────────────────── */}
      <section className="hero-contact-section" id="contact-section">
        <div className="contact-card-box">
          <div className="contact-text-col">
            <h2 className="contact-main-title">{t("contactTitle") || "Contact Below"}</h2>
            <p className="contact-main-subtitle">
              {t("contactSubtitle") || "Have questions about scheme eligibility or documentation? Reach out through official government channels."}
            </p>
            <div className="contact-details-list">
              <div className="contact-detail-row">
                <span className="contact-detail-icon">📞</span>
                <span>{t("contactTollFree") || "Official Government Toll-Free Number: 1800-115-555 (Govt. of India Citizen Helpline, 24x7 Toll-Free)"}</span>
              </div>
              <div className="contact-detail-row">
                <span className="contact-detail-icon">✉️</span>
                <span>{t("contactEmail") || "Official Government Email: support-myscheme@gov.in"}</span>
              </div>
            </div>
          </div>
          <div className="contact-action-col">
            <Link to={user ? "/dashboard" : "/login"} className="btn-contact-action">
              {user ? (t("navDashboard") || "Go to Dashboard →") : (t("checkerBtn") || "Check Eligibility Now →")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="hero-footer">
        <p className="footer-copyright">
          {t("footerRights") || "© 2026 Sahayog. Empowering citizens across India with seamless access to welfare schemes."}
        </p>
      </footer>
    </div>
  );
}
