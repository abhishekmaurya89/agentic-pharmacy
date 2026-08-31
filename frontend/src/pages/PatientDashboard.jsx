import { useEffect, useState } from "react";
import { Send, LogOut, Bot, User, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  sendAgentMessage,
  confirmOrder,
  getRefillPredictions,
  getOrderStatus,
} from "../api/agent";

import OrderConfirmation from "../components/OrderConfirmation";

export default function PatientDashboard() {
  const navigate = useNavigate();

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I’m your pharmacy assistant. How can I help you today?",
    },
  ]);

  const [refillPredictions, setRefillPredictions] = useState([]);
  const [refillLoading, setRefillLoading] = useState(true);

  const [pendingOrder, setPendingOrder] = useState(null);
  const [pharmacistReview, setPharmacistReview] = useState(null);

  const [threadId, setThreadId] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadRefillPredictions = async () => {
      try {
        const data = await getRefillPredictions();

        setRefillPredictions(data.predictions || []);
      } catch (error) {
        console.error("Failed to load refill predictions:", error);
      } finally {
        setRefillLoading(false);
      }
    };

    loadRefillPredictions();
  }, []);

  useEffect(() => {
    if (!pharmacistReview?.thread_id) {
      return;
    }

    const checkStatus = async () => {
      try {
        const status = await getOrderStatus(pharmacistReview.thread_id);

        console.log("ORDER STATUS:", status);

        const normalizedStatus = status?.status?.toLowerCase();

        if (
          normalizedStatus === "approved" ||
          normalizedStatus === "confirmed"
        ) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: status.order_id
                ? `✅ Your order has been approved by the pharmacist and confirmed.\n\nOrder ID: ${status.order_id}`
                : "✅ Your order has been approved by the pharmacist and confirmed.",
            },
          ]);

          setPharmacistReview(null);
          return;
        }

        if (normalizedStatus === "rejected") {
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
      } catch (error) {
        console.error("Status check failed:", error);
      }
    };

    checkStatus();

    const interval = setInterval(checkStatus, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [pharmacistReview]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!message.trim() || sending) {
      return;
    }

    const userMessage = message.trim();

    setMessage("");
    setSending(true);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    try {
      const data = await sendAgentMessage(userMessage, threadId);

      console.log("AGENT RESPONSE:", data);

      if (data.thread_id) {
        setThreadId(data.thread_id);
      }

      if (data.response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
          },
        ]);
      }

      if (data.interrupt && data.interrupt.type === "order_confirmation") {
        setThreadId(data.thread_id);
        setPendingOrder(data.interrupt);
        setPharmacistReview(null);
      }

      if (data.interrupt && data.interrupt.type === "pharmacist_review") {
        setPharmacistReview({
          ...data.interrupt,
          thread_id: data.thread_id,
        });

        setPendingOrder(null);
      }
    } catch (error) {
      console.error(error);

      const detail = error.response?.data?.detail;

      const errorMessage = Array.isArray(detail)
        ? detail.map((item) => item.msg).join(", ")
        : typeof detail === "string"
          ? detail
          : "Something went wrong while contacting the pharmacy system.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setSending(false);
    }
  };
  const handleApproval = async (confirmed) => {
    if (!threadId || approvalLoading) {
      return;
    }

    setApprovalLoading(true);

    try {
      const data = await confirmOrder(threadId, confirmed);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.response ||
            (confirmed ? "Order confirmed." : "Order cancelled."),
        },
      ]);

      setPendingOrder(null);
      setThreadId(null);
    } catch (error) {
      console.error(error);

      const detail = error.response?.data?.detail;

      const errorMessage = Array.isArray(detail)
        ? detail.map((item) => item.msg).join(", ")
        : typeof detail === "string"
          ? detail
          : "Unable to process the order.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setApprovalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">MedPilot</h1>

            <p className="text-sm text-gray-500">AI Pharmacy Assistant</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-100"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Pharmacy Assistant</h2>

          <p className="mt-1 text-gray-500">
            Ask me to order or manage your medications.
          </p>
        </div>

        {!refillLoading && refillPredictions.length > 0 && (
          <div className="mb-6 space-y-3">
            {refillPredictions.map((prediction) => (
              <div
                key={prediction.medicine_id}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      Refill Reminder
                    </p>

                    <h3 className="mt-1 text-lg font-semibold">
                      {prediction.medicine_name}

                      {prediction.strength && ` ${prediction.strength}`}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Your usual refill interval is about{" "}
                      {prediction.average_interval_days} days.
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 px-3 py-2 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.max(prediction.days_until_refill, 0)}
                    </p>

                    <p className="text-xs text-blue-600">days</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="min-h-[500px] rounded-2xl border bg-white shadow-sm">
          <div className="space-y-5 p-6">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Bot size={18} />
                  </div>
                )}

                <div
                  className={`max-w-[75%] whitespace-pre-line rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.content}
                </div>

                {msg.role === "user" && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User size={18} />
                  </div>
                )}
              </div>
            ))}

            {pendingOrder && pendingOrder.type === "order_confirmation" && (
              <div className="ml-12">
                <OrderConfirmation
                  order={pendingOrder}
                  loading={approvalLoading}
                  onConfirm={() => handleApproval(true)}
                  onCancel={() => handleApproval(false)}
                />
              </div>
            )}

            {pharmacistReview &&
              pharmacistReview.type === "pharmacist_review" && (
                <div className="ml-12 max-w-md rounded-2xl border border-orange-200 bg-orange-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                      <ShieldAlert size={21} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-orange-900">
                        Pharmacist Review Required
                      </h3>

                      <p className="mt-1 text-sm text-orange-700">
                        This medication request requires additional review
                        before it can be processed.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Medicine</span>

                      <span className="font-medium">
                        {pharmacistReview.medicine}
                      </span>
                    </div>

                    {pharmacistReview.strength && (
                      <div className="mt-3 flex justify-between">
                        <span className="text-gray-500">Strength</span>

                        <span>{pharmacistReview.strength}</span>
                      </div>
                    )}

                    <div className="mt-3 flex justify-between">
                      <span className="text-gray-500">Quantity</span>

                      <span>{pharmacistReview.quantity}</span>
                    </div>

                    <div className="mt-3 flex justify-between border-t pt-3">
                      <span className="text-gray-500">Risk Level</span>

                      <span className="font-medium text-orange-600">
                        {pharmacistReview.risk_level}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-orange-100 px-3 py-2 text-center text-sm font-medium text-orange-800">
                    Awaiting pharmacist review
                  </div>
                </div>
              )}
          </div>

          <form onSubmit={handleSend} className="border-t p-4">
            <div className="flex gap-3">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending || !!pendingOrder || !!pharmacistReview}
                placeholder={
                  pendingOrder
                    ? "Please confirm or cancel the order above"
                    : pharmacistReview
                      ? "Waiting for pharmacist review"
                      : "I need 10 paracetamol tablets..."
                }
                className="flex-1 rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />

              <button
                type="submit"
                disabled={sending || !!pendingOrder || !!pharmacistReview}
                className="flex items-center justify-center rounded-xl bg-blue-600 px-5 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={19} />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
