import re
from datetime import datetime, timezone

from bson.binary import Binary
from fastapi import HTTPException, UploadFile

from backend.app.db.mongodb import db
from backend.app.services.order_service import validate_object_id

ALLOWED_CONTENT_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_FILE_SIZE = 10 * 1024 * 1024


async def upload_prescription(
    patient_id: str,
    medicine_name: str,
    valid_until: datetime,
    file: UploadFile,
):
    patient_object_id = validate_object_id(patient_id, "patient_id")
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Prescription must be a PDF, JPEG, or PNG file",
        )

    medicines = await db.medicines.find(
        {
            "name": {
                "$regex": f"^{re.escape(medicine_name.strip())}$",
                "$options": "i",
            },
        }
    ).to_list(length=2)
    if len(medicines) > 1:
        raise HTTPException(
            status_code=400,
            detail="Multiple medicines match; include the medicine strength",
        )
    medicine = medicines[0] if medicines else None
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    medicine_object_id = medicine["_id"]

    if not medicine.get("prescription_required"):
        raise HTTPException(
            status_code=400,
            detail="This medicine does not require a prescription",
        )

    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, detail="Prescription file must be 10 MB or smaller"
        )

    if valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=timezone.utc)

    if valid_until <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400, detail="Prescription expiry must be in the future"
        )

    result = await db.prescription_uploads.insert_one(
        {
            "patient_id": patient_object_id,
            "medicine_id": medicine_object_id,
            "quantity_allowed": None,
            "filename": file.filename or "prescription",
            "content_type": file.content_type,
            "file_data": Binary(content),
            "valid_until": valid_until,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "reviewed_at": None,
            "reviewed_by": None,
            "rejection_reason": None,
        }
    )

    return {"id": str(result.inserted_id), "status": "pending"}


async def get_pending_prescription_uploads():
    uploads = (
        await db.prescription_uploads.find({"status": "pending"})
        .sort("created_at", 1)
        .to_list(length=100)
    )
    return [
        {
            "id": str(upload["_id"]),
            "patient_id": str(upload["patient_id"]),
            "medicine_id": str(upload["medicine_id"]),
            "quantity_allowed": upload["quantity_allowed"],
            "valid_until": upload["valid_until"],
            "filename": upload["filename"],
            "content_type": upload["content_type"],
            "created_at": upload["created_at"],
        }
        for upload in uploads
    ]


async def get_prescription_file(upload_id: str):
    upload_object_id = validate_object_id(upload_id, "upload_id")
    upload = await db.prescription_uploads.find_one({"_id": upload_object_id})
    if not upload:
        raise HTTPException(status_code=404, detail="Prescription upload not found")

    return upload["file_data"], upload["content_type"], upload["filename"]


async def review_prescription_upload(
    upload_id: str,
    pharmacist_id: str,
    approved: bool,
    quantity_allowed: int | None = None,
    rejection_reason: str | None = None,
):
    upload_object_id = validate_object_id(upload_id, "upload_id")
    pharmacist_object_id = validate_object_id(pharmacist_id, "pharmacist_id")

    upload = await db.prescription_uploads.find_one(
        {"_id": upload_object_id, "status": "pending"}
    )
    if not upload:
        raise HTTPException(
            status_code=404, detail="Pending prescription upload not found"
        )

    if approved and (quantity_allowed is None or quantity_allowed <= 0):
        raise HTTPException(
            status_code=400, detail="Approved prescriptions require a valid quantity"
        )

    now = datetime.now(timezone.utc)
    update = {
        "status": "approved" if approved else "rejected",
        "reviewed_at": now,
        "reviewed_by": pharmacist_object_id,
    }
    if not approved:
        update["rejection_reason"] = rejection_reason or "Rejected by pharmacist"

    if approved:
        await db.prescriptions.insert_one(
            {
                "patient_id": upload["patient_id"],
                "medicine_id": upload["medicine_id"],
                "quantity_allowed": quantity_allowed,
                "remaining_quantity": quantity_allowed,
                "valid_until": upload["valid_until"],
                "status": "active",
                "source_upload_id": upload["_id"],
                "created_at": now,
            }
        )

    await db.prescription_uploads.update_one(
        {"_id": upload_object_id}, {"$set": update}
    )
    return {"id": upload_id, "status": update["status"]}
