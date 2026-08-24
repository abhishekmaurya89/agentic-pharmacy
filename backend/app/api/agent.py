from fastapi import APIRouter

from backend.app.agent.llm import (
    extract_medication_request
)


router = APIRouter(
    prefix="/agent",
    tags=["Agent"]
)


@router.post("/extract")
async def extract(
    message: str
):
    result = await extract_medication_request(
        message
    )

    return result.model_dump()