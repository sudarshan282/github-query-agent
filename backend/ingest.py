import os
import time
import math
import chromadb
from github import Github
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_cohere import CohereEmbeddings
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chromadb_store")
COLLECTION_FILE = os.getenv("COLLECTION_FILE", "/tmp/current_collection.txt")

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
        chunk_size=3000,
        chunk_overlap=200
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
    try:
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        existing = client.list_collections()
        for col in existing:
            client.delete_collection(col.name)
            print(f"Deleted collection: {col.name}")
        del client
        print("ChromaDB cleared!")
    except Exception as e:
        print(f"Error clearing ChromaDB: {e}")


def get_embeddings():
    return CohereEmbeddings(
        model="embed-english-light-v3.0",
        cohere_api_key=COHERE_API_KEY
    )


def save_collection_name(name: str):
    try:
        os.makedirs(os.path.dirname(COLLECTION_FILE), exist_ok=True)
        with open(COLLECTION_FILE, "w") as f:
            f.write(name)
    except Exception as e:
        print(f"Error saving collection name: {e}")


def embed_in_batches(embeddings, documents):
    batch_size = 20
    total_batches = math.ceil(len(documents) / batch_size)
    all_embedded = []

    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        print(f"Embedding batch {batch_num}/{total_batches}...")
        batch_embedded = embeddings.embed_documents(batch)
        all_embedded.extend(batch_embedded)
        if i + batch_size < len(documents):
            print("Waiting to avoid rate limit...")
            time.sleep(62)

    return all_embedded


def ingest_repo(repo_url: str):
    print(f"\nStarting ingestion for: {repo_url}")
    clear_chromadb()
    files = fetch_repo_files(repo_url)
    if not files:
        return {"status": "error", "message": "No readable files found"}
    documents, metadatas = chunk_files(files)
    print("\nEmbedding and storing in ChromaDB...")

    collection_name = f"repo_{int(time.time())}"
    save_collection_name(collection_name)

    embeddings = get_embeddings()
    all_embedded = embed_in_batches(embeddings, documents)

    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_or_create_collection(name=collection_name)
    collection.add(
        documents=documents,
        metadatas=metadatas,
        embeddings=all_embedded,
        ids=[str(i) for i in range(len(documents))]
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

    collection_name = f"repo_{int(time.time())}"
    save_collection_name(collection_name)

    embeddings = get_embeddings()
    batch_size = 20
    total_batches = math.ceil(len(documents) / batch_size)
    all_embedded = []

    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        yield json.dumps({"type": "status", "message": f"EMBEDDING BATCH {batch_num}/{total_batches}..."}) + "\n"
        batch_embedded = embeddings.embed_documents(batch)
        all_embedded.extend(batch_embedded)
        if i + batch_size < len(documents):
            yield json.dumps({"type": "status", "message": "RATE LIMIT COOLDOWN... PLEASE WAIT 60s"}) + "\n"
            time.sleep(62)

    yield json.dumps({"type": "status", "message": "STORING IN CHROMADB..."}) + "\n"

    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_or_create_collection(name=collection_name)
    collection.add(
        documents=documents,
        metadatas=metadatas,
        embeddings=all_embedded,
        ids=[str(i) for i in range(len(documents))]
    )

    yield json.dumps({
        "type": "done",
        "message": "INGESTION COMPLETE!",
        "files_fetched": len(files),
        "chunks_stored": len(documents)
    }) + "\n"