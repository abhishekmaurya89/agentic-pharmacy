from datetime import datetime

from pydantic import BaseModel, Field


class OrderItem(BaseModel):
    medicine_id: str
    medicine_name: str | None = None
    strength: str | None = None
    quantity: int = Field(gt=0)
    unit_price: float


class OrderCreate(BaseModel):
    items: list[OrderItem] = Field(min_length=1)


class OrderResponse(BaseModel):
    id: str
    patient_id: str
    items: list[OrderItem]
    total_amount: float
    status: str
    created_at: datetime