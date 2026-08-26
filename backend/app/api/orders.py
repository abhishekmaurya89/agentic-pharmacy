from fastapi import APIRouter

from backend.app.models.order import OrderCreate
from backend.app.services.order_service import execute_order

from fastapi import APIRouter, Depends

from backend.app.core.auth import get_current_user
from backend.app.models.order import OrderCreate
from backend.app.services.order_service import execute_order
from fastapi import Depends, HTTPException
from backend.app.services.pharmacist_service import (
    get_thread_status,
)
from backend.app.core.auth import (
    get_current_user,
)

from backend.app.services.order_service import (
    get_order_status_by_thread,
)

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

@router.get("/status/{thread_id}")
async def get_order_status(
    thread_id: str,
    current_user: dict = Depends(
        get_current_user
    ),
):
    order = await get_order_status_by_thread(
        thread_id
    )

    if not order:
        return {
            "status": "pending",
            "thread_id": thread_id,
        }

    return order
@router.get("/status/{thread_id}")
async def get_order_status(
    thread_id: str,
    current_user: dict = Depends(
        get_current_user
    ),
):
    result = await get_thread_status(
        thread_id
    )

    return result

@router.get("/status/{thread_id}")
async def get_order_status(
    thread_id: str,
    current_user: dict = Depends(
        get_current_user
    ),
):
    order = await get_order_status_by_thread(
        thread_id
    )

    if not order:
        return {
            "status": "pending",
            "thread_id": thread_id,
        }

    if (
        order.get("patient_id")
        != current_user["id"]
    ):
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    return order


@router.post("/")
async def create_order(
    order: OrderCreate,
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "patient":
        return {
            "error": "Only patients can place orders"
        }

    if len(order.items) != 1:
        return {
            "error": "MVP currently supports one medicine per order"
        }

    item = order.items[0]

    return await execute_order(
        patient_id=current_user["id"],
        medicine_id=item.medicine_id,
        quantity=item.quantity
    )
    if len(order.items) != 1:
        return {
            "error": "MVP currently supports one medicine per order"
        }

    item = order.items[0]

    return await execute_order(
        patient_id=patient_id,
        medicine_id=item.medicine_id,
        quantity=item.quantity
    )
