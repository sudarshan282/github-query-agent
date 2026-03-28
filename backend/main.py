import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ingest import ingest_repo, ingest_repo_stream
from query import answer_question, suggest_improvements
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse

load_dotenv()

app = FastAPI(title="GitHub Query Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://github-query-agent.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RepoRequest(BaseModel):
    repo_url: str
    github_token: str = ""

class QuestionRequest(BaseModel):
    question: str

@app.get("/")
def root():
    return {"message": "GitHub Query Agent is running"}

@app.post("/ingest")
def ingest(request: RepoRequest):
    if not request.repo_url:
        raise HTTPException(status_code=400, detail="repo_url is required")
    if request.github_token:
        os.environ["GITHUB_TOKEN"] = request.github_token
    result = ingest_repo(request.repo_url)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@app.post("/ingest-stream")
def ingest_stream(request: RepoRequest):
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
    if not request.question:
        raise HTTPException(status_code=400, detail="question is required")
    if not os.path.exists("./chromadb_store"):
        raise HTTPException(status_code=400, detail="No repo ingested yet. Please ingest a repo first.")
    result = answer_question(request.question)
    return result

@app.post("/improve")
def improve():
    if not os.path.exists("./chromadb_store"):
        raise HTTPException(status_code=400, detail="No repo ingested yet. Please ingest a repo first.")
    result = suggest_improvements()
    return result