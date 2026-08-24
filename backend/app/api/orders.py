from fastapi import APIRouter

from backend.app.models.order import OrderCreate
from backend.app.services.order_service import execute_order


router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)


from fastapi import APIRouter, Depends

from backend.app.core.auth import get_current_user
from backend.app.models.order import OrderCreate
from backend.app.services.order_service import execute_order


router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)


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
