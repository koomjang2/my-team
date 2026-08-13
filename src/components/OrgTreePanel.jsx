import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { RANK_COLORS, RANK_NONE, STATUS_ACTIVE, STATUS_LABEL, hasMemberPv, isNonRank, rankDisplay } from '../engine/ranks.js'
import { makeLayout } from './treeLayout.js'
import TreeConnectors from './TreeConnectors.jsx'
import NodeEditorPopover from './NodeEditorPopover.jsx'
import CopyableId from './CopyableId.jsx'
import TreePanelHeader from './TreePanelHeader.jsx'
import CaptureCaption from './CaptureCaption.jsx'
import MemoPopover from './MemoPopover.jsx'
import { usePanZoom } from './usePanZoom.js'
import { usePanelCapture } from './usePanelCapture.js'

const CARD_WIDTH = 104
const layout = makeLayout({ cardWidth: CARD_WIDTH, emptyLaneWidth: 130, branchGap: 48 })

function NodeCard({
  node, effRank, gap, isSelected, isEditing,
  onOpenEditor, onOpenMemo, onAddLeft, onAddRight, onRemove, canAddLeft, canAddRight,
  memoOpen, onCloseMemo, onSaveMemo,
}) {
  // 왼쪽 '계보도 구성' 카드 색은 **명목 직급** 을 따른다 (오른쪽은 달성할 직급을 따른다)
  const colorClass = RANK_COLORS[node.nominalRank ?? RANK_NONE] ?? 'bg-gray-100 text-gray-700 border-gray-300'
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

        {/* 메모는 직급 편집창 대신 카드 밑 쪽지창을 연다 */}
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
            className="absolute -right-2 -top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-[10px] text-white opacity-75 transition-opacity hover:opacity-100"
            style={{ lineHeight: 1 }}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            title="삭제"
          >
            ×
          </button>
        )}

        {/* 메모는 이 카드 바로 밑에 겹쳐 뜬다 — 계보도 배치를 밀지 않도록 absolute */}
        {memoOpen && (
          <MemoPopover node={node} onSave={onSaveMemo} onClose={onCloseMemo} />
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

function TreeNode({ nodeId, nodes, effRankMap, gapMap, editingId, selectedId, memoNodeId, handlers }) {
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
        memoOpen={memoNodeId === node.id}
        onCloseMemo={handlers.onCloseMemo}
        onSaveMemo={handlers.onSaveMemo}
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
                    editingId={editingId} selectedId={selectedId} memoNodeId={memoNodeId} handlers={handlers}
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
                    editingId={editingId} selectedId={selectedId} memoNodeId={memoNodeId} handlers={handlers}
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
  memoNodeId, onCloseMemo, onSaveMemo,
  onSaveTree, onLoadTree, onResetTree,
  periodLabel,
  style,
}) {
  const [editingId, setEditingId] = useState(null)
  const { containerRef, layerRef, onMouseDown, resetView } = usePanZoom()
  const panelRef = useRef(null)
  const innerRef = useRef(null)
  const { saveImage, print } = usePanelCapture({
    panelRef, containerRef, innerRef, imageName: '계보도구성.jpg',
  })
  const roots = nodes.filter((n) => !n.parentId)

  const handlers = {
    onAdd,
    onRemove,
    onUpdate,
    onOpenMemo,
    onCloseMemo,
    onSaveMemo,
    onOpenEditor: (id) => setEditingId((cur) => (cur === id ? null : id)),
  }

  return (
    <aside
      ref={panelRef}
      style={style}
      className="tree-panel split-pane-top flex w-full min-h-0 flex-shrink-0 flex-col overflow-hidden border-b bg-white"
    >
      <TreePanelHeader
        title="계보도 구성"
        onSave={onSaveTree}
        onLoad={onLoadTree}
        onPrint={print}
        onImage={saveImage}
        onFocusRoot={resetView}
        onReset={onResetTree}
      />

      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        className="tree-print-area org-tree-pan-area min-h-0 flex-1 overflow-hidden bg-slate-50/30 p-4 md:min-h-[340px]"
      >
        <div ref={layerRef} className="will-change-transform" style={{ transform: 'translate(0px, 0px) scale(1)', transformOrigin: '0 0' }}>
          <div ref={innerRef} className="origin-top scale-[0.85] transform transition-transform md:scale-100">
            <CaptureCaption title="계보도 구성" periodLabel={periodLabel} />
            {roots.map((root) => (
              <TreeNode
                key={root.id}
                nodeId={root.id}
                nodes={nodes}
                effRankMap={effRankMap}
                gapMap={gapMap}
                editingId={editingId}
                selectedId={selectedId}
                memoNodeId={memoNodeId}
                handlers={handlers}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
