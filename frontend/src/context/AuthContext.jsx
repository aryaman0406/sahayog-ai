import React, { createContext, useState, useEffect, useContext, useCallback } from "react";

const AuthContext = createContext(null);

const TOKEN_KEY = "sahayog_token";

/**
 * Extract a human-readable error message from a FastAPI error response.
 * FastAPI validation errors return detail as an array of objects:
 *   [{loc: [...], msg: "...", type: "..."}, ...]
 * Normal errors return detail as a string.
 */
function extractErrorMessage(errorData, fallback) {
  const detail = errorData?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => e.msg || JSON.stringify(e)).join("; ");
  }
  return fallback;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Authenticated fetch helper. Reads the JWT from localStorage
   * and attaches it as a Bearer token on every request.
   * Use this for ALL protected API calls.
   */
  const authFetch = useCallback((url, options = {}) => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const headers = { ...(options.headers || {}) };
    if (savedToken) {
      headers["Authorization"] = `Bearer ${savedToken}`;
    }
    const baseUrl = import.meta.env.VITE_API_URL || "";
    return fetch(`${baseUrl}${url}`, { ...options, headers });
  }, []);

  // On mount: restore session from localStorage token
  useEffect(() => {
    async function checkAuth() {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const baseUrl = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // Token expired or invalid — clean up
          localStorage.removeItem(TOKEN_KEY);
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  async function login(email, password) {
    let res;
    try {
      const baseUrl = import.meta.env.VITE_API_URL || "";
      res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch (networkErr) {
      throw new Error("Network error — please check your connection.");
    }
    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        throw new Error("Login failed (server error).");
      }
      throw new Error(extractErrorMessage(errorData, "Login failed"));
    }
    const data = await res.json();
    // BUG FIX: Store token in localStorage for persistence
    localStorage.setItem(TOKEN_KEY, data.access_token);
    // BUG FIX: Extract just the user object, not the entire TokenResponse
    setUser(data.user);
    return data.user;
  }

  async function register(registerData) {
    let res;
    try {
      const baseUrl = import.meta.env.VITE_API_URL || "";
      res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
    } catch (networkErr) {
      throw new Error("Network error — please check your connection.");
    }
    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        throw new Error("Registration failed (server error).");
      }
      throw new Error(extractErrorMessage(errorData, "Registration failed"));
    }
    const data = await res.json();
    // BUG FIX: Store token in localStorage for persistence
    localStorage.setItem(TOKEN_KEY, data.access_token);
    // BUG FIX: Extract just the user object, not the entire TokenResponse
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      // BUG FIX: Send Authorization header (logout route requires auth)
      await authFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  async function updateProfile(profileData) {
    let res;
    try {
      // BUG FIX: Correct URL /api/auth/me (PUT), was /api/auth/profile
      // BUG FIX: Send Authorization header via authFetch
      res = await authFetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
    } catch (networkErr) {
      throw new Error("Network error — please check your connection.");
    }
    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        throw new Error("Profile update failed (server error).");
      }
      throw new Error(extractErrorMessage(errorData, "Profile update failed"));
    }
    const userData = await res.json();
    setUser(userData);
    return userData;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
