from datetime import datetime, timezone

from bson import ObjectId

from backend.app.db.mongodb import db
from backend.app.services.inventory_service import get_medicine


async def check_prescription(patient_id: str, medicine_id: str, quantity: int | None):
    if quantity is None:
        return {"allowed": False, "reason": "QUANTITY_REQUIRED"}

    if quantity <= 0:
        return {"allowed": False, "reason": "INVALID_QUANTITY"}

    medicine = await get_medicine(medicine_id)

    if not medicine.get("prescription_required"):
        return {"allowed": True, "reason": "PRESCRIPTION_NOT_REQUIRED"}

    patient_query = (
        {"$in": [patient_id, ObjectId(patient_id)]}
        if ObjectId.is_valid(patient_id)
        else patient_id
    )
    medicine_query = (
        {"$in": [medicine_id, ObjectId(medicine_id)]}
        if ObjectId.is_valid(medicine_id)
        else medicine_id
    )

    prescription = await db.prescriptions.find_one(
        {
            "patient_id": patient_query,
            "medicine_id": medicine_query,
            "status": "active",
        }
    )

    if not prescription:
        return {"allowed": False, "reason": "PRESCRIPTION_REQUIRED"}

    now = datetime.now(timezone.utc)

    valid_until = prescription["valid_until"]

    if valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=timezone.utc)

    if valid_until < now:
        return {"allowed": False, "reason": "PRESCRIPTION_EXPIRED"}

    remaining = prescription["remaining_quantity"]

    if remaining < quantity:
        return {
            "allowed": False,
            "reason": "PRESCRIPTION_QUANTITY_EXCEEDED",
            "remaining_quantity": remaining,
            "requested_quantity": quantity,
        }

    return {
        "allowed": True,
        "reason": "VALID_PRESCRIPTION",
        "remaining_quantity": remaining,
    }
