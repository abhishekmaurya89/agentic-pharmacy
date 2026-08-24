from langchain_google_genai import ChatGoogleGenerativeAI

from backend.app.config import settings
from backend.app.agent.schemas import MedicationRequest


llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    google_api_key=settings.gemini_api_key,
    temperature=0
)


structured_llm = llm.with_structured_output(
    MedicationRequest
)


async def extract_medication_request(
    user_message: str
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


    response = await structured_llm.ainvoke([
        ("system", system_prompt),
        ("human", user_message)
    ])

    return response