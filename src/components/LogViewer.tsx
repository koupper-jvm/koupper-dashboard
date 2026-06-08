import { useEffect, useRef, useState } from 'react'
import type { LogResponse } from '../types/api'

interface Props {
  log: LogResponse | null
  title: string
}

type ViewMode = 'log' | 'result'

function lineClass(line: string): string {
  if (/ERROR|FAIL|\[!\]|\[FAILED\]|\[TIMEOUT\]/.test(line)) return 'log-error'
  if (/\[DONE\]|\[✓\]|✓|\[OK\]/.test(line)) return 'log-ok'
  if (/▶|\[?\]|CORTEX|\[WORKER\]/.test(line)) return 'log-info'
  if (line.startsWith('[DEBUG]')) return 'log-dim'
  if (line.startsWith('[RESULT]')) return 'log-result-line'
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

function extractResult(lines: string[]): { raw: string; parsed: unknown } | null {
  const sentinelLine = lines.find(l => l.trimStart().startsWith('[RESULT] '))
  if (!sentinelLine) return null
  const raw = sentinelLine.replace(/^\s*\[RESULT\]\s*/, '')
  try {
    return { raw, parsed: JSON.parse(raw) }
  } catch {
    return { raw, parsed: null }
  }
}

function ResultPanel({ raw, parsed }: { raw: string; parsed: unknown }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleKey(path: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  function renderValue(val: unknown, path: string, depth: number): React.ReactNode {
    if (val === null) return <span className="rj-null">null</span>
    if (typeof val === 'boolean') return <span className="rj-bool">{String(val)}</span>
    if (typeof val === 'number') return <span className="rj-num">{val}</span>
    if (typeof val === 'string') return <span className="rj-str">"{val.length > 200 ? val.slice(0, 200) + '…' : val}"</span>
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="rj-empty">[ ]</span>
      const isCollapsed = collapsed.has(path)
      return (
        <span>
          <button className="rj-toggle" onClick={() => toggleKey(path)}>
            {isCollapsed ? '▶' : '▼'} [ {val.length} ]
          </button>
          {!isCollapsed && (
            <div className="rj-children">
              {val.map((item, i) => (
                <div key={i} className="rj-row">
                  <span className="rj-idx">[{i}]</span>{' '}
                  {renderValue(item, `${path}.${i}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </span>
      )
    }
    if (typeof val === 'object' && val !== null) {
      const entries = Object.entries(val as Record<string, unknown>)
      if (entries.length === 0) return <span className="rj-empty">{ }</span>
      const isCollapsed = collapsed.has(path)
      return (
        <span>
          <button className="rj-toggle" onClick={() => toggleKey(path)}>
            {isCollapsed ? '▶' : '▼'} {'{' + entries.length + '}'}
          </button>
          {!isCollapsed && (
            <div className="rj-children">
              {entries.map(([k, v]) => (
                <div key={k} className="rj-row">
                  <span className="rj-key">{k}</span>
                  <span className="rj-colon">: </span>
                  {renderValue(v, `${path}.${k}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </span>
      )
    }
    return <span>{String(val)}</span>
  }

  if (!parsed) {
    return (
      <div className="log-body" style={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text)', padding: '0.75rem' }}>
        {raw}
      </div>
    )
  }

  return (
    <div className="log-body result-json-viewer">
      {renderValue(parsed, 'root', 0)}
    </div>
  )
}

export function LogViewer({ log, title }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<ViewMode>('log')

  const lines = log?.lines ?? []
  const resultData = extractResult(lines)

  useEffect(() => {
    setMode('log')
  }, [log?.jobId])

  useEffect(() => {
    const el = bodyRef.current
    if (!el || mode !== 'log') return
    const atBottom = el.scrollHeight - el.clientHeight <= el.scrollTop + 60
    if (atBottom) el.scrollTop = el.scrollHeight
  }, [log?.lines, mode])

  const q = search.trim().toLowerCase()
  const matchCount = q ? lines.filter(l => l.toLowerCase().includes(q)).length : 0

  return (
    <div className="log-panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{title}</span>
          {log?.live && <span className="live-indicator">● LIVE</span>}
          {resultData && (
            <div className="log-mode-tabs">
              <button
                className={`log-mode-tab ${mode === 'log' ? 'active' : ''}`}
                onClick={() => setMode('log')}
              >
                Log
              </button>
              <button
                className={`log-mode-tab result-tab ${mode === 'result' ? 'active' : ''}`}
                onClick={() => setMode('result')}
              >
                Result
              </button>
            </div>
          )}
        </div>
        {mode === 'log' && (
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
        )}
      </div>

      {mode === 'result' && resultData ? (
        <ResultPanel raw={resultData.raw} parsed={resultData.parsed} />
      ) : (
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
      )}
    </div>
  )
}
