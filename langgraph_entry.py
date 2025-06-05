# langgraph_entry.py
from backend.graph import Graph

graph = Graph().compile()

graph_workflow =  graph.get_graph().draw_mermaid_png()

with open("graph_workflow.png", "wb") as f:
    f.write(graph_workflow)