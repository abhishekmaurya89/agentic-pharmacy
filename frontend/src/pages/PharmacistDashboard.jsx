import { useEffect, useState } from "react";
import { LogOut, ShieldAlert, Check, X, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

export default function PharmacistDashboard() {
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [lastUpdated, setLastUpdated] = useState(null);

  const getToken = () => localStorage.getItem("access_token");


  const getErrorMessage = (err, fallback) => {
    const detail = err.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return item?.msg || "Validation error";
        })
        .join(", ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    if (detail && typeof detail === "object") {
      return detail.msg || detail.message || fallback;
    }

    return fallback;
  };

  const loadReviews = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response = await API.get("/pharmacist/pending", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      setReviews(response.data);

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load reviews:", err);

      setError(getErrorMessage(err, "Unable to load pending reviews."));
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };


  useEffect(() => {
    loadReviews();

    const interval = setInterval(() => {
      loadReviews(false);
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleReview = async (review, approved) => {
    if (processingId) {
      return;
    }

    setProcessingId(review._id);
    setError("");
    setSuccess("");

    try {
      const response = await API.post(
        "/pharmacist/review",
        {
          thread_id: review.thread_id,

          approved,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      console.log("PHARMACIST REVIEW RESULT:", response.data);

      setReviews((prev) => prev.filter((item) => item._id !== review._id));

      setSuccess(
        approved
          ? `${review.medicine_name} order approved successfully.`
          : `${review.medicine_name} order rejected successfully.`,
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Review processing failed:", err);

      setError(getErrorMessage(err, "Unable to process the review."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");

    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">MedPilot</h1>

            <p className="text-sm text-gray-500">Pharmacist Control Center</p>
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

     

      <main className="mx-auto max-w-6xl px-6 py-8">
    
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Pending Reviews</h2>

              <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                {reviews.length}
              </span>
            </div>

            <p className="mt-1 text-gray-500">
              Review high-risk medication requests before execution.
            </p>

            {lastUpdated && (
              <p className="mt-1 text-xs text-gray-400">
                Last updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          <button
            onClick={() => loadReviews(true)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <Check size={18} />

            <span>{success}</span>

            <button
              onClick={() => setSuccess("")}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <ShieldAlert size={18} />

            <span>{error}</span>

            <button
              onClick={() => setError("")}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border bg-white p-10 text-center text-gray-500">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            Loading pending reviews...
          </div>
        )}
        {!loading && reviews.length === 0 && (
          <div className="rounded-2xl border bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check size={22} />
            </div>

            <h3 className="mt-4 font-semibold">No pending reviews</h3>

            <p className="mt-1 text-sm text-gray-500">
              All medication requests have been reviewed.
            </p>
          </div>
        )}

        {!loading && reviews.length > 0 && (
          <div className="grid gap-5">
            {reviews.map((review) => {
              const processing = processingId === review._id;

              return (
                <div
                  key={review._id}
                  className="rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                        <ShieldAlert size={22} />
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold">
                          {review.medicine_name}

                          {review.strength && ` ${review.strength}`}
                        </h3>

                        <p className="text-sm text-gray-500">
                          Patient ID: {review.patient_id}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase text-red-700">
                      {review.risk_level}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Quantity</p>

                      <p className="mt-1 text-lg font-semibold">
                        {review.quantity}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Risk Score</p>

                      <p className="mt-1 text-lg font-semibold">
                        {review.risk_score}
                        /100
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Status</p>

                      <p className="mt-1 text-lg font-semibold text-orange-600">
                        Pending
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4">
                    <p className="font-medium text-orange-900">
                      Risk Assessment
                    </p>

                    {review.risk_reasons?.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-sm text-orange-800">
                        {review.risk_reasons.map((reason, index) => (
                          <li key={index} className="flex gap-2">
                            <span>•</span>

                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-orange-800">
                        No additional risk reasons provided.
                      </p>
                    )}
                  </div>

                  {review.created_at && (
                    <p className="mt-4 text-xs text-gray-400">
                      Submitted {new Date(review.created_at).toLocaleString()}
                    </p>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => handleReview(review, false)}
                      disabled={processing}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={18} />

                      {processing ? "Processing..." : "Reject"}
                    </button>

                    <button
                      onClick={() => handleReview(review, true)}
                      disabled={processing}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check size={18} />

                      {processing ? "Processing..." : "Approve"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
