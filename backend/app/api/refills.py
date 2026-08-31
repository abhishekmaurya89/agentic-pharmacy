from fastapi import APIRouter, Depends

from backend.app.core.auth import get_current_user
from backend.app.services.refill_service import get_refill_predictions

router = APIRouter(
    prefix="/refills",
    tags=["Refills"],
)


@router.get("/predictions")
async def refill_predictions(
    current_user: dict = Depends(get_current_user),
):
    predictions = await get_refill_predictions(str(current_user["id"]))

    return {"predictions": predictions}
