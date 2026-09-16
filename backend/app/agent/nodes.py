from langgraph.types import interrupt

from backend.app.agent.llm import (
    extract_medication_request,
    llm,
)
from backend.app.agent.state import PharmacyState
from backend.app.services.interaction_service import check_drug_interactions
from backend.app.services.inventory_service import (
    check_inventory,
    search_medicines,
    search_medicines_by_keyword,
)
from backend.app.services.order_service import (
    create_pending_order,
    execute_order,
)
from backend.app.services.pharmacist_service import create_pharmacist_review
from backend.app.services.refill_service import get_last_order_quantity
from backend.app.services.risk_service import calculate_order_risk


async def check_interactions_node(state: PharmacyState) -> PharmacyState:
    result = await check_drug_interactions(
        patient_id=state["user_id"], medicine_id=state["medicine_id"]
    )
    reasons = list(state.get("risk_reasons", []))
    if result.get("interaction_found"):
        if "Potential drug interaction detected" not in reasons:
            reasons.append("Potential drug interaction detected")
        return {
            **state,
            "interaction_result": result,
            "risk_level": "high",
            "risk_reasons": reasons,
        }
    return {**state, "interaction_result": result, "risk_reasons": reasons}


async def assess_risk(state: PharmacyState) -> PharmacyState:
    result = calculate_order_risk(
        medicine=state["medicine"],
        quantity=state.get("quantity"),
        prescription_result=state.get("prescription_result") or {},
    )
    score = result["risk_score"]
    reasons = list(state.get("risk_reasons", []))
    for r in result.get("risk_reasons", []):
        if r not in reasons:
            reasons.append(r)
    level = result["risk_level"]
    if state.get("interaction_result", {}).get("interaction_found"):
        level = "high"
        score = max(score, 80)
    return {
        **state,
        "risk_level": level,
        "risk_score": score,
        "risk_reasons": reasons,
    }


async def pharmacist_review(state: PharmacyState) -> PharmacyState:
    medicine = state["medicine"]
    thread_id = state.get("thread_id", "")
    risk_level = state.get("risk_level", "high")
    risk_score = state.get("risk_score", 0)
    risk_reasons = state.get("risk_reasons", [])

    review_id = await create_pharmacist_review(
        thread_id=thread_id,
        patient_id=state["user_id"],
        medicine_id=state["medicine_id"],
        medicine=medicine,
        quantity=state["quantity"],
        risk_level=risk_level,
        risk_score=risk_score,
        risk_reasons=risk_reasons,
    )

    await create_pending_order(
        patient_id=state["user_id"],
        medicine_id=state["medicine_id"],
        medicine=medicine,
        quantity=state["quantity"],
        risk_level=risk_level,
        risk_reasons=risk_reasons,
        thread_id=thread_id,
    )

    reasons_text = ", ".join(risk_reasons) if risk_reasons else "Safety review required"
    hold_message = (
        f"This order for {medicine['name']} ({state['quantity']} units) requires pharmacist approval due to safety policies: {reasons_text}. "
        f"Your order has been placed on hold pending pharmacist review."
    )

    review = interrupt(
        {
            "type": "pharmacist_review",
            "message": hold_message,
            "review_id": review_id,
            "patient_id": state["user_id"],
            "medicine_id": state["medicine_id"],
            "medicine": medicine["name"],
            "strength": medicine.get("strength"),
            "quantity": state["quantity"],
            "risk_level": risk_level,
            "risk_score": risk_score,
            "risk_reasons": risk_reasons,
        }
    )

    approved = isinstance(review, dict) and review.get("approved") is True

    if not approved:
        rejection_reason = (
            review.get("rejection_reason")
            if isinstance(review, dict) and review.get("rejection_reason")
            else "Pharmacist rejected the order based on safety assessment."
        )
        return {
            **state,
            "pharmacist_approved": False,
            "rejection_reason": rejection_reason,
            "order_ready": False,
            "order_result": None,
            "response": f"Your order was rejected during pharmacist review: {rejection_reason}",
        }

    return {
        **state,
        "pharmacist_approved": True,
        "pharmacist_id": review.get("pharmacist_id") if isinstance(review, dict) else None,
        "response": (
            "Pharmacist approved the order. Processing your medication order."
        ),
    }


async def extract_intent(state: PharmacyState) -> PharmacyState:

    previous_medicine = state.get("medicine_name")
    previous_quantity = state.get("quantity")

    result = await extract_medication_request(
        state["user_message"],
        previous_medicine,
    )

    medicine_name = result.medicine_name or previous_medicine

    quantity = result.quantity if result.quantity is not None else previous_quantity

    return {
        **state,
        "intent": result.intent,
        "medicine_name": medicine_name,
        "quantity": quantity,
        "information_type": result.information_type,
        "clarification_needed": result.clarification_needed,
        "clarification_question": result.clarification_question,
    }


async def greeting_response(state: PharmacyState) -> PharmacyState:
    return {
        **state,
        "response": (
            "Hello! I can help you with medicine information, placing an order, or managing a refill."
        ),
    }


async def refill_request(state: PharmacyState) -> PharmacyState:
    medicine_name = state.get("medicine_name")

    if not medicine_name:
        return {
            **state,
            "response": "Which specific medicine would you like to refill? For example, you can say: refill my Losartan.",
            "order_ready": False,
        }

    medicines = await search_medicines(medicine_name)
    if not medicines:
        medicines = await search_medicines_by_keyword(medicine_name)

    if not medicines:
        return {
            **state,
            "response": f"I couldn't find a medicine matching '{medicine_name}'. Please specify the medicine name.",
            "order_ready": False,
        }

    if len(medicines) > 1:
        names = [f"{m['name']} {m.get('strength', '')}".strip() for m in medicines[:5]]
        return {
            **state,
            "response": "Please specify which medicine to refill: " + ", ".join(names),
            "order_ready": False,
        }

    medicine = medicines[0]
    quantity = await get_last_order_quantity(state["user_id"], medicine["id"])
    if not quantity:
        return {
            **state,
            "response": f"I found {medicine['name']}, but there is no previous confirmed order to determine the refill quantity. Please place a new order with the quantity.",
            "order_ready": False,
        }

    return {
        **state,
        "medicine_id": medicine["id"],
        "medicine": medicine,
        "quantity": quantity,
        "response": f"I found your previous {medicine['name']} refill quantity of {quantity}. I’ll validate availability and prescription eligibility now.",
    }


async def resolve_medicine(state: PharmacyState) -> PharmacyState:

    medicine_name = state.get("medicine_name")

    if not medicine_name:
        return {
            **state,
            "response": "Which medicine would you like?",
            "order_ready": False,
        }

    medicines = await search_medicines(medicine_name)

    if not medicines:
        medicines = await search_medicines_by_keyword(medicine_name)

    if not medicines:
        return {
            **state,
            "response": f"I couldn't find a medicine matching '{medicine_name}'.",
            "order_ready": False,
        }

    if len(medicines) > 1:
        names = [f"{m['name']} {m.get('strength', '')}".strip() for m in medicines[:5]]

        return {
            **state,
            "response": (
                "I found multiple medicines. "
                "Please specify which one: " + ", ".join(names)
            ),
            "order_ready": False,
        }

    medicine = medicines[0]

    return {**state, "medicine_id": medicine["id"], "medicine": medicine}


async def check_inventory_node(state: PharmacyState) -> PharmacyState:
    medicine_id = state.get("medicine_id")
    quantity = state.get("quantity")

    result = await check_inventory(
        medicine_id,
        quantity,
    )

    if not result.get("allowed"):
        reason = result.get("reason")
        if reason == "QUANTITY_REQUIRED":
            med_name = state.get("medicine_name") or "this medicine"
            resp = f"Please specify the quantity of {med_name} you would like to order."
        elif reason == "INVALID_QUANTITY":
            resp = "Please specify a valid quantity greater than zero."
        elif reason == "INSUFFICIENT_STOCK":
            avail = result.get("available", 0)
            resp = f"Insufficient stock available. Only {avail} units are currently in stock."
        else:
            resp = "Requested medication is currently unavailable in the requested quantity."
        return {
            **state,
            "inventory_result": result,
            "order_ready": False,
            "response": resp,
        }

    return {**state, "inventory_result": result}


from backend.app.services.prescription_service import check_prescription


async def check_prescription_node(state: PharmacyState) -> PharmacyState:
    result = await check_prescription(
        patient_id=state["user_id"],
        medicine_id=state["medicine_id"],
        quantity=state.get("quantity"),
    )

    if not result.get("allowed"):
        reason = result.get("reason", "")
        if reason == "PRESCRIPTION_REQUIRED":
            resp = "A valid active prescription is required to order this medicine, but none was found for your account."
        elif reason == "PRESCRIPTION_EXPIRED":
            resp = "Your prescription for this medicine has expired. Please consult your physician for renewal."
        elif reason == "PRESCRIPTION_QUANTITY_EXCEEDED":
            rem = result.get("remaining_quantity", 0)
            resp = f"The requested quantity exceeds your remaining prescription limit of {rem} units."
        else:
            resp = f"Prescription validation failed: {reason.replace('_', ' ').lower()}."
        return {
            **state,
            "prescription_result": result,
            "order_ready": False,
            "response": resp,
        }

    return {**state, "prescription_result": result}


async def prepare_order(state: PharmacyState) -> PharmacyState:

    medicine = state["medicine"]

    total = medicine["unit_price"] * state["quantity"]

    risk_level = state.get("risk_level", "low")

    return {
        **state,
        "order_ready": True,
        "confirmation_required": True,
        "approval_type": "patient",
        "confirmed": False,
        "response": (
            f"Order summary:\n\n"
            f"Medicine: {medicine['name']}\n"
            f"Strength: {medicine.get('strength', '')}\n"
            f"Quantity: {state['quantity']}\n"
            f"Total: ₹{total:.2f}\n"
            f"Risk level: {risk_level}\n\n"
            f"Would you like to confirm this order?"
        ),
    }


async def execute_order_node(state: PharmacyState) -> PharmacyState:
    result = await execute_order(
        patient_id=state["user_id"],
        medicine_id=state["medicine_id"],
        quantity=state["quantity"],
        thread_id=state.get("thread_id"),
    )

    return {
        **state,
        "order_result": result,
        "order_ready": False,
        "response": (
            f"Order confirmed successfully.\n\n"
            f"Order ID: {result['order_id']}\n"
            f"Medicine: {result['medicine_name']}\n"
            f"Quantity: {result['quantity']}\n"
            f"Total: ₹{result['total_amount']:.2f}"
        ),
    }


async def medicine_information(state: PharmacyState) -> PharmacyState:

    medicine_name = state.get("medicine_name")

    if not medicine_name:
        return {
            **state,
            "response": "Which medicine would you like information about?",
        }

    medicines = await search_medicines(medicine_name)

    if not medicines:
        return {
            **state,
            "response": f"I couldn't find information for {medicine_name}.",
        }

    medicine = medicines[0]

    information_type = state.get(
        "information_type",
        "general",
    )

    medicine_context = {
        "name": medicine.get("name"),
        "strength": medicine.get("strength"),
        "form": medicine.get("form"),
        "description": medicine.get("description"),
        "uses": medicine.get("uses"),
        "side_effects": medicine.get("side_effects"),
        "precautions": medicine.get("precautions"),
        "dosage": medicine.get("dosage"),
        "unit_price": medicine.get("unit_price"),
        "stock": medicine.get("stock"),
    }

    information_prompt = f"""
You are a pharmacy information assistant.

Medicine data from the pharmacy database:

{medicine_context}

Information requested:

{information_type}

Answer the user's question clearly and concisely.

Rules:

- Use the provided medicine data as the primary source.
- Do not invent medicine-specific facts.
- Do not provide personalized medical advice.
- Do not recommend a personalized dosage.
- Do not diagnose medical conditions.
- If the requested information is not available in the database, say so.
- Only mention price when the user asks about price.
- Only mention availability or stock when the user asks about availability.
- For general questions, explain what the medicine is and its general purpose when that information is available.
- Keep the answer patient-friendly.
"""

    response = await llm.ainvoke(
        [
            ("system", information_prompt),
            ("human", state["user_message"]),
        ]
    )

    content = response.content

    if isinstance(content, str):
        answer = content

    elif isinstance(content, list):
        parts = []

        for item in content:
            if isinstance(item, str):
                parts.append(item)

            elif isinstance(item, dict):
                text = item.get("text")

                if text:
                    parts.append(str(text))

        answer = "".join(parts)

    elif isinstance(content, dict):
        answer = str(content.get("text", content))

    else:
        answer = str(content)

    return {
        **state,
        "response": answer,
    }


async def unknown_request(state: PharmacyState) -> PharmacyState:

    return {
        **state,
        "response": (
            "I'm sorry, I couldn't understand your request. "
            "You can ask me to order or refill a medicine."
        ),
    }


def route_inventory(state: PharmacyState):

    result = state.get("inventory_result")

    if not result or not result.get("allowed"):
        return "reject"

    return "continue"


def route_prescription(state: PharmacyState):

    result = state.get("prescription_result")

    if not result or not result.get("allowed"):
        return "reject"

    return "continue"


async def reject_order(state: PharmacyState) -> PharmacyState:

    return {**state, "order_ready": False}


async def human_approval(state: PharmacyState) -> PharmacyState:

    medicine = state["medicine"]
    quantity = state["quantity"]

    total = medicine["unit_price"] * quantity

    approval = interrupt(
        {
            "type": "order_confirmation",
            "message": "Please confirm your order.",
            "medicine": medicine["name"],
            "strength": medicine.get("strength"),
            "quantity": quantity,
            "total_amount": total,
        }
    )

    confirmed = isinstance(approval, dict) and approval.get("confirmed") is True

    if not confirmed:
        return {
            **state,
            "confirmed": False,
            "order_ready": False,
            "order_result": None,
            "response": (
                "Order cancelled. "
                "No medication was ordered and "
                "your inventory was not changed."
            ),
        }

    return {**state, "confirmed": True}
