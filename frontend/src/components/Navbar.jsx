import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import DarkModeToggle from "./DarkModeToggle.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";

export default function Navbar({ savedCount }) {
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

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={() => setMobileMenuOpen(false)}>
          <span className="logo-seal">स</span> {t("brand")}
        </Link>

        {/* Desktop Links */}
        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            {t("navHome")}
          </NavLink>
          {user && (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                {t("navDashboard")}
              </NavLink>
              <NavLink to="/saved" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                {t("navSaved")}
                {savedCount > 0 && <span className="badge">{savedCount}</span>}
              </NavLink>
              <NavLink to="/analytics" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                {t("navAnalytics")}
              </NavLink>
            </>
          )}
        </div>

        {/* Desktop Actions */}
        <div className="navbar-actions">
          <LanguageSwitcher />
          <DarkModeToggle />
          {user ? (
            <div className="user-profile-menu">
              <span className="user-name-display">{user.name}</span>
              <button onClick={handleLogout} className="btn-logout">
                {t("navLogout")}
              </button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="btn-login-link">{t("navLogin")}</Link>
              <Link to="/register" className="btn-register-link btn-primary-nav">{t("navRegister")}</Link>
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
            {t("navHome")}
          </NavLink>
          {user && (
            <>
              <NavLink to="/dashboard" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                {t("navDashboard")}
              </NavLink>
              <NavLink to="/saved" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                {t("navSaved")}
                {savedCount > 0 && <span className="badge mobile-badge">{savedCount}</span>}
              </NavLink>
              <NavLink to="/analytics" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                {t("navAnalytics")}
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
                  {t("navLogout")}
                </button>
              </div>
            ) : (
              <div className="mobile-auth-row">
                <Link to="/login" className="btn-login-link" onClick={() => setMobileMenuOpen(false)}>{t("navLogin")}</Link>
                <Link to="/register" className="btn-primary-nav w-full text-center" onClick={() => setMobileMenuOpen(false)}>{t("navRegister")}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
