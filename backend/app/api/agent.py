from fastapi import APIRouter, Depends

from backend.app.agent.graph import pharmacy_graph
from backend.app.core.auth import get_current_user


router = APIRouter(
    prefix="/agent",
    tags=["Agent"]
)


@router.post("/chat")
async def chat(
    message: str,
    current_user: dict = Depends(get_current_user)
):

    initial_state = {
        "user_message": message,
        "user_id": current_user["id"]
    }

    result = await pharmacy_graph.ainvoke(
        initial_state
    )

    return {
        "response": result.get("response"),
        "state": {
            "intent": result.get("intent"),
            "medicine_name": result.get("medicine_name"),
            "quantity": result.get("quantity"),
            "medicine_id": result.get("medicine_id"),
            "inventory_result": result.get("inventory_result"),
            "prescription_result": result.get("prescription_result"),
            "order_ready": result.get("order_ready")
        }
    }