import { useEffect, useRef } from 'react'
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

export function LogViewer({ log, title }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.clientHeight <= el.scrollTop + 60
    if (atBottom) el.scrollTop = el.scrollHeight
  }, [log?.lines])

  return (
    <div className="log-panel">
      <div className="panel-header">
        <span>{title}</span>
      </div>
      <div className="log-body" ref={bodyRef}>
        {!log || log.lines.length === 0 ? (
          <span className="empty">
            {log?.error ?? 'Select a job to view its log'}
          </span>
        ) : (
          log.lines.map((line, i) => (
            <div key={i} className={`log-line ${lineClass(line)}`}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
