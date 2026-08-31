from langchain_google_genai import ChatGoogleGenerativeAI

from backend.app.agent.schemas import MedicationRequest
from backend.app.config import settings


llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    google_api_key=settings.gemini_api_key,
    temperature=0,
)

structured_llm = llm.with_structured_output(MedicationRequest)


def normalize_intent(raw_intent: str | None) -> str:
    if raw_intent is None:
        return "unknown"

    value = str(raw_intent).strip().lower().replace(" ", "_")

    aliases = {
        "greeting": "greeting",
        "hi": "greeting",
        "hello": "greeting",
        "hey": "greeting",
        "inquiry": "inquiry",
        "information": "inquiry",
        "medicine_information": "inquiry",
        "question": "inquiry",
        "order": "order",
        "order_medicine": "order",
        "buy": "order",
        "purchase": "order",
        "refill": "refill",
        "refill_medicine": "refill",
        "unknown": "unknown",
    }

    if value in aliases:
        return aliases[value]

    if any(token in value for token in ["hello", "hi", "hey", "good_morning", "good_evening"]):
        return "greeting"

    if any(token in value for token in ["what_is", "what_are", "used_for", "info", "information", "side_effect", "benefit", "price", "dose", "dosage"]):
        return "inquiry"

    if "refill" in value:
        return "refill"

    if any(token in value for token in ["order", "buy", "purchase", "need", "get", "prescribe"]):
        return "order"

    return "unknown"


def normalize_intent(raw_intent: str | None) -> str:
    if raw_intent is None:
        return "unknown"

    value = str(raw_intent).strip().lower().replace(" ", "_")

    aliases = {
        "greeting": "greeting",
        "hi": "greeting",
        "hello": "greeting",
        "hey": "greeting",
        "order": "order_medicine",
        "order_medicine": "order_medicine",
        "buy": "order_medicine",
        "purchase": "order_medicine",
        "refill": "refill_medicine",
        "refill_medicine": "refill_medicine",
        "inquiry": "medicine_information",
        "information": "medicine_information",
        "medicine_information": "medicine_information",
        "question": "medicine_information",
        "unknown": "unknown",
    }

    if value in aliases:
        return aliases[value]

    if any(
        token in value
        for token in [
            "hello",
            "hi",
            "hey",
            "good_morning",
            "good_evening",
        ]
    ):
        return "greeting"

    if any(
        token in value
        for token in [
            "what_is",
            "what_are",
            "what_does",
            "what_do",
            "used_for",
            "info",
            "information",
            "side_effect",
            "benefit",
            "price",
            "cost",
            "dose",
            "dosage",
            "purpose",
            "available",
        ]
    ):
        return "medicine_information"

    if "refill" in value:
        return "refill_medicine"

    if any(
        token in value
        for token in [
            "order",
            "buy",
            "purchase",
            "need",
            "get",
        ]
    ):
        return "order_medicine"

    return "unknown"


async def extract_medication_request(
    user_message: str,
    previous_medicine_name: str | None = None,
) -> MedicationRequest:

    system_prompt = """
You are the intent extraction component of a pharmacy AI system.

Your ONLY job is to understand the user's request and classify its intent.

Do NOT:
- approve orders
- check inventory
- validate prescriptions
- execute orders
- provide medical advice
- answer the user's medical question

Extract:
- intent
- medicine name
- quantity

Possible intents:

order_medicine
refill_medicine
medicine_information
unknown

If the request is ambiguous, set:
clarification_needed = true.

Examples:

User:
"I need 20 paracetamol tablets"

Intent:
order_medicine

Medicine:
paracetamol

Quantity:
20

User:
"Can you refill my usual medicine?"

Intent:
refill_medicine

User:
"What is paracetamol used for?"

Intent:
medicine_information

Remember:
Safety validation happens outside the LLM.
"""

    context = ""

    if previous_medicine_name:
        context = f"""
Previous medicine mentioned by the user:
{previous_medicine_name}

Use this medicine when the current message refers to:
"it", "this medicine", "that medicine", "its", "same medicine", etc.
"""

    response = await structured_llm.ainvoke(
        [("system", system_prompt), ("human", user_message)]
    )

    normalized = response.model_copy(update={"intent": normalize_intent(response.intent)})
    return normalized
