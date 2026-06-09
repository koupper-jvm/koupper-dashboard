import { createContext, useContext, useState } from 'react'
import type { SwarmSnapshot } from '../types/api'
import type { NodeInfo } from '../hooks/useNodes'

interface AppCtx {
  snapshot: SwarmSnapshot | null
  nodes: NodeInfo[]
  chatOpen: boolean
  setChatOpen: (v: boolean) => void
  selectedJob: { queue: string; id: string } | null
  setSelectedJob: (j: { queue: string; id: string } | null) => void
}

const Ctx = createContext<AppCtx>({
  snapshot: null, nodes: [],
  chatOpen: true, setChatOpen: () => {},
  selectedJob: null, setSelectedJob: () => {},
})

export function AppProvider({ snapshot, nodes, children }: {
  snapshot: SwarmSnapshot | null
  nodes: NodeInfo[]
  children: React.ReactNode
}) {
  const [chatOpen, setChatOpen] = useState(true)
  const [selectedJob, setSelectedJob] = useState<{ queue: string; id: string } | null>(null)

  return (
    <Ctx.Provider value={{ snapshot, nodes, chatOpen, setChatOpen, selectedJob, setSelectedJob }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
