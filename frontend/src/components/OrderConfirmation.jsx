import { Check, X, ShoppingCart } from "lucide-react";

export default function OrderConfirmation({
  order,
  onConfirm,
  onCancel,
  loading,
}) {
  return (
    <div className="mt-3 max-w-md rounded-2xl border bg-white p-5 shadow-sm">

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <ShoppingCart size={20} />
        </div>

        <div>
          <h3 className="font-semibold">
            Confirm Order
          </h3>

          <p className="text-sm text-gray-500">
            Please review before ordering
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

        <div className="flex justify-between border-t pt-3">
          <span className="text-gray-500">
            Total
          </span>

          <span className="font-semibold">
            ₹{order.total_amount}
          </span>
        </div>

      </div>

      <div className="mt-4 flex gap-3">

        <button
          onClick={onCancel}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <X size={17} />
          Cancel
        </button>

        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Check size={17} />
          {loading ? "Processing..." : "Confirm"}
        </button>

      </div>

    </div>
  );
}