from fastapi import APIRouter, Depends, HTTPException

from backend.app.core.auth import get_current_user
from backend.app.models.order import OrderCreate
from backend.app.services.order_service import (
    execute_order,
    get_order_status_by_thread,
)
from backend.app.services.pharmacist_service import get_thread_status

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("/status/{thread_id}")
async def get_order_status(
    thread_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = await get_thread_status(thread_id)

    if not result or (result.get("status") == "pending" and not result.get("medicine_name")):
        order = await get_order_status_by_thread(thread_id)
        if order:
            result = order

    if not result:
        return {
            "status": "pending",
            "thread_id": thread_id,
        }

    patient_id = result.get("patient_id")
    if patient_id and current_user.get("role") != "pharmacist" and str(patient_id) != str(current_user["id"]):
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    return result


@router.post("/")
async def create_order(
    order: OrderCreate, current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Only patients can place orders")

    if len(order.items) != 1:
        raise HTTPException(status_code=400, detail="Only one medicine per order is supported")

    item = order.items[0]

    return await execute_order(
        patient_id=current_user["id"],
        medicine_id=item.medicine_id,
        quantity=item.quantity,
    )
