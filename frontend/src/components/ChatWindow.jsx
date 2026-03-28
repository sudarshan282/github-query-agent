import { useState, useRef, useEffect } from "react"
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
              if (line.trim() === "") return <div key={lineIndex} style={{ height: "10px" }} />
              if (line.startsWith("##")) return (
                <div key={lineIndex} style={{
                  color: "var(--cyan)", fontSize: "13px", marginTop: "16px",
                  marginBottom: "6px", paddingBottom: "4px", borderBottom: "2px solid var(--cyan)"
                }}>
                  ▶ {line.replace(/^#+\s*/, "")}
                </div>
              )
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
                          <span style={{ color: "var(--cyan)", borderBottom: "1px solid var(--cyan-dim)", paddingBottom: "1px" }}>{boldMatch[1]}</span>
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

function ChatWindow() {
  const [messages, setMessages] = useState([
    { type: "system", text: "REPO LOADED. ASK ME ANYTHING ABOUT THE CODEBASE." }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" })
  }, [messages])

  const handleExportChat = () => {
    if (messages.length <= 1) return
    const lines = messages.map(msg => {
      if (msg.type === "system") return `[SYSTEM] ${msg.text}`
      if (msg.type === "user") return `[YOU] ${msg.text}`
      if (msg.type === "bot") {
        let text = `[AGENT] ${msg.text}`
        if (msg.sources && msg.sources.length > 0) text += `\nSOURCES: ${msg.sources.join(", ")}`
        return text
      }
      if (msg.type === "error") return `[ERROR] ${msg.text}`
      return ""
    }).join("\n\n")
    const blob = new Blob([lines], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `chat-export-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAsk = async () => {
    if (!input.trim()) return
    const userMessage = input.trim()
    setInput("")
    setMessages(prev => [...prev, { type: "user", text: userMessage }])
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/query`, { question: userMessage })
      setMessages(prev => [...prev, {
        type: "bot", text: response.data.answer, sources: response.data.sources
      }])
    } catch (error) {
      setMessages(prev => [...prev, {
        type: "error", text: error.response?.data?.detail || "ERROR. COULD NOT GET ANSWER."
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) handleAsk()
  }

  return (
    <div className="pixel-card mb-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div className="flex items-center gap-3">
          <span style={{ color: "var(--cyan)", fontSize: "18px" }}>▶</span>
          <h2 style={{ color: "var(--cyan)", fontSize: "16px", margin: 0 }}>QUERY TERMINAL</h2>
        </div>
        <button onClick={handleExportChat} disabled={messages.length <= 1} style={{
          background: "transparent", border: "2px solid var(--cyan)", color: "var(--cyan)",
          fontSize: "9px", padding: "6px 12px", cursor: messages.length <= 1 ? "not-allowed" : "pointer",
          fontFamily: "'Press Start 2P', cursive", opacity: messages.length <= 1 ? 0.4 : 1
        }}>
          EXPORT CHAT ↓
        </button>
      </div>

      <div style={{
        height: "500px", overflowY: "auto", marginBottom: "16px",
        padding: "10px", background: "var(--bg-primary)", border: "3px solid var(--gray)"
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: "16px" }}>
            {msg.type === "system" && (
              <div style={{ color: "var(--gray)", fontSize: "12px", lineHeight: "1.8", textAlign: "center" }}>
                — {msg.text} —
              </div>
            )}
            {msg.type === "user" && (
              <div style={{ textAlign: "right" }}>
                <span style={{
                  display: "inline-block", background: "var(--bg-tertiary)",
                  border: "2px solid var(--pink)", color: "var(--pink)",
                  fontSize: "13px", padding: "8px 12px", lineHeight: "1.8", maxWidth: "80%", textAlign: "left"
                }}>
                  ▶ {msg.text}
                </span>
              </div>
            )}
            {msg.type === "bot" && (
              <div>
                <div style={{
                  background: "var(--bg-tertiary)", border: "2px solid var(--cyan)",
                  padding: "10px 12px", maxWidth: "85%", color: "#ffffff"
                }}>
                  <MessageContent text={msg.text} />
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: "6px", fontSize: "10px", color: "var(--gray)" }}>
                    SOURCES: {msg.sources.join(" | ")}
                  </div>
                )}
              </div>
            )}
            {msg.type === "error" && (
              <div style={{ color: "var(--pink)", fontSize: "12px", lineHeight: "1.8" }}>
                ✗ {msg.text}
              </div>
            )}
          </div>
        ))}
        {loading && <div style={{ color: "var(--cyan)", fontSize: "12px" }}>◀ THINKING...</div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <input
          className="pixel-input" type="text"
          placeholder="ASK SOMETHING ABOUT THE REPO..."
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown} disabled={loading}
          style={{ flex: 1, fontSize: "11px" }}
        />
        <button className="pixel-btn-cyan" onClick={handleAsk} disabled={loading} style={{
          whiteSpace: "nowrap", opacity: loading ? 0.6 : 1,
          cursor: loading ? "not-allowed" : "pointer", fontSize: "11px"
        }}>
          {loading ? "..." : "ASK ▶"}
        </button>
      </div>
    </div>
  )
}

export default ChatWindow