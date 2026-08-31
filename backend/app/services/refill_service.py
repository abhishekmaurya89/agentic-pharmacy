from datetime import datetime, timezone, timedelta

from bson import ObjectId

from backend.app.db.mongodb import db


async def get_refill_predictions(patient_id: str):
    if not ObjectId.is_valid(patient_id):
        return []

    patient_object_id = ObjectId(patient_id)

    orders = (
        await db.orders.find(
            {
                "patient_id": patient_object_id,
                "status": "confirmed",
            }
        )
        .sort(
            "created_at",
            1,
        )
        .to_list(length=100)
    )

    medicine_orders = {}

    for order in orders:
        for item in order.get("items", []):
            medicine_id = item.get("medicine_id")

            if not medicine_id:
                continue

            medicine_id = str(medicine_id)

            medicine_orders.setdefault(medicine_id, []).append(
                {
                    "created_at": order.get("created_at"),
                    "quantity": item.get("quantity", 0),
                    "medicine_id": medicine_id,
                    "medicine_name": item.get("medicine_name"),
                    "strength": item.get("strength"),
                }
            )

    predictions = []

    now = datetime.now(timezone.utc)

    for medicine_id, orders_for_medicine in medicine_orders.items():
        if len(orders_for_medicine) < 2:
            continue

        dates = [
            order["created_at"]
            for order in orders_for_medicine
            if order.get("created_at")
        ]

        if len(dates) < 2:
            continue

        intervals = []

        for index in range(1, len(dates)):
            previous = dates[index - 1]
            current = dates[index]

            if previous.tzinfo is None:
                previous = previous.replace(tzinfo=timezone.utc)

            if current.tzinfo is None:
                current = current.replace(tzinfo=timezone.utc)

            interval = (current - previous).days

            if interval > 0:
                intervals.append(interval)

        if not intervals:
            continue

        average_interval = sum(intervals) / len(intervals)

        latest_order = orders_for_medicine[-1]

        latest_date = latest_order["created_at"]

        if latest_date.tzinfo is None:
            latest_date = latest_date.replace(tzinfo=timezone.utc)

        predicted_date = latest_date + timedelta(days=round(average_interval))

        days_until_refill = (predicted_date - now).days

        if days_until_refill <= 7:
            predictions.append(
                {
                    "medicine_id": medicine_id,
                    "medicine_name": latest_order.get("medicine_name"),
                    "strength": latest_order.get("strength"),
                    "last_quantity": latest_order.get("quantity"),
                    "average_interval_days": round(average_interval),
                    "predicted_refill_date": predicted_date,
                    "days_until_refill": days_until_refill,
                }
            )

    return predictions


async def generate_refill_alert(
    patient_id: str,
):
    predictions = await get_refill_predictions(patient_id)

    alerts = []

    for prediction in predictions:
        alerts.append(
            {
                "type": "refill_alert",
                "medicine_id": prediction["medicine_id"],
                "medicine_name": prediction["medicine_name"],
                "strength": prediction.get("strength"),
                "message": (
                    f"{prediction['medicine_name']}"
                    f" may need a refill in "
                    f"{max(prediction['days_until_refill'], 0)} days."
                ),
                "predicted_refill_date": prediction["predicted_refill_date"],
                "days_until_refill": prediction["days_until_refill"],
            }
        )

    return alerts
