# GitHub Query Agent

An agentic RAG system that ingests GitHub repositories into a vector database and enables natural language querying and AI-powered code review — built with LangChain, Groq, and ChromaDB.

## What it does

- Paste any public GitHub repo URL and ingest it
- Ask questions about the code in plain English
- Get a full AI-powered code review with improvement suggestions
- Copy or download code snippets from responses
- Export chat history and improvement scans
- Remembers previously ingested repos

## Tech Stack

**Backend**
- FastAPI — REST API server
- LangChain — LLM orchestration
- Groq (Llama 3.3 70b) — AI answers and suggestions
- Google Gemini — text embeddings
- ChromaDB — local vector database
- PyGithub — GitHub API integration

**Frontend**
- React + Vite
- Tailwind CSS
- Pixel art UI with Press Start 2P font

## Setup

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
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
GITHUB_TOKEN=your_github_token_optional
```

Get your keys here:
- Gemini: [aistudio.google.com](https://aistudio.google.com)
- Groq: [console.groq.com](https://console.groq.com)
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
- Gemini API key (free at aistudio.google.com)
- Groq API key (free at console.groq.com)