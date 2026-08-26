from typing import Any, TypedDict


class PharmacyState(TypedDict, total=False):

    user_message: str
    user_id: str
    thread_id: str

    intent: str
    medicine_name: str | None
    quantity: int | None

    clarification_needed: bool
    clarification_question: str | None

    medicine_id: str | None
    medicine: dict[str, Any] | None

    inventory_result: dict[str, Any] | None
    prescription_result: dict[str, Any] | None

    # Risk
    risk_level: str | None
    risk_score: int
    risk_reasons: list[str]

   # Approval
    confirmation_required: bool
    approval_type: str | None
    confirmed: bool
    pharmacist_id: str | None
    pharmacist_approved: bool
    rejection_reason: str | None
    
    order_ready: bool

    order_result: dict[str, Any] | None

    response: str