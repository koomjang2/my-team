import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { RANK_COLORS, RANK_NONE, STATUS_ACTIVE, STATUS_LABEL, hasMemberPv, isNonRank, rankDisplay } from '../engine/ranks.js'
import { makeLayout } from './treeLayout.js'
import TreeConnectors from './TreeConnectors.jsx'
import NodeEditorPopover from './NodeEditorPopover.jsx'
import CopyableId from './CopyableId.jsx'
import { usePanZoom } from './usePanZoom.js'

const CARD_WIDTH = 104
const layout = makeLayout({ cardWidth: CARD_WIDTH, emptyLaneWidth: 130, branchGap: 48 })

function NodeCard({
  node, effRank, gap, isSelected, isEditing,
  onOpenEditor, onOpenMemo, onAddLeft, onAddRight, onRemove, canAddLeft, canAddRight,
}) {
  const colorClass = RANK_COLORS[node.rank] ?? 'bg-gray-100 text-gray-700 border-gray-300'
  // 없음/소비자는 직급 판정 대상이 아니다
  const nonRank = isNonRank(node.rank)
  // 명목 직급에 실제로 도달하는지 — 오른쪽 실질 계보도와 같은 판정
  const achieved = nonRank || gap?.achieved

  return (
    <div className="relative z-10 flex flex-col items-center hover:z-[500]">
      <div
        data-tree-node="true"
        className={`tree-node-card relative cursor-pointer select-none rounded-lg border-2 px-2 py-1.5 text-center transition-all duration-300
          shadow-[0_6px_14px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.65)]
          bg-gradient-to-b from-white/65 via-white/20 to-black/5 backdrop-blur-[1px]
          ${colorClass}
          ${isSelected || isEditing
            ? 'ring-2 ring-blue-500 ring-offset-1'
            : 'hover:-translate-y-[2px] hover:shadow-[0_12px_22px_rgba(15,23,42,0.22)]'}`}
        style={{ width: CARD_WIDTH }}
        onClick={onOpenEditor}
        title="터치하면 달성할 직급을 선택합니다"
      >
        {/* 명목 직급 — 이번에 달성할 직급과 별개로 달고 있는 이름표 */}
        <div className="truncate text-[9px] leading-tight text-gray-500">
          명목 {rankDisplay(node.nominalRank ?? RANK_NONE)}
        </div>

        <div className="flex items-center justify-center gap-1">
          <span className="text-xs font-bold">{rankDisplay(node.rank)}</span>
          {!nonRank && (
            <span
              className={`rounded px-1 text-[9px] leading-tight ${
                node.status === STATUS_ACTIVE ? 'bg-sky-600/15 text-sky-800' : 'bg-amber-500/20 text-amber-800'
              }`}
            >
              {STATUS_LABEL[node.status] ?? '실질'}
            </span>
          )}
        </div>

        <div className="mt-0.5 truncate text-xs font-semibold">{node.name || '이름 없음'}</div>
        <CopyableId value={node.memberId} />

        {hasMemberPv(node.rank) && (node.memberPvMan ?? 0) > 0 && (
          <div className="truncate text-[9px] text-emerald-700">회원PV {node.memberPvMan}만</div>
        )}

        {!nonRank && (
          <div
            className={`mt-0.5 truncate text-[9px] font-medium ${achieved ? 'text-emerald-700' : 'text-rose-600'}`}
          >
            {achieved ? '조건 충족' : gap?.shortfalls?.[0] ?? '조건 미달'}
          </div>
        )}

        {/* 메모 영역만 팝오버 대신 스낵바를 연다 */}
        <button
          className="mt-1 w-full rounded border border-white/70 bg-white/70 py-0.5 text-[10px] font-medium text-gray-600 transition-colors hover:bg-white"
          onClick={(e) => { e.stopPropagation(); onOpenMemo() }}
          title="메모 보기"
          data-no-pan
        >
          메모{node.memo?.trim() ? ' •' : ''}
        </button>

        {onRemove && (
          <button
            className="absolute -right-2 -top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-gray-300 text-[10px] text-gray-500 opacity-30 transition-opacity hover:opacity-80"
            style={{ lineHeight: 1 }}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            title="삭제"
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-1.5 flex gap-1">
        <button
          disabled={!canAddLeft}
          onClick={(e) => { e.stopPropagation(); onAddLeft() }}
          className={`flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors
            ${!canAddLeft
              ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-20'
              : 'cursor-pointer border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
          title={canAddLeft ? '좌 하위 추가' : '좌 자식 이미 존재'}
        >
          <Plus size={8} /><span>좌</span>
        </button>
        <button
          disabled={!canAddRight}
          onClick={(e) => { e.stopPropagation(); onAddRight() }}
          className={`flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors
            ${!canAddRight
              ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-20'
              : 'cursor-pointer border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
          title={canAddRight ? '우 하위 추가' : '우 자식 이미 존재'}
        >
          <Plus size={8} /><span>우</span>
        </button>
      </div>
    </div>
  )
}

function TreeNode({ nodeId, nodes, effRankMap, gapMap, editingId, selectedId, handlers }) {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return null

  const row = layout.childRow(nodeId, nodes)
  const isRoot = !node.parentId

  return (
    <div className="flex flex-col items-center" style={{ minWidth: row.hasChildren ? row.childRowWidth : CARD_WIDTH }}>
      <NodeCard
        node={node}
        effRank={effRankMap.get(node.id)}
        gap={gapMap.get(node.id)}
        isSelected={selectedId === node.id}
        isEditing={editingId === node.id}
        canAddLeft={!row.hasLeft}
        canAddRight={!row.hasRight}
        onOpenEditor={() => handlers.onOpenEditor(node.id)}
        onOpenMemo={() => handlers.onOpenMemo(node.id)}
        onAddLeft={() => handlers.onAdd(node.id, 'left')}
        onAddRight={() => handlers.onAdd(node.id, 'right')}
        onRemove={isRoot ? undefined : () => handlers.onRemove(node.id)}
      />

      {editingId === node.id && (
        <NodeEditorPopover
          node={node}
          onUpdate={(patch) => handlers.onUpdate(node.id, patch)}
          onClose={() => handlers.onOpenEditor(null)}
        />
      )}

      {row.hasChildren && (
        <div className="flex flex-col items-center" style={{ width: row.childRowWidth }}>
          <TreeConnectors row={row} />
          <div className="flex" style={{ width: row.childRowWidth }}>
            <div className="flex flex-col items-center" style={{ width: row.leftLaneWidth }}>
              {row.hasLeft && (
                <>
                  <div className="mb-0.5 text-[10px] font-bold text-blue-500">좌</div>
                  <TreeNode
                    nodeId={row.left.id} nodes={nodes} effRankMap={effRankMap} gapMap={gapMap}
                    editingId={editingId} selectedId={selectedId} handlers={handlers}
                  />
                </>
              )}
            </div>
            <div style={{ width: layout.branchGap }} />
            <div className="flex flex-col items-center" style={{ width: row.rightLaneWidth }}>
              {row.hasRight && (
                <>
                  <div className="mb-0.5 text-[10px] font-bold text-orange-500">우</div>
                  <TreeNode
                    nodeId={row.right.id} nodes={nodes} effRankMap={effRankMap} gapMap={gapMap}
                    editingId={editingId} selectedId={selectedId} handlers={handlers}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrgTreePanel({
  nodes, effRankMap, gapMap, selectedId,
  onAdd, onRemove, onUpdate, onOpenMemo,
  onSaveTree, onLoadTree, onPrintTree, onResetTree,
  style,
}) {
  const [editingId, setEditingId] = useState(null)
  const { containerRef, layerRef, onMouseDown, resetView } = usePanZoom()
  const innerRef = useRef(null)
  const roots = nodes.filter((n) => !n.parentId)

  const handlers = {
    onAdd,
    onRemove,
    onUpdate,
    onOpenMemo,
    onOpenEditor: (id) => setEditingId((cur) => (cur === id ? null : id)),
  }

  async function handleSaveImage() {
    const inner = innerRef.current
    const container = containerRef.current
    if (!inner || !container) return
    const prevTransform = inner.style.transform
    const prevOverflow = container.style.overflow
    inner.style.transform = 'none'
    container.style.overflow = 'visible'
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    try {
      const { toJpeg } = await import('html-to-image')
      const dataUrl = await toJpeg(inner, {
        backgroundColor: '#f8fafc', pixelRatio: 2, quality: 0.92,
        width: inner.scrollWidth, height: inner.scrollHeight,
      })
      const a = document.createElement('a')
      a.download = '실질계보도.jpg'
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

  return (
    <aside
      style={style}
      className="org-tree-panel split-pane-top no-print flex w-full min-h-0 flex-shrink-0 flex-col overflow-hidden border-b bg-white md:w-1/2 md:border-b-0 md:border-r"
    >
      <div className="flex flex-col justify-between gap-1 border-b px-3 py-2 lg:flex-row lg:items-center">
        <span className="text-[11px] font-bold uppercase text-gray-500">계보도 구성</span>
        <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
          <button onClick={onSaveTree} className="glass-btn h-7 min-w-fit px-2 text-[10px]">🗂 저장</button>
          <button onClick={onLoadTree} className="glass-btn h-7 min-w-fit px-2 text-[10px]">📂 열기</button>
          <button onClick={onPrintTree} className="glass-btn h-7 min-w-fit px-2 text-[10px]">🖨 인쇄</button>
          <button onClick={handleSaveImage} className="glass-btn h-7 min-w-fit px-2 text-[10px]">🖼 그림</button>
          <button onClick={resetView} className="glass-btn h-7 min-w-fit px-2 text-[10px]">🎯 화면</button>
          <button onClick={onResetTree} className="glass-btn h-7 min-w-fit px-2 text-[10px]">♻ 초기화</button>
        </div>
      </div>

      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        className="org-tree-print-area org-tree-pan-area min-h-0 flex-1 overflow-hidden bg-slate-50/30 p-4 md:min-h-[340px]"
      >
        <div ref={layerRef} className="will-change-transform" style={{ transform: 'translate(0px, 0px) scale(1)', transformOrigin: '0 0' }}>
          <div ref={innerRef} className="origin-top scale-[0.85] transform transition-transform md:scale-100">
            {roots.map((root) => (
              <TreeNode
                key={root.id}
                nodeId={root.id}
                nodes={nodes}
                effRankMap={effRankMap}
                gapMap={gapMap}
                editingId={editingId}
                selectedId={selectedId}
                handlers={handlers}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
