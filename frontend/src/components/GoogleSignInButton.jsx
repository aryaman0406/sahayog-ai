import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useNavigate } from "react-router-dom";

export default function GoogleSignInButton({ onSuccess }) {
  const { loginWithGoogle } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const googleBtnContainerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isRealClientConfigured =
    Boolean(clientId) &&
    clientId !== "YOUR_GOOGLE_CLIENT_ID" &&
    clientId.includes(".apps.googleusercontent.com");

  // Callback for official Google Identity Services
  const handleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle({ credential: response.credential });
      if (onSuccess) onSuccess();
      else navigate("/dashboard");
    } catch (err) {
      console.error("Google sign in error:", err);
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(Boolean(window.google?.accounts?.id));

  useEffect(() => {
    if (!isRealClientConfigured) return;

    const checkGoogle = () => {
      if (window.google?.accounts?.id) {
        setGoogleScriptLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGoogle()) return;

    const interval = setInterval(() => {
      if (checkGoogle()) {
        clearInterval(interval);
      }
    }, 200);

    const timeout = setTimeout(() => clearInterval(interval), 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isRealClientConfigured]);

  useEffect(() => {
    if (isRealClientConfigured && googleScriptLoaded && googleBtnContainerRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
        }

        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: 360,
        });
      } catch (err) {
        console.warn("Could not render official Google button:", err);
      }
    }
  }, [isRealClientConfigured, googleScriptLoaded, clientId]);

  const handleCustomGoogleLogin = async (email, name) => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle({
        email,
        name: name || email.split("@")[0],
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${name || email}`,
      });
      setShowDemoModal(false);
      if (onSuccess) onSuccess();
      else navigate("/dashboard");
    } catch (err) {
      console.error("Google login failed:", err);
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (isRealClientConfigured && window.google?.accounts?.id) {
      // Trigger Google One Tap or prompt
      try {
        window.google.accounts.id.prompt();
      } catch (e) {
        setShowDemoModal(true);
      }
    } else {
      // Show dev/demo Google account picker modal
      setShowDemoModal(true);
    }
  };

  return (
    <div className="google-auth-container">
      {error && <div className="google-auth-error">{error}</div>}

      {/* Hidden container for Google official button if rendered */}
      {isRealClientConfigured && (
        <div ref={googleBtnContainerRef} className="google-native-btn-wrapper" />
      )}

      {/* Branded Google Sign-In button */}
      {(!isRealClientConfigured || !window.google?.accounts?.id) && (
        <button
          type="button"
          className="btn-google-signin"
          onClick={handleClick}
          disabled={loading}
          aria-label="Sign in with Google"
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="google-btn-text">
            {loading ? "Signing in…" : t("continueWithGoogle") || "Continue with Google"}
          </span>
        </button>
      )}

      {/* Dev & Demo Account Selector Modal (active when testing or without Cloud Console Client ID) */}
      {showDemoModal && (
        <div className="google-modal-overlay" onClick={() => setShowDemoModal(false)}>
          <div
            className="google-modal-card animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="google-modal-header">
              <div className="google-badge-brand">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <h3>Sign in with Google</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowDemoModal(false)}
              >
                ✕
              </button>
            </div>

            <p className="google-modal-desc">
              Choose a Google account to continue to <strong>Sahayog AI</strong>.
            </p>

            <div className="google-accounts-list">
              <button
                type="button"
                className="google-account-item"
                onClick={() => handleCustomGoogleLogin("rahul.kumar@gmail.com", "Rahul Kumar")}
                disabled={loading}
              >
                <div className="account-avatar" style={{ background: "#4285F4" }}>
                  R
                </div>
                <div className="account-details">
                  <span className="account-name">Rahul Kumar</span>
                  <span className="account-email">rahul.kumar@gmail.com</span>
                </div>
              </button>

              <button
                type="button"
                className="google-account-item"
                onClick={() => handleCustomGoogleLogin("ananya.sharma@gmail.com", "Ananya Sharma")}
                disabled={loading}
              >
                <div className="account-avatar" style={{ background: "#34A853" }}>
                  A
                </div>
                <div className="account-details">
                  <span className="account-name">Ananya Sharma</span>
                  <span className="account-email">ananya.sharma@gmail.com</span>
                </div>
              </button>

              <button
                type="button"
                className="google-account-item"
                onClick={() => handleCustomGoogleLogin("vikram.singh@gmail.com", "Vikram Singh")}
                disabled={loading}
              >
                <div className="account-avatar" style={{ background: "#EA4335" }}>
                  V
                </div>
                <div className="account-details">
                  <span className="account-name">Vikram Singh</span>
                  <span className="account-email">vikram.singh@gmail.com</span>
                </div>
              </button>
            </div>

            <div className="custom-google-email-form">
              <span className="custom-or-divider">Or use your own Gmail:</span>
              <div className="custom-input-row">
                <input
                  type="text"
                  placeholder="Your Name"
                  className="google-custom-input"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="your.email@gmail.com"
                  className="google-custom-input"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-google-custom-go"
                  disabled={!customEmail || loading}
                  onClick={() => handleCustomGoogleLogin(customEmail, customName)}
                >
                  {loading ? "…" : "Sign In →"}
                </button>
              </div>
            </div>

            <div className="google-modal-footer">
              <small>
                💡 To use production Google OAuth, configure <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code>.
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
