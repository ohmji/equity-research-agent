import logging
from typing import Any, Dict

from langchain_core.messages import AIMessage

from ...classes import ResearchState
from .base import BaseResearcher

logger = logging.getLogger(__name__)


class FundamentalAnalyst(BaseResearcher):
    """
    Analyst agent that performs qualitative, business‑centric fundamental research.
    It focuses on questions investors usually ask before committing capital,
    such as the company’s business model, competitive advantage, management
    quality, industry dynamics, and key risks.
    """

    def __init__(self) -> None:
        super().__init__()
        self.analyst_type = "fundamental_analyzer"

    async def analyze(self, state: ResearchState) -> Dict[str, Any]:
        """Run fundamental analysis and store results inside the shared state."""
        company = state.get("company", "Unknown Company")

        websocket_manager = state.get("websocket_manager")
        job_id = state.get("job_id")

        # ------------------------------------------------------------------ #
        # 1) Create focused search queries using an LLM prompt
        # ------------------------------------------------------------------ #
        queries = await self.generate_queries(
            state,
            """
            Generate queries for a qualitative fundamental analysis of {company} in the {industry} industry. Focus on:
            - Business model and key revenue sources
            - Competitive advantages and market position
            - Management background and governance
            - Market size and industry growth trends
            - Strategic plans and capital allocation
            - Key risks and ESG issues
            """,
        )

        subqueries_msg = (
            "🔍 Subqueries for fundamental analysis:\n"
            + "\n".join([f"• {q}" for q in queries])
        )
        messages = state.get("messages", [])
        messages.append(AIMessage(content=subqueries_msg))
        state["messages"] = messages

        # Proactively notify the front‑end over WebSocket
        if websocket_manager and job_id:
            await websocket_manager.send_status_update(
                job_id=job_id,
                status="processing",
                message="Fundamental analysis queries generated",
                result={
                    "step": "Fundamental Analyst",
                    "analyst_type": self.analyst_type,
                    "queries": queries,
                },
            )

        # ------------------------------------------------------------------ #
        # 2) Aggregate documents (company website scrape + web search results)
        # ------------------------------------------------------------------ #
        fundamental_data: Dict[str, Any] = {}

        # Include site scrape (if available) as the first “document”
        if site_scrape := state.get("site_scrape"):
            company_url = state.get("company_url", "company-website")
            fundamental_data[company_url] = {
                "title": state.get("company", "Unknown Company"),
                "raw_content": site_scrape,
                "query": f"Overview and qualitative information about {company}",
            }

        # Retrieve documents for each generated query
        for query in queries:
            documents = await self.search_documents(state, [query])
            for url, doc in documents.items():
                doc["query"] = query
                fundamental_data[url] = doc

        completion_msg = (
            f"✓ Completed fundamental analysis with {len(fundamental_data)} documents"
        )

        # Send real‑time progress update
        if websocket_manager and job_id:
            await websocket_manager.send_status_update(
                job_id=job_id,
                status="processing",
                message=f"Used Tavily Search to find {len(fundamental_data)} documents",
                result={
                    "step": "Searching",
                    "analyst_type": self.analyst_type,
                    "queries": queries,
                    "documents_found": len(fundamental_data),
                },
            )

        # ------------------------------------------------------------------ #
        # 3) Persist results back to the shared state
        # ------------------------------------------------------------------ #
        messages.append(AIMessage(content=completion_msg))
        state["messages"] = messages
        state["fundamental_data"] = fundamental_data

        return {
            "message": completion_msg,
            "fundamental_data": fundamental_data,
            "analyst_type": self.analyst_type,
            "queries": queries,
        }

    # The run() wrapper allows the node to be executed within the graph
    async def run(self, state: ResearchState) -> Dict[str, Any]:
        return await self.analyze(state)