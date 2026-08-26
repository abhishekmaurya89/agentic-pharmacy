from datetime import datetime, timedelta, timezone

from backend.app.db.mongodb import db

MIN_PURCHASES = 2
DEFAULT_DAYS_BUFFER = 5


async def predict_refill(patient_id: str, medicine_id: str):

    orders = (
        await db.orders.find(
            {
                "patient_id": patient_id,
                "status": "confirmed",
                "items.medicine_id": medicine_id,
            }
        )
        .sort("created_at", -1)
        .limit(10)
        .to_list(length=10)
    )

    if len(orders) < MIN_PURCHASES:
        return {"predictable": False, "reason": "Insufficient purchase history"}

    purchase_dates = []

    for order in orders:
        purchase_dates.append(order["created_at"])

    purchase_dates.sort()

    intervals = []

    for i in range(1, len(purchase_dates)):
        previous = purchase_dates[i - 1]
        current = purchase_dates[i]

        days = (current - previous).total_seconds() / 86400

        if days > 0:
            intervals.append(days)

    if not intervals:
        return {"predictable": False, "reason": "Unable to calculate purchase interval"}

    average_interval = sum(intervals) / len(intervals)

    last_purchase = purchase_dates[-1]

    predicted_date = last_purchase + timedelta(days=average_interval)

    now = datetime.now(timezone.utc)

    days_until_refill = (predicted_date - now).total_seconds() / 86400

    return {
        "predictable": True,
        "average_interval_days": round(average_interval, 2),
        "predicted_refill_date": predicted_date,
        "days_until_refill": round(days_until_refill, 2),
    }


async def generate_refill_alert(patient_id: str, medicine_id: str):

    prediction = await predict_refill(patient_id, medicine_id)

    if not prediction["predictable"]:
        return None

    days_until_refill = prediction["days_until_refill"]

    if days_until_refill > DEFAULT_DAYS_BUFFER:
        return None

    existing = await db.refill_alerts.find_one(
        {"patient_id": patient_id, "medicine_id": medicine_id, "status": "pending"}
    )

    if existing:
        return None

    alert = {
        "patient_id": patient_id,
        "medicine_id": medicine_id,
        "predicted_refill_date": prediction["predicted_refill_date"],
        "days_until_refill": days_until_refill,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.refill_alerts.insert_one(alert)

    return {"alert_id": str(result.inserted_id), **prediction}
