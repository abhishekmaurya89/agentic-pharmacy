from datetime import datetime

from pydantic import BaseModel, Field


class PrescriptionCreate(BaseModel):
    patient_id: str
    medicine_id: str

    quantity_allowed: int = Field(gt=0)
    remaining_quantity: int = Field(ge=0)

    valid_until: datetime

    status: str = "active"


class PrescriptionResponse(BaseModel):
    id: str
    patient_id: str
    medicine_id: str

    quantity_allowed: int
    remaining_quantity: int

    valid_until: datetime
    status: str