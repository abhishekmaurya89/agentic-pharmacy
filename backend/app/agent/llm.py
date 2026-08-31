from langchain_google_genai import ChatGoogleGenerativeAI

from backend.app.agent.schemas import MedicationRequest
from backend.app.config import settings

llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite", google_api_key=settings.gemini_api_key, temperature=0
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


async def extract_medication_request(user_message: str) -> MedicationRequest:

    system_prompt = """
You are the intent extraction component of a pharmacy AI system.

Your ONLY job is to understand the user's request and classify its intent.

Do NOT:
- approve orders
- check inventory
- validate prescriptions
- execute orders
- provide medical advice

Extract:
- intent
- medicine name
- quantity
- clarification status

Possible intents:

greeting
inquiry
order
refill
unknown

Use the following rules:

1. greeting
Use for simple greetings or conversational openings.

Examples:
"hi"
"hello"
"hey"
"good morning"

2. order
Use when the user wants to purchase or order a medicine.

Examples:
"I need 20 paracetamol tablets"
"Order 5 paracetamol"
"Can I buy 10 ibuprofen?"

3. refill
Use when the user wants to refill a previously ordered or existing medicine.

Examples:
"Can you refill my usual medicine?"
"I want a refill"
"Refill my paracetamol"

4. inquiry
Use when the user is asking about a medicine, its uses, price, availability, dosage, side effects, strength, or other medicine-related information WITHOUT directly requesting an order.

Examples:
"What is paracetamol used for?"
"What are the side effects of ibuprofen?"
"How much does paracetamol cost?"
"Do you have paracetamol?"
"What is paracetamol 500mg?"

5. unknown
Use when the request is unrelated to greetings, medicine information, ordering medicine, or refilling medicine.

Examples:
"What's the weather today?"
"Tell me a joke"
"Who is the president?"

Medicine extraction:

If the user mentions a medicine, extract its name into medicine_name.

If the user specifies a quantity for an order, extract it into quantity.

For greetings:
- intent = greeting
- medicine_name = null
- quantity = null

For medicine information:
- extract medicine_name if present
- do not treat the question as an order

For refill requests:
- extract medicine_name if the user explicitly mentions one
- quantity may be null if the user does not specify one

If the request is ambiguous or required information is missing for the intended action, set:
clarification_needed = true

If clarification is needed, provide a short clarification_question.

Safety validation happens outside the LLM.
"""

    response = await structured_llm.ainvoke(
        [
            ("system", system_prompt),
            ("human", user_message),
        ]
    )

    normalized = response.model_copy(update={"intent": normalize_intent(response.intent)})
    return normalized
