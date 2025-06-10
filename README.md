# 🧠 Equity Research Agent

A **LangGraph-based multi-agent system for automated equity research**. The system simulates the workflow of a professional equity research analyst, providing enriched, curated, and briefed insights through a structured multi-agent architecture.

## 🚀 Features

- 📊 Financial analysis
- 🗞️ News scanning
- 🧠 Sentiment analysis for news and report sections
- 🏭 Industry insights
- 🏢 Company profiling
- 🔍 Data collection and enrichment
- 📝 Auto-generated investment briefings
- ✍️ Final report editing
- 🌐 Real-time WebSocket progress updates
- 📈 Valuation analysis powered by Yahoo Finance
- 💬 Real-time subquery generation for deeper insights
- 🔎 Symbol lookup using Tavily and yfinance

## 🧱 Architecture

This project is built using LangGraph's `StateGraph` with the following node pipeline:

```
grounding
   ├── financial_analyst
   ├── news_scanner
   ├── industry_analyst
   ├── company_analyst
   ├── fundamental_analyst
   └── valuation_analyst
      ↓
   collector → curator → enricher → briefing → editor
```

Each node represents a specialized agent:
- `GroundingNode`: Sets research context.
- `FinancialAnalyst`, `NewsScanner`, `IndustryAnalyzer`, `CompanyAnalyzer`: Conduct domain-specific analysis.
- `FundamentalAnalyst`, `ValuationAnalyst`: Perform financial metrics evaluation and market-based valuation with Yahoo Finance API.
- `Collector`: Aggregates data.
- `Curator`: Filters and prioritizes findings.
- `Enricher`: Enhances findings with additional insights.
- `Briefing`: Creates structured reports.
- `Editor`: Finalizes output for human consumption.

## 🧪 How to Run

0. **Create a new Python project using [uv](https://github.com/astral-sh/uv) (optional but recommended)**

```bash
uv venv
uv pip install -r requirements.txt
```

1. **Install dependencies (if not using uv)**

```bash
pip install -r requirements.txt
```

2. **Run the Agent**

```python
from backend.graph import Graph
graph = Graph(company="Tesla")
# graph.run(thread={}) is an async generator
async for state in graph.run(thread={}):
    print(state)
```

> Note: Make sure to configure WebSocket manager and other integrations as needed.

## 📂 Project Structure

```
backend/
├── graph.py         # Main workflow definition
├── classes/
│   └── state.py     # InputState dataclass
└── nodes/           # Modular node logic
    ├── collector.py
    ├── curator.py
    ├── enricher.py
    ├── briefing.py
    ├── editor.py
    └── researchers.py
```

## 📡 WebSocket Support

Progress updates are sent via WebSocket (`websocket_manager`) with:
- Job ID (`job_id`)
- Current node name
- Execution progress
- Result or error data

## 🙏 Acknowledgements

Additional capabilities such as sentiment analysis were added to enhance the report generation.
