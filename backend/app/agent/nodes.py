from backend.app.agent.state import PharmacyState
from backend.app.agent.llm import extract_medication_request
from langgraph.types import interrupt

async def extract_intent(
    state: PharmacyState
) -> PharmacyState:

    result = await extract_medication_request(
        state["user_message"]
    )

    return {
        **state,
        "intent": result.intent,
        "medicine_name": result.medicine_name,
        "quantity": result.quantity,
        "clarification_needed": result.clarification_needed,
        "clarification_question": result.clarification_question
    }
from backend.app.services.inventory_service import search_medicines


async def resolve_medicine(
    state: PharmacyState
) -> PharmacyState:

    medicine_name = state.get("medicine_name")

    if not medicine_name:

        return {
            **state,
            "response": "Which medicine would you like?",
            "order_ready": False
        }

    medicines = await search_medicines(
        medicine_name
    )

    if not medicines:

        return {
            **state,
            "response": f"I couldn't find a medicine matching '{medicine_name}'.",
            "order_ready": False
        }

    if len(medicines) > 1:

        names = [
            f"{m['name']} {m.get('strength', '')}".strip()
            for m in medicines[:5]
        ]

        return {
            **state,
            "response": (
                "I found multiple medicines. "
                "Please specify which one: "
                + ", ".join(names)
            ),
            "order_ready": False
        }

    medicine = medicines[0]

    return {
        **state,
        "medicine_id": medicine["id"],
        "medicine": medicine
    }
from backend.app.services.inventory_service import check_inventory


async def check_inventory_node(
    state: PharmacyState
) -> PharmacyState:

    result = await check_inventory(
        state["medicine_id"],
        state["quantity"]
    )

    if not result["allowed"]:

        return {
            **state,
            "inventory_result": result,
            "order_ready": False,
            "response": (
                f"Sorry, there isn't enough stock. "
                f"Available: {result.get('available', 0)}, "
                f"requested: {result.get('requested', 0)}."
            )
        }

    return {
        **state,
        "inventory_result": result
    }

from backend.app.services.prescription_service import (
    check_prescription
)


async def check_prescription_node(
    state: PharmacyState
) -> PharmacyState:

    result = await check_prescription(
        patient_id=state["user_id"],
        medicine_id=state["medicine_id"],
        quantity=state["quantity"]
    )

    if not result["allowed"]:

        return {
            **state,
            "prescription_result": result,
            "order_ready": False,
            "response": (
                "I can't complete this order because "
                f"{result['reason'].replace('_', ' ').lower()}."
            )
        }

    return {
        **state,
        "prescription_result": result
    }
async def prepare_order(
    state: PharmacyState
) -> PharmacyState:

    medicine = state["medicine"]

    total = (
        medicine["unit_price"] *
        state["quantity"]
    )

    return {
        **state,
        "order_ready": True,
        "confirmation_required": True,
        "confirmed": False,
        "response": (
            f"Order summary:\n\n"
            f"Medicine: {medicine['name']}\n"
            f"Strength: {medicine.get('strength', '')}\n"
            f"Quantity: {state['quantity']}\n"
            f"Total: ₹{total:.2f}\n\n"
            f"Would you like to confirm this order?"
        )
    }
from backend.app.services.order_service import execute_order


async def execute_order_node(
    state: PharmacyState
) -> PharmacyState:

    result = await execute_order(
        patient_id=state["user_id"],
        medicine_id=state["medicine_id"],
        quantity=state["quantity"]
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
        )
    }
async def medicine_information(
    state: PharmacyState
) -> PharmacyState:

    medicine_name = state.get("medicine_name")

    if not medicine_name:
        return {
            **state,
            "response": "Which medicine would you like information about?"
        }

    medicines = await search_medicines(
        medicine_name
    )

    if not medicines:
        return {
            **state,
            "response": (
                f"I couldn't find information for "
                f"{medicine_name}."
            )
        }

    medicine = medicines[0]

    return {
        **state,
        "response": (
            f"{medicine['name']} "
            f"{medicine.get('strength', '')} "
            f"is available in our pharmacy."
        )
    }
async def unknown_request(
    state: PharmacyState
) -> PharmacyState:

    return {
        **state,
        "response": (
            "I'm sorry, I couldn't understand your request. "
            "You can ask me to order or refill a medicine."
        )
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

async def reject_order(
    state: PharmacyState
) -> PharmacyState:

    return {
        **state,
        "order_ready": False
    }



async def human_approval(
    state: PharmacyState
) -> PharmacyState:

    medicine = state["medicine"]
    quantity = state["quantity"]

    total = medicine["unit_price"] * quantity

    approval = interrupt({
        "type": "order_confirmation",
        "message": "Please confirm your order.",
        "medicine": medicine["name"],
        "strength": medicine.get("strength"),
        "quantity": quantity,
        "total_amount": total
    })

    confirmed = (
        isinstance(approval, dict)
        and approval.get("confirmed") is True
    )

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
            )
        }

    return {
        **state,
        "confirmed": True
    }