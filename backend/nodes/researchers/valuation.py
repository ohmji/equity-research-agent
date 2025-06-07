import logging
from langchain_core.messages import AIMessage
from ...classes import ResearchState
from .base import BaseResearcher
import yfinance as yf
import asyncio

logger = logging.getLogger(__name__)

class ValuationAnalyst(BaseResearcher):
    def __init__(self):
        super().__init__()
        self.analyst_type = "valuation_analyzer"

    async def lookup_symbol_via_tavily(self, company_name: str) -> str:
        try:
            search_query = f"{company_name} stock ticker site:finance.yahoo.com"
            results = await self.tavily_client.search(search_query, search_depth="basic", max_results=3)
            for result in results.get("results", []):
                url = result.get("url", "")
                if "finance.yahoo.com/quote/" in url:
                    parts = url.split("/quote/")
                    if len(parts) > 1:
                        ticker = parts[1].split("/")[0].split("?")[0]
                        return ticker.upper()
        except Exception as e:
            logger.warning(f"Failed to lookup symbol via Tavily: {e}")
        return company_name

    def lookup_symbol(self, company_name: str) -> str:
        try:
            results = yf.search(company_name)
            if results and isinstance(results, list) and "symbol" in results[0]:
                return results[0]["symbol"]
        except Exception:
            pass
        return company_name  # fallback

    async def analyze(self, state: ResearchState):
        websocket_manager = state.get("websocket_manager")
        job_id = state.get("job_id")

        company = state.get("company", "Unknown Company")
        ticker = state.get("ticker")
        if not ticker:
            ticker = await self.lookup_symbol_via_tavily(company)
            if not ticker:
                ticker = self.lookup_symbol(company)
        messages = state.get("messages", [])

        if websocket_manager and job_id:
            await websocket_manager.send_status_update(
                job_id=job_id,
                status="processing",
                message=f"Looking up ticker symbol for {company}...",
                result={
                    "step": "Valuation Analyst",
                    "analyst_type": "Valuation Analyst",
                }
            )

        if websocket_manager and job_id:
            await websocket_manager.send_status_update(
                job_id=job_id,
                status="processing",
                message=f"Fetching valuation data for {ticker}...",
                result={
                    "step": "Valuation Analyst",
                    "analyst_type":"Valuation Analyst",
                }
            )
        try:
            stock = await asyncio.to_thread(yf.Ticker, ticker)
            info = await asyncio.to_thread(lambda: stock.info)
            pe_ratio = info.get("trailingPE", "N/A")
            forward_pe = info.get("forwardPE", "N/A")
            eps = info.get("trailingEps", "N/A")
            market_cap = info.get("marketCap", "N/A")
            dividend_yield = info.get("dividendYield", "N/A")
            beta = info.get("beta", "N/A")
            price_to_book = info.get("priceToBook", "N/A")
            return_on_equity = info.get("returnOnEquity", "N/A")

            # Estimated DCF Value (GGM) placeholder, as no calculation provided
            estimated_value = "N/A"

            summary = (
                f"💰 Valuation Summary for {ticker}:\n"
                f"• P/E Ratio: {pe_ratio}\n"
                f"• Forward P/E: {forward_pe}\n"
                f"• EPS: {eps}\n"
                f"• Market Cap: ${market_cap:,}\n"
                f"• Dividend Yield: {dividend_yield}\n"
                f"• Beta: {beta}\n"
                f"• Price to Book: {price_to_book}\n"
                f"• Return on Equity: {return_on_equity}\n"
                f"• Estimated DCF Value (GGM): {estimated_value}"
            )

            messages.append(AIMessage(content=summary))
            state["messages"] = messages
            valuation_data = {
                "ticker": ticker,
                "pe_ratio": pe_ratio,
                "forward_pe": forward_pe,
                "eps": eps,
                "market_cap": market_cap,
                "dividend_yield": dividend_yield,
                "beta": beta,
                "price_to_book": price_to_book,
                "return_on_equity": return_on_equity,
                "estimated_dcf": estimated_value
            }

            if websocket_manager and job_id:
                await websocket_manager.send_status_update(
                    job_id=job_id,
                    status="processing",
                    message="Valuation data fetched successfully.",
                    result={
                        "step": "Valuation Analyst",
                        "analyst_type": "Valuation Analyst",
                        "valuation_data": valuation_data
                    }
                )

            queries = await self.generate_queries(state, summary)

            subquery_message = AIMessage(content=f"Subqueries generated: {queries}")
            messages.append(subquery_message)
            state["messages"] = messages

            if websocket_manager and job_id:
                await websocket_manager.send_status_update(
                    job_id=job_id,
                    status="processing",
                    message="Generating queries for further research...",
                    result={
                        "step": "Valuation Analyst",
                        "analyst_type": "Valuation Analyst",
                        "queries": queries
                    }
                )

            valuation_data_docs = {}

            # Add the valuation summary as a document for briefing
            valuation_summary_text = summary.replace("•", "*")  # Convert bullets to markdown-style
            valuation_data_docs[f"https://finance.yahoo.com/quote/{ticker}"] = {
                "title": f"Valuation Summary for {ticker}",
                "raw_content": valuation_summary_text,
                "query": f"Valuation data for {ticker}",
                "score": 1.0
            }

            for query in queries:
                documents = await self.search_documents(state, [query])
                for url, doc in documents.items():
                    doc["query"] = query
                    valuation_data_docs[url] = doc

            completion_msg = f"Completed analysis with {len(valuation_data_docs)} documents"
            
            if websocket_manager and job_id:
                await websocket_manager.send_status_update(
                    job_id=job_id,
                    status="processing",
                    message=f"Used Tavily Search to find {len(valuation_data_docs)} documents",
                    result={
                        "step": "Searching",
                        "analyst_type": "Valuation Analyst",
                        "queries": queries
                    }
                )
            
            messages.append(AIMessage(content=completion_msg))
            state["messages"] = messages

            # Store collected documents into state
            state["valuation_data"] = valuation_data_docs

            if websocket_manager and job_id:
                await websocket_manager.send_status_update(
                    job_id=job_id,
                    status="completed",
                    message="Valuation analysis complete.",
                    result={
                        "step": "Valuation Analyst",
                        "analyst_type": "Valuation Analyst"
                    }
                )

            return {
                "message": completion_msg,
                "valuation_data": valuation_data_docs,
                "queries": queries,
                "analyst_type": self.analyst_type,
            }

        except Exception as e:
            error_msg = f"Failed to fetch valuation data for {ticker}: {str(e)}"
            logger.error(error_msg)
            messages.append(AIMessage(content=error_msg))
            state["messages"] = messages

            if websocket_manager and job_id:
                await websocket_manager.send_status_update(
                    job_id=job_id,
                    status="error",
                    message=error_msg,
                    result={
                        "step": "Valuation Analyst",
                        "analyst_type": "Valuation Analyst"
                    }
                )

            raise  # Re-raise to maintain error flow

    async def run(self, state: ResearchState):
        return await self.analyze(state)