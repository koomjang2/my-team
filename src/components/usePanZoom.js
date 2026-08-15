import { useEffect, useRef } from 'react'
import { isTypingTarget } from './keyboard.js'

const ZOOM_MIN = 0.3
const ZOOM_MAX = 3
// 이만큼 움직이면 '누른 것' 이 아니라 '끈 것' 으로 본다 — 카드를 눌러도 팬이 되게 하려면 필요하다
const DRAG_SLOP = 6
// 계보도 바깥 빈 바탕이 이보다 많이 보이지 않게 막는다 (무한 스크롤 방지)
const PAN_EDGE_GAP = 30

/**
 * 빈 바탕 드래그 팬 + 휠/핀치 줌.
 * translate + scale 을 한 레이어에 걸고 transformOrigin 을 좌상단으로 두어
 * 줌 수식(newPan = m - (m - oldPan) * ratio)이 단순해진다.
 */
export function usePanZoom(contentKey) {
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

  /**
   * 계보도가 실제로 차지하는 사각형 (팬 레이어 안의 좌표, 줌 1 기준).
   *
   * 레이어 자체를 재지 않고 회원 덩어리(`[data-tree-unit]`)들의 화면 사각형을 합쳐 쓴다 —
   * 레이어는 빈 레인(자식 없는 자리의 폭)까지 품고 있어 실제 카드보다 훨씬 넓다.
   * 안쪽에 걸린 `scale-[0.85] md:scale-100` 도 화면 사각형에는 이미 녹아 있다.
   *
   * 팬 도중에는 변하지 않으므로 제스처 시작·계보도 변경·칸 크기 변경 때만 다시 잰다
   * (움직일 때마다 재면 레이아웃이 매번 강제돼 폰에서 끊긴다).
   */
  const contentBoxRef = useRef(null)

  /**
   * 인쇄·그림 저장 중인가.
   * 그때는 CSS 가 패널을 원본 크기로 펼치고 팬 변형을 지운다(index.css 의 @media print).
   * 그 상태에서 재면 화면과 전혀 다른 값이 나오므로, 다 끝난 뒤 다시 잰다.
   */
  function isCapturing() {
    return document.body.classList.contains('print-panel-mode')
      || document.body.classList.contains('capture-mode')
  }

  function measureContent() {
    const container = containerRef.current
    const layer = layerRef.current
    if (!container || !layer || isCapturing()) return
    const units = layer.querySelectorAll('[data-tree-unit]')
    if (!units.length) return

    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
    for (const u of units) {
      const r = u.getBoundingClientRect()
      if (r.left < left) left = r.left
      if (r.right > right) right = r.right
      if (r.top < top) top = r.top
      if (r.bottom > bottom) bottom = r.bottom
    }

    // 화면 좌표 → 레이어 좌표: p = (화면값 − 레이어원점) / zoom
    const cRect = container.getBoundingClientRect()
    const cs = getComputedStyle(container)
    const padL = parseFloat(cs.paddingLeft) || 0
    const padT = parseFloat(cs.paddingTop) || 0
    const s = stateRef.current
    const z = s.zoom || 1
    const originX = cRect.left + padL + s.panX
    const originY = cRect.top + padT + s.panY
    contentBoxRef.current = {
      left: (left - originX) / z,
      right: (right - originX) / z,
      top: (top - originY) / z,
      bottom: (bottom - originY) / z,
    }
  }

  /**
   * 빈 바탕이 PAN_EDGE_GAP 넘게 보이지 않도록 네 방향 모두 가둔다.
   * 계보도가 보는 칸보다 작아 두 조건이 부딪히는 축은 '왼쪽/위 끝을 보여주는 쪽'으로 붙인다.
   * 아직 재기 전(첫 그림)에는 예전 규칙 — 루트를 화면 맨 위에 붙여 둔다 — 만 적용한다.
   */
  function clampPan() {
    const s = stateRef.current
    const container = containerRef.current
    const box = contentBoxRef.current
    if (!container || !box) {
      if (s.panY > 0) s.panY = 0
      return
    }

    const cs = getComputedStyle(container)
    const padL = parseFloat(cs.paddingLeft) || 0
    const padT = parseFloat(cs.paddingTop) || 0
    const z = s.zoom

    // 화면상 내용 왼쪽 끝 = padL + panX + box.left*z → 이 값이 GAP 을 넘지 않아야 한다
    const maxPanX = PAN_EDGE_GAP - padL - box.left * z
    const minPanX = container.clientWidth - PAN_EDGE_GAP - padL - box.right * z
    s.panX = minPanX > maxPanX ? maxPanX : Math.min(maxPanX, Math.max(minPanX, s.panX))

    const maxPanY = PAN_EDGE_GAP - padT - box.top * z
    const minPanY = container.clientHeight - PAN_EDGE_GAP - padT - box.bottom * z
    s.panY = minPanY > maxPanY ? maxPanY : Math.min(maxPanY, Math.max(minPanY, s.panY))
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

  // 어디를 잡아도 화면을 끌 수 있어야 한다 — 카드도, 편집창의 빈자리도, 버튼 위도.
  // 글자를 만지는 칸(입력칸·글상자)만 뺀다. 거기서 끌기는 캐럿·선택이라
  // 팬이 가로채면 글을 고칠 수 없다. [data-no-pan] 은 예외를 두고 싶을 때 쓴다.
  function isPanStart(target) {
    if (!target) return false
    return !target.closest('input, select, textarea, [data-no-pan]')
  }

  /**
   * 눌렀다 떼면 click 이 나야 하는 자리인가 (카드·버튼 등).
   * 이런 곳에서는 touchstart 를 막지 않는다 — 막으면 탭이 click 으로 이어지지 않는다.
   */
  function isTapTarget(target) {
    return !!target?.closest?.('.tree-node-card, button, a, label')
  }

  /**
   * 이름·ID·PV·메모를 치던 중 그 칸 밖을 누르면 커서를 뺀다.
   * 팬을 시작할 때 mousedown 의 기본 동작을 막는데(preventDefault), 브라우저가
   * 원래 그때 해 주던 blur 까지 함께 막혀 커서가 칸에 남아 있었다.
   * 누른 곳이 그 칸 자신이면 그대로 둔다 — 글 고치는 중이다.
   */
  function blurOutside(target) {
    const active = document.activeElement
    if (!active || !isTypingTarget(active)) return
    if (active === target || active.contains?.(target)) return
    active.blur()
  }

  function panStart(clientX, clientY) {
    const s = stateRef.current
    measureContent()
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
    blurOutside(e.target)
    if (!isPanStart(e.target)) return
    panStart(e.clientX, e.clientY)
    e.preventDefault()
  }

  function resetView() {
    const s = stateRef.current
    s.panX = 0
    s.panY = 0
    s.zoom = 1
    measureContent()
    apply()
  }

  /**
   * 계보도 모양이나 보는 칸 크기가 바뀌면 다시 재고 팬 범위도 다시 가둔다.
   * ResizeObserver 가 창 크기 변화와 **패널 비율 조절**(기준선 끌기)을 함께 잡아 준다.
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    measureContent()
    apply()
    const ro = new ResizeObserver(() => {
      // 인쇄·그림 저장이 패널을 잠시 펼칠 때도 여기가 불린다 — 그때는 손대지 않는다.
      // (끝나고 원래 크기로 돌아올 때 다시 불리므로 그때 제대로 잡힌다)
      if (isCapturing()) return
      measureContent()
      apply()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // 회원이 늘고 줄면 계보도 크기가 달라진다 (패널이 nodes 를 넘겨준다)
  useEffect(() => {
    measureContent()
    apply()
  }, [contentKey])

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
      measureContent()
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
        measureContent()
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
        blurOutside(t.target)
        if (!isPanStart(t.target)) return
        panStart(t.clientX, t.clientY)
        // 누르면 반응해야 하는 자리(카드·버튼)에서는 touchstart 를 막지 않는다 —
        // 막으면 탭이 click 으로 이어지지 않는다. 실제로 끌면 touchmove 에서 막는다.
        if (!isTapTarget(t.target)) e.preventDefault()
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
