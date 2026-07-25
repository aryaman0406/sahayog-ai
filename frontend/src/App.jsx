import React, { useEffect, useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import ProfileForm from "./components/ProfileForm.jsx";
import SchemeResults from "./components/SchemeResults.jsx";
import SavedSchemes from "./components/SavedSchemes.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import SchemeDetail from "./components/SchemeDetail.jsx";
import AuthForm from "./components/AuthForm.jsx";
import FloatingChatbot from "./components/FloatingChatbot.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";

const MATCHES_CACHE_KEY = "sahayog_matches_cache";

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="card-panel text-center pad-lg animate-fade-in">
        <p className="empty-state">⏳ Verifying session…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Guest-only Route Guard
function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="card-panel text-center pad-lg animate-fade-in">
        <p className="empty-state">⏳ Checking session…</p>
      </div>
    );
  }
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppContent() {
  const { user, authFetch } = useAuth();

  // Seed matches instantly from cache so dashboard is never empty on load
  const [matches, setMatches] = useState(() => {
    try {
      const cached = localStorage.getItem(MATCHES_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [savedSchemes, setSavedSchemes] = useState([]);

  // Handle scheme eligibility matching
  const handleProfileSubmit = useCallback(async (profileData) => {
    try {
      const res = await authFetch("/api/match/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        const data = await res.json();
        const fresh = data.matches || [];
        setMatches(fresh);
        // Cache for instant display next session
        try { localStorage.setItem(MATCHES_CACHE_KEY, JSON.stringify(fresh)); } catch {}
      }
    } catch (err) {
      console.error("Scoring request failed:", err);
    }
  }, [authFetch]);

  // On user change: fire saved list + match in PARALLEL — not sequential
  useEffect(() => {
    if (!user) {
      setSavedSchemes([]);
      setMatches([]);
      localStorage.removeItem(MATCHES_CACHE_KEY);
      return;
    }

    const fetchSaved = authFetch("/api/saved/")
      .then(res => res.ok ? res.json() : { saved: [] })
      .then(data => setSavedSchemes(data.saved || []))
      .catch(() => {});

    const fetchMatches = (user.age && user.occupation)
      ? handleProfileSubmit({
          age: user.age,
          occupation: user.occupation,
          annual_income: user.annual_income,
          location_type: user.location_type,
          gender: user.gender,
        })
      : Promise.resolve();

    // Both fire at the same time
    Promise.all([fetchSaved, fetchMatches]);
  }, [user?.id]);

  // Toggle saving scheme to MongoDB
  const toggleBookmark = async (schemeId) => {
    if (!user) return;
    const isSaved = savedSchemes.some((s) => s.scheme_id === schemeId);
    try {
      if (isSaved) {
        const res = await authFetch(`/api/saved/${schemeId}`, { method: "DELETE" });
        if (res.ok) {
          setSavedSchemes((prev) => prev.filter((s) => s.scheme_id !== schemeId));
        }
      } else {
        const res = await authFetch("/api/saved/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheme_id: schemeId })
        });
        if (res.ok) {
          const data = await res.json();
          setSavedSchemes(data.saved || []);
        }
      }
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    }
  };

  const savedSchemeIds = savedSchemes.map((s) => s.scheme_id);

  return (
    <div className="app-shell">
      <Navbar savedCount={savedSchemes.length} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Hero isLanding={true} />} />
          <Route
            path="/login"
            element={
              <AuthRoute>
                <AuthForm isRegister={false} />
              </AuthRoute>
            }
          />
          <Route
            path="/register"
            element={
              <AuthRoute>
                <AuthForm isRegister={true} />
              </AuthRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div className="dashboard-grid">
                  <ProfileForm onSubmit={handleProfileSubmit} />
                  {matches.length > 0 && (
                    <SchemeResults
                      matches={matches}
                      savedSchemeIds={savedSchemeIds}
                      onToggleSave={toggleBookmark}
                    />
                  )}
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedSchemes savedSchemes={savedSchemes} onToggleSave={toggleBookmark} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsDashboard matches={matches} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheme/:id"
            element={
              <SchemeDetail onCheckEligibility={(sch) => console.log("Prefilling scheme eligibility", sch)} />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {user && <FloatingChatbot matches={matches} />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AppContent />
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}
