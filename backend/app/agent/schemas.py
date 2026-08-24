from typing import Literal

from pydantic import BaseModel, Field


class MedicationRequest(BaseModel):
    intent: Literal[
        "order_medicine",
        "refill_medicine",
        "medicine_information",
        "unknown"
    ]

    medicine_name: str | None = None

    quantity: int | None = Field(
        default=None,
        gt=0,
        le=100
    )

    clarification_needed: bool = False

    clarification_question: str | None = None