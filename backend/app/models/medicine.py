from pydantic import BaseModel, Field


class MedicineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    strength: str | None = None
    form: str | None = None

    stock: int = Field(ge=0)

    prescription_required: bool = False

    unit_price: float = Field(ge=0)


class MedicineResponse(BaseModel):
    id: str
    name: str
    strength: str | None
    form: str | None

    stock: int
    prescription_required: bool

    unit_price: float
