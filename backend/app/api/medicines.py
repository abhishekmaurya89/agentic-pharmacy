from fastapi import APIRouter, Depends

from backend.app.core.auth import require_roles
from backend.app.models.medicine import MedicineCreate
from backend.app.services.inventory_service import (
    create_medicine,
    get_medicine,
    search_medicines,
)

router = APIRouter(prefix="/medicines", tags=["Medicines"])


@router.post("/")
async def add_medicine(
    medicine: MedicineCreate,
    current_user: dict = Depends(require_roles("pharmacist")),
):
    return await create_medicine(medicine.model_dump())


@router.get("/search")
async def search(name: str):
    return await search_medicines(name)


@router.get("/{medicine_id}")
async def get(medicine_id: str):
    return await get_medicine(medicine_id)
