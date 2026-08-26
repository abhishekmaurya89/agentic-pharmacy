from datetime import datetime, timezone

from bson import ObjectId

from backend.app.db.mongodb import db
from backend.app.services.inventory_service import get_medicine


async def check_prescription(patient_id: str, medicine_id: str, quantity: int):
    if quantity <= 0:
        return {"allowed": False, "reason": "INVALID_QUANTITY"}

    medicine = await get_medicine(medicine_id)

    # OTC medicine does not require a prescription
    if not medicine["prescription_required"]:
        return {"allowed": True, "reason": "PRESCRIPTION_NOT_REQUIRED"}

    prescription = await db.prescriptions.find_one(
        {
            "patient_id": patient_id,
            "medicine_id": ObjectId(medicine_id),
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
