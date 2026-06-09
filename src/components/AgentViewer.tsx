import { useEffect, useCallback, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { java } from '@codemirror/lang-java'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

interface Props {
  name: string
  content: string
  onClose: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function AgentViewer({ name, content, onClose }: Props) {
  const [code, setCode]         = useState(content)
  const [dirty, setDirty]       = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [code])

  const handleChange = useCallback((val: string) => {
    setCode(val)
    setDirty(val !== content)
    setSaveState('idle')
  }, [content])

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(code).catch(() => {})
  }, [code])

  async function handleSave() {
    if (!dirty) return
    setSaveState('saving')
    try {
      const res = await fetch(`/api/agent/${name}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: code }),
      })
      const data = await res.json()
      setSaveState(data.ok ? 'saved' : 'error')
      if (data.ok) setDirty(false)
      setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  const lineCount = code.split('\n').length

  const saveLabel =
    saveState === 'saving' ? '↻ Saving…' :
    saveState === 'saved'  ? '✓ Saved'   :
    saveState === 'error'  ? '✕ Error'   :
    dirty                  ? '⬆ Save'    : '✓ Saved'

  const saveCls =
    saveState === 'saved' ? 'agent-viewer-btn save-ok' :
    saveState === 'error' ? 'agent-viewer-btn save-err' :
    dirty                 ? 'agent-viewer-btn save-dirty' : 'agent-viewer-btn save-clean'

  return (
    <div className="agent-viewer">
      <div className="agent-viewer-toolbar">
        <div className="agent-viewer-toolbar-left">
          <span className="agent-viewer-lang">KTS</span>
          <span className="agent-viewer-title">◈ {name}.kts</span>
          <span className="agent-viewer-meta">{lineCount} lines</span>
          {dirty && <span className="agent-viewer-dirty">● unsaved</span>}
        </div>
        <div className="agent-viewer-toolbar-right">
          <span className="agent-viewer-hint">Ctrl+F search · Ctrl+S save · Esc close</span>
          <button className="agent-viewer-btn" onClick={handleCopy}>⎘ Copy</button>
          <button className={saveCls} onClick={handleSave} disabled={!dirty || saveState === 'saving'}>
            {saveLabel}
          </button>
          <button className="agent-viewer-btn agent-viewer-close-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="agent-viewer-body">
        <CodeMirror
          value={code}
          height="100%"
          theme={oneDark}
          extensions={[java(), EditorView.lineWrapping]}
          editable={true}
          onChange={handleChange}
          basicSetup={{
            lineNumbers:               true,
            foldGutter:                true,
            highlightActiveLine:       true,
            highlightSelectionMatches: true,
            searchKeymap:              true,
            autocompletion:            false,
            bracketMatching:           true,
            closeBrackets:             true,
            indentOnInput:             true,
            tabSize:                   4,
          }}
        />
      </div>
    </div>
  )
}
