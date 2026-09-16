import { useEffect, useState } from "react";
import { LogOut, ShieldAlert, Check, X, RefreshCw, Pill, Clock, TrendingUp, Users, Activity, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = axios.create({ baseURL: import.meta.env.VITE_BACKEND_URL });

function RiskBar({ score }) {
  const color = score >= 70 ? "#f43f5e" : score >= 40 ? "#f59e0b" : "#10b981";
  return (
    <div style={{ marginTop: 8 }}>
      <div className="risk-bar">
        <div
          className="risk-bar-fill"
          style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: "#4a5568" }}>0</span>
        <span style={{ fontSize: 10, color, fontWeight: 600 }}>{score}/100</span>
        <span style={{ fontSize: 10, color: "#4a5568" }}>100</span>
      </div>
    </div>
  );
}

function ReviewCard({ review, processingId, onReview }) {
  const [expanded, setExpanded] = useState(false);
  const processing = processingId === review._id;
  const riskColor = review.risk_level === "high" ? "#f43f5e" : review.risk_level === "medium" ? "#f59e0b" : "#10b981";
  const badgeClass = review.risk_level === "high" ? "badge-high" : review.risk_level === "medium" ? "badge-medium" : "badge-low";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18,
        overflow: "hidden",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}
      className="fade-in"
    >
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: `${riskColor}18`,
              border: `1px solid ${riskColor}35`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <ShieldAlert size={22} color={riskColor} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#f0f4ff" }}>
                {review.medicine_name}
                {review.strength && (
                  <span style={{ fontWeight: 400, color: "#8b9bb4", fontSize: 14 }}> {review.strength}</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#4a5568", marginTop: 3 }}>
                <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
                {new Date(review.created_at).toLocaleString()}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className={badgeClass}
              style={{ borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              {review.risk_level}
            </span>
            <span className="badge-pending" style={{ borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
              Pending
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Patient ID", value: review.patient_id?.slice(-8) || "—", mono: true },
            { label: "Quantity", value: review.quantity },
            { label: "Risk Score", value: `${review.risk_score}/100` },
          ].map(({ label, value, mono }) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 4, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f4ff", fontFamily: mono ? "monospace" : "inherit" }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 500, marginBottom: 4 }}>RISK SCORE</div>
          <RiskBar score={review.risk_score || 0} />
        </div>

        {review.risk_reasons?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                cursor: "pointer", color: "#8b9bb4", fontSize: 12, fontFamily: "inherit", fontWeight: 500,
                padding: 0,
              }}
            >
              <AlertCircle size={13} />
              Risk factors ({review.risk_reasons.length})
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {expanded && (
              <div style={{
                marginTop: 10, background: `${riskColor}0d`,
                border: `1px solid ${riskColor}25`, borderRadius: 10, padding: "12px 14px",
              }}>
                {review.risk_reasons.map((r, i) => (
                  <div key={i} style={{ fontSize: 13, color: riskColor, marginBottom: 5, display: "flex", gap: 6 }}>
                    <span style={{ opacity: 0.7 }}>·</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 24px",
        display: "flex", gap: 10,
        background: "rgba(0,0,0,0.15)",
      }}>
        <button
          id={`reject-${review._id}`}
          onClick={() => onReview(review, false)}
          disabled={processing}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)",
            borderRadius: 12, padding: "12px 20px", fontFamily: "inherit", fontWeight: 600,
            fontSize: 14, color: "#fb7185", cursor: processing ? "not-allowed" : "pointer",
            opacity: processing ? 0.5 : 1, transition: "all 0.2s",
          }}
        >
          <X size={16} />
          {processing ? "Processing..." : "Reject"}
        </button>
        <button
          id={`approve-${review._id}`}
          onClick={() => onReview(review, true)}
          disabled={processing}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "linear-gradient(135deg, #10b981, #059669)",
            border: "none", borderRadius: 12, padding: "12px 20px",
            fontFamily: "inherit", fontWeight: 600, fontSize: 14, color: "white",
            cursor: processing ? "not-allowed" : "pointer",
            opacity: processing ? 0.5 : 1, transition: "all 0.2s",
            boxShadow: processing ? "none" : "0 4px 12px rgba(16,185,129,0.3)",
          }}
        >
          <Check size={16} />
          {processing ? "Processing..." : "Approve"}
        </button>
      </div>
    </div>
  );
}

export default function PharmacistDashboard() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState({ approved: 0, rejected: 0 });

  const getToken = () => localStorage.getItem("access_token");

  const getErrorMessage = (err, fallback) => {
    const detail = err.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map((i) => (typeof i === "string" ? i : i?.msg || "Validation error")).join(", ");
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object") return detail.msg || detail.message || fallback;
    return fallback;
  };

  const loadReviews = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError("");
      const response = await API.get("/pharmacist/pending", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setReviews(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load pending reviews."));
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
    const interval = setInterval(() => loadReviews(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleReview = async (review, approved) => {
    if (processingId) return;
    setProcessingId(review._id);
    setError("");
    setSuccess("");
    try {
      await API.post(
        "/pharmacist/review",
        { thread_id: review.thread_id, approved },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setReviews((prev) => prev.filter((item) => item._id !== review._id));
      setStats((prev) => ({
        approved: prev.approved + (approved ? 1 : 0),
        rejected: prev.rejected + (approved ? 0 : 1),
      }));
      setSuccess(approved ? `✅ ${review.medicine_name} order approved.` : `❌ ${review.medicine_name} order rejected.`);
      setLastUpdated(new Date());
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to process the review."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const sessionStats = [
    { label: "Pending", value: reviews.length, color: "#f97316", icon: Clock },
    { label: "Approved", value: stats.approved, color: "#10b981", icon: Check },
    { label: "Rejected", value: stats.rejected, color: "#f43f5e", icon: X },
  ];

  return (
    <div className="animated-bg" style={{ minHeight: "100vh" }}>
      <header style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(10,15,30,0.85)",
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "0 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", height: 60,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
            }}>
              <Pill size={17} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#f0f4ff" }}>MedPilot</div>
              <div style={{ fontSize: 11, color: "#6366f1", marginTop: -2, fontWeight: 500 }}>Pharmacist Console</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lastUpdated && (
              <div style={{ fontSize: 11, color: "#4a5568" }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <button
              id="refresh-btn"
              onClick={() => loadReviews(true)}
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: 8, padding: "7px 14px", fontSize: 12, color: "#a78bfa",
                cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 500,
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              Refresh
            </button>
            <button
              id="pharmacist-logout"
              onClick={handleLogout}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "#8b9bb4",
                cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
              }}
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>
            Medication Review Queue
          </h1>
          <p style={{ color: "#8b9bb4", fontSize: 15 }}>
            Review high-risk medication requests requiring pharmacist approval.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {sessionStats.map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="stat-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${color}15`, border: `1px solid ${color}30`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={20} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff" }}>{value}</div>
                <div style={{ fontSize: 12, color: "#8b9bb4", fontWeight: 500 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {success && (
          <div style={{
            background: success.startsWith("✅") ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)",
            border: `1px solid ${success.startsWith("✅") ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.25)"}`,
            borderRadius: 12, padding: "12px 16px", marginBottom: 20,
            fontSize: 14, color: success.startsWith("✅") ? "#34d399" : "#fb7185",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>{success}</span>
            <button onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>
              <X size={15} />
            </button>
          </div>
        )}

        {error && (
          <div style={{
            background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)",
            borderRadius: 12, padding: "12px 16px", marginBottom: 20,
            fontSize: 14, color: "#fb7185", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>
              <X size={15} />
            </button>
          </div>
        )}

        {loading && (
          <div style={{ display: "grid", gap: 16 }}>
            {[1, 2].map((i) => (
              <div key={i} className="shimmer" style={{ height: 220, borderRadius: 18, border: "1px solid rgba(255,255,255,0.06)" }} />
            ))}
          </div>
        )}

        {!loading && reviews.length === 0 && (
          <div style={{
            textAlign: "center", padding: "72px 24px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 20,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <Check size={28} color="#34d399" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f0f4ff", marginBottom: 8 }}>
              All caught up!
            </h3>
            <p style={{ color: "#8b9bb4", fontSize: 15 }}>
              No pending medication reviews at this time.
            </p>
          </div>
        )}

        {!loading && reviews.length > 0 && (
          <div style={{ display: "grid", gap: 16 }}>
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                processingId={processingId}
                onReview={handleReview}
              />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
