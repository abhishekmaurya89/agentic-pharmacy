import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Pill, UserPlus } from "lucide-react";
import { registerUser } from "../api/auth";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
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
      await registerUser(name, email, password, "patient");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = () => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };

  const pw = strength();
  const strengthColors = ["#4a5568", "#f43f5e", "#f97316", "#f59e0b", "#10b981"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="min-h-screen animated-bg" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 440 }} className="fade-in">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 24px rgba(59,130,246,0.35)",
          }}>
            <Pill size={26} color="white" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#60a5fa", marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            MedPilot
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f0f4ff", marginBottom: 8 }}>
            Create your account
          </h1>
          <p style={{ color: "#8b9bb4", fontSize: 15 }}>
            Join MedPilot and manage your medications smarter
          </p>
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
          {error && (
            <div style={{
              background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 20,
              fontSize: 14, color: "#fb7185",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#8b9bb4", marginBottom: 8 }}>
                Full name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input-dark"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#8b9bb4", marginBottom: 8 }}>
                Email address
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-dark"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#8b9bb4", marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="register-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-dark"
                  placeholder="Min. 8 characters"
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#4a5568", padding: 0,
                  }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {password && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= pw ? strengthColors[pw] : "rgba(255,255,255,0.08)",
                        transition: "background 0.3s ease",
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: pw > 0 ? strengthColors[pw] : "#4a5568" }}>
                    {strengthLabels[pw]}
                  </p>
                </div>
              )}
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: "100%", marginTop: 4, fontSize: 15, padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: "spin 1s linear infinite", width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus size={17} />
                  Create account
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "#8b9bb4" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#60a5fa", fontWeight: 600, textDecoration: "none" }}>
            Sign in →
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}