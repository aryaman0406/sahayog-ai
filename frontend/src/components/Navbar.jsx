import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import DarkModeToggle from "./DarkModeToggle.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";

export default function Navbar({ savedCount = 0 }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      setMobileMenuOpen(false);
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleNavLinkClick = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-logo" onClick={() => setMobileMenuOpen(false)}>
          <div className="logo-badge-icon">
            <span className="logo-letter">स</span>
          </div>
          <span className="logo-brand-text">Sahayog AI</span>
        </Link>

        {/* Desktop Links */}
        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            {t("navHome") || "Home"}
          </NavLink>
          <NavLink to={user ? "/dashboard" : "/login"} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            {t("navSchemes") || "Schemes"}
          </NavLink>
          {user && (
            <button 
              type="button" 
              className="nav-item-btn" 
              onClick={() => {
                const el = document.getElementById("ai-assistant-card");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                else navigate("/dashboard");
              }}
            >
              {t("navAIAssistant") || "AI Assistant"}
            </button>
          )}
          <button 
            type="button" 
            className="nav-item-btn" 
            onClick={() => navigate(user ? "/dashboard" : "/login")}
          >
            {t("navEligibility") || "Eligibility Checker"}
          </button>
          {user ? (
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              {t("navDashboard") || "Dashboard"}
            </NavLink>
          ) : (
            <NavLink to="/login" className="nav-item">
              {t("navDashboard") || "Dashboard"}
            </NavLink>
          )}
          <button
            type="button"
            className="nav-item-btn"
            onClick={() => {
              const el = document.getElementById("about-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {t("navAbout") || "About Us"}
          </button>
          <button
            type="button"
            className="nav-item-btn"
            onClick={() => {
              const el = document.getElementById("contact-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {t("navContact") || "Contact"}
          </button>
        </div>

        {/* Desktop Actions */}
        <div className="navbar-actions">
          <LanguageSwitcher />
          <DarkModeToggle />

          {user ? (
            <div className="user-profile-menu">
              <span className="user-name-display">{user.name}</span>
              {savedCount > 0 && (
                <Link to="/saved" className="nav-saved-pill" title={t("navSaved") || "Saved Schemes"}>
                  🔖 {savedCount}
                </Link>
              )}
              <button onClick={handleLogout} className="btn-logout">
                {t("navLogout") || "Logout"}
              </button>
            </div>
          ) : (
            <div className="auth-action-group">
              <Link to="/login" className="btn-login-outline">
                {t("navLogin") || "Login"}
              </Link>
              <Link to="/register" className="btn-register-solid">
                {t("navRegister") || "Register"}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="mobile-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          <span className={`bar ${mobileMenuOpen ? "open" : ""}`}></span>
          <span className={`bar ${mobileMenuOpen ? "open" : ""}`}></span>
          <span className={`bar ${mobileMenuOpen ? "open" : ""}`}></span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer animate-fade-in">
          <NavLink to="/" end className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
            {t("navHome") || "Home"}
          </NavLink>
          <NavLink to={user ? "/dashboard" : "/login"} className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
            {t("navSchemes") || "Schemes"}
          </NavLink>
          {user && (
            <button 
              type="button" 
              className="mobile-nav-item text-left w-full"
              style={{ background: "none", border: "none", font: "inherit", color: "inherit", cursor: "pointer", padding: "10px 16px" }}
              onClick={() => {
                setMobileMenuOpen(false);
                const el = document.getElementById("ai-assistant-card");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                else navigate("/dashboard");
              }}
            >
              {t("navAIAssistant") || "AI Assistant"}
            </button>
          )}
          <NavLink to={user ? "/dashboard" : "/login"} className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
            {t("navEligibility") || "Eligibility Checker"}
          </NavLink>
          {user && (
            <>
              <NavLink to="/dashboard" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                {t("navDashboard") || "Dashboard"}
              </NavLink>
              <NavLink to="/saved" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                {t("navSaved") || "Saved Schemes"} ({savedCount})
              </NavLink>
              <NavLink to="/analytics" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                {t("navAnalytics") || "Analytics"}
              </NavLink>
            </>
          )}

          <hr className="drawer-divider" />

          <div className="mobile-drawer-actions">
            <div className="toggles-row">
              <LanguageSwitcher />
              <DarkModeToggle />
            </div>

            {user ? (
              <div className="mobile-user-row">
                <span className="mobile-username">{user.name}</span>
                <button onClick={handleLogout} className="btn-logout w-full">
                  {t("navLogout") || "Logout"}
                </button>
              </div>
            ) : (
              <div className="mobile-auth-row">
                <Link to="/login" className="btn-login-outline w-full text-center" onClick={() => setMobileMenuOpen(false)}>
                  {t("navLogin") || "Login"}
                </Link>
                <Link to="/register" className="btn-register-solid w-full text-center" onClick={() => setMobileMenuOpen(false)}>
                  {t("navRegister") || "Register"}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
