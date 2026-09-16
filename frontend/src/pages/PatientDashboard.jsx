import { useEffect, useRef, useState } from "react";
import {
  Send,
  LogOut,
  Bot,
  User,
  ShieldAlert,
  Pill,
  Bell,
  ChevronRight,
  X,
  Clock,
  TrendingUp,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  sendAgentMessage,
  confirmOrder,
  getRefillPredictions,
  getOrderStatus,
} from "../api/agent";
import { uploadPrescription } from "../api/prescriptions";
import OrderConfirmation from "../components/OrderConfirmation";

function TypingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          flexShrink: 0,
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Bot size={15} color="white" />
      </div>
      <div
        className="bubble-assistant"
        style={{
          padding: "12px 16px",
          display: "flex",
          gap: 5,
          alignItems: "center",
        }}
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

function Message({ msg, index }) {
  const isUser = msg.role === "user";
  return (
    <div
      className="message-animate"
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        gap: 10,
        alignItems: "flex-end",
        animationDelay: `${Math.min(index * 0.05, 0.3)}s`,
        opacity: 0,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          flexShrink: 0,
          background: isUser
            ? "rgba(255,255,255,0.1)"
            : "linear-gradient(135deg, #3b82f6, #6366f1)",
          border: isUser ? "1px solid rgba(255,255,255,0.1)" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isUser ? "none" : "0 4px 12px rgba(59,130,246,0.3)",
        }}
      >
        {isUser ? (
          <User size={15} color="#8b9bb4" />
        ) : (
          <Bot size={15} color="white" />
        )}
      </div>
      <div
        className={isUser ? "bubble-user" : "bubble-assistant"}
        style={{
          maxWidth: "72%",
          padding: "12px 16px",
          fontSize: 14.5,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

function RefillCard({ prediction, onQuickRefill }) {
  const medicineName = prediction.medicine_name || "";
  const days = Math.max(prediction.days_until_refill, 0);
  const urgent = days <= 3;
  return (
    <div
      style={{
        background: urgent ? "rgba(244,63,94,0.07)" : "rgba(59,130,246,0.07)",
        border: `1px solid ${urgent ? "rgba(244,63,94,0.2)" : "rgba(59,130,246,0.15)"}`,
        borderRadius: 14,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: urgent
              ? "rgba(244,63,94,0.15)"
              : "rgba(59,130,246,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Pill size={18} color={urgent ? "#fb7185" : "#60a5fa"} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f4ff" }}>
            {medicineName}
            {prediction.strength && ` ${prediction.strength}`}
          </div>
          <div style={{ fontSize: 12, color: "#8b9bb4", marginTop: 2 }}>
            <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
            Refill in {days} day{days !== 1 ? "s" : ""} · Every ~
            {prediction.average_interval_days}d
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            textAlign: "center",
            minWidth: 44,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: urgent ? "#fb7185" : "#60a5fa",
            }}
          >
            {days}
          </div>
          <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 500 }}>
            DAYS
          </div>
        </div>
        <button
          onClick={() => onQuickRefill(medicineName)}
          disabled={!medicineName}
          style={{
            background: urgent
              ? "rgba(244,63,94,0.15)"
              : "rgba(59,130,246,0.15)",
            border: `1px solid ${urgent ? "rgba(244,63,94,0.25)" : "rgba(59,130,246,0.25)"}`,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            color: urgent ? "#fb7185" : "#60a5fa",
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          Refill <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function PharmacistReviewBanner({ review, onDismiss }) {
  return (
    <div
      style={{
        background: "rgba(249,115,22,0.08)",
        border: "1px solid rgba(249,115,22,0.25)",
        borderRadius: 16,
        padding: "18px 20px",
        marginLeft: 42,
        maxWidth: 400,
      }}
      className="message-animate"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(249,115,22,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldAlert size={18} color="#fb923c" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#fed7aa" }}>
              Pharmacist Review Required
            </div>
            <div style={{ fontSize: 12, color: "#9a6240", marginTop: 1 }}>
              Your order is under safety review
            </div>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9a6240",
              padding: 0,
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 10,
          padding: "12px 14px",
          fontSize: 13,
        }}
      >
        {[
          [
            "Medicine",
            `${review.medicine}${review.strength ? ` ${review.strength}` : ""}`,
          ],
          ["Quantity", review.quantity],
          ["Risk Level", review.risk_level],
        ].map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ color: "#8b9bb4" }}>{k}</span>
            <span
              style={{
                fontWeight: 600,
                color: k === "Risk Level" ? "#fb923c" : "#f0f4ff",
              }}
            >
              {v}
            </span>
          </div>
        ))}
        {review.risk_reasons?.length > 0 && (
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: 10,
              marginTop: 4,
            }}
          >
            <div style={{ fontSize: 12, color: "#8b9bb4", marginBottom: 6 }}>
              Risk factors:
            </div>
            {review.risk_reasons.map((r, i) => (
              <div
                key={i}
                style={{ fontSize: 12, color: "#fb923c", marginBottom: 3 }}
              >
                · {r}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(249,115,22,0.1)",
          borderRadius: 8,
          padding: "8px 12px",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#fb923c",
            animation: "pulse-blink 1.5s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, color: "#fb923c", fontWeight: 500 }}>
          Awaiting pharmacist review · Auto-refreshing
        </span>
      </div>
      <style>{`
        @keyframes pulse-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

const QUICK_ACTIONS = [
  "Order Paracetamol 500mg",
  "What are the side effects of Metformin?",
  "I need to refill my blood pressure medication",
  "Order Amoxicillin 250mg - 10 tablets",
];

export default function PatientDashboard() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm MedPilot, your AI pharmacy assistant. 👋\n\nI can help you:\n• Order medications\n• Get medicine information\n• Manage your refills\n\nHow can I help you today?",
    },
  ]);

  const [refillPredictions, setRefillPredictions] = useState([]);
  const [refillLoading, setRefillLoading] = useState(true);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [pharmacistReview, setPharmacistReview] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicineName: "",
    validUntil: "",
    file: null,
  });
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [prescriptionMessage, setPrescriptionMessage] = useState("");
  const [prescriptionError, setPrescriptionError] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingOrder, pharmacistReview, sending]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getRefillPredictions();
        setRefillPredictions(data.predictions || []);
      } catch {
        /* ignore */
      } finally {
        setRefillLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!pharmacistReview?.thread_id) return;
    const check = async () => {
      try {
        const status = await getOrderStatus(pharmacistReview.thread_id);
        const s = status?.status?.toLowerCase();
        if (s === "approved" || s === "confirmed") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: status.order_id
                ? `✅ Your order has been approved by the pharmacist!\n\nOrder ID: ${status.order_id}\nMedicine: ${status.medicine_name}\nQuantity: ${status.quantity}\nTotal: ₹${status.total_amount?.toFixed(2)}`
                : "✅ Your order has been approved by the pharmacist and is being processed.",
            },
          ]);
          setPharmacistReview(null);
        } else if (s === "rejected") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: status.rejection_reason
                ? `❌ Your order was rejected by the pharmacist.\n\nReason: ${status.rejection_reason}`
                : "❌ Your order was rejected by the pharmacist.",
            },
          ]);
          setPharmacistReview(null);
        }
      } catch {
        /* ignore */
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [pharmacistReview]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const sendMessage = async (text) => {
    if (!text.trim() || sending) return;
    const userMessage = text.trim();
    setMessage("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const data = await sendAgentMessage(userMessage, threadId);
      if (data.thread_id) setThreadId(data.thread_id);

      if (data.response) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      }

      if (data.interrupt?.type === "order_confirmation") {
        setThreadId(data.thread_id);
        setPendingOrder(data.interrupt);
        setPharmacistReview(null);
      }

      if (data.interrupt?.type === "pharmacist_review") {
        setPharmacistReview({ ...data.interrupt, thread_id: data.thread_id });
        setPendingOrder(null);
      }
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((i) => i.msg).join(", ")
        : typeof detail === "string"
          ? detail
          : "Something went wrong. Please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❗ ${msg}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(message);
  };

  const handleApproval = async (confirmed) => {
    if (!threadId || approvalLoading) return;
    setApprovalLoading(true);
    try {
      const data = await confirmOrder(threadId, confirmed);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.response ||
            (confirmed ? "✅ Order confirmed!" : "❌ Order cancelled."),
        },
      ]);
      setPendingOrder(null);
      if (confirmed) setThreadId(null);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((i) => i.msg).join(", ")
        : typeof detail === "string"
          ? detail
          : "Unable to process the order.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❗ ${msg}` },
      ]);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleQuickRefill = (medicineName) => {
    sendMessage(`I need to refill my ${medicineName}`);
  };

  const handlePrescriptionUpload = async (event) => {
    event.preventDefault();
    if (!prescriptionForm.file || uploadingPrescription) return;
    setUploadingPrescription(true);
    setPrescriptionMessage("");
    setPrescriptionError("");
    try {
      await uploadPrescription(prescriptionForm);
      setPrescriptionMessage(
        "Prescription uploaded for pharmacist verification.",
      );
      setPrescriptionForm({ medicineName: "", validUntil: "", file: null });
      event.target.reset();
    } catch (error) {
      setPrescriptionError(
        error.response?.data?.detail || "Unable to upload prescription.",
      );
    } finally {
      setUploadingPrescription(false);
    }
  };

  const hasRefills = !refillLoading && refillPredictions.length > 0;

  return (
    <div
      className="animated-bg"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(10,15,30,0.8)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 60,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
              }}
            >
              <Pill size={17} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#f0f4ff" }}>
                MedPilot
              </div>
              <div style={{ fontSize: 11, color: "#4a5568", marginTop: -2 }}>
                AI Pharmacy Assistant
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {hasRefills && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.2)",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 12,
                  color: "#60a5fa",
                  fontWeight: 500,
                }}
              >
                <Bell size={13} />
                {refillPredictions.length} refill
                {refillPredictions.length > 1 ? "s" : ""} due
              </div>
            )}
            <button
              id="logout-btn"
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 13,
                color: "#8b9bb4",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 500,
                transition: "all 0.2s",
              }}
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          padding: "24px",
          display: "flex",
          gap: 24,
        }}
      >
        <div style={{ width: 300, flexShrink: 0 }}>
          <div
            style={{ position: "sticky", top: 84, display: "grid", gap: 22 }}
          >
            <form
              onSubmit={handlePrescriptionUpload}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <UploadCloud size={24} color="#60a5fa" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#8b9bb4",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Upload prescription
                </span>
              </div>
              <div style={{ display: "grid", gap: 9 }}>
                <input
                  className="input-dark"
                  placeholder="Medicine name"
                  required
                  value={prescriptionForm.medicineName}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      medicineName: e.target.value,
                    })
                  }
                />
                <input
                  className="input-dark"
                  type="date"
                  required
                  value={prescriptionForm.validUntil}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      validUntil: e.target.value,
                    })
                  }
                />
                <input
                  id="prescription-file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  required
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      file: e.target.files[0],
                    })
                  }
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="prescription-file"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    border: "1px dashed rgba(96,165,250,0.4)",
                    borderRadius: 9,
                    padding: "10px 12px",
                    color: "#93c5fd",
                    fontSize: 12,
                    cursor: "pointer",
                    background: "rgba(59,130,246,0.06)",
                  }}
                >
                  <UploadCloud size={16} />
                  {prescriptionForm.file
                    ? prescriptionForm.file.name
                    : "Choose file"}
                </label>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={uploadingPrescription}
                  style={{ padding: "10px 12px", fontSize: 13 }}
                >
                  {uploadingPrescription ? "Uploading..." : "Submit for review"}
                </button>
              </div>
              {prescriptionMessage && (
                <div style={{ color: "#34d399", fontSize: 12, marginTop: 10 }}>
                  {prescriptionMessage}
                </div>
              )}
              {prescriptionError && (
                <div style={{ color: "#fb7185", fontSize: 12, marginTop: 10 }}>
                  {prescriptionError}
                </div>
              )}
            </form>
            <div style={{ width: 300, flexShrink: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <TrendingUp size={16} color="#60a5fa" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#8b9bb4",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Refill Reminders
                </span>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {refillLoading && (
                  <div style={{ color: "#8b9bb4", fontSize: 12 }}>
                    Loading refill predictions...
                  </div>
                )}
                {!refillLoading && refillPredictions.length === 0 && (
                  <div
                    style={{ color: "#8b9bb4", fontSize: 12, lineHeight: 1.5 }}
                  >
                    Refill predictions will appear after you have placed
                    recurring medicine orders.
                  </div>
                )}
                {refillPredictions.map((p) => (
                  <RefillCard
                    key={p.medicine_id}
                    prediction={p}
                    onQuickRefill={handleQuickRefill}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 20,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: "calc(100vh - 160px)",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
                }}
              >
                <Sparkles size={16} color="white" />
              </div>
              <div>
                <div
                  style={{ fontWeight: 600, fontSize: 14, color: "#f0f4ff" }}
                >
                  Pharmacy AI
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#10b981",
                      display: "inline-block",
                    }}
                  />
                  Online · Ready to help
                </div>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {messages.map((msg, i) => (
                <Message key={i} msg={msg} index={i} />
              ))}

              {sending && <TypingIndicator />}

              {pendingOrder?.type === "order_confirmation" && (
                <div style={{ marginLeft: 42 }}>
                  <OrderConfirmation
                    order={pendingOrder}
                    loading={approvalLoading}
                    onConfirm={() => handleApproval(true)}
                    onCancel={() => handleApproval(false)}
                  />
                </div>
              )}

              {pharmacistReview?.type === "pharmacist_review" && (
                <PharmacistReviewBanner review={pharmacistReview} />
              )}

              <div ref={messagesEndRef} />
            </div>

            {messages.length === 1 && !sending && (
              <div style={{ padding: "0 20px 16px" }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#4a5568",
                    marginBottom: 8,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Quick actions
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {QUICK_ACTIONS.map((qa) => (
                    <button
                      key={qa}
                      onClick={() => sendMessage(qa)}
                      style={{
                        background: "rgba(59,130,246,0.08)",
                        border: "1px solid rgba(59,130,246,0.15)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 12.5,
                        color: "#60a5fa",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontWeight: 500,
                        transition: "all 0.15s",
                      }}
                    >
                      {qa}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={handleSend}
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                padding: "14px 16px",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                ref={inputRef}
                id="chat-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending || !!pendingOrder || !!pharmacistReview}
                placeholder={
                  pendingOrder
                    ? "Please confirm or cancel your order above"
                    : pharmacistReview
                      ? "Waiting for pharmacist review..."
                      : "Ask me about medications, order, or refill..."
                }
                className="input-dark"
                style={{ flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <button
                id="send-btn"
                type="submit"
                disabled={
                  sending ||
                  !message.trim() ||
                  !!pendingOrder ||
                  !!pharmacistReview
                }
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  flexShrink: 0,
                  background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
                  opacity:
                    sending ||
                    !message.trim() ||
                    !!pendingOrder ||
                    !!pharmacistReview
                      ? 0.5
                      : 1,
                  transition: "all 0.2s",
                }}
              >
                <Send size={18} color="white" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
