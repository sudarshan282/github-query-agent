import os
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


def get_vectorstore():
    """Loads the ChromaDB store we created during ingestion"""
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=GEMINI_API_KEY
    )
    vectorstore = Chroma(
        persist_directory="./chromadb_store",
        embedding_function=embeddings
    )
    return vectorstore


def format_docs(docs):
    """Joins retrieved chunks into a single string for the prompt"""
    return "\n\n".join([doc.page_content for doc in docs])


def get_llm(temperature=0.2):
    """Returns Groq LLM"""
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=GROQ_API_KEY,
        temperature=temperature
    )


def answer_question(question: str):
    """Takes a question and answers it using the repo context"""

    vectorstore = get_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

    prompt = PromptTemplate(
        template="""
You are an expert code assistant and friendly chatbot that has read an entire GitHub repository.
Use the following code and file context to answer questions about the codebase clearly and accurately.

If the message is casual conversation (like greetings, compliments, or small talk),
respond in a friendly and natural way without mentioning the code context.

If asked about the code, use the context provided to give accurate answers.
If you don't know the answer from the context, say so honestly.

IMPORTANT FORMATTING RULES:
- Always wrap code in proper markdown code blocks with the language specified like ```c or ```python
- Never use single backticks for code — always use triple backticks
- For multiple lines of code always use a code block
- Never say "here is a snippet" without showing it in a proper code block

Context:
{context}

Question:
{question}

Answer:
""",
        input_variables=["context", "question"]
    )

    llm = get_llm(temperature=0.2)

    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    answer = chain.invoke(question)
    docs = retriever.invoke(question)
    sources = list(set([doc.metadata["path"] for doc in docs]))

    return {
        "answer": answer,
        "sources": sources
    }


def suggest_improvements():
    """Analyzes the repo and suggests improvements"""

    vectorstore = get_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

    prompt = PromptTemplate(
        template="""
You are a senior software engineer doing a code review of a GitHub repository.
Based on the code and files provided, suggest specific improvements in these areas:

1. Code quality and best practices
2. Project structure and organization
3. Security concerns if any
4. Performance improvements
5. Missing documentation or tests

Be specific — mention actual file names and code patterns you noticed.

Context:
{context}

Suggestions:
""",
        input_variables=["context"]
    )

    llm = get_llm(temperature=0.3)

    docs = retriever.invoke("project structure code quality architecture")
    context = format_docs(docs)
    sources = list(set([doc.metadata["path"] for doc in docs]))

    chain = prompt | llm | StrOutputParser()
    suggestions = chain.invoke({"context": context})

    return {
        "suggestions": suggestions,
        "sources": sources
    }
