def calculate_order_risk(
    medicine: dict,
    quantity: int,
    prescription_result: dict
):
    score = 0
    reasons = []

    if medicine.get("prescription_required"):
        score += 30
        reasons.append(
            "Prescription medicine"
        )

    if quantity >= 50:
        score += 30
        reasons.append(
            "Large requested quantity"
        )

    elif quantity >= 30:
        score += 15
        reasons.append(
            "Above-normal requested quantity"
        )

    remaining = prescription_result.get(
        "remaining_quantity"
    )

    if remaining is not None:

        if quantity >= remaining * 0.75:
            score += 20
            reasons.append(
                "Large portion of prescription remaining quantity requested"
            )


    if score >= 50:
        risk_level = "high"

    elif score >= 20:
        risk_level = "medium"

    else:
        risk_level = "low"

    return {
        "risk_level": risk_level,
        "risk_score": score,
        "risk_reasons": reasons
    }
