from typing import TypedDict, Any


class PharmacyState(TypedDict, total=False):

    # User / conversation
    user_message: str
    user_id: str

    # Intent
    intent: str
    medicine_name: str | None
    quantity: int | None

    clarification_needed: bool
    clarification_question: str | None

    # Medicine
    medicine_id: str | None
    medicine: dict[str, Any] | None

    # Safety checks
    inventory_result: dict[str, Any] | None
    prescription_result: dict[str, Any] | None

    # Order
    order_ready: bool
    confirmation_required: bool
    confirmed: bool

    # Result
    order_result: dict[str, Any] | None

    # Response
    response: str