from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, UploadFile

from backend.app.core.auth import require_roles
from backend.app.services.prescription_upload_service import upload_prescription

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


@router.post("/upload")
async def upload(
    medicine_name: str = Form(...),
    valid_until: datetime = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles("patient")),
):
    return await upload_prescription(
        patient_id=current_user["id"],
        medicine_name=medicine_name,
        valid_until=valid_until,
        file=file,
    )
