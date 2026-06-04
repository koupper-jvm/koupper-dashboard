import { useEffect, useRef, useState } from 'react'

export function useVerticalResize(defaultPct = 45) {
  const [chatPct, setChatPct] = useState(defaultPct)
  const drag = useRef<{ startY: number; startPct: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = drag.current
      if (!d || !containerRef.current) return
      const h = containerRef.current.clientHeight
      if (h === 0) return
      const dy = e.clientY - d.startY
      const newPct = Math.min(80, Math.max(20, d.startPct + (dy / h) * 100))
      setChatPct(newPct)
    }
    function onUp() {
      drag.current = null
      document.body.style.cursor = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  function startVDrag(e: React.MouseEvent) {
    e.preventDefault()
    drag.current = { startY: e.clientY, startPct: chatPct }
    document.body.style.cursor = 'row-resize'
  }

  return { chatPct, startVDrag, containerRef }
}
