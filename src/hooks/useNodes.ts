import { useState, useEffect } from 'react'

export interface NodeInfo {
  host: string
  status: string
  role: string
  agents: string[]
  registeredAt: string
  sshUser?: string
  sshKeyPath?: string
}

export function useNodes(refreshTick?: number) {
  const [nodes, setNodes] = useState<NodeInfo[]>([])

  useEffect(() => {
    const fetch_ = () => {
      fetch('/api/nodes')
        .then(r => r.json())
        .then(d => { if (d.ok) setNodes(d.nodes ?? []) })
        .catch(() => {})
    }
    fetch_()
    const id = setInterval(fetch_, 10_000)
    return () => clearInterval(id)
  }, [refreshTick])

  return nodes
}
