from fastapi import APIRouter, Depends, Request

from langgraph.types import Command

from backend.app.core.auth import get_current_user


router = APIRouter(
    prefix="/pharmacist",
    tags=["Pharmacist"]
)


@router.post("/review")
async def review_order(
    request: Request,
    thread_id: str,
    approved: bool,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "pharmacist":
        return {
            "error": "Pharmacist access required"
        }

    graph = request.app.state.pharmacy_graph

    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }

    result = await graph.ainvoke(
        Command(
            resume={
                "approved": approved,
                "pharmacist_id": current_user["id"],
            }
        ),
        config
    )

    return {
        "response": result.get("response"),
        "order_result": result.get("order_result"),
    }
