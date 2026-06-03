import CodeMirror from '@uiw/react-codemirror'
import { java } from '@codemirror/lang-java'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

interface Props {
  name: string
  content: string
  onClose: () => void
}

const noPointer = EditorView.theme({ '.cm-content': { cursor: 'text' } })

export function AgentViewer({ name, content, onClose }: Props) {
  return (
    <div className="agent-viewer">
      <div className="panel-header">
        <span className="agent-viewer-title">
          <span style={{ color: 'var(--purple)' }}>◈</span>
          {' '}{name}.kts
        </span>
        <button className="close-btn" onClick={onClose} title="Close">✕</button>
      </div>
      <div className="agent-viewer-body">
        <CodeMirror
          value={content}
          height="100%"
          theme={oneDark}
          extensions={[java(), noPointer]}
          editable={false}
          basicSetup={{
            lineNumbers:      true,
            foldGutter:       true,
            highlightActiveLine: false,
            autocompletion:   false,
            searchKeymap:     false,
          }}
        />
      </div>
    </div>
  )
}
