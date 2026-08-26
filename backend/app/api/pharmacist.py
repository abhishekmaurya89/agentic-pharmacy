from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
)
from langgraph.types import Command
from pydantic import BaseModel

from backend.app.core.auth import get_current_user
from backend.app.services.order_service import (
    update_pending_order_status,
)
from backend.app.services.pharmacist_service import (
    get_pending_reviews,
    get_review_by_thread_id,
    update_pharmacist_review,
)

router = APIRouter(
    prefix="/pharmacist",
    tags=["Pharmacist"],
)


class PharmacistReviewRequest(BaseModel):
    thread_id: str
    approved: bool
    rejection_reason: str | None = None


def require_pharmacist(current_user: dict):
    if current_user.get("role") != "pharmacist":
        raise HTTPException(
            status_code=403,
            detail="Pharmacist access required",
        )

    return current_user


@router.get("/pending")
async def pending_reviews(
    current_user: dict = Depends(get_current_user),
):
    require_pharmacist(current_user)

    return await get_pending_reviews()


@router.post("/review")
async def review_order(
    request: Request,
    body: PharmacistReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    require_pharmacist(current_user)

    graph = request.app.state.pharmacy_graph

    config = {"configurable": {"thread_id": body.thread_id}}

    result = await graph.ainvoke(
        Command(
            resume={
                "approved": body.approved,
                "pharmacist_id": current_user["id"],
            }
        ),
        config,
    )

    review = await get_review_by_thread_id(body.thread_id)

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Pending pharmacist review not found",
        )
    await update_pharmacist_review(
        thread_id=body.thread_id,
        approved=body.approved,
        pharmacist_id=current_user["id"],
        rejection_reason=body.rejection_reason,
    )

    await update_pending_order_status(
        thread_id=body.thread_id,
        patient_id=review["patient_id"],
        medicine_id=review["medicine_id"],
        approved=body.approved,
        pharmacist_id=current_user["id"],
        rejection_reason=body.rejection_reason,
    )

    return {
        "response": result.get("response"),
        "order_result": result.get("order_result"),
    }
