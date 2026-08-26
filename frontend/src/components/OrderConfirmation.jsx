import { Check, X, ShoppingCart, AlertCircle } from "lucide-react";

export default function OrderConfirmation({
  order,
  onConfirm,
  onCancel,
  loading,
}) {
  const isPharmacistReview = order.type === "pharmacist_review";

  return (
    <div className="mt-3 max-w-md rounded-2xl border bg-white p-5 shadow-sm">

      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
          isPharmacistReview ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
        }`}>
          {isPharmacistReview ? <AlertCircle size={20} /> : <ShoppingCart size={20} />}
        </div>

        <div>
          <h3 className="font-semibold">
            {isPharmacistReview ? "Pharmacist Review Required" : "Confirm Order"}
          </h3>

          <p className="text-sm text-gray-500">
            {isPharmacistReview ? "This order requires pharmacist approval" : "Please review before ordering"}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-gray-50 p-4">

        <div className="flex justify-between">
          <span className="text-gray-500">
            Medicine
          </span>

          <span className="font-medium">
            {order.medicine}
          </span>
        </div>

        {order.strength && (
          <div className="flex justify-between">
            <span className="text-gray-500">
              Strength
            </span>

            <span>
              {order.strength}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-500">
            Quantity
          </span>

          <span>
            {order.quantity}
          </span>
        </div>

        {isPharmacistReview && order.total_amount && (
          <div className="flex justify-between">
            <span className="text-gray-500">
              Total
            </span>

            <span>
              ₹{order.total_amount}
            </span>
          </div>
        )}

        {isPharmacistReview && order.risk_level && (
          <div className="border-t pt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Risk Assessment</div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Risk Level</span>
              <span className={`font-semibold ${
                order.risk_level === "high" ? "text-red-600" :
                order.risk_level === "medium" ? "text-yellow-600" :
                "text-green-600"
              }`}>
                {order.risk_level.charAt(0).toUpperCase() + order.risk_level.slice(1)}
              </span>
            </div>
            {order.risk_score && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Risk Score</span>
                <span className="font-medium">{order.risk_score}/100</span>
              </div>
            )}
            {order.risk_reasons && order.risk_reasons.length > 0 && (
              <div className="mt-2">
                <span className="text-gray-500 text-sm">Reasons:</span>
                <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                  {order.risk_reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!isPharmacistReview && order.total_amount && (
          <div className="flex justify-between border-t pt-3">
            <span className="text-gray-500">
              Total
            </span>

            <span className="font-semibold">
              ₹{order.total_amount}
            </span>
          </div>
        )}

      </div>

      <div className="mt-4 flex gap-3">

        <button
          onClick={onCancel}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <X size={17} />
          {isPharmacistReview ? "Reject" : "Cancel"}
        </button>

        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium text-white disabled:opacity-50 ${
            isPharmacistReview 
              ? "bg-orange-600 hover:bg-orange-700" 
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <Check size={17} />
          {loading ? "Processing..." : (isPharmacistReview ? "Approve" : "Confirm")}
        </button>

      </div>

    </div>
  );
}