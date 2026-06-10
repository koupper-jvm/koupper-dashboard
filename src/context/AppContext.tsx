import { createContext, useContext, useState } from 'react'
import type { SwarmSnapshot } from '../types/api'
import type { NodeInfo } from '../hooks/useNodes'

const VOICE_MUTED_KEY  = 'cortex-voice-muted'
const CHAT_OPEN_KEY   = 'cortex-chat-open'

interface AppCtx {
  snapshot: SwarmSnapshot | null
  nodes: NodeInfo[]
  chatOpen: boolean
  setChatOpen: (v: boolean) => void
  selectedJob: { queue: string; id: string } | null
  setSelectedJob: (j: { queue: string; id: string } | null) => void
  voiceMuted: boolean
  toggleMute: () => void
  refreshNodes: () => void
}

const Ctx = createContext<AppCtx>({
  snapshot: null, nodes: [],
  chatOpen: true, setChatOpen: () => {},
  selectedJob: null, setSelectedJob: () => {},
  voiceMuted: false, toggleMute: () => {},
  refreshNodes: () => {},
})

export function AppProvider({ snapshot, nodes, refreshNodes, children }: {
  snapshot: SwarmSnapshot | null
  nodes: NodeInfo[]
  refreshNodes: () => void
  children: React.ReactNode
}) {
  const [chatOpen, setChatOpenRaw] = useState(
    () => localStorage.getItem(CHAT_OPEN_KEY) !== 'false'
  )

  function setChatOpen(v: boolean) {
    localStorage.setItem(CHAT_OPEN_KEY, String(v))
    setChatOpenRaw(v)
  }
  const [selectedJob, setSelectedJob] = useState<{ queue: string; id: string } | null>(null)
  const [voiceMuted, setVoiceMuted] = useState(
    () => localStorage.getItem(VOICE_MUTED_KEY) === 'true'
  )

  function toggleMute() {
    setVoiceMuted(prev => {
      const next = !prev
      localStorage.setItem(VOICE_MUTED_KEY, String(next))
      return next
    })
  }

  return (
    <Ctx.Provider value={{ snapshot, nodes, chatOpen, setChatOpen, selectedJob, setSelectedJob, voiceMuted, toggleMute, refreshNodes }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
