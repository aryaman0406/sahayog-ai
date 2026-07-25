import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import ChatPanel from "./ChatPanel.jsx";

export default function FloatingChatbot({ matches }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="floating-chatbot-container">
      {/* Floating Chat Popup Window */}
      {isOpen && (
        <div className="floating-chatbot-window animate-slide-up">
          <div className="floating-chatbot-header">
            <div className="floating-chatbot-title">
              <span className="chatbot-avatar-icon">🤖</span>
              <div>
                <span className="chatbot-header-name">{t("chatTitle")}</span>
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
            <ChatPanel profile={user} matches={matches} />
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
