import { useState } from "react"
import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "https://github-query-agent.onrender.com"

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const extensions = {
      python: ".py", javascript: ".js", typescript: ".ts",
      jsx: ".jsx", tsx: ".tsx", c: ".c", cpp: ".cpp",
      java: ".java", html: ".html", css: ".css", json: ".json",
      yaml: ".yaml", yml: ".yml", bash: ".sh", shell: ".sh",
      sql: ".sql", rust: ".rs", go: ".go", ruby: ".rb",
      php: ".php", swift: ".swift", kotlin: ".kt", markdown: ".md"
    }
    const ext = extensions[language?.toLowerCase()] || ".txt"
    const blob = new Blob([code], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `code${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ margin: "8px 0", border: "2px solid var(--cyan)", background: "#000" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "6px 10px", borderBottom: "2px solid var(--cyan)", background: "var(--bg-tertiary)"
      }}>
        <span style={{ color: "var(--cyan)", fontSize: "11px" }}>
          {language ? language.toUpperCase() : "CODE"}
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleCopy} style={{
            background: copied ? "var(--cyan)" : "transparent",
            border: "2px solid var(--cyan)",
            color: copied ? "#000" : "var(--cyan)",
            fontSize: "10px", padding: "3px 8px", cursor: "pointer",
            fontFamily: "'Press Start 2P', cursive"
          }}>
            {copied ? "COPIED!" : "COPY"}
          </button>
          <button onClick={handleDownload} style={{
            background: "transparent", border: "2px solid var(--pink)",
            color: "var(--pink)", fontSize: "10px", padding: "3px 8px",
            cursor: "pointer", fontFamily: "'Press Start 2P', cursive"
          }}>
            DOWNLOAD
          </button>
        </div>
      </div>
      <pre style={{
        margin: 0, padding: "12px", overflowX: "auto",
        fontSize: "13px", lineHeight: "1.8", color: "var(--cyan)",
        fontFamily: "'Press Start 2P', cursive", whiteSpace: "pre-wrap", wordBreak: "break-all"
      }}>
        {code}
      </pre>
    </div>
  )
}

function MessageContent({ text }) {
  const parts = text.split(/(```[\s\S]*?```)/g)
  return (
    <div>
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3, -3).split("\n")
          const language = lines[0].trim()
          const code = lines.slice(1).join("\n").trim()
          return <CodeBlock key={index} code={code} language={language} />
        }
        const lines = part.split("\n")
        return (
          <div key={index}>
            {lines.map((line, lineIndex) => {
              if (line.trim() === "" || line.trim() === "---") {
                return <div key={lineIndex} style={{ height: "10px" }} />
              }
              if (line.startsWith("##")) {
                return (
                  <div key={lineIndex} style={{
                    color: "var(--cyan)", fontSize: "13px", marginTop: "16px",
                    marginBottom: "6px", paddingBottom: "4px", borderBottom: "2px solid var(--cyan)"
                  }}>
                    ▶ {line.replace(/^#+\s*/, "")}
                  </div>
                )
              }
              if (/^\*\*.*\*\*/.test(line.trim()) && !line.trim().startsWith("*   ")) {
                return (
                  <div key={lineIndex} style={{
                    color: "var(--cyan)", fontSize: "13px", marginTop: "14px",
                    marginBottom: "4px", paddingBottom: "4px", borderBottom: "1px solid var(--cyan-dim)"
                  }}>
                    ▸ {line.replace(/\*\*/g, "").trim()}
                  </div>
                )
              }
              if (/^\d+\./.test(line)) {
                const content = line.replace(/^\d+\.\s*/, "")
                const boldMatch = content.match(/^\*\*(.+?)\*\*:?(.*)/)
                return (
                  <div key={lineIndex} style={{
                    color: "var(--cyan)", fontSize: "13px", marginTop: "14px",
                    marginBottom: "6px", lineHeight: "1.8",
                    borderLeft: "3px solid var(--cyan)", paddingLeft: "10px"
                  }}>
                    {boldMatch ? (
                      <>
                        <span style={{ color: "var(--cyan)", borderBottom: "1px solid var(--cyan-dim)", paddingBottom: "1px" }}>
                          {boldMatch[1]}
                        </span>
                        <span style={{ color: "#ffffff" }}>{boldMatch[2]}</span>
                      </>
                    ) : content.replace(/\*\*/g, "")}
                  </div>
                )
              }
              if (line.trim().startsWith("*") || line.trim().startsWith("-")) {
                const content = line.replace(/^[\*\-]\s*/, "")
                const boldMatch = content.match(/^\*\*(.+?)\*\*:?(.*)/)
                return (
                  <div key={lineIndex} style={{
                    color: "#ffffff", fontSize: "13px", lineHeight: "2",
                    marginBottom: "4px", paddingLeft: "16px", display: "flex", gap: "8px"
                  }}>
                    <span style={{ color: "var(--cyan)", flexShrink: 0 }}>▸</span>
                    <span>
                      {boldMatch ? (
                        <>
                          <span style={{ color: "var(--cyan)", borderBottom: "1px solid var(--cyan-dim)", paddingBottom: "1px" }}>
                            {boldMatch[1]}
                          </span>
                          <span>{boldMatch[2]}</span>
                        </>
                      ) : content.replace(/\*\*/g, "")}
                    </span>
                  </div>
                )
              }
              return (
                <div key={lineIndex} style={{ color: "#ffffff", fontSize: "13px", lineHeight: "2.2", marginBottom: "6px" }}>
                  {line.replace(/\*\*/g, "")}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function SuggestionsPanel() {
  const [suggestions, setSuggestions] = useState(null)
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGetSuggestions = async () => {
    setLoading(true)
    setError(null)
    setSuggestions(null)
    try {
      const response = await axios.post(`${API_URL}/improve`)
      setSuggestions(response.data.suggestions)
      setSources(response.data.sources)
    } catch (error) {
      setError(error.response?.data?.detail || "ERROR. COULD NOT GET SUGGESTIONS.")
    } finally {
      setLoading(false)
    }
  }

  const handleExportSuggestions = () => {
    if (!suggestions) return
    const blob = new Blob([suggestions], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `improvement-scan-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="pixel-card">
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "24px"
      }}>
        <div className="flex items-center gap-3">
          <span style={{ color: "var(--pink)", fontSize: "18px" }}>▶</span>
          <h2 style={{ color: "var(--pink)", fontSize: "16px", margin: 0 }}>IMPROVEMENT SCAN</h2>
        </div>
        <button onClick={handleExportSuggestions} disabled={!suggestions} style={{
          background: "transparent", border: "2px solid var(--pink)", color: "var(--pink)",
          fontSize: "9px", padding: "6px 12px", cursor: !suggestions ? "not-allowed" : "pointer",
          fontFamily: "'Press Start 2P', cursive", opacity: !suggestions ? 0.4 : 1
        }}>
          EXPORT SCAN ↓
        </button>
      </div>

      <p style={{ color: "var(--gray)", fontSize: "12px", lineHeight: "2", marginBottom: "20px" }}>
        RUN A FULL CODE REVIEW ON THE LOADED REPO.
        GET SPECIFIC SUGGESTIONS ON CODE QUALITY,
        STRUCTURE, SECURITY AND MORE.
      </p>

      <button className="pixel-btn" onClick={handleGetSuggestions} disabled={loading} style={{
        width: "100%", opacity: loading ? 0.6 : 1,
        cursor: loading ? "not-allowed" : "pointer", marginBottom: "20px", fontSize: "12px"
      }}>
        {loading ? "SCANNING REPO..." : "▶ RUN IMPROVEMENT SCAN"}
      </button>

      {loading && (
        <div style={{
          textAlign: "center", color: "var(--cyan)", fontSize: "13px",
          lineHeight: "2", padding: "20px", border: "3px solid var(--gray)"
        }}>
          <div>ANALYZING CODEBASE...</div>
          <div style={{ color: "var(--gray)", marginTop: "8px", fontSize: "12px" }}>
            THIS MAY TAKE A FEW SECONDS
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: "12px", border: "3px solid var(--pink)",
          color: "var(--pink)", fontSize: "12px", lineHeight: "1.8"
        }}>
          ✗ {error}
        </div>
      )}

      {suggestions && (
        <div>
          <div style={{
            background: "var(--bg-primary)", border: "3px solid var(--cyan)",
            padding: "16px", marginBottom: "16px", maxHeight: "600px", overflowY: "auto"
          }}>
            <MessageContent text={suggestions} />
          </div>
          {sources && sources.length > 0 && (
            <div style={{
              padding: "10px", border: "3px solid var(--gray)",
              fontSize: "11px", color: "var(--gray)", lineHeight: "2"
            }}>
              <div style={{ color: "var(--cyan)", marginBottom: "6px", fontSize: "12px" }}>
                FILES ANALYZED:
              </div>
              {sources.map((source, index) => (
                <div key={index}>▶ {source}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SuggestionsPanel