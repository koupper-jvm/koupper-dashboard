import React, { useRef, useEffect } from 'react'

interface Props {
  size?: number
  className?: string
  style?: React.CSSProperties
}

const AuroraRing: React.FC<Props> = ({ size = 48, className, style }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })!
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const S = size * dpr
    canvas.width  = S
    canvas.height = S
    const cx = S / 2, cy = S / 2

    let raf: number, t = 0, visible = true, lastFrame = 0
    const FRAME_MS = 1000 / 30

    type ColorStop = { pos: number; color: [number,number,number,number] }
    type Ring = { r:number; thick:number; speed:number; dir:1|-1; stops:ColorStop[]; phase:number }

    const rings: Ring[] = [
      { r:0.44, thick:0.10, speed:0.28, dir: 1, phase:0, stops:[
        {pos:0.00, color:[0,242,254,0]},
        {pos:0.20, color:[0,242,254,0.5]},
        {pos:0.45, color:[123,95,255,0.75]},
        {pos:0.70, color:[255,0,122,0.55]},
        {pos:1.00, color:[255,0,122,0]},
      ]},
      { r:0.36, thick:0.06, speed:0.55, dir:-1, phase:Math.PI*0.6, stops:[
        {pos:0.00, color:[79,172,254,0]},
        {pos:0.30, color:[79,172,254,0.65]},
        {pos:0.60, color:[0,242,254,0.85]},
        {pos:1.00, color:[0,242,254,0]},
      ]},
      { r:0.27, thick:0.045, speed:1.1, dir: 1, phase:Math.PI*1.3, stops:[
        {pos:0.00, color:[255,0,122,0]},
        {pos:0.25, color:[255,0,122,0.7]},
        {pos:0.55, color:[200,80,255,0.8]},
        {pos:1.00, color:[200,80,255,0]},
      ]},
      { r:0.32, thick:0.022, speed:1.8, dir:-1, phase:Math.PI*0.2, stops:[
        {pos:0.00, color:[0,242,254,0]},
        {pos:0.50, color:[180,255,255,0.9]},
        {pos:1.00, color:[0,242,254,0]},
      ]},
    ]

    interface Spark { angle:number; r:number; size:number; alpha:number; speed:number; life:number; maxLife:number; cr:number; cg:number; cb:number }
    const sparks: Spark[] = []
    const SPARK_COLORS: [number,number,number][] = [[0,242,254],[123,95,255],[255,0,122],[79,172,254]]

    function spawnSpark() {
      const ring = rings[Math.floor(Math.random()*rings.length)]
      const c    = SPARK_COLORS[Math.floor(Math.random()*SPARK_COLORS.length)]
      sparks.push({
        angle: Math.random()*Math.PI*2,
        r: (S/2)*ring.r,
        size: (0.8+Math.random()*1.2)*dpr,
        alpha: 0,
        speed: (0.8+Math.random()*1.4)*ring.dir*(ring.speed*0.7)*0.016,
        life: 0,
        maxLife: 40+Math.floor(Math.random()*60),
        cr: c[0], cg: c[1], cb: c[2],
      })
    }
    for (let i = 0; i < 14; i++) spawnSpark()

    function lerpRgba(a: [number,number,number,number], b: [number,number,number,number], tt: number): string {
      return `rgba(${(a[0]+(b[0]-a[0])*tt)|0},${(a[1]+(b[1]-a[1])*tt)|0},${(a[2]+(b[2]-a[2])*tt)|0},${(a[3]+(b[3]-a[3])*tt).toFixed(3)})`
    }

    function drawRing(ring: Ring, time: number) {
      const radius   = (S/2)*ring.r
      const halfThick = (S/2)*ring.thick
      const arcLen   = Math.PI*(1.1+0.4*Math.sin(time*0.3+ring.phase))
      const startAngle = time*ring.speed*ring.dir+ring.phase
      const midStop  = ring.stops[Math.floor(ring.stops.length/2)]
      const [mr,mg,mb] = midStop.color

      ctx.save()
      ctx.translate(cx, cy)

      // Pass 1: glow (8 steps + shadowBlur)
      ctx.shadowColor = `rgba(${mr},${mg},${mb},0.6)`
      ctx.shadowBlur  = halfThick*3*dpr
      for (let i = 0; i < 8; i++) {
        const frac  = (i+0.5)/8
        const angle = startAngle+frac*arcLen
        let color   = 'rgba(0,0,0,0)'
        for (let s = 0; s < ring.stops.length-1; s++) {
          if (frac >= ring.stops[s].pos && frac <= ring.stops[s+1].pos) {
            color = lerpRgba(ring.stops[s].color, ring.stops[s+1].color,
              (frac-ring.stops[s].pos)/(ring.stops[s+1].pos-ring.stops[s].pos))
            break
          }
        }
        ctx.beginPath()
        ctx.arc(0, 0, radius, angle, angle+arcLen/8+0.01)
        ctx.strokeStyle = color
        ctx.lineWidth   = halfThick*2.8*dpr
        ctx.lineCap     = 'round'
        ctx.stroke()
      }
      ctx.shadowBlur = 0

      // Pass 2: crisp (40 steps)
      for (let i = 0; i < 40; i++) {
        const frac    = i/40
        const angle   = startAngle+frac*arcLen
        let color     = 'rgba(0,0,0,0)'
        for (let s = 0; s < ring.stops.length-1; s++) {
          if (frac >= ring.stops[s].pos && frac <= ring.stops[s+1].pos) {
            color = lerpRgba(ring.stops[s].color, ring.stops[s+1].color,
              (frac-ring.stops[s].pos)/(ring.stops[s+1].pos-ring.stops[s].pos))
            break
          }
        }
        const breathe = 1+0.12*Math.sin(time*1.5+ring.phase+frac*4)
        ctx.beginPath()
        ctx.arc(0, 0, radius, angle, angle+arcLen/40+0.002)
        ctx.strokeStyle = color
        ctx.lineWidth   = halfThick*0.7*breathe*dpr
        ctx.lineCap     = 'round'
        ctx.stroke()
      }
      ctx.restore()
    }

    function drawCore(time: number) {
      const pulse = 1+0.08*Math.sin(time*2.1)
      const coreR = S*0.11*pulse
      const grad  = ctx.createRadialGradient(cx,cy,0,cx,cy,coreR)
      grad.addColorStop(0,   'rgba(200,240,255,0.12)')
      grad.addColorStop(0.5, 'rgba(0,242,254,0.04)')
      grad.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(cx,cy,coreR,0,Math.PI*2)
      ctx.fillStyle = grad; ctx.fill()
    }

    function drawSparks() {
      for (let i = sparks.length-1; i >= 0; i--) {
        const sp = sparks[i]
        sp.life++; sp.angle += sp.speed*0.016
        const lf = sp.life/sp.maxLife
        sp.alpha = lf < 0.2 ? lf/0.2 : lf > 0.7 ? 1-(lf-0.7)/0.3 : 1
        const px = cx+Math.cos(sp.angle)*sp.r
        const py = cy+Math.sin(sp.angle)*sp.r
        ctx.beginPath(); ctx.arc(px,py,sp.size*2.5,0,Math.PI*2)
        ctx.fillStyle = `rgba(${sp.cr},${sp.cg},${sp.cb},${sp.alpha*0.2})`; ctx.fill()
        ctx.beginPath(); ctx.arc(px,py,sp.size,0,Math.PI*2)
        ctx.fillStyle = `rgba(${sp.cr},${sp.cg},${sp.cb},${sp.alpha*0.85})`; ctx.fill()
        if (sp.life >= sp.maxLife) { sparks.splice(i,1); spawnSpark() }
      }
    }

    const render = (now: number) => {
      if (!visible) { raf = requestAnimationFrame(render); return }
      if (now-lastFrame < FRAME_MS) { raf = requestAnimationFrame(render); return }
      lastFrame = now; t += 0.033
      ctx.clearRect(0,0,S,S)
      drawCore(t)
      for (const ring of rings) drawRing(ring, t)
      drawSparks()
      raf = requestAnimationFrame(render)
    }

    const observer = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
    observer.observe(canvas)
    raf = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [size])

  return (
    <canvas ref={canvasRef} className={className}
      style={{ width:size, height:size, display:'block', background:'transparent', borderRadius:'50%', willChange:'transform', ...style }}
    />
  )
}

export default AuroraRing
