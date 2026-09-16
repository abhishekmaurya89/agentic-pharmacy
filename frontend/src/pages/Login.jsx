import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Pill, Zap, Shield, Activity } from "lucide-react";
import { loginUser } from "../api/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await loginUser(email, password);
      localStorage.setItem("access_token", data.access_token);
      if (data.role === "pharmacist") {
        navigate("/pharmacist");
      } else {
        navigate("/patient");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, label: "AI-Powered", desc: "Natural language medicine ordering" },
    { icon: Shield, label: "Safety First", desc: "Automated prescription & risk validation" },
    { icon: Activity, label: "Real-time", desc: "Live pharmacist review & approval" },
  ];

  return (
    <div className="min-h-screen animated-bg flex">
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 30% 40%, rgba(59,130,246,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(99,102,241,0.1) 0%, transparent 60%)",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Pill size={22} color="white" />
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#f0f4ff" }}>MedPilot</span>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
            <span className="gradient-text">Agentic Pharmacy</span>
            <br />
            <span style={{ color: "#f0f4ff" }}>Intelligence</span>
          </h1>
          <p style={{ color: "#8b9bb4", fontSize: 17, lineHeight: 1.6, marginBottom: 40, maxWidth: 400 }}>
            Order medications, manage prescriptions, and get real-time safety reviews — all through natural conversation.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: "14px 18px",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "rgba(59,130,246,0.15)",
                  border: "1px solid rgba(59,130,246,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={18} color="#60a5fa" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f4ff" }}>{label}</div>
                  <div style={{ fontSize: 13, color: "#8b9bb4" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: 13, color: "#4a5568" }}>
            © 2026 MedPilot. All rights reserved.
          </p>
        </div>
      </div>

      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ width: "100%", maxWidth: 420 }} className="fade-in">
          <div style={{ marginBottom: 40 }}>
            <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Pill size={18} color="white" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 700 }}>MedPilot</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#f0f4ff" }}>
              Welcome back
            </h2>
            <p style={{ color: "#8b9bb4", fontSize: 15 }}>
              Sign in to your account to continue
            </p>
          </div>

          {error && (
            <div style={{
              background: "rgba(244,63,94,0.1)",
              border: "1px solid rgba(244,63,94,0.25)",
              borderRadius: 12, padding: "12px 16px",
              marginBottom: 24, fontSize: 14, color: "#fb7185",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#8b9bb4", marginBottom: 8 }}>
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-dark"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#8b9bb4", marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-dark"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#4a5568", padding: 0,
                  }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: "100%", marginTop: 4, fontSize: 15, padding: "14px" }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg style={{ animation: "spin 1s linear infinite", width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Signing in...
                </span>
              ) : "Sign in"}
            </button>
          </form>

          <p style={{ marginTop: 28, textAlign: "center", fontSize: 14, color: "#8b9bb4" }}>
            Don't have an account?{" "}
            <Link
              to="/register"
              style={{ color: "#60a5fa", fontWeight: 600, textDecoration: "none" }}
            >
              Create one →
            </Link>
          </p>

          <div style={{
            marginTop: 32, padding: "16px", borderRadius: 12,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <p style={{ fontSize: 12, color: "#4a5568", textAlign: "center", marginBottom: 10, fontWeight: 500 }}>
              Demo credentials
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => { setEmail("patient@demo.com"); setPassword("password123"); }}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 12,
                  background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                  color: "#60a5fa", cursor: "pointer", fontWeight: 500, fontFamily: "inherit",
                }}
              >
                Patient login
              </button>
              <button
                type="button"
                onClick={() => { setEmail("pharmacist@demo.com"); setPassword("password123"); }}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 12,
                  background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                  color: "#a78bfa", cursor: "pointer", fontWeight: 500, fontFamily: "inherit",
                }}
              >
                Pharmacist login
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}