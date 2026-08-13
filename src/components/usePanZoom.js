import { useEffect, useRef } from 'react'

const ZOOM_MIN = 0.3
const ZOOM_MAX = 3
// 이만큼 움직이면 '누른 것' 이 아니라 '끈 것' 으로 본다 — 카드를 눌러도 팬이 되게 하려면 필요하다
const DRAG_SLOP = 6

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
    dragged: false,       // 이번 눌림에서 DRAG_SLOP 을 넘겼는가
    suppressClick: false, // 끌고 난 뒤 따라오는 click 한 번을 삼킨다
    pinchActive: false,
    pinchStartDist: 0,
    pinchStartZoom: 1,
    pinchCenterX: 0, pinchCenterY: 0,
    pinchStartPanX: 0, pinchStartPanY: 0,
  })

  // 루트('나')는 항상 화면 맨 위에 붙는다 — 위쪽 빈 공간을 만들며 내려갈 수 없고,
  // 아래(하위 계보도) 방향으로만 이동한다. panY > 0 이 곧 '나 위쪽 여백'이다.
  function clampPan() {
    const s = stateRef.current
    if (s.panY > 0) s.panY = 0
  }

  function apply() {
    if (!layerRef.current) return
    clampPan()
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

  // 버튼·입력칸·팝오버 위에서는 팬을 시작하지 않는다.
  // 노드 카드는 **허용한다** — 카드를 잡고도 화면을 끌 수 있어야 하기 때문이다.
  // 대신 살짝 눌렀다 뗀 것(탭)은 그대로 click 으로 흘려보내 편집창이 열리게 한다.
  function isPanStart(target) {
    if (!target) return false
    return !target.closest('button, input, select, textarea, [data-no-pan]')
  }

  /** 카드 위에서 시작한 눌림인가 — 터치에서 click 을 살려 두어야 하는 경우 */
  function isOnCard(target) {
    return !!target?.closest?.('.tree-node-card')
  }

  function panStart(clientX, clientY) {
    const s = stateRef.current
    s.active = true
    s.dragged = false
    s.startX = clientX
    s.startY = clientY
    s.panStartX = s.panX
    s.panStartY = s.panY
    containerRef.current?.classList.add('is-panning')
  }

  function panMove(clientX, clientY) {
    const s = stateRef.current
    if (!s.active) return
    const dx = clientX - s.startX
    const dy = clientY - s.startY
    if (!s.dragged && Math.hypot(dx, dy) > DRAG_SLOP) {
      s.dragged = true
      s.suppressClick = true // 끌었으니 카드가 열리면 안 된다
    }
    s.panX = s.panStartX + dx
    s.panY = s.panStartY + dy
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
    // 누를 때마다 먼저 푼다 — 끌고 난 뒤 버튼을 누르면 그 첫 탭이 삼켜지기 때문
    stateRef.current.suppressClick = false
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

  // 끌어서 화면을 옮긴 직후 따라오는 click 한 번을 잡아먹는다.
  // 이게 없으면 카드를 잡고 화면을 끌 때마다 편집창이 열린다.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function onClickCapture(e) {
      if (!stateRef.current.suppressClick) return
      stateRef.current.suppressClick = false
      e.stopPropagation()
      e.preventDefault()
    }
    container.addEventListener('click', onClickCapture, true)
    return () => container.removeEventListener('click', onClickCapture, true)
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
        s.suppressClick = false
        if (!isPanStart(t.target)) return
        panStart(t.clientX, t.clientY)
        // 카드 위에서는 touchstart 를 막지 않는다 — 막으면 탭이 click 으로 이어지지 않아
        // 편집창이 열리지 않는다. 실제로 끌기 시작하면 touchmove 에서 막는다.
        if (!isOnCard(t.target)) e.preventDefault()
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
