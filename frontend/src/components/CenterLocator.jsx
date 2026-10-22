import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { FALLBACK_CENTERS, getFallbackStates } from "../data/fallbackCenters.js";

// Haversine distance calculator for offline fallback
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const CENTER_TYPE_FILTERS = [
  { id: "all", label: "All Centers", icon: "🏛️" },
  { id: "csc", label: "Common Service Centers (CSC)", icon: "💻" },
  { id: "government_office", label: "Tehsildar & Gov Offices", icon: "🏢" }
];

export default function CenterLocator() {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [statesList, setStatesList] = useState([]);
  const [selectedState, setSelectedState] = useState(user?.state || "");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [pincode, setPincode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [centerType, setCenterType] = useState("all");

  // Geolocation State
  const [userCoords, setUserCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

// Fetch available states and districts
  useEffect(() => {
    async function fetchStates() {
      try {
        const res = await fetch("/api/centers/states");
        if (res.ok) {
          const data = await res.json();
          if (data.states && data.states.length > 0) {
            setStatesList(data.states);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend states fetch unavailable, using verified offline states:", err);
      }
      setStatesList(getFallbackStates());
    }
    fetchStates();
  }, []);

  // Fetch centers based on current active filters
  const fetchCenters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedState) params.append("state", selectedState);
      if (selectedDistrict) params.append("district", selectedDistrict);
      if (pincode.trim()) params.append("pincode", pincode.trim());
      if (centerType && centerType !== "all") params.append("center_type", centerType);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (userCoords?.lat && userCoords?.lng) {
        params.append("lat", userCoords.lat);
        params.append("lng", userCoords.lng);
      }
      params.append("limit", "40");

      const res = await fetch(`/api/centers/?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch centers from backend");
      const data = await res.json();
      setCenters(data.centers || []);
    } catch (err) {
      console.warn("Falling back to verified local centers dataset:", err);
      // Filter FALLBACK_CENTERS locally
      let filtered = FALLBACK_CENTERS.filter((c) => {
        if (selectedState && selectedState.toLowerCase() !== "all" && c.state.toLowerCase() !== selectedState.toLowerCase()) return false;
        if (selectedDistrict && selectedDistrict.toLowerCase() !== "all" && c.district.toLowerCase() !== selectedDistrict.toLowerCase()) return false;
        if (pincode.trim() && c.pincode !== pincode.trim()) return false;
        if (centerType && centerType !== "all" && c.category.toLowerCase() !== centerType.toLowerCase() && !c.center_type.toLowerCase().includes(centerType.toLowerCase())) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const corpus = `${c.name} ${c.address} ${c.district} ${c.state} ${c.services.join(" ")} ${c.center_type}`.toLowerCase();
          if (!corpus.includes(q)) return false;
        }
        return true;
      }).map((c) => {
        let dist = null;
        if (userCoords?.lat && userCoords?.lng) {
          dist = calculateDistance(userCoords.lat, userCoords.lng, c.lat, c.lng);
        }
        return {
          ...c,
          distance_km: dist,
          maps_url: `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
        };
      });

      if (userCoords?.lat && userCoords?.lng) {
        filtered.sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
      } else {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }

      setCenters(filtered);
    } finally {
      setLoading(false);
    }
  }, [selectedState, selectedDistrict, pincode, centerType, searchQuery, userCoords]);

  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  // Handle Geolocation Request
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGeoLoading(false);
      },
      (err) => {
        console.warn("Geolocation access denied or timed out:", err);
        setGeoError("Location access denied. Please select your State & District manually.");
        setGeoLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Available districts for chosen state
  const currentDistricts = statesList.find((s) => s.state === selectedState)?.districts || [];

  const handleCopyAddress = (id, address) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="center-locator-container animate-fade-in pad-page">
      {/* Header Banner */}
      <div className="locator-header-card card-panel">
        <div className="locator-header-content">
          <div className="locator-header-badge">
            <span className="badge-pulse"></span>
            <span>📍 Physical Assistance Network</span>
          </div>
          <h1 className="locator-title">Nearest CSC &amp; Citizen Seva Kendra Network</h1>
          <p className="locator-subtitle">
            Find certified Common Service Centers (CSCs), MeeSeva, Maha e-Seva, e-Mitra, Bangalore One, and Taluk/Tehsildar offices near you for offline scheme application, biometric e-KYC, and document verification.
          </p>
        </div>

        {/* Quick Action: Auto-Detect Location */}
        <div className="locator-quick-action">
          <button
            type="button"
            className={`btn-geo-detect ${userCoords ? "active" : ""}`}
            onClick={handleGetLocation}
            disabled={geoLoading}
          >
            {geoLoading ? "⏳ Locating you…" : userCoords ? "📍 Location Detected (Sorted by Distance)" : "🎯 Find Nearest Centers Near Me"}
          </button>
          {geoError && <p className="geo-error-msg">{geoError}</p>}
          {userCoords && (
            <button
              type="button"
              className="btn-clear-geo"
              onClick={() => setUserCoords(null)}
              title="Clear GPS filter"
            >
              ✕ Reset GPS
            </button>
          )}
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="locator-filter-bar card-panel">
        <div className="filter-inputs-grid">
          {/* State Dropdown */}
          <div className="filter-group">
            <label className="filter-label">State / UT</label>
            <select
              className="form-select"
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict("");
              }}
            >
              <option value="">All States</option>
              {statesList.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state}
                </option>
              ))}
            </select>
          </div>

          {/* District Dropdown */}
          <div className="filter-group">
            <label className="filter-label">District</label>
            <select
              className="form-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
            >
              <option value="">All Districts</option>
              {currentDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Pincode Search */}
          <div className="filter-group">
            <label className="filter-label">Pincode</label>
            <input
              type="text"
              maxLength={6}
              className="form-input"
              placeholder="e.g. 411005"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          {/* Keyword Search */}
          <div className="filter-group search-grow">
            <label className="filter-label">Search by Name / Service</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Aadhaar, PM-KISAN, Dadar, Indiranagar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Type Category Pills */}
        <div className="center-type-pills">
          {CENTER_TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`pill-filter ${centerType === f.id ? "active" : ""}`}
              onClick={() => setCenterType(f.id)}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
          {(selectedState || selectedDistrict || pincode || searchQuery || centerType !== "all" || userCoords) && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={() => {
                setSelectedState("");
                setSelectedDistrict("");
                setPincode("");
                setSearchQuery("");
                setCenterType("all");
                setUserCoords(null);
              }}
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="results-count-bar">
        <span className="results-count-text">
          {loading ? "Searching centers…" : `Showing ${centers.length} verified physical centers`}
        </span>
        {userCoords && (
          <span className="geo-active-badge">⚡ Sorted by shortest distance from your location</span>
        )}
      </div>

      {/* Center Cards Grid */}
      {loading ? (
        <div className="center-loading-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="center-card skeleton-card">
              <div className="skeleton-line full" />
              <div className="skeleton-line half" />
              <div className="skeleton-line three-quarter" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card-panel error-panel text-center">
          <p className="error-text">⚠️ {error}</p>
          <button type="button" className="btn-primary" onClick={fetchCenters}>
            Retry Search
          </button>
        </div>
      ) : centers.length === 0 ? (
        <div className="card-panel empty-centers text-center pad-lg">
          <span className="empty-icon">📍</span>
          <h3>No centers found matching your criteria</h3>
          <p className="text-muted">
            Try broadening your search, clearing the district filter, or searching for neighboring pincodes.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setSelectedState("");
              setSelectedDistrict("");
              setPincode("");
              setSearchQuery("");
              setCenterType("all");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="centers-grid">
          {centers.map((center) => (
            <div key={center.id} className="center-card card-panel animate-scale-up">
              {/* Top Meta */}
              <div className="center-card-header">
                <div className="center-badge-group">
                  <span className={`center-type-tag ${center.category}`}>
                    {center.center_type}
                  </span>
                  {center.verified && (
                    <span className="verified-tag" title="Govt Verified Center">
                      ✓ Govt Verified
                    </span>
                  )}
                </div>
                {center.distance_km !== null && (
                  <div className="distance-badge">
                    <span>📍 {center.distance_km} km away</span>
                  </div>
                )}
              </div>

              {/* Center Name */}
              <h3 className="center-name">{center.name}</h3>

              {/* Address */}
              <p className="center-address">
                <span className="icon">📌</span> {center.address}
              </p>

              {/* Operating Hours & Contact */}
              <div className="center-meta-details">
                <div className="meta-item">
                  <span className="meta-icon">🕒</span>
                  <span className="meta-text">{center.operating_hours}</span>
                </div>
                {center.phone && (
                  <div className="meta-item">
                    <span className="meta-icon">📞</span>
                    <a href={`tel:${center.phone.replace(/[^\d+]/g, '')}`} className="meta-text meta-link" title="Call this center">
                      {center.phone}
                    </a>
                  </div>
                )}
                {center.email && (
                  <div className="meta-item">
                    <span className="meta-icon">✉️</span>
                    <a href={`mailto:${center.email}`} className="meta-text meta-link" title="Email this center">
                      {center.email}
                    </a>
                  </div>
                )}
                {center.contact_person && (
                  <div className="meta-item">
                    <span className="meta-icon">👤</span>
                    <span className="meta-text">Authority: {center.contact_person}</span>
                  </div>
                )}
              </div>

              {/* Services List */}
              {center.services && center.services.length > 0 && (
                <div className="center-services-section">
                  <p className="services-title">Available Services:</p>
                  <div className="services-pills-list">
                    {center.services.map((srv, idx) => (
                      <span key={idx} className="service-pill">
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="center-card-actions">
                <a
                  href={center.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-action-primary"
                >
                  🗺️ Open in Google Maps
                </a>
                {center.phone && (
                  <a
                    href={`tel:${center.phone.replace(/[^\d+]/g, '')}`}
                    className="btn-action-call"
                    title={`Call ${center.phone}`}
                  >
                    📞 Call
                  </a>
                )}
                <button
                  type="button"
                  className="btn-action-secondary"
                  onClick={() => handleCopyAddress(center.id, `${center.name}, ${center.address}`)}
                >
                  {copiedId === center.id ? "✓ Copied!" : "📋 Copy Address"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
