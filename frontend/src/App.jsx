import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import ProfileForm from "./components/ProfileForm.jsx";
import SchemeResults from "./components/SchemeResults.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import SavedSchemes from "./components/SavedSchemes.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import SchemeDetail from "./components/SchemeDetail.jsx";
import AuthForm from "./components/AuthForm.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="card-panel text-center pad-lg animate-fade-in">
        <p className="empty-state">Verifying session details...</p>
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
        <p className="empty-state">Checking session...</p>
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
  const [matches, setMatches] = useState([]);
  const [savedSchemes, setSavedSchemes] = useState([]);

  // Fetch bookmarks from MongoDB
  const fetchSavedList = async () => {
    if (!user) return;
    try {
      const res = await authFetch("/api/saved/");
      if (res.ok) {
        const data = await res.json();
        setSavedSchemes(data.saved || []);
      }
    } catch (err) {
      console.error("Failed to fetch bookmarks:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavedList();
    } else {
      setSavedSchemes([]);
    }
  }, [user]);

  // Handle scheme eligibility matching
  const handleProfileSubmit = async (profileData) => {
    try {
      const res = await authFetch("/api/match/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error("Scoring request failed:", err);
    }
  };

  // Run matches if user profile data exists on session load
  useEffect(() => {
    if (user && user.age && user.occupation) {
      handleProfileSubmit({
        age: user.age,
        occupation: user.occupation,
        annual_income: user.annual_income,
        location_type: user.location_type,
        gender: user.gender,
      });
    } else {
      setMatches([]);
    }
  }, [user]);

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
          fetchSavedList();
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
                    <>
                      <SchemeResults 
                        matches={matches} 
                        savedSchemeIds={savedSchemeIds} 
                        onToggleSave={toggleBookmark} 
                      />
                      <ChatPanel profile={user} matches={matches} />
                    </>
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
      <footer className="app-footer">
        <p>© 2026 Sahayog AI · Empowerment Through Access</p>
      </footer>
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
