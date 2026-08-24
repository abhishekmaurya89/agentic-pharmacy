from fastapi import APIRouter, Depends, Request

from backend.app.core.auth import get_current_user
from backend.app.agent.state import PharmacyState
from langgraph.types import Command
import uuid

thread_id = str(uuid.uuid4())

router = APIRouter(
    prefix="/agent",
    tags=["Agent"]
)

@router.post("/chat")
async def chat(
    request: Request,
    message: str,
    current_user: dict = Depends(get_current_user)
):

    graph = request.app.state.pharmacy_graph

    thread_id = str(uuid.uuid4())

    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }

    initial_state = {
        "user_message": message,
        "user_id": current_user["id"]
    }

    result = await graph.ainvoke(
        initial_state,
        config
    )

    return {
        "thread_id": thread_id,
        "response": result.get("response"),
        "state": {
            "intent": result.get("intent"),
            "medicine_name": result.get("medicine_name"),
            "quantity": result.get("quantity"),
            "medicine_id": result.get("medicine_id"),
            "order_ready": result.get("order_ready")
        }
    }

@router.post("/confirm")
async def confirm_order(
    request: Request,
    thread_id: str,
    confirmed: bool,
    current_user: dict = Depends(get_current_user)
):

    graph = request.app.state.pharmacy_graph

    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }

    result = await graph.ainvoke(
        Command(
            resume={
                "confirmed": confirmed
            }
        ),
        config
    )

    return {
        "response": result.get("response"),
        "order_result": result.get("order_result")
    }