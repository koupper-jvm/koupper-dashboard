import { useEffect, useRef, useState } from 'react'
import type { LogResponse } from '../types/api'

interface Props {
  log: LogResponse | null
  title: string
}

function lineClass(line: string): string {
  if (/ERROR|FAIL|\[!\]|\[FAILED\]|\[TIMEOUT\]/.test(line)) return 'log-error'
  if (/\[DONE\]|\[✓\]|✓|\[OK\]/.test(line)) return 'log-ok'
  if (/▶|\[?\]|CORTEX|\[WORKER\]/.test(line)) return 'log-info'
  if (line.startsWith('[DEBUG]')) return 'log-dim'
  return ''
}

function highlight(line: string, query: string): React.ReactNode {
  if (!query) return line
  const idx = line.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return line
  return (
    <>
      {line.slice(0, idx)}
      <mark className="log-highlight">{line.slice(idx, idx + query.length)}</mark>
      {line.slice(idx + query.length)}
    </>
  )
}

export function LogViewer({ log, title }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.clientHeight <= el.scrollTop + 60
    if (atBottom) el.scrollTop = el.scrollHeight
  }, [log?.lines])

  const lines = log?.lines ?? []
  const q = search.trim().toLowerCase()
  const matchCount = q ? lines.filter(l => l.toLowerCase().includes(q)).length : 0

  return (
    <div className="log-panel">
      <div className="panel-header">
        <span>{title}</span>
        <div className="log-search-row">
          <input
            className="log-search-input"
            type="text"
            placeholder="Search logs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <span className="log-search-count">
              {matchCount} match{matchCount !== 1 ? 'es' : ''}
            </span>
          )}
          {search && (
            <button className="log-search-clear" onClick={() => setSearch('')}>×</button>
          )}
        </div>
      </div>
      <div className="log-body" ref={bodyRef}>
        {!log || lines.length === 0 ? (
          <span className="empty">
            {log?.error ?? 'Select a job to view its log'}
          </span>
        ) : (
          lines.map((line, i) => {
            const isMatch = q ? line.toLowerCase().includes(q) : true
            return (
              <div
                key={i}
                className={`log-line ${lineClass(line)} ${q && !isMatch ? 'log-dimmed' : ''}`}
              >
                {q ? highlight(line, search.trim()) : line}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
