from langgraph.graph import StateGraph, START, END

from backend.app.agent.state import PharmacyState
from backend.app.agent.nodes import (
    extract_intent,
    resolve_medicine,
    check_inventory_node,
    check_prescription_node,
    prepare_order,
    execute_order_node
)


def build_pharmacy_graph():

    graph = StateGraph(PharmacyState)

    # Nodes
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
        "execute_order",
        execute_order_node
    )

    # Flow
    graph.add_edge(
        START,
        "extract_intent"
    )

    graph.add_edge(
        "extract_intent",
        "resolve_medicine"
    )

    graph.add_edge(
        "resolve_medicine",
        "check_inventory"
    )

    graph.add_edge(
        "check_inventory",
        "check_prescription"
    )

    graph.add_edge(
        "check_prescription",
        "prepare_order"
    )

    graph.add_edge(
        "prepare_order",
        END
    )

    return graph.compile()


pharmacy_graph = build_pharmacy_graph()