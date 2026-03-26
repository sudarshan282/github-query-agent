import { useState } from "react"
import RepoInput from "./components/RepoInput"
import ChatWindow from "./components/ChatWindow"
import SuggestionsPanel from "./components/SuggestionsPanel"

function App() {
 const [ingested, setIngested] = useState(false)
const [currentRepo, setCurrentRepo] = useState("")
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      padding: "24px"
    }}>

      {/* Header */}
      <div style={{
        textAlign: "center",
        marginBottom: "40px",
        paddingBottom: "24px",
        borderBottom: "3px solid var(--pink)"
      }}>
        <h1 style={{
          color: "var(--cyan)",
          fontSize: "24px",
          marginBottom: "16px",
          letterSpacing: "4px"
        }}>
          ▶ GITHUB QUERY AGENT
        </h1>
        <p style={{
          color: "var(--gray)",
          fontSize: "11px",
          lineHeight: "2"
        }}>
          LOAD ANY PUBLIC GITHUB REPO. ASK QUESTIONS. GET INSIGHTS.
        </p>
        <div style={{
          marginTop: "12px",
          fontSize: "11px",
          color: ingested ? "var(--cyan)" : "var(--gray)"
        }}>
          <div style={{
  marginTop: "12px",
  fontSize: "11px",
  color: ingested ? "var(--cyan)" : "var(--gray)"
}}>
  STATUS:{" "}
  <span style={{
    display: "inline-block",
    width: "12px",
    height: "12px",
    background: ingested ? "var(--cyan)" : "transparent",
    border: `2px solid ${ingested ? "var(--cyan)" : "var(--gray)"}`,
    marginRight: "6px",
    verticalAlign: "middle",
    position: "relative",
    top: "-1px"
  }}/>
  {ingested ? "REPO LOADED" : "NO REPO LOADED"}
</div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

        <RepoInput onIngestSuccess={(url) => {
  setIngested(true)
  setCurrentRepo(url)
}} />

        {ingested ? (
  <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  }}>
    <ChatWindow />
    <SuggestionsPanel />
  </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "80px 20px",
            border: "3px solid var(--gray)",
            color: "var(--gray)",
            fontSize: "11px",
            lineHeight: "3"
          }}>
            <div style={{ fontSize: "40px", marginBottom: "20px" }}>⬆</div>
            <div>INGEST A REPO FIRST</div>
            <div>TO UNLOCK THE QUERY TERMINAL</div>
            <div>AND IMPROVEMENT SCANNER</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center",
        marginTop: "40px",
        paddingTop: "20px",
        borderTop: "3px solid var(--gray)",
        color: "var(--gray)",
        fontSize: "9px",
        lineHeight: "2"
      }}>
        GITHUB QUERY AGENT — POWERED BY GROQ + GEMINI EMBEDDINGS + CHROMADB + LANGCHAIN
      </div>

    </div>
  )
}

export default App