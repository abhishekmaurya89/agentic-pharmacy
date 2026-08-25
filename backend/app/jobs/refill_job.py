from backend.app.db.mongodb import db
from backend.app.services.refill_service import (
    generate_refill_alert
)


async def run_refill_predictions():

    patients = await db.users.find({
        "role": "patient"
    }).to_list(length=1000)

    for patient in patients:

        medications = await db.patient_medications.find({
            "patient_id": str(patient["_id"]),
            "active": True
        }).to_list(length=100)

        for medication in medications:

            await generate_refill_alert(
                patient_id=str(patient["_id"]),
                medicine_id=medication["medicine_id"]
            )
            