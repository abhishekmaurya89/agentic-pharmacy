from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException

from backend.app.db.mongodb import db
from backend.app.services.inventory_service import check_inventory
from backend.app.services.prescription_service import check_prescription


def validate_object_id(value: str, field_name: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name}",
        )

    return ObjectId(value)


async def get_order_status_by_thread(
    thread_id: str,
):
    order = await db.orders.find_one(
        {
            "thread_id": thread_id,
        }
    )

    if not order:
        return None

    item = order.get("items", [{}])[0] if order.get("items") else {}

    return {
        "order_id": str(order["_id"]),
        "patient_id": str(order.get("patient_id")) if order.get("patient_id") else None,
        "thread_id": order.get("thread_id"),
        "status": order.get("status"),
        "medicine_id": (str(item["medicine_id"]) if item.get("medicine_id") else None),
        "medicine_name": item.get("medicine_name"),
        "strength": item.get("strength"),
        "quantity": item.get("quantity"),
        "total_amount": order.get("total_amount"),
        "rejection_reason": order.get("rejection_reason"),
    }


async def execute_order(
    patient_id: str,
    medicine_id: str,
    quantity: int,
    thread_id: str | None = None,
):
    if quantity is None or quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero",
        )

    if quantity > 100:
        raise HTTPException(
            status_code=403,
            detail="This quantity requires pharmacist approval before the order can be processed.",
        )

    patient_object_id = validate_object_id(
        patient_id,
        "patient_id",
    )

    medicine_object_id = validate_object_id(
        medicine_id,
        "medicine_id",
    )

    patient = await db.users.find_one(
        {
            "_id": patient_object_id,
            "role": "patient",
        }
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    medicine = await db.medicines.find_one({"_id": medicine_object_id})

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found",
        )

    inventory = await check_inventory(
        medicine_id,
        quantity,
    )

    if not inventory["allowed"]:
        raise HTTPException(
            status_code=400,
            detail=inventory,
        )

    prescription = await check_prescription(
        patient_id,
        medicine_id,
        quantity,
    )

    if not prescription["allowed"]:
        raise HTTPException(
            status_code=403,
            detail=prescription,
        )

    result = await db.medicines.update_one(
        {
            "_id": medicine_object_id,
            "stock": {"$gte": quantity},
        },
        {"$inc": {"stock": -quantity}},
    )

    if result.modified_count != 1:
        raise HTTPException(
            status_code=409,
            detail="Inventory changed. Please try again.",
        )

    total_amount = medicine["unit_price"] * quantity

    order = {
        "thread_id": thread_id,
        "patient_id": patient_object_id,
        "items": [
            {
                "medicine_id": medicine_object_id,
                "medicine_name": medicine["name"],
                "strength": medicine.get("strength"),
                "quantity": quantity,
                "unit_price": medicine["unit_price"],
            }
        ],
        "total_amount": total_amount,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc),
    }

    existing_pending = None
    if thread_id:
        existing_pending = await db.orders.find_one(
            {
                "thread_id": thread_id,
                "status": "pending_pharmacist_review",
            }
        )

    try:
        if existing_pending:
            await db.orders.update_one(
                {"_id": existing_pending["_id"]},
                {
                    "$set": {
                        "status": "confirmed",
                        "total_amount": total_amount,
                        "items": [
                            {
                                "medicine_id": medicine_object_id,
                                "medicine_name": medicine["name"],
                                "strength": medicine.get("strength"),
                                "quantity": quantity,
                                "unit_price": medicine["unit_price"],
                            }
                        ],
                        "confirmed_at": datetime.now(timezone.utc),
                    }
                },
            )
            order_id = str(existing_pending["_id"])
        else:
            order_result = await db.orders.insert_one(order)
            order_id = str(order_result.inserted_id)

    except Exception:
        await db.medicines.update_one(
            {"_id": medicine_object_id},
            {"$inc": {"stock": quantity}},
        )

        raise HTTPException(
            status_code=500,
            detail="Order creation failed. Inventory restored.",
        )

    if medicine["prescription_required"]:
        patient_query = (
            {"$in": [patient_object_id, patient_id]}
            if ObjectId.is_valid(patient_id)
            else patient_id
        )
        medicine_query = (
            {"$in": [medicine_object_id, medicine_id]}
            if ObjectId.is_valid(medicine_id)
            else medicine_id
        )
        prescription_update = await db.prescriptions.update_one(
            {
                "patient_id": patient_query,
                "medicine_id": medicine_query,
                "status": "active",
                "remaining_quantity": {"$gte": quantity},
            },
            {"$inc": {"remaining_quantity": -quantity}},
        )

        if prescription_update.modified_count != 1:
            if existing_pending:
                await db.orders.update_one(
                    {"_id": existing_pending["_id"]},
                    {"$set": {"status": "rejected", "rejection_reason": "Prescription changed"}},
                )
            else:
                await db.orders.delete_one({"_id": ObjectId(order_id)})

            await db.medicines.update_one(
                {"_id": medicine_object_id},
                {"$inc": {"stock": quantity}},
            )

            raise HTTPException(
                status_code=409,
                detail="Prescription changed. Order cancelled.",
            )

    await db.audit_logs.insert_one(
        {
            "event": "ORDER_EXECUTED",
            "order_id": order_id,
            "patient_id": str(patient_object_id),
            "medicine_id": str(medicine_object_id),
            "quantity": quantity,
            "total_amount": total_amount,
            "thread_id": thread_id,
            "timestamp": datetime.now(timezone.utc),
        }
    )

    return {
        "order_id": order_id,
        "patient_id": patient_id,
        "medicine_id": medicine_id,
        "medicine_name": medicine["name"],
        "strength": medicine.get("strength"),
        "quantity": quantity,
        "total_amount": total_amount,
        "status": "confirmed",
    }


async def create_pending_order(
    patient_id: str,
    medicine_id: str,
    medicine: dict,
    quantity: int,
    risk_level: str,
    risk_reasons: list[str],
    thread_id: str,
):
    patient_object_id = validate_object_id(
        patient_id,
        "patient_id",
    )

    medicine_object_id = validate_object_id(
        medicine_id,
        "medicine_id",
    )

    total_amount = medicine["unit_price"] * quantity

    pending_order = {
        "thread_id": thread_id,
        "patient_id": patient_object_id,
        "items": [
            {
                "medicine_id": medicine_object_id,
                "quantity": quantity,
                "unit_price": medicine["unit_price"],
                "medicine_name": medicine["name"],
                "strength": medicine.get("strength"),
            }
        ],
        "total_amount": total_amount,
        "status": "pending_pharmacist_review",
        "risk_level": risk_level,
        "risk_reasons": risk_reasons,
        "created_at": datetime.now(timezone.utc),
        "reviewed_at": None,
        "reviewed_by": None,
    }

    try:
        result = await db.orders.insert_one(pending_order)

        return {
            "order_id": str(result.inserted_id),
            "patient_id": patient_id,
            "medicine_id": medicine_id,
            "medicine_name": medicine["name"],
            "strength": medicine.get("strength"),
            "quantity": quantity,
            "total_amount": total_amount,
            "status": "pending_pharmacist_review",
            "risk_level": risk_level,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create pending order: {str(e)}",
        )


async def update_pending_order_status(
    thread_id: str,
    patient_id: str,
    medicine_id: str,
    approved: bool,
    pharmacist_id: str = None,
    rejection_reason: str = None,
):
    patient_object_id = validate_object_id(
        patient_id,
        "patient_id",
    )

    medicine_object_id = validate_object_id(
        medicine_id,
        "medicine_id",
    )

    new_status = "confirmed" if approved else "rejected"

    update_fields = {
        "status": new_status,
        "reviewed_at": datetime.now(timezone.utc),
    }

    if pharmacist_id:
        update_fields["reviewed_by"] = pharmacist_id

    if rejection_reason:
        update_fields["rejection_reason"] = rejection_reason

    try:
        result = await db.orders.update_one(
            {
                "thread_id": thread_id,
                "patient_id": patient_object_id,
                "items.medicine_id": medicine_object_id,
                "status": "pending_pharmacist_review",
            },
            {"$set": update_fields},
        )

        return {
            "success": result.modified_count > 0,
            "status": new_status,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update order: {str(e)}",
        )
