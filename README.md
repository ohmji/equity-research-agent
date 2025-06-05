# 🧠 Equity Research Agent

An agentic workflow powered by LangGraph and LangChain for automated company research and analysis. The system simulates the workflow of a professional equity research analyst, providing enriched, curated, and briefed insights through a structured multi-agent architecture.

## 🚀 Features

- 📊 Financial analysis
- 🗞️ News scanning
- 🏭 Industry insights
- 🏢 Company profiling
- 🔍 Data collection and enrichment
- 📝 Auto-generated investment briefings
- ✍️ Final report editing
- 🌐 Real-time WebSocket progress updates

## 🧱 Architecture

This project is built using LangGraph's `StateGraph` with the following node pipeline:

```
grounding → financial_analyst →┐
           news_scanner        │
           industry_analyst    ├─→ collector → curator → enricher → briefing → editor
           company_analyst     │
                               ┘
```

Each node represents a specialized agent:
- `GroundingNode`: Sets research context.
- `FinancialAnalyst`, `NewsScanner`, `IndustryAnalyzer`, `CompanyAnalyzer`: Conduct domain-specific analysis.
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
- Current node name
- Execution progress
- State keys

## 📜 License

MIT License
