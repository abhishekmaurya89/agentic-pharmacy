import { useState } from "react";
import {
  Send,
  LogOut,
  Bot,
  User,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  sendAgentMessage,
  confirmOrder,
} from "../api/agent";

import OrderConfirmation from "../components/OrderConfirmation";

export default function PatientDashboard() {
  const navigate = useNavigate();

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I’m your pharmacy assistant. How can I help you today?",
    },
  ]);

  // Patient confirmation state
  const [pendingOrder, setPendingOrder] = useState(null);

  // Pharmacist review state
  const [pharmacistReview, setPharmacistReview] =
    useState(null);

  // LangGraph thread for patient confirmation
  const [threadId, setThreadId] = useState(null);

  const [approvalLoading, setApprovalLoading] =
    useState(false);

  const [sending, setSending] = useState(false);

  // --------------------------------
  // Logout
  // --------------------------------

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  // --------------------------------
  // Send message
  // --------------------------------

  const handleSend = async (e) => {
    e.preventDefault();

    if (!message.trim() || sending) {
      return;
    }

    const userMessage = message.trim();

    setMessage("");
    setSending(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    try {
      const data = await sendAgentMessage(
        userMessage
      );

      console.log(
        "AGENT RESPONSE:",
        data
      );

      // --------------------------------
      // Normal agent response
      // --------------------------------

      if (data.response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
          },
        ]);
      }

      // --------------------------------
      // Patient confirmation
      // --------------------------------

      if (
        data.interrupt &&
        data.interrupt.type ===
          "order_confirmation"
      ) {
        setThreadId(data.thread_id);

        setPendingOrder(
          data.interrupt
        );

        // Make sure pharmacist state
        // is not displayed
        setPharmacistReview(null);
      }

      // --------------------------------
      // Pharmacist review
      // --------------------------------

      if (
        data.interrupt &&
        data.interrupt.type ===
          "pharmacist_review"
      ) {
        setPharmacistReview(
          data.interrupt
        );

        // IMPORTANT:
        // Patient must NOT receive
        // approval controls.
        setPendingOrder(null);

        // Don't use the patient
        // confirmation handler.
        setThreadId(null);
      }
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error.response?.data?.detail ||
            "Something went wrong while contacting the pharmacy system.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  // --------------------------------
  // Patient confirmation
  // --------------------------------

  const handleApproval = async (
    confirmed
  ) => {
    if (
      !threadId ||
      approvalLoading
    ) {
      return;
    }

    setApprovalLoading(true);

    try {
      const data = await confirmOrder(
        threadId,
        confirmed
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.response ||
            (
              confirmed
                ? "Order confirmed."
                : "Order cancelled."
            ),
        },
      ]);

      setPendingOrder(null);
      setThreadId(null);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error.response?.data?.detail ||
            "Unable to process the order.",
        },
      ]);
    } finally {
      setApprovalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ================================
          Navbar
      ================================= */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <div>
            <h1 className="text-xl font-bold">
              MedPilot
            </h1>

            <p className="text-sm text-gray-500">
              AI Pharmacy Assistant
            </p>
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

      {/* ================================
          Main
      ================================= */}

      <main className="mx-auto flex max-w-4xl flex-col px-4 py-8">

        {/* Page heading */}

        <div className="mb-6">

          <h2 className="text-2xl font-bold">
            Pharmacy Assistant
          </h2>

          <p className="mt-1 text-gray-500">
            Ask me to order or manage your
            medications.
          </p>

        </div>

        {/* ================================
            Chat
        ================================= */}

        <div className="min-h-[500px] rounded-2xl border bg-white shadow-sm">

          <div className="space-y-5 p-6">

            {/* ================================
                Messages
            ================================= */}

            {messages.map(
              (msg, index) => (

                <div
                  key={index}
                  className={`flex gap-3 ${
                    msg.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >

                  {/* Assistant icon */}

                  {msg.role ===
                    "assistant" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <Bot size={18} />
                    </div>
                  )}

                  {/* Message */}

                  <div
                    className={`max-w-[75%] whitespace-pre-line rounded-2xl px-4 py-3 ${
                      msg.role ===
                      "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* User icon */}

                  {msg.role ===
                    "user" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200">
                      <User size={18} />
                    </div>
                  )}

                </div>
              )
            )}

            {/* ================================
                Patient Order Confirmation
            ================================= */}

            {pendingOrder &&
              pendingOrder.type ===
                "order_confirmation" && (

                <div className="ml-12">

                  <OrderConfirmation
                    order={pendingOrder}
                    loading={
                      approvalLoading
                    }
                    onConfirm={() =>
                      handleApproval(
                        true
                      )
                    }
                    onCancel={() =>
                      handleApproval(
                        false
                      )
                    }
                  />

                </div>
            )}

            {/* ================================
                Pharmacist Review Notice
            ================================= */}

            {pharmacistReview &&
              pharmacistReview.type ===
                "pharmacist_review" && (

                <div className="ml-12 max-w-md rounded-2xl border border-orange-200 bg-orange-50 p-5">

                  {/* Header */}

                  <div className="flex items-start gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">

                      <ShieldAlert
                        size={21}
                      />

                    </div>

                    <div>

                      <h3 className="font-semibold text-orange-900">
                        Pharmacist Review Required
                      </h3>

                      <p className="mt-1 text-sm text-orange-700">
                        This medication request
                        requires additional
                        review before it can
                        be processed.
                      </p>

                    </div>

                  </div>

                  {/* Order information */}

                  <div className="mt-4 rounded-xl bg-white p-4 text-sm">

                    <div className="flex justify-between">

                      <span className="text-gray-500">
                        Medicine
                      </span>

                      <span className="font-medium">
                        {
                          pharmacistReview.medicine
                        }
                      </span>

                    </div>

                    {pharmacistReview.strength && (
                      <div className="mt-3 flex justify-between">

                        <span className="text-gray-500">
                          Strength
                        </span>

                        <span>
                          {
                            pharmacistReview.strength
                          }
                        </span>

                      </div>
                    )}

                    <div className="mt-3 flex justify-between">

                      <span className="text-gray-500">
                        Quantity
                      </span>

                      <span>
                        {
                          pharmacistReview.quantity
                        }
                      </span>

                    </div>

                    <div className="mt-3 flex justify-between border-t pt-3">

                      <span className="text-gray-500">
                        Risk Level
                      </span>

                      <span className="font-medium text-orange-600">
                        {
                          pharmacistReview.risk_level
                        }
                      </span>

                    </div>

                  </div>

                  {/* Status */}

                  <div className="mt-4 rounded-lg bg-orange-100 px-3 py-2 text-center text-sm font-medium text-orange-800">

                    Awaiting pharmacist review

                  </div>

                </div>
            )}

          </div>

          {/* ================================
              Input
          ================================= */}

          <form
            onSubmit={handleSend}
            className="border-t p-4"
          >

            <div className="flex gap-3">

              <input
                value={message}
                onChange={(e) =>
                  setMessage(
                    e.target.value
                  )
                }
                disabled={
                  sending ||
                  !!pendingOrder
                }
                placeholder={
                  pendingOrder
                    ? "Please confirm or cancel the order above"
                    : "I need 10 paracetamol tablets..."
                }
                className="flex-1 rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />

              <button
                type="submit"
                disabled={
                  sending ||
                  !!pendingOrder
                }
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