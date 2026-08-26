from datetime import datetime, timezone

from bson import ObjectId

from backend.app.db.mongodb import db


async def update_pharmacist_review(
    thread_id: str,
    approved: bool,
    pharmacist_id: str,
    rejection_reason: str | None = None,
):
    update_data = {
        "status": (
            "approved"
            if approved
            else "rejected"
        ),
        "reviewed_by": ObjectId(
            pharmacist_id
        ),
        "reviewed_at": datetime.now(
            timezone.utc
        ),
    }

    if not approved:
        update_data["rejection_reason"] = (
            rejection_reason
            or "Rejected by pharmacist"
        )

    result = await db.pharmacist_reviews.update_one(
        {
            "thread_id": thread_id,
            "status": "pending",
        },
        {
            "$set": update_data
        },
    )

    return result.modified_count == 1

async def create_pharmacist_review(
    thread_id: str,
    patient_id: str,
    medicine_id: str,
    medicine: dict,
    quantity: int,
    risk_level: str,
    risk_score: int,
    risk_reasons: list[str],
):
    review = {
        "thread_id": thread_id,

        "patient_id": ObjectId(patient_id),
        "medicine_id": ObjectId(medicine_id),

        "medicine_name": medicine["name"],
        "strength": medicine.get("strength"),

        "quantity": quantity,

        "risk_level": risk_level,
        "risk_score": risk_score,
        "risk_reasons": risk_reasons,

        "status": "pending",

        "created_at": datetime.now(timezone.utc),

        "reviewed_at": None,
        "reviewed_by": None,
        "rejection_reason": None,
    }

    result = await db.pharmacist_reviews.insert_one(
        review
    )

    return str(result.inserted_id)

async def get_review_by_thread_id(
    thread_id: str
):
    review = await db.pharmacist_reviews.find_one(
        {
            "thread_id": thread_id,
            "status": "pending",
        }
    )

    if not review:
        return None

    review["_id"] = str(review["_id"])
    review["patient_id"] = str(
        review["patient_id"]
    )
    review["medicine_id"] = str(
        review["medicine_id"]
    )

    return review

async def get_pending_reviews():
    reviews = await db.pharmacist_reviews.find(
        {
            "status": "pending"
        }
    ).sort(
        "created_at",
        1
    ).to_list(
        length=100
    )

    for review in reviews:
        review["_id"] = str(review["_id"])
        review["patient_id"] = str(review["patient_id"])
        review["medicine_id"] = str(review["medicine_id"])

    return reviews