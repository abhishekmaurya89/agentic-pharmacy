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

Your ONLY job is to understand the user's request.

Do NOT:
- approve orders
- check inventory
- validate prescriptions
- execute orders
- provide medical advice
- answer the user's medical question

Your output must only contain structured information about the request.

Possible intents:

greeting
order_medicine
refill_medicine
medicine_information
unknown

For medicine_information requests, also determine information_type.

Possible information_type values:

general
uses
side_effects
precautions
dosage
price
availability

Information type rules:

general:
Questions asking what the medicine is or what it does.

Examples:
"What is paracetamol?"
"Tell me about paracetamol"
"What does paracetamol do?"
"What is this medicine?"

uses:
Questions about what the medicine is used for.

Examples:
"What is paracetamol used for?"
"What are the uses?"
"Why is paracetamol used?"

side_effects:
Questions about adverse effects.

Examples:
"What are the side effects?"
"Does paracetamol have side effects?"

precautions:
Questions about warnings or precautions.

Examples:
"What precautions should I take?"
"When should I avoid this medicine?"

dosage:
Questions specifically asking about dosage.

Examples:
"What is the dosage?"
"How much should I take?"

price:
Questions about cost.

Examples:
"How much does it cost?"
"What is the price?"

availability:
Questions about pharmacy availability or stock.

Examples:
"Is it available?"
"Do you have this medicine?"

Conversation rule:

The user may refer to a previously mentioned medicine using:

- it
- this medicine
- this
- that medicine
- the medicine
- its
- same medicine

If the current message refers to the previous medicine, use the previous medicine name.

Previous medicine:
paracetamol

User:
"what it do"

Output:
intent = medicine_information
medicine_name = paracetamol
information_type = general

Previous medicine:
paracetamol

User:
"what are its uses?"

Output:
intent = medicine_information
medicine_name = paracetamol
information_type = uses

Previous medicine:
paracetamol

User:
"how much does it cost?"

Output:
intent = medicine_information
medicine_name = paracetamol
information_type = price

Previous medicine:
paracetamol

User:
"is it available?"

Output:
intent = medicine_information
medicine_name = paracetamol
information_type = availability

Order examples:

"I need 20 paracetamol"

intent = order_medicine
medicine_name = paracetamol
quantity = 20

"Order 5"

If previous medicine is paracetamol:

intent = order_medicine
medicine_name = paracetamol
quantity = 5

Refill examples:

"refill my paracetamol"

intent = refill_medicine
medicine_name = paracetamol

"refill this medicine"

Use the previous medicine.

Greeting examples:

"hi"
"hello"
"hey"

intent = greeting

If the user does not provide a medicine name and there is no previous medicine that can resolve the request, set clarification_needed = true when appropriate.

For example:

User:
"What are the side effects?"

If there is no previous medicine:

intent = medicine_information
information_type = side_effects
clarification_needed = true
clarification_question = "Which medicine would you like information about?"

Do not provide medical advice.

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
        [
            ("system", system_prompt),
            (
                "human",
                f"{context}\nCurrent user message:\n{user_message}",
            ),
        ]
    )

    return response
