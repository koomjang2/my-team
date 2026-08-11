import { useEffect, useRef, useState } from 'react'
import { Plus, ChevronDown, Check, Pencil } from 'lucide-react'

const TAG_COLORS = {
  slate:  'bg-gray-200 text-gray-700 border-gray-400',
  blue:   'bg-blue-100 text-blue-800 border-blue-400',
  orange: 'bg-orange-100 text-orange-800 border-orange-400',
  green:  'bg-green-100 text-green-700 border-green-500',
  purple: 'bg-purple-100 text-purple-800 border-purple-500',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-500',
  pink:   'bg-pink-100 text-pink-800 border-pink-500',
  red:    'bg-red-100 text-red-800 border-red-500',
}
const TAG_DOT = {
  slate: 'bg-gray-400', blue: 'bg-blue-500', orange: 'bg-orange-500', green: 'bg-green-500',
  purple: 'bg-purple-500', yellow: 'bg-yellow-500', pink: 'bg-pink-500', red: 'bg-red-500',
}

const ALL_COLORS = Object.keys(TAG_COLORS)
const NODE_CARD_WIDTH = 84
const EMPTY_LANE_WIDTH = 120
const BRANCH_GAP = 48

function countDescendants(nodeId, allNodes) {
  const children = allNodes.filter((n) => n.parentId === nodeId)
  let total = children.length
  for (const c of children) total += countDescendants(c.id, allNodes)
  return total
}

function EditableField({ value, onChange, placeholder, className, inputClassName }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    onChange(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        className={inputClassName}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <button
      type="button"
      className={`${className} outline-none rounded-sm px-0.5 focus-visible:ring-1 focus-visible:ring-sky-400`}
      onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true) }}
    >
      {value || <span className="text-gray-300">{placeholder}</span>}
    </button>
  )
}

function calcSubtreeWidth(nodeId, allNodes, cache) {
  if (cache.has(nodeId)) return cache.get(nodeId)
  const left = allNodes.find((n) => n.parentId === nodeId && n.side === 'left')
  const right = allNodes.find((n) => n.parentId === nodeId && n.side === 'right')
  if (!left && !right) {
    const width = Math.max(NODE_CARD_WIDTH, EMPTY_LANE_WIDTH)
    cache.set(nodeId, width)
    return width
  }

  const leftWidth = left ? calcSubtreeWidth(left.id, allNodes, cache) : Math.max(NODE_CARD_WIDTH, EMPTY_LANE_WIDTH)
  const rightWidth = right ? calcSubtreeWidth(right.id, allNodes, cache) : Math.max(NODE_CARD_WIDTH, EMPTY_LANE_WIDTH)
  const width = leftWidth + rightWidth + BRANCH_GAP
  cache.set(nodeId, width)
  return width
}

function NodeCard({ node, isSelected, onSelect, canAddLeft, canAddRight,
  onAddLeft, onAddRight, onRemove, onChangeColor, onChangeName, onChangeTitle, allNodes }) {
  const [showColorMenu, setShowColorMenu] = useState(false)
  const color = node.color && TAG_COLORS[node.color] ? node.color : 'slate'
  const colorClass = TAG_COLORS[color]
  const descendantCount = countDescendants(node.id, allNodes)

  return (
    <div className="relative flex flex-col items-center z-10 hover:z-[500]">
      <div
        data-tree-node="true"
        className={`
          tree-node-card relative border-2 rounded-lg px-3 py-1.5 cursor-pointer min-w-[84px] text-center
          transition-all duration-300 select-none
          shadow-[0_6px_14px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.65)]
          bg-gradient-to-b from-white/65 via-white/20 to-black/5 backdrop-blur-[1px]
          ${colorClass}
          ${isSelected
            ? 'ring-2 ring-offset-1 ring-blue-500 shadow-[0_10px_20px_rgba(15,23,42,0.24),inset_0_1px_0_rgba(255,255,255,0.75)]'
            : 'hover:-translate-y-[2px] hover:shadow-[0_12px_22px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.75)]'}
        `}
        onClick={() => onSelect()}
      >
        <div className="relative inline-block">
          <button
            className="flex items-center gap-0.5 mx-auto text-xs font-bold hover:opacity-70"
            onClick={(e) => { e.stopPropagation(); setShowColorMenu(!showColorMenu) }}
            title="클릭하여 태그 색상 변경"
          >
            <span className={`inline-block w-2 h-2 rounded-full ${TAG_DOT[color]}`} />
            <ChevronDown size={9} />
          </button>

          {showColorMenu && (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-[100] bg-white border rounded-lg shadow-xl py-1 px-1.5 grid grid-cols-4 gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {ALL_COLORS.map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-full flex items-center justify-center hover:opacity-80"
                  style={{ outline: color === c ? '2px solid #2563eb' : 'none', outlineOffset: 1 }}
                  onClick={() => { onChangeColor(c); setShowColorMenu(false) }}
                  title={c}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${TAG_DOT[c]}`}>
                    {color === c && <Check size={10} className="text-white" />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <EditableField
          value={node.name}
          onChange={onChangeName}
          placeholder="이름"
          className="block w-full text-xs font-semibold mt-0.5 whitespace-nowrap cursor-text"
          inputClassName="text-xs font-semibold text-center bg-white border-b border-gray-500 outline-none w-full min-w-0 px-0.5"
        />

        <EditableField
          value={node.title ?? ''}
          onChange={onChangeTitle}
          placeholder="직책/역할"
          className="block w-full text-[10px] text-gray-600 whitespace-nowrap cursor-text"
          inputClassName="text-[10px] text-center bg-white border-b border-gray-400 outline-none w-full min-w-0 px-0.5"
        />

        {descendantCount > 0 && (
          <div className="mt-0.5 text-[9px] text-gray-500">하위 {descendantCount}명</div>
        )}

        {onRemove && (
          <button
            className="absolute -top-2 -right-2 bg-gray-300 text-gray-500 rounded-full w-4 h-4 text-[10px]
                       flex items-center justify-center z-10 opacity-30 hover:opacity-80 transition-opacity"
            style={{ lineHeight: 1 }}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            title="노드 삭제"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex gap-1 mt-1.5">
        <button
          disabled={!canAddLeft}
          onClick={(e) => { e.stopPropagation(); onAddLeft?.() }}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border font-medium transition-colors
            ${!canAddLeft
              ? 'opacity-20 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
              : 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100 cursor-pointer'}`}
          title={!canAddLeft ? '왼쪽 자식 이미 존재' : '왼쪽 하위 추가'}
        >
          <Plus size={8} /><span>좌</span>
        </button>
        <button
          disabled={!canAddRight}
          onClick={(e) => { e.stopPropagation(); onAddRight?.() }}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border font-medium transition-colors
            ${!canAddRight
              ? 'opacity-20 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
              : 'bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100 cursor-pointer'}`}
          title={!canAddRight ? '오른쪽 자식 이미 존재' : '오른쪽 하위 추가'}
        >
          <Plus size={8} /><span>우</span>
        </button>
      </div>
    </div>
  )
}

function BinaryTreeNode({ nodeId, allNodes, selectedId, onSelect, onAdd, onRemove, onChangeColor, onChangeName, onChangeTitle }) {
  const [addSide, setAddSide] = useState(null)
  const [newName, setNewName] = useState('')
  const [newTitle, setNewTitle] = useState('')

  const node = allNodes.find((n) => n.id === nodeId)
  if (!node) return null

  const leftChild  = allNodes.find((n) => n.parentId === nodeId && n.side === 'left')
  const rightChild = allNodes.find((n) => n.parentId === nodeId && n.side === 'right')
  const hasLeft    = !!leftChild
  const hasRight   = !!rightChild
  const hasChildren = hasLeft || hasRight
  const isRoot = !node.parentId
  const widthCache = new Map()

  const leftLaneWidth = hasLeft
    ? calcSubtreeWidth(leftChild.id, allNodes, widthCache)
    : Math.max(NODE_CARD_WIDTH, EMPTY_LANE_WIDTH)
  const rightLaneWidth = hasRight
    ? calcSubtreeWidth(rightChild.id, allNodes, widthCache)
    : Math.max(NODE_CARD_WIDTH, EMPTY_LANE_WIDTH)
  const childRowWidth = leftLaneWidth + rightLaneWidth + BRANCH_GAP
  const leftCenterX = leftLaneWidth / 2
  const rightCenterX = leftLaneWidth + BRANCH_GAP + (rightLaneWidth / 2)

  function handleAdd() {
    const name = newName.trim() || (addSide === 'left' ? '새 구성원(좌)' : '새 구성원(우)')
    onAdd(nodeId, addSide, name, newTitle.trim())
    setAddSide(null); setNewName(''); setNewTitle('')
  }

  return (
    <div className="flex flex-col items-center" style={{ minWidth: hasChildren ? childRowWidth : NODE_CARD_WIDTH }}>
      <NodeCard
        node={node}
        isSelected={node.id === selectedId}
        onSelect={() => onSelect(node.id)}
        canAddLeft={!hasLeft}
        canAddRight={!hasRight}
        onAddLeft={() => setAddSide(addSide === 'left' ? null : 'left')}
        onAddRight={() => setAddSide(addSide === 'right' ? null : 'right')}
        onRemove={isRoot ? undefined : () => onRemove(node.id)}
        onChangeColor={(c) => onChangeColor(node.id, c)}
        onChangeName={(name) => onChangeName(node.id, name)}
        onChangeTitle={(title) => onChangeTitle(node.id, title)}
        allNodes={allNodes}
      />

      {addSide && (
        <div
          className="mt-1.5 p-2 bg-white border rounded-lg shadow-lg text-xs w-44 z-40"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-semibold text-gray-600 mb-1.5">
            <span className={addSide === 'left' ? 'text-blue-600' : 'text-orange-500'}>
              {addSide === 'left' ? '좌' : '우'}
            </span> 하위 추가
          </p>
          <input
            className="border rounded px-1 py-0.5 w-full mb-1 text-xs"
            placeholder="이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <input
            className="border rounded px-1 py-0.5 w-full mb-1.5 text-xs"
            placeholder="직책/역할 (선택)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-1">
            <button
              className="flex-1 bg-blue-500 text-white rounded px-2 py-0.5 text-xs hover:bg-blue-600"
              onClick={handleAdd}
            >추가</button>
            <button
              className="bg-gray-100 rounded px-2 py-0.5 text-xs hover:bg-gray-200"
              onClick={() => { setAddSide(null); setNewName(''); setNewTitle('') }}
            >취소</button>
          </div>
        </div>
      )}

      {hasChildren && (
        <div className="flex flex-col items-center" style={{ width: childRowWidth }}>
          <div className="w-px h-3 bg-gray-400" />
          <div className="relative" style={{ width: childRowWidth, height: 12 }}>
            {hasLeft && hasRight && (
              <>
                <div className="absolute bg-gray-400" style={{ top: 0, left: leftCenterX, width: rightCenterX - leftCenterX, height: 2 }} />
                <div className="absolute w-px bg-gray-400" style={{ top: 0, left: leftCenterX, height: 12 }} />
                <div className="absolute w-px bg-gray-400" style={{ top: 0, left: rightCenterX, height: 12 }} />
              </>
            )}
            {hasLeft && !hasRight && (
              <>
                <div className="absolute bg-gray-400" style={{ top: 0, left: leftCenterX, width: (childRowWidth / 2) - leftCenterX, height: 2 }} />
                <div className="absolute w-px bg-gray-400" style={{ top: 0, left: leftCenterX, height: 12 }} />
              </>
            )}
            {!hasLeft && hasRight && (
              <>
                <div className="absolute bg-gray-400" style={{ top: 0, left: childRowWidth / 2, width: rightCenterX - (childRowWidth / 2), height: 2 }} />
                <div className="absolute w-px bg-gray-400" style={{ top: 0, left: rightCenterX, height: 12 }} />
              </>
            )}
          </div>
          <div className="flex" style={{ width: childRowWidth }}>
            <div className="flex flex-col items-center" style={{ width: leftLaneWidth }}>
              {hasLeft && (
                <BinaryTreeNode
                  nodeId={leftChild.id}
                  allNodes={allNodes}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onAdd={onAdd}
                  onRemove={onRemove}
                  onChangeColor={onChangeColor}
                  onChangeName={onChangeName}
                  onChangeTitle={onChangeTitle}
                />
              )}
            </div>
            <div style={{ width: BRANCH_GAP }} />
            <div className="flex flex-col items-center" style={{ width: rightLaneWidth }}>
              {hasRight && (
                <BinaryTreeNode
                  nodeId={rightChild.id}
                  allNodes={allNodes}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onAdd={onAdd}
                  onRemove={onRemove}
                  onChangeColor={onChangeColor}
                  onChangeName={onChangeName}
                  onChangeTitle={onChangeTitle}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrgTreePanel({
  nodes, selectedId, onSelect, onAdd, onRemove, onChangeColor, onChangeName, onChangeTitle,
  onSaveTree, onLoadTree, onPrintTree, onResetTree,
}) {
  const roots = nodes.filter((n) => !n.parentId)
  const treePrintRef = useRef(null)
  const treeInnerRef = useRef(null)
  const panLayerRef = useRef(null)

  async function handleSaveTreeImage() {
    const container = treePrintRef.current
    const inner = treeInnerRef.current
    if (!container || !inner) return

    const prevTransform = inner.style.transform
    const prevOverflow = container.style.overflow

    inner.style.transform = 'none'
    container.style.overflow = 'visible'

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    try {
      const { toJpeg } = await import('html-to-image')
      const dataUrl = await toJpeg(inner, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
        quality: 0.92,
        width: inner.scrollWidth,
        height: inner.scrollHeight,
      })
      const a = document.createElement('a')
      a.download = '조직도.jpg'
      a.href = dataUrl
      a.click()
    } catch (e) {
      alert('이미지 저장 실패: ' + e.message)
    } finally {
      inner.style.transform = prevTransform
      container.style.overflow = prevOverflow
    }
  }

  useEffect(() => {
    function handlePrintEvent() {
      if (!treePrintRef.current) return
      document.body.classList.add('print-org-tree-mode')
      const cleanup = () => {
        document.body.classList.remove('print-org-tree-mode')
        window.removeEventListener('afterprint', cleanup)
      }
      window.addEventListener('afterprint', cleanup)
      window.print()
    }

    window.addEventListener('print-org-tree', handlePrintEvent)
    return () => window.removeEventListener('print-org-tree', handlePrintEvent)
  }, [])

  // --- 빈 바탕 드래그 팬 + 줌: transform 기반 (translate + scale) ---
  const ZOOM_MIN = 0.3
  const ZOOM_MAX = 3
  const dragRef = useRef({
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

  function applyPanTransform() {
    if (!panLayerRef.current) return
    const { panX, panY, zoom } = dragRef.current
    panLayerRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
  }

  function zoomAtPoint(mx, my, newZoom) {
    const s = dragRef.current
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newZoom))
    const ratio = clamped / s.zoom
    s.panX = mx - (mx - s.panX) * ratio
    s.panY = my - (my - s.panY) * ratio
    s.zoom = clamped
  }

  function pointInContainer(clientX, clientY) {
    const rect = treePrintRef.current?.getBoundingClientRect()
    if (!rect) return { x: clientX, y: clientY }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function isPanStart(target) {
    if (!target) return false
    return !target.closest('button, input, select, textarea, .tree-node-card, [data-no-pan]')
  }

  function handlePanMouseDown(e) {
    if (e.button !== 0) return
    if (!isPanStart(e.target)) return
    panStart(e.clientX, e.clientY)
    e.preventDefault()
  }

  function panStart(clientX, clientY) {
    const s = dragRef.current
    s.active = true
    s.startX = clientX
    s.startY = clientY
    s.panStartX = s.panX
    s.panStartY = s.panY
    if (treePrintRef.current) treePrintRef.current.classList.add('is-panning')
  }

  function panMove(clientX, clientY) {
    const s = dragRef.current
    if (!s.active) return
    const dx = clientX - s.startX
    const dy = clientY - s.startY
    s.panX = s.panStartX + dx
    s.panY = s.panStartY + dy
    applyPanTransform()
  }

  function panEnd() {
    const s = dragRef.current
    if (!s.active) return
    s.active = false
    if (treePrintRef.current) treePrintRef.current.classList.remove('is-panning')
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragRef.current.active) return
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

  useEffect(() => {
    const container = treePrintRef.current
    if (!container) return
    function onWheel(e) {
      e.preventDefault()
      const s = dragRef.current
      if (e.ctrlKey || e.metaKey) {
        const { x, y } = pointInContainer(e.clientX, e.clientY)
        const factor = Math.exp(-e.deltaY * 0.0015)
        zoomAtPoint(x, y, s.zoom * factor)
      } else {
        s.panX -= e.deltaX
        s.panY -= e.deltaY
      }
      applyPanTransform()
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const container = treePrintRef.current
    if (!container) return

    function touchDistance(t1, t2) {
      const dx = t1.clientX - t2.clientX
      const dy = t1.clientY - t2.clientY
      return Math.hypot(dx, dy)
    }

    function onTouchStart(e) {
      const s = dragRef.current
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]]
        const mx = (a.clientX + b.clientX) / 2
        const my = (a.clientY + b.clientY) / 2
        const { x, y } = pointInContainer(mx, my)
        s.pinchActive = true
        s.pinchStartDist = touchDistance(a, b)
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
      const s = dragRef.current
      if (s.pinchActive && e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]]
        const newDist = touchDistance(a, b)
        if (s.pinchStartDist > 0) {
          const newZoom = s.pinchStartZoom * (newDist / s.pinchStartDist)
          const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newZoom))
          const ratio = clamped / s.pinchStartZoom
          s.panX = s.pinchCenterX - (s.pinchCenterX - s.pinchStartPanX) * ratio
          s.panY = s.pinchCenterY - (s.pinchCenterY - s.pinchStartPanY) * ratio
          s.zoom = clamped
          applyPanTransform()
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
      const s = dragRef.current
      if (e.touches.length < 2) s.pinchActive = false
      if (e.touches.length === 0) panEnd()
    }

    container.addEventListener('touchstart', onTouchStart, { passive: false })
    container.addEventListener('touchmove',  onTouchMove,  { passive: false })
    container.addEventListener('touchend',   onTouchEnd)
    container.addEventListener('touchcancel', onTouchEnd)
    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove',  onTouchMove)
      container.removeEventListener('touchend',   onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return (
    <aside className="org-tree-panel bg-white border-b md:border-b-0 md:border-r flex flex-col no-print flex-shrink-0 w-full md:w-1/2 lg:w-5/12">
      <div className="px-3 py-2 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-1">
        <span className="text-[11px] font-bold text-gray-500 uppercase">조직도</span>
        <div className="flex overflow-x-auto gap-1 pb-1 lg:pb-0">
          <button onClick={onSaveTree} className="glass-btn h-7 px-2 text-[10px] min-w-fit">🗂 저장</button>
          <button onClick={onLoadTree} className="glass-btn h-7 px-2 text-[10px] min-w-fit">📂 열기</button>
          <button onClick={onPrintTree} className="glass-btn h-7 px-2 text-[10px] min-w-fit">🖨 인쇄</button>
          <button onClick={handleSaveTreeImage} className="glass-btn h-7 px-2 text-[10px] min-w-fit">🖼 그림저장</button>
          <button onClick={onResetTree} className="glass-btn h-7 px-2 text-[10px] min-w-fit">♻ 초기화</button>
        </div>
      </div>

      <div
        ref={treePrintRef}
        onMouseDown={handlePanMouseDown}
        className="org-tree-print-area org-tree-pan-area overflow-hidden flex-1 p-4 bg-slate-50/30"
      >
        <div
          ref={panLayerRef}
          className="will-change-transform"
          style={{ transform: 'translate(0px, 0px) scale(1)', transformOrigin: '0 0' }}
        >
          <div ref={treeInnerRef} className="origin-top transform scale-[0.85] md:scale-100 transition-transform">
            {roots.map((root) => (
              <BinaryTreeNode
                key={root.id}
                nodeId={root.id}
                allNodes={nodes}
                selectedId={selectedId}
                onSelect={onSelect}
                onAdd={onAdd}
                onRemove={onRemove}
                onChangeColor={onChangeColor}
                onChangeName={onChangeName}
                onChangeTitle={onChangeTitle}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
