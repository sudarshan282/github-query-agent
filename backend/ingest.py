import os
import time
import shutil
from github import Github
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

ALLOWED_EXTENSIONS = [
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c",
    ".html", ".css", ".md", ".txt", ".json", ".yaml", ".yml", ".env.example",
    ".rs", ".toml", ".go", ".rb", ".php", ".swift", ".kt", ".vue", ".svelte"
]

ALLOWED_FILENAMES = [
    "LICENSE", "Makefile", "Dockerfile", "README", "CHANGELOG", "CONTRIBUTING"
]


def get_github_client():
    if GITHUB_TOKEN:
        return Github(GITHUB_TOKEN)
    return Github()


def fetch_repo_files(repo_url: str):
    parts = repo_url.rstrip("/").split("github.com/")
    repo_path = parts[1]

    g = get_github_client()
    repo = g.get_repo(repo_path)

    files = []
    tree = repo.get_git_tree(sha="HEAD", recursive=True)

    for item in tree.tree:
        if item.type == "blob":
            _, ext = os.path.splitext(item.path)
            filename = os.path.basename(item.path)
            if ext in ALLOWED_EXTENSIONS or filename in ALLOWED_FILENAMES:
                try:
                    file_content = repo.get_contents(item.path)
                    content = file_content.decoded_content.decode("utf-8")
                    files.append({
                        "path": item.path,
                        "content": content,
                        "extension": ext
                    })
                    print(f"Fetched: {item.path}")
                    time.sleep(0.5)
                except Exception as e:
                    print(f"Skipped {item.path}: {e}")

    print(f"\nTotal files fetched: {len(files)}")
    return files


def chunk_files(files: list):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )

    documents = []
    metadatas = []

    for file in files:
        chunks = splitter.split_text(file["content"])
        for chunk in chunks:
            documents.append(chunk)
            metadatas.append({
                "path": file["path"],
                "extension": file["extension"]
            })

    print(f"Total chunks created: {len(documents)}")
    return documents, metadatas


def clear_chromadb():
    if os.path.exists("./chromadb_store"):
        import gc
        gc.collect()
        for root, dirs, files in os.walk("./chromadb_store", topdown=False):
            for file in files:
                try:
                    os.remove(os.path.join(root, file))
                except Exception:
                    pass
            for dir in dirs:
                try:
                    os.rmdir(os.path.join(root, dir))
                except Exception:
                    pass
        try:
            os.rmdir("./chromadb_store")
        except Exception:
            pass


def ingest_repo(repo_url: str):
    print(f"\nStarting ingestion for: {repo_url}")

    clear_chromadb()

    files = fetch_repo_files(repo_url)
    if not files:
        return {"status": "error", "message": "No readable files found"}

    documents, metadatas = chunk_files(files)

    print("\nEmbedding and storing in ChromaDB...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    Chroma.from_texts(
        texts=documents,
        embedding=embeddings,
        metadatas=metadatas,
        persist_directory="./chromadb_store"
    )

    print("Ingestion complete!")
    return {
        "status": "success",
        "files_fetched": len(files),
        "chunks_stored": len(documents)
    }


def ingest_repo_stream(repo_url: str):
    import json

    yield json.dumps({"type": "status", "message": "STARTING INGESTION..."}) + "\n"

    clear_chromadb()
    yield json.dumps({"type": "status", "message": "CLEARED OLD DATA"}) + "\n"

    parts = repo_url.rstrip("/").split("github.com/")
    repo_path = parts[1]

    g = get_github_client()
    repo = g.get_repo(repo_path)

    yield json.dumps({"type": "status", "message": "CONNECTED TO GITHUB"}) + "\n"

    files = []
    tree = repo.get_git_tree(sha="HEAD", recursive=True)

    yield json.dumps({"type": "status", "message": "SCANNING FILE TREE..."}) + "\n"

    for item in tree.tree:
        if item.type == "blob":
            _, ext = os.path.splitext(item.path)
            filename = os.path.basename(item.path)
            if ext in ALLOWED_EXTENSIONS or filename in ALLOWED_FILENAMES:
                try:
                    file_content = repo.get_contents(item.path)
                    content = file_content.decoded_content.decode("utf-8")
                    files.append({
                        "path": item.path,
                        "content": content,
                        "extension": ext
                    })
                    yield json.dumps({"type": "file", "message": f"FETCHED: {item.path}"}) + "\n"
                    time.sleep(0.5)
                except Exception as e:
                    yield json.dumps({"type": "skip", "message": f"SKIPPED: {item.path}"}) + "\n"

    if not files:
        yield json.dumps({"type": "error", "message": "NO READABLE FILES FOUND"}) + "\n"
        return

    yield json.dumps({"type": "status", "message": f"CHUNKING {len(files)} FILES..."}) + "\n"

    documents, metadatas = chunk_files(files)

    yield json.dumps({"type": "status", "message": f"EMBEDDING {len(documents)} CHUNKS..."}) + "\n"

    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    Chroma.from_texts(
        texts=documents,
        embedding=embeddings,
        metadatas=metadatas,
        persist_directory="./chromadb_store"
    )

    yield json.dumps({
        "type": "done",
        "message": "INGESTION COMPLETE!",
        "files_fetched": len(files),
        "chunks_stored": len(documents)
    }) + "\n"