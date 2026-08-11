import { useEffect, useRef } from 'react'

const ZOOM_MIN = 0.3
const ZOOM_MAX = 3

/**
 * 빈 바탕 드래그 팬 + 휠/핀치 줌.
 * translate + scale 을 한 레이어에 걸고 transformOrigin 을 좌상단으로 두어
 * 줌 수식(newPan = m - (m - oldPan) * ratio)이 단순해진다.
 */
export function usePanZoom() {
  const containerRef = useRef(null)
  const layerRef = useRef(null)
  const stateRef = useRef({
    active: false,
    startX: 0, startY: 0,
    panStartX: 0, panStartY: 0,
    panX: 0, panY: 0, zoom: 1,
    pinchActive: false,
    pinchStartDist: 0,
    pinchStartZoom: 1,
    pinchCenterX: 0, pinchCenterY: 0,
    pinchStartPanX: 0, pinchStartPanY: 0,
  })

  function apply() {
    if (!layerRef.current) return
    const { panX, panY, zoom } = stateRef.current
    layerRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
  }

  function pointInContainer(clientX, clientY) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: clientX, y: clientY }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function zoomAtPoint(mx, my, newZoom) {
    const s = stateRef.current
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newZoom))
    const ratio = clamped / s.zoom
    s.panX = mx - (mx - s.panX) * ratio
    s.panY = my - (my - s.panY) * ratio
    s.zoom = clamped
  }

  // 버튼/입력/노드 카드 위에서는 팬을 시작하지 않는다 — 빈 바탕만 허용
  function isPanStart(target) {
    if (!target) return false
    return !target.closest('button, input, select, textarea, .tree-node-card, [data-no-pan]')
  }

  function panStart(clientX, clientY) {
    const s = stateRef.current
    s.active = true
    s.startX = clientX
    s.startY = clientY
    s.panStartX = s.panX
    s.panStartY = s.panY
    containerRef.current?.classList.add('is-panning')
  }

  function panMove(clientX, clientY) {
    const s = stateRef.current
    if (!s.active) return
    s.panX = s.panStartX + (clientX - s.startX)
    s.panY = s.panStartY + (clientY - s.startY)
    apply()
  }

  function panEnd() {
    const s = stateRef.current
    if (!s.active) return
    s.active = false
    containerRef.current?.classList.remove('is-panning')
  }

  function onMouseDown(e) {
    if (e.button !== 0) return
    if (!isPanStart(e.target)) return
    panStart(e.clientX, e.clientY)
    e.preventDefault()
  }

  function resetView() {
    const s = stateRef.current
    s.panX = 0
    s.panY = 0
    s.zoom = 1
    apply()
  }

  useEffect(() => {
    function onMove(e) {
      if (!stateRef.current.active) return
      panMove(e.clientX, e.clientY)
    }
    function onUp() { panEnd() }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // 휠: Ctrl/Cmd 는 줌(마우스 위치 기준), 평소엔 팬
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function onWheel(e) {
      e.preventDefault()
      const s = stateRef.current
      if (e.ctrlKey || e.metaKey) {
        const { x, y } = pointInContainer(e.clientX, e.clientY)
        zoomAtPoint(x, y, s.zoom * Math.exp(-e.deltaY * 0.0015))
      } else {
        s.panX -= e.deltaX
        s.panY -= e.deltaY
      }
      apply()
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])

  // 모바일: 1손가락 팬 + 2손가락 핀치 줌
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

    function onTouchStart(e) {
      const s = stateRef.current
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]]
        const { x, y } = pointInContainer((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2)
        s.pinchActive = true
        s.pinchStartDist = dist(a, b)
        s.pinchStartZoom = s.zoom
        s.pinchCenterX = x
        s.pinchCenterY = y
        s.pinchStartPanX = s.panX
        s.pinchStartPanY = s.panY
        s.active = false
        container.classList.remove('is-panning')
        e.preventDefault()
        return
      }
      if (e.touches.length === 1 && !s.pinchActive) {
        const t = e.touches[0]
        if (!isPanStart(t.target)) return
        panStart(t.clientX, t.clientY)
        e.preventDefault()
      }
    }

    function onTouchMove(e) {
      const s = stateRef.current
      if (s.pinchActive && e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]]
        const newDist = dist(a, b)
        if (s.pinchStartDist > 0) {
          const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s.pinchStartZoom * (newDist / s.pinchStartDist)))
          const ratio = clamped / s.pinchStartZoom
          s.panX = s.pinchCenterX - (s.pinchCenterX - s.pinchStartPanX) * ratio
          s.panY = s.pinchCenterY - (s.pinchCenterY - s.pinchStartPanY) * ratio
          s.zoom = clamped
          apply()
        }
        e.preventDefault()
        return
      }
      if (s.active && e.touches.length === 1) {
        const t = e.touches[0]
        panMove(t.clientX, t.clientY)
        e.preventDefault()
      }
    }

    function onTouchEnd(e) {
      const s = stateRef.current
      if (e.touches.length < 2) s.pinchActive = false
      if (e.touches.length === 0) panEnd()
    }

    container.addEventListener('touchstart', onTouchStart, { passive: false })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd)
    container.addEventListener('touchcancel', onTouchEnd)
    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return { containerRef, layerRef, onMouseDown, resetView }
}
