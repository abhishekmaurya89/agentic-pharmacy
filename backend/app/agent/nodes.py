from langgraph.types import interrupt

from backend.app.agent.llm import (
    extract_medication_request,
    llm,
)
from backend.app.agent.state import PharmacyState
from backend.app.services.interaction_service import check_drug_interactions
from backend.app.services.inventory_service import check_inventory, search_medicines
from backend.app.services.order_service import (
    create_pending_order,
    execute_order,
    update_pending_order_status,
)
from backend.app.services.pharmacist_service import create_pharmacist_review
from backend.app.services.risk_service import calculate_order_risk


async def check_interactions_node(state: PharmacyState) -> PharmacyState:

    result = await check_drug_interactions(
        patient_id=state["user_id"], medicine_id=state["medicine_id"]
    )

    if result["interaction_found"]:
        return {
            **state,
            "interaction_result": result,
            "risk_level": "high",
            "risk_reasons": [
                *state.get("risk_reasons", []),
                "Potential drug interaction detected",
            ],
            "response": (
                "A potential medication interaction was detected. "
                "This order requires pharmacist review."
            ),
        }

    return {**state, "interaction_result": result}


async def assess_risk(state: PharmacyState) -> PharmacyState:

    result = calculate_order_risk(
        medicine=state["medicine"],
        quantity=state["quantity"],
        prescription_result=state["prescription_result"],
    )

    return {
        **state,
        "risk_level": result["risk_level"],
        "risk_score": result["risk_score"],
        "risk_reasons": result["risk_reasons"],
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

    # Create pending order in orders collection
    await create_pending_order(
        patient_id=state["user_id"],
        medicine_id=state["medicine_id"],
        medicine=medicine,
        quantity=state["quantity"],
        risk_level=risk_level,
        risk_reasons=risk_reasons,
        thread_id=thread_id,
    )

    # Pause LangGraph

    review = interrupt(
        {
            "type": "pharmacist_review",
            "message": ("This order requires pharmacist approval."),
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

    # Resumed by pharmacist

    approved = isinstance(review, dict) and review.get("approved") is True

    if not approved:
        return {
            **state,
            "pharmacist_approved": False,
            "order_ready": False,
            "order_result": None,
            "response": ("Your order was rejected during pharmacist review."),
        }

    return {
        **state,
        "pharmacist_approved": True,
        "pharmacist_id": review.get("pharmacist_id"),
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
            "response": "Which medicine would you like to refill?",
            "order_ready": False,
        }

    return {
        **state,
        "response": (
            f"I can help with a refill for {medicine_name}. "
            "I’ll check your prescription and refill eligibility next."
        ),
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
            "response": "Which medicine would you like to refill?",
            "order_ready": False,
        }

    return {
        **state,
        "response": (
            f"I can help with a refill for {medicine_name}. "
            "I’ll check your prescription and refill eligibility next."
        ),
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


async def check_inventory_node(state):
    print("CHECK INVENTORY STATE:", state)

    medicine_id = state.get("medicine_id")

    quantity = state.get("quantity")

    print("MEDICINE ID:", medicine_id)

    print("QUANTITY:", quantity)

    result = await check_inventory(
        medicine_id,
        quantity,
    )

    return {"inventory_result": result}


from backend.app.services.prescription_service import check_prescription


async def check_prescription_node(state: PharmacyState) -> PharmacyState:

    result = await check_prescription(
        patient_id=state["user_id"],
        medicine_id=state["medicine_id"],
        quantity=state["quantity"],
    )

    if not result["allowed"]:
        return {
            **state,
            "prescription_result": result,
            "order_ready": False,
            "response": (
                "I can't complete this order because "
                f"{result['reason'].replace('_', ' ').lower()}."
            ),
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
    )

    return {
        **state,
        "order_result": result,
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

