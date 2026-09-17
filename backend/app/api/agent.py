import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from langgraph.types import Command

from backend.app.agent.state import PharmacyState
from backend.app.core.auth import get_current_user

router = APIRouter(prefix="/agent", tags=["Agent"])


@router.post("/chat")
async def chat(
    request: Request,
    message: str,
    thread_id: str | None = None,
    current_user: dict = Depends(get_current_user),
):

    graph = request.app.state.pharmacy_graph

    if not thread_id:
        thread_id = str(uuid.uuid4())
    else:
        snapshot = await graph.aget_state({"configurable": {"thread_id": thread_id}})
        state_user_id = snapshot.values.get("user_id") if snapshot.values else None
        if state_user_id and state_user_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

    config = {"configurable": {"thread_id": thread_id}}

    initial_state: PharmacyState = {
        "user_message": message,
        "user_id": current_user["id"],
        "thread_id": thread_id,
    }

    result = await graph.ainvoke(initial_state, config)

    interrupts = result.get("__interrupt__", ())

    interrupt_data = None

    if interrupts:
        interrupt_data = interrupts[0].value

    response_text = result.get("response")
    if not response_text and interrupt_data and isinstance(interrupt_data, dict):
        response_text = interrupt_data.get("message")

    return {
        "thread_id": thread_id,
        "response": response_text,
        "interrupt": interrupt_data,
        "order_result": result.get("order_result"),
    }


@router.post("/confirm")
async def confirm_order(
    request: Request,
    thread_id: str,
    confirmed: bool,
    approval_type: str = "order",
    current_user: dict = Depends(get_current_user),
):
    if approval_type == "pharmacist":
        if current_user.get("role") != "pharmacist":
            raise HTTPException(
                status_code=403,
                detail="Pharmacist role required for pharmacist approval",
            )
        resume_data = {
            "approved": confirmed,
            "pharmacist_id": current_user["id"],
        }
    else:
        snapshot = await request.app.state.pharmacy_graph.aget_state(
            {"configurable": {"thread_id": thread_id}}
        )
        state_user_id = snapshot.values.get("user_id") if snapshot.values else None
        if state_user_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        resume_data = {"confirmed": confirmed}

    graph = request.app.state.pharmacy_graph

    config = {"configurable": {"thread_id": thread_id}}

    result = await graph.ainvoke(Command(resume=resume_data), config)

    return {
        "response": result.get("response"),
        "order_result": result.get("order_result"),
    }
