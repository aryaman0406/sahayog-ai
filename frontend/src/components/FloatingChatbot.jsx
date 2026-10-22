import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import ChatPanel from "./ChatPanel.jsx";

export default function FloatingChatbot({ matches, onProfileExtracted }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isLanding = location.pathname === "/";
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(!isLanding);

  useEffect(() => {
    if (!isLanding) {
      setHasScrolledPastHero(true);
      return;
    }

    const checkScroll = () => {
      // Embedded Hero assistant card is at the top; once scrolled past 480px, show floating button
      setHasScrolledPastHero(window.scrollY > 480);
    };

    checkScroll();
    window.addEventListener("scroll", checkScroll, { passive: true });
    return () => window.removeEventListener("scroll", checkScroll);
  }, [isLanding]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-sahayog-chatbot", handleOpen);
    return () => window.removeEventListener("open-sahayog-chatbot", handleOpen);
  }, []);

  const shouldShowButton = isOpen || !isLanding || hasScrolledPastHero;

  if (!shouldShowButton && !isOpen) {
    return null;
  }

  return (
    <div className="floating-chatbot-container">
      {/* Floating Chat Popup Window */}
      {isOpen && (
        <div className="floating-chatbot-window animate-slide-up">
          <div className="floating-chatbot-header">
            <div className="floating-chatbot-title">
              <span className="chatbot-avatar-icon">🤖</span>
              <div>
                <span className="chatbot-header-name">{t("chatTitle") || "Sahayog AI Assistant"}</span>
                <span className="chatbot-online-status">● Live Assistant</span>
              </div>
            </div>
            <button
              type="button"
              className="floating-chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close Chatbot"
            >
              ✕
            </button>
          </div>
          <div className="floating-chatbot-body">
            <ChatPanel profile={user} matches={matches} onProfileExtracted={onProfileExtracted} />
          </div>
        </div>
      )}

      {/* Floating Toggle Button (Right Bottom Corner) */}
      <button
        type="button"
        className={`floating-chatbot-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title={t("chatFloatingTooltip") || "Chat with Sahayog AI Assistant"}
        aria-label="Toggle Chatbot"
      >
        <span className="chatbot-btn-icon">{isOpen ? "✕" : "🤖"}</span>
        <span className="chatbot-btn-text">
          {isOpen ? t("btnBack") || "Close" : t("chatFloatingBtn") || "Ask Sahayog AI"}
        </span>
        <span className="chatbot-pulse-ring"></span>
      </button>
    </div>
  );
}
