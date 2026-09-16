from fastapi import APIRouter, Depends, HTTPException, Request, Response
from langgraph.types import Command
from pydantic import BaseModel

from backend.app.core.auth import require_roles
from backend.app.services.order_service import update_pending_order_status
from backend.app.services.pharmacist_service import (
    get_pending_reviews,
    get_review_by_thread_id,
    update_pharmacist_review,
)
from backend.app.services.prescription_upload_service import (
    get_pending_prescription_uploads,
    get_prescription_file,
    review_prescription_upload,
)

router = APIRouter(
    prefix="/pharmacist",
    tags=["Pharmacist"],
)


class PharmacistReviewRequest(BaseModel):
    thread_id: str
    approved: bool
    rejection_reason: str | None = None


class PrescriptionReviewRequest(BaseModel):
    approved: bool
    quantity_allowed: int | None = None
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
    current_user: dict = Depends(require_roles("pharmacist")),
):
    return await get_pending_reviews()


@router.get("/prescriptions/pending")
async def pending_prescription_uploads(
    current_user: dict = Depends(require_roles("pharmacist")),
):
    return await get_pending_prescription_uploads()


@router.post("/prescriptions/{upload_id}/review")
async def review_prescription(
    upload_id: str,
    body: PrescriptionReviewRequest,
    current_user: dict = Depends(require_roles("pharmacist")),
):
    return await review_prescription_upload(
        upload_id=upload_id,
        pharmacist_id=current_user["id"],
        approved=body.approved,
        quantity_allowed=body.quantity_allowed,
        rejection_reason=body.rejection_reason,
    )


@router.get("/prescriptions/{upload_id}/file")
async def prescription_file(
    upload_id: str,
    current_user: dict = Depends(require_roles("pharmacist")),
):
    content, content_type, filename = await get_prescription_file(upload_id)
    return Response(
        content=bytes(content),
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.post("/review")
async def review_order(
    request: Request,
    body: PharmacistReviewRequest,
    current_user: dict = Depends(require_roles("pharmacist")),
):
    review = await get_review_by_thread_id(body.thread_id)

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Pending pharmacist review not found",
        )

    graph = request.app.state.pharmacy_graph

    config = {"configurable": {"thread_id": body.thread_id}}

    result = await graph.ainvoke(
        Command(
            resume={
                "approved": body.approved,
                "pharmacist_id": current_user["id"],
                "rejection_reason": body.rejection_reason,
            }
        ),
        config,
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
