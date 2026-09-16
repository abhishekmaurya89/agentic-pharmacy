from bson import ObjectId

from backend.app.db.mongodb import db


async def check_drug_interactions(patient_id: str, medicine_id: str):
    patient_query = (
        {"$in": [patient_id, ObjectId(patient_id)]}
        if ObjectId.is_valid(patient_id)
        else patient_id
    )

    active_medicines = await db.patient_medications.find(
        {"patient_id": patient_query, "active": True}
    ).to_list(length=100)

    if not active_medicines:
        return {"allowed": True, "interaction_found": False, "interactions": []}

    current_medicine_ids = []
    for medication in active_medicines:
        med_id = medication.get("medicine_id")
        if med_id:
            current_medicine_ids.append(str(med_id))
            if ObjectId.is_valid(str(med_id)):
                current_medicine_ids.append(ObjectId(str(med_id)))

    med_query_ids = [medicine_id]
    if ObjectId.is_valid(medicine_id):
        med_query_ids.append(ObjectId(medicine_id))

    interactions = await db.drug_interactions.find(
        {
            "$or": [
                {
                    "medicine_a": {"$in": med_query_ids},
                    "medicine_b": {"$in": current_medicine_ids},
                },
                {
                    "medicine_b": {"$in": med_query_ids},
                    "medicine_a": {"$in": current_medicine_ids},
                },
            ]
        }
    ).to_list(length=100)

    if interactions:
        return {
            "allowed": False,
            "interaction_found": True,
            "interactions": interactions,
        }

    return {"allowed": True, "interaction_found": False, "interactions": []}
