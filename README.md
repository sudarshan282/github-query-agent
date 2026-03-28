# GitHub Query Agent

An agentic RAG system that ingests GitHub repositories into a vector database and enables natural language querying and AI-powered code review — built with LangChain, Groq, Cohere, and ChromaDB.

## What it does

- Paste any public GitHub repo URL and ingest it
- Ask questions about the code in plain English
- Get a full AI-powered code review with improvement suggestions
- Copy or download code snippets from responses
- Export chat history and improvement scans
- Supports multiple repos — switch anytime without refreshing

## Tech Stack

**Backend**
- FastAPI — REST API server
- LangChain — LLM orchestration
- Groq (Llama 3.3 70b) — AI answers and suggestions
- Cohere — text embeddings (embed-english-light-v3.0)
- ChromaDB — local vector database
- PyGithub — GitHub API integration

**Frontend**
- React + Vite
- Tailwind CSS
- Pixel art UI with Press Start 2P font

**Deployed on**
- Vercel (frontend)
- Render (backend)

## Setup (Local)

### 1. Clone the repo
```bash
git clone https://github.com/sudarshan282/github-query-agent.git
cd github-query-agent
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

### 3. Add your API keys
Copy `.env.example` to `.env` and fill in your keys:
```
GROQ_API_KEY=your_groq_api_key
COHERE_API_KEY=your_cohere_api_key
GITHUB_TOKEN=your_github_token_optional
COLLECTION_FILE=./current_collection.txt
```

Get your keys here:
- Groq: [console.groq.com](https://console.groq.com)
- Cohere: [cohere.com](https://cohere.com)
- GitHub Token: GitHub → Settings → Developer Settings → Personal Access Tokens (optional, for private repos)

### 4. Start the backend
```bash
uvicorn main:app --reload
```

### 5. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### 6. Open the app
Go to `http://localhost:5173`

## How to use

1. Paste a GitHub repo URL and click **INGEST REPO**
2. Wait for all files to be fetched and embedded
3. Ask any question about the codebase in the **QUERY TERMINAL**
4. Click **RUN IMPROVEMENT SCAN** for AI code review
5. Export chat or scan results using the export buttons

## Requirements

- Python 3.11+
- Node.js 18+
- Groq API key (free at console.groq.com)
- Cohere API key (free at cohere.com)

## Notes

- First request after inactivity may take 30-60 seconds (Render free tier spin-up)
- Ingestion batches chunks with 60s cooldown between batches to respect Cohere trial rate limits
- Only public GitHub repositories are supported without a token
- Private repos require a GitHub personal access token
- For local development, set `VITE_API_URL=http://localhost:8000` in `frontend/.env`