import React, { createContext, useState, useEffect, useContext, useCallback } from "react";

const AuthContext = createContext(null);

const TOKEN_KEY = "sahayog_token";
const BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Decode a JWT payload without verifying the signature (client-side only).
 * Used to quickly check token expiry before making a network request.
 */
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  // exp is in seconds; add 10s buffer
  return Date.now() / 1000 > payload.exp - 10;
}

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

  const authFetch = useCallback((url, options = {}) => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const headers = { ...(options.headers || {}) };
    if (savedToken) {
      headers["Authorization"] = `Bearer ${savedToken}`;
    }
    return fetch(`${BASE_URL}${url}`, { ...options, headers });
  }, []);

  // On mount: restore session from localStorage token — skip network if token is expired
  useEffect(() => {
    async function checkAuth() {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken || isTokenExpired(savedToken)) {
        if (savedToken) localStorage.removeItem(TOKEN_KEY);
        setLoading(false);
        return;
      }
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setUser(null);
        }
      } catch (err) {
        // On timeout or network error, keep the user logged out cleanly
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
      res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error("Network error — please check your connection.");
    }
    if (!res.ok) {
      let errorData;
      try { errorData = await res.json(); } catch { throw new Error("Login failed (server error)."); }
      throw new Error(extractErrorMessage(errorData, "Login failed"));
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setUser(data.user);
    return data.user;
  }

  async function register(registerData) {
    let res;
    try {
      res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
    } catch {
      throw new Error("Network error — please check your connection.");
    }
    if (!res.ok) {
      let errorData;
      try { errorData = await res.json(); } catch { throw new Error("Registration failed (server error)."); }
      throw new Error(extractErrorMessage(errorData, "Registration failed"));
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
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
      res = await authFetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
    } catch {
      throw new Error("Network error — please check your connection.");
    }
    if (!res.ok) {
      let errorData;
      try { errorData = await res.json(); } catch { throw new Error("Profile update failed (server error)."); }
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
