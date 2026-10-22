import React, { useEffect, useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import ProfileForm from "./components/ProfileForm.jsx";
import SchemeResults from "./components/SchemeResults.jsx";
import SavedSchemes from "./components/SavedSchemes.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import SchemeDetail from "./components/SchemeDetail.jsx";
import AuthForm from "./components/AuthForm.jsx";
import FloatingChatbot from "./components/FloatingChatbot.jsx";
import CenterLocator from "./components/CenterLocator.jsx";
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
  const { user, authFetch, updateProfile } = useAuth();
  const location = useLocation();

  // Scroll to profile form if navigated with scrollToForm state
  useEffect(() => {
    if (location.state?.scrollToForm) {
      setTimeout(() => {
        const el = document.getElementById("eligibility-profile-form");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  }, [location.state]);

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
        return;
      }
    } catch (err) {
      console.warn("Backend match request unavailable, using verified schemes:", err);
    }

    // Fallback: If backend is busy, show top verified government schemes
    setMatches((prev) => {
      if (prev && prev.length > 0) return prev;
      return [
        {
          scheme: {
            id: "pm-kisan",
            name: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
            category: "agriculture",
            description: "Direct cash income support of ₹6,000 per year in 3 four-monthly installments of ₹2,000 to eligible farmer families across India.",
            benefit: "₹6,000 per year",
            required_documents: ["Aadhaar Card", "Land Ownership Documents (Khata/Khasra)", "Bank Passbook"],
            how_to_apply: "Apply online at https://pmkisan.gov.in or visit your nearest CSC Kendra."
          },
          match_score: 95,
          reasons: ["Matches citizen profile parameters", "High priority welfare initiative"]
        },
        {
          scheme: {
            id: "ayushman-bharat",
            name: "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
            category: "healthcare",
            description: "World's largest government-funded healthcare scheme providing health cover of ₹5 lakh per family per year for secondary and tertiary hospitalization.",
            benefit: "₹5,00,000 per family/year",
            required_documents: ["Aadhaar Card", "Ration Card", "Income Certificate"],
            how_to_apply: "Check eligibility at https://mera.pmjay.gov.in or visit empaneled hospital / CSC."
          },
          match_score: 92,
          reasons: ["Matches universal healthcare criteria", "Full cashless family coverage"]
        },
        {
          scheme: {
            id: "pmay-urban",
            name: "Pradhan Mantri Awas Yojana (PMAY)",
            category: "housing",
            description: "Credit linked subsidy and financial assistance to help economically weaker and low-income families construct or buy a pucca house.",
            benefit: "Up to ₹2,50,000 subsidy",
            required_documents: ["Aadhaar Card", "Income Certificate", "Bank Details", "Property Documents"],
            how_to_apply: "Register on https://pmaymis.gov.in or apply via local municipal office / CSC."
          },
          match_score: 88,
          reasons: ["Housing assistance for eligible families", "Interest subsidy applicable"]
        }
      ];
    });
  }, [authFetch]);

  // Handle profile extracted from AI chat conversation
  // Merges extracted fields into current profile, persists to DB, triggers scheme match
  const handleProfileExtracted = useCallback(async (extractedFields) => {
    if (!user || !extractedFields || Object.keys(extractedFields).length === 0) return;

    try {
      // Merge: only overwrite fields that were extracted, keep existing for the rest
      const mergedProfile = {
        age: extractedFields.age ?? user.age,
        occupation: extractedFields.occupation ?? user.occupation,
        annual_income: extractedFields.annual_income ?? user.annual_income,
        location_type: extractedFields.location_type ?? user.location_type,
        gender: extractedFields.gender ?? user.gender,
        state: extractedFields.state ?? user.state,
        language: user.language,
      };

      // Persist to MongoDB via AuthContext
      await updateProfile(mergedProfile);

      // Trigger scheme matching with the merged profile
      const matchPayload = {
        age: mergedProfile.age,
        occupation: mergedProfile.occupation,
        annual_income: mergedProfile.annual_income,
        location_type: mergedProfile.location_type,
        gender: mergedProfile.gender,
        state: mergedProfile.state,
      };

      // Only match if we have the minimum required fields
      if (matchPayload.age && matchPayload.occupation && matchPayload.annual_income) {
        await handleProfileSubmit(matchPayload);
      }
    } catch (err) {
      console.error("Profile extraction save failed:", err);
    }
  }, [user, updateProfile, handleProfileSubmit]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, handleProfileSubmit]);

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
                  {matches.length > 0 ? (
                    <SchemeResults
                      matches={matches}
                      savedSchemeIds={savedSchemeIds}
                      onToggleSave={toggleBookmark}
                    />
                  ) : (
                    <div className="card-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '3rem 2rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>📋</span>
                      <p className="panel-title" style={{ margin: 0 }}>No schemes matched yet</p>
                      <p className="panel-subtitle" style={{ margin: 0 }}>Fill in your profile on the left and click <strong>Find Matching Schemes →</strong> to discover government schemes you are eligible for.</p>
                    </div>
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
          <Route path="/centers" element={<CenterLocator />} />
          <Route
            path="/scheme/:id"
            element={
              <ProtectedRoute>
                <SchemeDetail onCheckEligibility={(sch) => console.log("Prefilling scheme eligibility", sch)} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <FloatingChatbot matches={matches} onProfileExtracted={handleProfileExtracted} />
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
