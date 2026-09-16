import { Check, X, ShoppingCart, AlertCircle } from "lucide-react";

export default function OrderConfirmation({ order, onConfirm, onCancel, loading }) {
  const isPharmacistReview = order.type === "pharmacist_review";
  const accentColor = isPharmacistReview ? "#f97316" : "#3b82f6";
  const accentLight = isPharmacistReview ? "rgba(249,115,22,0.12)" : "rgba(59,130,246,0.12)";
  const accentBorder = isPharmacistReview ? "rgba(249,115,22,0.25)" : "rgba(59,130,246,0.2)";

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${accentBorder}`,
      borderRadius: 18, padding: "20px",
      maxWidth: 400,
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accentBorder}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: accentLight, border: `1px solid ${accentBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isPharmacistReview
            ? <AlertCircle size={20} color={accentColor} />
            : <ShoppingCart size={20} color={accentColor} />}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#f0f4ff" }}>
            {isPharmacistReview ? "Pharmacist Review Required" : "Confirm Your Order"}
          </div>
          <div style={{ fontSize: 12, color: "#8b9bb4", marginTop: 2 }}>
            {isPharmacistReview
              ? "This order requires pharmacist approval"
              : "Please review the details below"}
          </div>
        </div>
      </div>

      <div style={{
        background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "14px 16px",
        border: "1px solid rgba(255,255,255,0.06)", marginBottom: 14,
      }}>
        {[
          ["Medicine", order.medicine],
          order.strength && ["Strength", order.strength],
          ["Quantity", order.quantity],
        ].filter(Boolean).map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: "#8b9bb4" }}>{k}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f0f4ff" }}>{v}</span>
          </div>
        ))}

        {order.total_amount && (
          <div style={{
            display: "flex", justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 4,
          }}>
            <span style={{ fontSize: 14, color: "#8b9bb4", fontWeight: 500 }}>Total Amount</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: accentColor }}>
              ₹{typeof order.total_amount === "number" ? order.total_amount.toFixed(2) : order.total_amount}
            </span>
          </div>
        )}
      </div>

      {isPharmacistReview && order.risk_level && (
        <div style={{
          background: "rgba(244,63,94,0.06)",
          border: "1px solid rgba(244,63,94,0.2)",
          borderRadius: 10, padding: "12px 14px", marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#8b9bb4", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Risk Assessment
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#8b9bb4" }}>Risk Level</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f43f5e", textTransform: "capitalize" }}>
              {order.risk_level}
            </span>
          </div>
          {order.risk_score && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#8b9bb4" }}>Risk Score</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#f0f4ff" }}>{order.risk_score}/100</span>
            </div>
          )}
          {order.risk_reasons?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {order.risk_reasons.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "#f43f5e", marginBottom: 3 }}>· {r}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          id="order-cancel-btn"
          onClick={onCancel}
          disabled={loading}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)",
            borderRadius: 12, padding: "12px 16px",
            fontFamily: "inherit", fontWeight: 600, fontSize: 14, color: "#fb7185",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1,
            transition: "all 0.2s",
          }}
        >
          <X size={16} />
          {isPharmacistReview ? "Reject" : "Cancel"}
        </button>
        <button
          id="order-confirm-btn"
          onClick={onConfirm}
          disabled={loading}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            background: isPharmacistReview
              ? "linear-gradient(135deg, #f97316, #ea580c)"
              : "linear-gradient(135deg, #3b82f6, #6366f1)",
            border: "none", borderRadius: 12, padding: "12px 16px",
            fontFamily: "inherit", fontWeight: 600, fontSize: 14, color: "white",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1,
            boxShadow: loading ? "none" : `0 4px 16px ${accentColor}40`,
            transition: "all 0.2s",
          }}
        >
          {loading ? (
            <svg style={{ animation: "spin 1s linear infinite", width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : <Check size={16} />}
          {loading ? "Processing..." : (isPharmacistReview ? "Approve" : "Confirm Order")}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}