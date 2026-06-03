import { useEffect, useRef, useState } from 'react'

export function useResize(defaultLeft = 350, defaultMid = 420) {
  const [leftW, setLeftW] = useState(defaultLeft)
  const [midW,  setMidW]  = useState(defaultMid)

  const drag = useRef<{
    handle: 'lm' | 'mr'
    startX: number
    startLeft: number
    startMid: number
  } | null>(null)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = drag.current
      if (!d) return
      const dx = e.clientX - d.startX
      if (d.handle === 'lm') {
        setLeftW(Math.max(180, d.startLeft + dx))
      } else {
        setMidW(Math.max(140, d.startMid + dx))
      }
    }
    function onUp() {
      drag.current = null
      document.body.style.cursor = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [])

  function startDrag(handle: 'lm' | 'mr') {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      drag.current = { handle, startX: e.clientX, startLeft: leftW, startMid: midW }
      document.body.style.cursor = 'col-resize'
    }
  }

  return { leftW, midW, startDrag }
}
