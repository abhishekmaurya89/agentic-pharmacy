import { useState } from "react";
import { Send, LogOut, Bot, User } from "lucide-react";
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

  const [pendingOrder, setPendingOrder] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [sending, setSending] = useState(false);

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
      const data = await sendAgentMessage(userMessage);
      console.log("AGENT RESPONSE:", data);

      if (data.response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
          },
        ]);
      }

      // LangGraph interrupted for patient approval
      if (
        data.interrupt &&
        data.interrupt.type === "order_confirmation"
      ) {
        setThreadId(data.thread_id);
        setPendingOrder(data.interrupt);
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

  const handleApproval = async (confirmed) => {
    if (!threadId || approvalLoading) {
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

      {/* Navbar */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <div>
            <h1 className="text-xl font-bold">
              Agentic Pharmacy
            </h1>

            <p className="text-sm text-gray-500">
              AI Pharmacy Assistant
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            <LogOut size={17} />
            Logout
          </button>

        </div>

      </header>

      {/* Main */}

      <main className="mx-auto flex max-w-4xl flex-col px-4 py-8">

        <div className="mb-6">

          <h2 className="text-2xl font-bold">
            Pharmacy Assistant
          </h2>

          <p className="mt-1 text-gray-500">
            Ask me to order or manage your medications.
          </p>

        </div>

        {/* Chat */}

        <div className="min-h-125 rounded-2xl border bg-white shadow-sm">

          <div className="space-y-5 p-6">

            {messages.map((msg, index) => (

              <div
                key={index}
                className={`flex gap-3 ${
                  msg.role === "user"
                    ? "justify-end"
                    : "justify-start"
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

            {/* Order Confirmation */}

            {pendingOrder && (
              <div className="ml-12">
                <OrderConfirmation
                  order={pendingOrder}
                  loading={approvalLoading}
                  onConfirm={() =>
                    handleApproval(true)
                  }
                  onCancel={() =>
                    handleApproval(false)
                  }
                />
              </div>
            )}

          </div>

          {/* Input */}

          <form
            onSubmit={handleSend}
            className="border-t p-4"
          >

            <div className="flex gap-3">

              <input
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                disabled={sending || pendingOrder}
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
                className="flex items-center justify-center rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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