from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from backend.app.agent.state import PharmacyState


checkpointer_context = AsyncSqliteSaver.from_conn_string(
    "langgraph_checkpoints.sqlite"
)

from backend.app.agent.nodes import (
    extract_intent,
    resolve_medicine,
    check_inventory_node,
    check_prescription_node,
    assess_risk,
    prepare_order,
    human_approval,
    pharmacist_review,
    execute_order_node,
    medicine_information,
    unknown_request,
    reject_order,
)

def route_risk(state: PharmacyState):

    risk = state.get("risk_level")

    if risk == "high":
        return "pharmacist"

    return "patient"

def route_intent(state: PharmacyState):

    intent = state.get("intent")

    if intent == "order_medicine":
        return "order"

    if intent == "medicine_information":
        return "information"

    return "unknown"

def route_pharmacist(state: PharmacyState):

    if state.get("pharmacist_approved") is True:
        return "execute"

    return "reject"

def route_medicine(state: PharmacyState):

    if not state.get("medicine_id"):
        return "reject"

    return "continue"


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

def route_approval(state: PharmacyState):

    if state.get("confirmed") is True:
        return "execute"

    return "cancel"

def build_pharmacy_graph():

    graph = StateGraph(PharmacyState)

    graph.add_node(
        "extract_intent",
        extract_intent
    )

    graph.add_node(
        "resolve_medicine",
        resolve_medicine
    )

    graph.add_node(
        "check_inventory",
        check_inventory_node
    )

    graph.add_node(
        "check_prescription",
        check_prescription_node
    )

    graph.add_node(
        "prepare_order",
        prepare_order
    )

    graph.add_node(
        "human_approval",
        human_approval
    )

    graph.add_node(
        "execute_order",
        execute_order_node
    )

    graph.add_node(
        "medicine_information",
        medicine_information
    )

    graph.add_node(
        "unknown_request",
        unknown_request
    )
    
    graph.add_node(
        "reject_order",
        reject_order
    )

    graph.add_node(
        "assess_risk",
        assess_risk
    )
    graph.add_node(
        "pharmacist_review",
        pharmacist_review
    )
    # START
    graph.add_edge(
        START,
        "extract_intent"
    )

    # Intent
    graph.add_conditional_edges(
        "extract_intent",
        route_intent,
        {
            "order": "resolve_medicine",
            "information": "medicine_information",
            "unknown": "unknown_request"
        }
    )

    # Medicine
    graph.add_conditional_edges(
        "resolve_medicine",
        route_medicine,
        {
            "continue": "check_inventory",
            "reject": "reject_order"
        }
    )

    # Inventory
    graph.add_conditional_edges(
        "check_inventory",
        route_inventory,
        {
            "continue": "check_prescription",
            "reject": "reject_order"
        }
    )

    # Prescription
    graph.add_edge(
    "check_prescription",
    "assess_risk"
    )
    graph.add_conditional_edges(
    "assess_risk",
    route_risk,
    {
        "patient": "prepare_order",
        "pharmacist": "pharmacist_review"
    }
    )
    # Prepare
    graph.add_edge(
        "prepare_order",
        "human_approval"
    )

    # Approval
    graph.add_conditional_edges(
        "human_approval",
        route_approval,
        {
            "execute": "execute_order",
            "cancel": END
        }
    )

    # Execution
    graph.add_edge(
        "execute_order",
        END
    )

    # Other terminal paths
    graph.add_edge(
        "medicine_information",
        END
    )

    graph.add_edge(
        "unknown_request",
        END
    )
    graph.add_conditional_edges(
            "pharmacist_review",
            route_pharmacist,
            {
                "execute": "execute_order",
                "reject": END
            }
        )
    
    graph.add_edge(
        "reject_order",
        END
    )

    return graph

