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
    canvas.width = S
    canvas.height = S
    const cx = S / 2, cy = S / 2

    let raf: number, t = 0, visible = true, lastFrame = 0
    const FRAME_MS = 1000 / 30

    const rings = [
      { r: 0.44, thick: 0.10, speed: 0.28, dir: 1 as 1|-1, phase: 0,
        stops: [[0,0,[0,242,254,0]],[0.20,[0,242,254,0.5]],[0.45,[123,95,255,0.75]],[0.70,[255,0,122,0.55]],[1,[255,0,122,0]]] },
      { r: 0.36, thick: 0.06, speed: 0.55, dir: -1 as 1|-1, phase: Math.PI*0.6,
        stops: [[0,[79,172,254,0]],[0.30,[79,172,254,0.65]],[0.60,[0,242,254,0.85]],[1,[0,242,254,0]]] },
      { r: 0.27, thick: 0.045, speed: 1.1, dir: 1 as 1|-1, phase: Math.PI*1.3,
        stops: [[0,[255,0,122,0]],[0.25,[255,0,122,0.7]],[0.55,[200,80,255,0.8]],[1,[200,80,255,0]]] },
      { r: 0.32, thick: 0.022, speed: 1.8, dir: -1 as 1|-1, phase: Math.PI*0.2,
        stops: [[0,[0,242,254,0]],[0.50,[180,255,255,0.9]],[1,[0,242,254,0]]] },
    ] as Array<{ r:number; thick:number; speed:number; dir:1|-1; phase:number; stops:Array<[number, [number,number,number,number]]> }>

    interface Spark { angle:number; r:number; size:number; alpha:number; speed:number; life:number; maxLife:number; cr:number; cg:number; cb:number }
    const sparks: Spark[] = []
    const SPARK_COLORS = [[0,242,254],[123,95,255],[255,0,122],[79,172,254]] as [number,number,number][]

    function spawnSpark() {
      const ring = rings[Math.floor(Math.random()*rings.length)]
      const c = SPARK_COLORS[Math.floor(Math.random()*SPARK_COLORS.length)]
      sparks.push({ angle:Math.random()*Math.PI*2, r:ring.r*S, size:(0.8+Math.random()*1.2)*dpr,
        alpha:0, speed:(0.8+Math.random()*1.4)*ring.dir*(ring.speed*0.7)*0.016,
        life:0, maxLife:40+Math.floor(Math.random()*60), cr:c[0], cg:c[1], cb:c[2] })
    }
    for (let i=0;i<8;i++) spawnSpark()

    function drawRing(ring: typeof rings[0], time: number) {
      const angle = time * ring.speed * ring.dir + ring.phase
      const r = ring.r * S, halfThick = ring.thick * S * 0.5
      const breathe = 1 + 0.04 * Math.sin(time * 1.7 + ring.phase)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angle)
      // Use arc segments with color interpolation
      const segs = 60
      for (let i=0;i<segs;i++) {
        const a0 = (i/segs)*Math.PI*2, a1 = ((i+1)/segs)*Math.PI*2
        const frac = i/segs
        // Find color at this fraction
        let c: [number,number,number,number] = [0,0,0,0]
        const stops = ring.stops
        for (let j=0;j<stops.length-1;j++) {
          const [p0,col0] = stops[j]; const [p1,col1] = stops[j+1]
          if (frac >= p0 && frac <= p1) {
            const t2 = (frac-p0)/(p1-p0)
            c = col0.map((v,k) => v + (col1[k]-v)*t2) as [number,number,number,number]
            break
          }
        }
        ctx.beginPath()
        ctx.arc(0, 0, r, a0, a1)
        ctx.lineWidth = halfThick * breathe * dpr
        ctx.lineCap = 'butt'
        ctx.strokeStyle = `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3]})`
        ctx.stroke()
      }
      ctx.restore()
    }

    function drawCore(time: number) {
      const pulse = 1 + 0.08*Math.sin(time*2.1)
      const coreR = S*0.11*pulse
      const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,coreR)
      grad.addColorStop(0,'rgba(200,240,255,0.12)')
      grad.addColorStop(0.5,'rgba(0,242,254,0.04)')
      grad.addColorStop(1,'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(cx,cy,coreR,0,Math.PI*2)
      ctx.fillStyle = grad; ctx.fill()
    }

    function drawSparks() {
      for (let i=sparks.length-1;i>=0;i--) {
        const sp = sparks[i]
        sp.life++; sp.angle += sp.speed
        const lf = sp.life/sp.maxLife
        sp.alpha = lf<0.2 ? lf/0.2 : lf>0.7 ? 1-(lf-0.7)/0.3 : 1
        const px = cx+Math.cos(sp.angle)*sp.r, py = cy+Math.sin(sp.angle)*sp.r
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
      style={{ width: size, height: size, display: 'block', background: 'transparent', borderRadius: '50%', willChange: 'transform', ...style }}
    />
  )
}

export default AuroraRing
