import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ingest import ingest_repo
from query import answer_question, suggest_improvements
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse
from ingest import ingest_repo, ingest_repo_stream

load_dotenv()

app = FastAPI(title="GitHub Query Agent")

# CORS — allows our React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://github-query-agent.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Request models ---
# These define what data each endpoint expects to receive

class RepoRequest(BaseModel):
    repo_url: str
    github_token: str = ""  # optional, for private repos

class QuestionRequest(BaseModel):
    question: str

# --- Routes ---

@app.get("/")
def root():
    return {"message": "GitHub Query Agent is running"}


@app.post("/ingest")
def ingest(request: RepoRequest):
    """
    Receives a GitHub repo URL, fetches all files,
    chunks them and stores in ChromaDB
    """
    if not request.repo_url:
        raise HTTPException(status_code=400, detail="repo_url is required")
    
    # If user provided a token, set it as env variable for this session
    if request.github_token:
        os.environ["GITHUB_TOKEN"] = request.github_token

    result = ingest_repo(request.repo_url)

    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])

    return result

@app.post("/ingest-stream")
def ingest_stream(request: RepoRequest):
    """
    Streams ingestion progress back to the frontend
    """
    if not request.repo_url:
        raise HTTPException(status_code=400, detail="repo_url is required")

    if request.github_token:
        os.environ["GITHUB_TOKEN"] = request.github_token

    return StreamingResponse(
        ingest_repo_stream(request.repo_url),
        media_type="text/plain"
    )


@app.post("/query")
def query(request: QuestionRequest):
    """
    Receives a question and returns an answer
    based on the ingested repo
    """
    if not request.question:
        raise HTTPException(status_code=400, detail="question is required")

    # Check if ChromaDB store exists
    if not os.path.exists("./chromadb_store"):
        raise HTTPException(
            status_code=400,
            detail="No repo ingested yet. Please ingest a repo first."
        )

    result = answer_question(request.question)
    return result


@app.post("/improve")
def improve():
    """
    Analyzes the ingested repo and returns
    improvement suggestions
    """
    if not os.path.exists("./chromadb_store"):
        raise HTTPException(
            status_code=400,
            detail="No repo ingested yet. Please ingest a repo first."
        )

    result = suggest_improvements()
    return result