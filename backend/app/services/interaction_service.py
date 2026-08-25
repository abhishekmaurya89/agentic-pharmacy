from backend.app.db.mongodb import db


async def check_drug_interactions(
    patient_id: str,
    medicine_id: str
):
    """
    Deterministic drug interaction check.

    Checks the requested medicine against
    the patient's currently active medications.
    """

    active_medicines = await db.patient_medications.find({
        "patient_id": patient_id,
        "active": True
    }).to_list(length=100)

    if not active_medicines:
        return {
            "allowed": True,
            "interaction_found": False,
            "interactions": []
        }

    current_medicine_ids = [
        medication["medicine_id"]
        for medication in active_medicines
    ]

    interactions = await db.drug_interactions.find({
        "$or": [
            {
                "medicine_a": medicine_id,
                "medicine_b": {
                    "$in": current_medicine_ids
                }
            },
            {
                "medicine_b": medicine_id,
                "medicine_a": {
                    "$in": current_medicine_ids
                }
            }
        ]
    }).to_list(length=100)

    if interactions:
        return {
            "allowed": False,
            "interaction_found": True,
            "interactions": interactions
        }

    return {
        "allowed": True,
        "interaction_found": False,
        "interactions": []
    }
