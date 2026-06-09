import { createContext, useContext, useState } from 'react'
import type { SwarmSnapshot } from '../types/api'
import type { NodeInfo } from '../hooks/useNodes'

const VOICE_MUTED_KEY = 'cortex-voice-muted'

interface AppCtx {
  snapshot: SwarmSnapshot | null
  nodes: NodeInfo[]
  chatOpen: boolean
  setChatOpen: (v: boolean) => void
  selectedJob: { queue: string; id: string } | null
  setSelectedJob: (j: { queue: string; id: string } | null) => void
  voiceMuted: boolean
  toggleMute: () => void
}

const Ctx = createContext<AppCtx>({
  snapshot: null, nodes: [],
  chatOpen: true, setChatOpen: () => {},
  selectedJob: null, setSelectedJob: () => {},
  voiceMuted: false, toggleMute: () => {},
})

export function AppProvider({ snapshot, nodes, children }: {
  snapshot: SwarmSnapshot | null
  nodes: NodeInfo[]
  children: React.ReactNode
}) {
  const [chatOpen, setChatOpen] = useState(true)
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
    <Ctx.Provider value={{ snapshot, nodes, chatOpen, setChatOpen, selectedJob, setSelectedJob, voiceMuted, toggleMute }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
