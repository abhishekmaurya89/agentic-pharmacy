from typing import TypedDict, Any


class PharmacyState(TypedDict, total=False):

    # Conversation
    user_message: str
    user_id: str

    # Extracted intent
    intent: str
    medicine_name: str | None
    quantity: int | None

    clarification_needed: bool
    clarification_question: str | None

    # Resolved medicine
    medicine_id: str | None
    medicine: dict[str, Any] | None

    # Safety checks
    inventory_result: dict[str, Any] | None
    prescription_result: dict[str, Any] | None

    # Order
    order_ready: bool
    confirmation_required: bool
    confirmed: bool

    order_result: dict[str, Any] | None

    # Final response
    response: str