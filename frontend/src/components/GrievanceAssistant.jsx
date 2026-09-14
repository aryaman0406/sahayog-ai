import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

const POPULAR_SCHEMES = [
  "PM-KISAN Samman Nidhi",
  "Pradhan Mantri Awas Yojana (PMAY)",
  "Ayushman Bharat - PMJAY",
  "National Scholarship Portal (NSP)",
  "PM SVANidhi (Street Vendor Loan)",
  "PM Vishwakarma Yojana",
  "Pradhan Mantri Matru Vandana Yojana (PMMVY)",
  "PM Mudra Yojana",
  "Mahatma Gandhi NREGA",
  "Old Age / Widow Pension Scheme"
];

const GRIEVANCE_TYPES = [
  "Delayed Disbursal / Payment Not Credited",
  "Wrongful / Arbitrary Rejection of Eligible Application",
  "Documents Submitted but Marked Incomplete/Lost",
  "Bribe / Undue Demands from Local Officials",
  "No Status Update / Acknowledgment Provided",
  "Portal / e-KYC Verification Failure",
  "Other Irregularity / Procedural Delay"
];

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" }
];

export default function GrievanceAssistant() {
  const { user, authFetch } = useAuth();
  const { t } = useLanguage();

  // Mode: "CPGRAMS" or "RTI"
  const [appType, setAppType] = useState("CPGRAMS");

  // Form Fields
  const [schemeName, setSchemeName] = useState("");
  const [applicantName, setApplicantName] = useState(user?.name || "");
  const [applicantAddress, setApplicantAddress] = useState(
    user?.state ? `${user?.district || ""}, ${user.state}` : ""
  );
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantEmail, setApplicantEmail] = useState(user?.email || "");
  const [referenceNo, setReferenceNo] = useState("");
  const [applicationDate, setApplicationDate] = useState("");
  const [grievanceType, setGrievanceType] = useState(GRIEVANCE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [draftLanguage, setDraftLanguage] = useState("en");

  // Output State
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schemeName.trim()) {
      setError("Please specify or select the welfare scheme name.");
      return;
    }
    if (!applicantName.trim()) {
      setError("Please enter applicant name.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe the issue or grievance details.");
      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        application_type: appType,
        scheme_name: schemeName.trim(),
        applicant_name: applicantName.trim(),
        applicant_address: applicantAddress.trim() || "India",
        applicant_phone: applicantPhone.trim() || undefined,
        applicant_email: applicantEmail.trim() || undefined,
        application_reference_no: referenceNo.trim() || undefined,
        application_date: applicationDate.trim() || undefined,
        grievance_type: grievanceType,
        description: description.trim(),
        language: draftLanguage
      };

      const res = await fetch("/api/grievance/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to generate draft. Please try again.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Grievance generation error:", err);
      setError(err.message || "An unexpected error occurred while drafting.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const fullText = `Subject: ${result.subject}\n\n${result.body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const fullText = `====================================================\n${result.application_type} APPLICATION DRAFT\nGenerated via Sahayog AI\n====================================================\n\nSubject: ${result.subject}\n\n${result.body}\n\n====================================================\nSUBMISSION INSTRUCTIONS:\n${result.instructions.join("\n")}\n====================================================`;
    const element = document.createElement("a");
    const file = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${result.application_type}_Draft_${schemeName.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="grievance-container animate-fade-in pad-page">
      {/* Header Banner */}
      <div className="grievance-header-card card-panel">
        <div className="grievance-header-badge">
          <span>⚖️ Citizen Legal Redressal Suite</span>
        </div>
        <h1 className="grievance-title">Grievance & RTI Drafting Assistant</h1>
        <p className="grievance-subtitle">
          If your welfare scheme application is delayed, arbitrarily rejected, or pending without response, draft an officially formatted, legally compliant <strong>CPGRAMS Public Grievance</strong> or <strong>RTI Application (RTI Act 2005)</strong> in seconds.
        </p>
      </div>

      <div className="grievance-split-layout">
        {/* Left Form Panel */}
        <div className="card-panel grievance-form-panel">
          {/* Portal Selector Tabs */}
          <div className="grievance-type-tabs">
            <button
              type="button"
              className={`type-tab-btn ${appType === "CPGRAMS" ? "active" : ""}`}
              onClick={() => setAppType("CPGRAMS")}
            >
              <span className="tab-icon">📢</span>
              <div className="tab-text-group">
                <span className="tab-main-title">CPGRAMS Grievance</span>
                <span className="tab-sub-title">For Delayed Funds & Department Complaints</span>
              </div>
            </button>
            <button
              type="button"
              className={`type-tab-btn ${appType === "RTI" ? "active" : ""}`}
              onClick={() => setAppType("RTI")}
            >
              <span className="tab-icon">📜</span>
              <div className="tab-text-group">
                <span className="tab-main-title">RTI Application</span>
                <span className="tab-sub-title">Under Section 6(1) of RTI Act 2005</span>
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grievance-form">
            {/* Scheme Selection */}
            <div className="form-group">
              <label className="form-label">Government Scheme Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. PM-KISAN, PMAY Housing, NSP Scholarship..."
                value={schemeName}
                onChange={(e) => setSchemeName(e.target.value)}
                required
              />
              <div className="quick-scheme-chips">
                <span className="chips-label">Quick select:</span>
                {POPULAR_SCHEMES.slice(0, 5).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip-btn"
                    onClick={() => setSchemeName(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Applicant Details */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Applicant Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Your full legal name"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Address / District / State *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Pune, Maharashtra"
                  value={applicantAddress}
                  onChange={(e) => setApplicantAddress(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Application Reference ID (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. ACK-2024-99881"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                />
              </div>
            </div>

            {/* Issue Category */}
            <div className="form-group">
              <label className="form-label">Nature of Grievance / Issue *</label>
              <select
                className="form-select"
                value={grievanceType}
                onChange={(e) => setGrievanceType(e.target.value)}
              >
                {GRIEVANCE_TYPES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Detailed Description */}
            <div className="form-group">
              <label className="form-label">Details / Specific Facts of the Case *</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Describe when you applied, what documents you gave, what officials said, and what remedy you are seeking..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Output Language */}
            <div className="form-group">
              <label className="form-label">Draft Language</label>
              <select
                className="form-select"
                value={draftLanguage}
                onChange={(e) => setDraftLanguage(e.target.value)}
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="form-error-banner">⚠️ {error}</div>}

            <button
              type="submit"
              className="btn-submit-draft"
              disabled={generating}
            >
              {generating ? "⏳ Drafting Official Document…" : `✨ Generate ${appType} Draft`}
            </button>
          </form>
        </div>

        {/* Right Output Document Preview */}
        <div className="card-panel grievance-preview-panel">
          {generating ? (
            <div className="preview-loading-state">
              <div className="spinner-orbit"></div>
              <h3>Preparing Formal {appType} Document…</h3>
              <p className="text-muted">
                Synthesizing administrative references, CITIZEN CHARTER clauses, and structured relief points.
              </p>
            </div>
          ) : result ? (
            <div className="preview-content-card animate-fade-in">
              {/* Document Actions Bar */}
              <div className="preview-top-bar">
                <div className="preview-badge-status">
                  <span className="badge-dot"></span>
                  <span>{result.generated_by}</span>
                </div>
                <div className="preview-action-btns">
                  <button
                    type="button"
                    className="btn-preview-action"
                    onClick={handleCopy}
                  >
                    {copied ? "✓ Copied!" : "📋 Copy Draft"}
                  </button>
                  <button
                    type="button"
                    className="btn-preview-action"
                    onClick={handleDownload}
                  >
                    💾 Download .TXT
                  </button>
                </div>
              </div>

              {/* Letterhead Preview */}
              <div className="official-letter-doc">
                <div className="doc-letterhead">
                  <span className="doc-type-tag">{result.application_type} FORMAT</span>
                  <span className="doc-confidential">CITIZEN FORMAL CORRESPONDENCE</span>
                </div>
                <h4 className="doc-subject-line">{result.subject}</h4>
                <div className="doc-divider"></div>
                <pre className="doc-body-text">{result.body}</pre>
              </div>

              {/* Instructions & Official Submission Guide */}
              <div className="instructions-card">
                <div className="instructions-header">
                  <span className="icon">🚀</span>
                  <h4>Where and How to Submit This Application</h4>
                </div>
                <ul className="instructions-list">
                  {result.instructions.map((inst, idx) => (
                    <li key={idx}>{inst}</li>
                  ))}
                </ul>
                <div className="portal-direct-action">
                  <a
                    href={result.portal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-portal-launch"
                  >
                    🌐 Open Official {result.portal_name.split(" ")[0]} Portal →
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="preview-empty-state">
              <span className="preview-empty-icon">⚖️</span>
              <h3>No Document Generated Yet</h3>
              <p className="text-muted">
                Fill in the details on the left and click <strong>Generate Draft</strong> to create an official CPGRAMS grievance letter or RTI application under Section 6(1) of RTI Act 2005.
              </p>
              <div className="legal-highlights">
                <div className="highlight-item">
                  <strong>📢 CPGRAMS:</strong> Direct escalation to Central/State Ministries with a 30-day mandate.
                </div>
                <div className="highlight-item">
                  <strong>📜 RTI Act 2005:</strong> Legally binds Public Information Officers (PIOs) to provide file notings and reasons within 30 days for a nominal ₹10 fee.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
