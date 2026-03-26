import { useState, useEffect, useRef } from "react"

function RepoInput({ onIngestSuccess }) {
  const [repoUrl, setRepoUrl] = useState("")
  const [githubToken, setGithubToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [showToken, setShowToken] = useState(false)
  const [progressLines, setProgressLines] = useState([])
  const [repoHistory, setRepoHistory] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const progressRef = useRef(null)
  const dropdownRef = useRef(null)

  // Load repo history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("repoHistory")
    if (saved) {
      setRepoHistory(JSON.parse(saved))
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const saveToHistory = (url) => {
    const existing = JSON.parse(localStorage.getItem("repoHistory") || "[]")
    const filtered = existing.filter(r => r.url !== url)
    const updated = [
      { url, timestamp: new Date().toLocaleDateString() },
      ...filtered
    ].slice(0, 10) // keep last 10
    localStorage.setItem("repoHistory", JSON.stringify(updated))
    setRepoHistory(updated)
  }

  const handleSelectRepo = (url) => {
    setRepoUrl(url)
    setShowDropdown(false)
  }

  const handleRemoveRepo = (url, e) => {
    e.stopPropagation()
    const updated = repoHistory.filter(r => r.url !== url)
    localStorage.setItem("repoHistory", JSON.stringify(updated))
    setRepoHistory(updated)
  }

  const handleIngest = async () => {
    if (!repoUrl) {
      setStatus({ type: "error", message: "PLEASE ENTER A REPO URL" })
      return
    }

    setLoading(true)
    setStatus(null)
    setProgressLines([])

    try {
      const response = await fetch("https://github-query-agent.onrender.com/ingest-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_url: repoUrl,
          github_token: githubToken
        })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter(l => l.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)

            if (data.type === "done") {
              setStatus({
                type: "success",
                message: `✓ ${data.message} — ${data.files_fetched} FILES, ${data.chunks_stored} CHUNKS`
              })
              saveToHistory(repoUrl)
              onIngestSuccess(repoUrl)
            } else if (data.type === "error") {
              setStatus({ type: "error", message: data.message })
            } else {
              setProgressLines(prev => {
                const updated = [...prev, { type: data.type, message: data.message }]
                setTimeout(() => {
                  progressRef.current?.scrollTo(0, progressRef.current.scrollHeight)
                }, 50)
                return updated
              })
            }
          } catch (e) {
            // skip malformed lines
          }
        }
      }

    } catch (error) {
      setStatus({ type: "error", message: "INGESTION FAILED. TRY AGAIN." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pixel-card mb-6">
      <div className="flex items-center gap-3 mb-6">
        <span style={{ color: "var(--pink)", fontSize: "18px" }}>▶</span>
        <h2 style={{ color: "var(--pink)", fontSize: "14px", margin: 0 }}>
          LOAD REPOSITORY
        </h2>
      </div>

      {/* URL Input with dropdown */}
      <div className="mb-4" style={{ position: "relative" }} ref={dropdownRef}>
        <label style={{
          color: "var(--cyan-dim)",
          fontSize: "10px",
          display: "block",
          marginBottom: "8px"
        }}>
          GITHUB REPO URL
        </label>

        <div style={{ display: "flex", gap: "8px" }}>
          <input
            className="pixel-input"
            type="text"
            placeholder="https://github.com/username/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            style={{ fontSize: "11px", flex: 1 }}
          />
          {repoHistory.length > 0 && (
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                background: showDropdown ? "var(--cyan)" : "transparent",
                border: "3px solid var(--cyan)",
                color: showDropdown ? "#000" : "var(--cyan)",
                fontSize: "11px",
                padding: "0 12px",
                cursor: "pointer",
                fontFamily: "'Press Start 2P', cursive",
                whiteSpace: "nowrap"
              }}
            >
              {showDropdown ? "▲" : "▼"}
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && repoHistory.length > 0 && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--bg-secondary)",
            border: "3px solid var(--cyan)",
            zIndex: 100,
            maxHeight: "250px",
            overflowY: "auto"
          }}>
            <div style={{
              padding: "8px 12px",
              fontSize: "8px",
              color: "var(--gray)",
              borderBottom: "1px solid var(--gray)"
            }}>
              RECENTLY INGESTED REPOS
            </div>
            {repoHistory.map((repo, index) => (
              <div
                key={index}
                onClick={() => handleSelectRepo(repo.url)}
                style={{
                  padding: "12px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--gray)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "transparent"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-tertiary)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div>
                  <div style={{
                    color: "var(--cyan)",
                    fontSize: "9px",
                    marginBottom: "4px"
                  }}>
                    {repo.url.replace("https://github.com/", "")}
                  </div>
                  <div style={{
                    color: "var(--gray)",
                    fontSize: "7px"
                  }}>
                    {repo.timestamp}
                  </div>
                </div>
                <button
                  onClick={(e) => handleRemoveRepo(repo.url, e)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--gray)",
                    fontSize: "10px",
                    cursor: "pointer",
                    fontFamily: "'Press Start 2P', cursive",
                    padding: "4px 8px"
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--pink)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--gray)"}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Private repo token */}
      <div className="mb-4">
        <button
          onClick={() => setShowToken(!showToken)}
          style={{
            background: "none",
            border: "none",
            color: "var(--gray)",
            fontSize: "9px",
            cursor: "pointer",
            fontFamily: "'Press Start 2P', cursive",
            padding: 0
          }}
        >
          {showToken ? "▼" : "▶"} PRIVATE REPO? ADD TOKEN
        </button>

        {showToken && (
          <div className="mt-3">
            <input
              className="pixel-input"
              type="password"
              placeholder="GITHUB TOKEN (OPTIONAL)"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              style={{ fontSize: "11px" }}
            />
          </div>
        )}
      </div>

      {/* Ingest button */}
      <button
        className="pixel-btn"
        onClick={handleIngest}
        disabled={loading}
        style={{
          width: "100%",
          opacity: loading ? 0.6 : 1,
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "12px"
        }}
      >
        {loading ? "INGESTING..." : "▶ INGEST REPO"}
      </button>

      {/* Live progress */}
      {progressLines.length > 0 && (
        <div
          ref={progressRef}
          style={{
            marginTop: "16px",
            background: "var(--bg-primary)",
            border: "3px solid var(--gray)",
            padding: "12px",
            maxHeight: "200px",
            overflowY: "auto"
          }}
        >
          {progressLines.map((line, index) => (
            <div key={index} style={{
              fontSize: "9px",
              lineHeight: "2",
              color: line.type === "file" ? "var(--cyan)"
                : line.type === "skip" ? "var(--gray)"
                : "#ffffff"
            }}>
              {line.type === "file" ? "✓ " : line.type === "skip" ? "- " : "● "}
              {line.message}
            </div>
          ))}
        </div>
      )}

      {/* Final status */}
      {status && (
        <div style={{
          marginTop: "16px",
          padding: "12px",
          border: `3px solid ${status.type === "success" ? "var(--cyan)" : "var(--pink)"}`,
          color: status.type === "success" ? "var(--cyan)" : "var(--pink)",
          fontSize: "10px",
          lineHeight: "1.8"
        }}>
          {status.message}
        </div>
      )}
    </div>
  )
}

export default RepoInput
