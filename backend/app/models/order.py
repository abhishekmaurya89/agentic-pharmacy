from datetime import datetime

from pydantic import BaseModel, Field


class OrderItem(BaseModel):
    medicine_id: str
    quantity: int = Field(gt=0, le=100)


class OrderCreate(BaseModel):
    items: list[OrderItem] = Field(min_length=1)


class OrderResponse(BaseModel):
    id: str
    patient_id: str
    items: list[OrderItem]

    total_amount: float

    status: str
    created_at: datetime
