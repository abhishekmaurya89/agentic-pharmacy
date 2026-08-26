import uuid

from fastapi import APIRouter, Depends, Request

from backend.app.agent.state import PharmacyState
from backend.app.core.auth import get_current_user
from langgraph.types import Command

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

    initial_state: PharmacyState = {
        "user_message": message,
        "user_id": current_user["id"],
        "thread_id": thread_id,
    }

    result = await graph.ainvoke(
        initial_state,
        config
    )

    interrupts = result.get(
        "__interrupt__",
        []
    )

    interrupt_data = None

    if interrupts:
        interrupt_data = interrupts[0].value

    return {
        "thread_id": thread_id,
        "response": result.get("response"),
        "interrupt": interrupt_data,
        "order_result": result.get("order_result"),
    }
@router.post("/confirm")
async def confirm_order(
    request: Request,
    thread_id: str,
    confirmed: bool,
    approval_type: str = "order",
    current_user: dict = Depends(get_current_user)
):

    graph = request.app.state.pharmacy_graph

    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }

    # Use different field names based on approval type
    if approval_type == "pharmacist":
        resume_data = {"approved": confirmed}
    else:
        resume_data = {"confirmed": confirmed}

    result = await graph.ainvoke(
        Command(
            resume=resume_data
        ),
        config
    )

    return {
        "response": result.get("response"),
        "order_result": result.get("order_result")
    }