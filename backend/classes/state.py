from typing import TypedDict, Optional, Dict, List, Any
from backend.services.websocket_manager import WebSocketManager

#Define the input state
class InputState(TypedDict, total=False):
    company: str
    company_url: Optional[str]
    hq_location: Optional[str]
    industry: Optional[str]
    websocket_manager: Optional[WebSocketManager]
    job_id: Optional[str]

class ResearchState(InputState):
    site_scrape: Dict[str, Any]
    messages: List[Any]
    financial_data: Dict[str, Any]
    fundamental_data: Dict[str, Any]
    valuation_data: Dict[str, Any]
    news_data: Dict[str, Any]
    industry_data: Dict[str, Any]
    company_data: Dict[str, Any]
    curated_financial_data: Dict[str, Any]
    curated_fundamental_data: Dict[str, Any]
    curated_valuation_data: Dict[str, Any]
    curated_news_data: Dict[str, Any]
    curated_industry_data: Dict[str, Any]
    curated_company_data: Dict[str, Any]
    financial_briefing: str
    fundamental_briefing: str
    valuation_briefing: str
    news_briefing: str
    industry_briefing: str
    company_briefing: str
    references: List[str]
    briefings: Dict[str, Any]
    report: str