import { useRef, useState } from 'react'
import { ChevronDown, Plus, Undo2 } from 'lucide-react'
import { RANK_COLORS, RANK_NONE, RANK_RULES, hasMemberPv, isNonRank, rankDisplay } from '../engine/ranks.js'
import { makeLayout } from './treeLayout.js'
import TreeConnectors from './TreeConnectors.jsx'
import NodeEditorPopover from './NodeEditorPopover.jsx'
import ImportSummaryBar from './ImportSummaryBar.jsx'
import RankQuickPicker from './RankQuickPicker.jsx'
import CopyableId from './CopyableId.jsx'
import TreePanelHeader from './TreePanelHeader.jsx'
import CaptureCaption from './CaptureCaption.jsx'
import { usePanZoom } from './usePanZoom.js'
import { usePanelCapture } from './usePanelCapture.js'
import { useEditorHotkeys } from './keyboard.js'

const CARD_WIDTH = 104
// 빈 레인 폭과 좌/우 사이 틈 — 이 둘이 계보도의 가로 폭을 정한다.
// 좁힐수록 한 화면에 더 들어오지만 카드가 붙어 보인다. 지금 값이면 잎 카드끼리
// 최소 26px 이 뜬다 (틈 22 + 레인 여유 4). 회원이 늘면 하위 폭만큼 자연히 벌어진다.
const layout = makeLayout({ cardWidth: CARD_WIDTH, emptyLaneWidth: 108, branchGap: 22 })

/** 카드 안 '명목' / '목표' 뱃지 — 직급 이름 **왼쪽**에 붙는다 */
const BADGE = 'shrink-0 rounded px-1 text-[10px] font-medium leading-tight'

/**
 * [+좌]/[+우] 말풍선 — 그 자리가 어떤 상태냐에 따라 하는 일이 다르다.
 *   비어 있음 → 그냥 붙인다 / 삭제로 비워 둔 자리 → 그 자리를 채운다 / 사람이 있음 → 위에 끼워 넣는다
 */
function addLabel(side, hotkey, occupant) {
  if (!occupant) return `${side} 하위 추가 (${hotkey})`
  if (occupant.vacated) return `${side} - 빈 자리 채우기 (${hotkey})`
  return `${side} - 기존 회원 위에 끼워 넣기 (${hotkey})`
}

function NodeCard({
  node, effRank, gap, isSelected, isEditing, isPickingRank, showIds,
  onOpenEditor, onOpenRankPicker, onPickRank, onClosePopups,
  onAddLeft, onAddRight, onRemove, leftLabel, rightLabel,
}) {
  // 왼쪽 '나의 계보도' 카드 색은 **명목 직급** 을 따른다 (오른쪽 '목표 계보도' 는 목표 직급)
  const colorClass = RANK_COLORS[node.nominalRank ?? RANK_NONE] ?? 'bg-gray-100 text-gray-700 border-gray-300'
  // 없음/소비자는 직급 판정 대상이 아니다
  const nonRank = isNonRank(node.rank)
  // 구조(좌/우 레그)로 검증되는 직급인가 — DM 이상만 해당
  const isLegRank = RANK_RULES[node.rank]?.type === 'leg'
  // 달성할 직급에 실제로 도달하는지 — 오른쪽 실질 계보도와 같은 판정
  const achieved = nonRank || gap?.achieved

  // 직급 고르기 목록만 열려 있을 때도 단축키는 편집창과 똑같이 듣는다.
  // (편집창이 열려 있으면 그쪽이 이미 듣고 있으므로 여기서는 끈다 — 두 번 처리 방지)
  useEditorHotkeys({
    enabled: isPickingRank && !isEditing,
    onClose: onClosePopups,
    onPickRank,
    // 자리가 차 있어도 막지 않는다 — 그때는 기존 회원 위에 끼워 넣는다
    onAddLeft,
    onAddRight,
  })

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
        title="터치하면 목표 직급을 선택합니다"
      >
        {/* 두 줄 모두 [뱃지] 직급 꼴 — 어느 쪽 직급인지 뱃지가 먼저 말해 준다 */}
        <div className="flex items-center justify-center gap-1 leading-tight">
          <span className={`${BADGE} bg-gray-500/15 text-gray-700`}>명목</span>
          <span className="truncate text-[11px] text-gray-600">
            {rankDisplay(node.nominalRank ?? RANK_NONE)}
          </span>
        </div>

        {/*
          목표 뱃지 + 목표 직급을 하나의 둥근 상자로 묶어 '누를 수 있는 곳' 임을 보인다.
          여기를 누르면 큰 편집창이 아니라 직급 목록만 바로 열린다 (카드의 다른 곳은 편집창).
        */}
        <div className="flex justify-center">
          <button
            className="flex items-center gap-1 rounded-full border border-current/20 bg-white/70 px-1.5 py-0.5 transition-colors hover:bg-white"
            onClick={(e) => { e.stopPropagation(); onOpenRankPicker() }}
            title="목표 직급 선택 (` 1~8)"
          >
            <span className={`${BADGE} bg-sky-600/15 text-sky-800`}>목표</span>
            <span className="text-xs font-bold">{rankDisplay(node.rank)}</span>
            <ChevronDown size={10} className="shrink-0 opacity-60" />
          </button>
        </div>

        {isPickingRank && (
          <RankQuickPicker value={node.rank} onPick={onPickRank} />
        )}

        <div className="mt-0.5 truncate text-xs font-semibold">{node.name || '이름 없음'}</div>
        {/* 회원 ID 는 머리줄의 'ID 보이기' 로 끈다 — 이쪽은 기본이 켜짐 */}
        {showIds && <CopyableId value={node.memberId} size="name" />}

        {/* 명목 직급이 SRM 이상이면 숨긴다 — 목표 직급과 무관 */}
        {hasMemberPv(node.nominalRank) && (node.memberPvMan ?? 0) > 0 && (
          <div className="truncate text-[9px] text-emerald-700">회원PV {node.memberPvMan}만</div>
        )}

        {/*
          SSM/SM 은 지정한 것 자체가 곧 달성 전제라 '조건 충족' 이 늘 떠 있어 의미가 없다.
          구조로 검증되는 DM 이상(leg)만 결과를 적는다.
          부족분은 좌·우 **둘 다** 적는다 — truncate 를 걸면 뒤쪽(우)이 잘려
          좌만 부족한 것처럼 보이므로 줄바꿈으로 흘린다.
        */}
        {isLegRank && (
          <div
            className={`mt-0.5 text-[9px] font-medium leading-tight ${achieved ? 'text-emerald-700' : 'text-rose-600'}`}
          >
            {achieved
              ? '조건 충족'
              : gap?.shortfalls?.length
                ? gap.shortfalls.map((s) => <div key={s}>{s}</div>)
                : '조건 미달'}
          </div>
        )}

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

      </div>

      {/*
        자리가 차 있어도 누를 수 있다 — 그때는 원래 있던 회원 **바로 위**에 끼워 넣는다.
        말풍선으로 '추가' 와 '끼워 넣기' 를 구분해 준다.
      */}
      <div className="mt-1.5 flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onAddLeft() }}
          className="flex cursor-pointer items-center gap-0.5 rounded border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 transition-colors hover:bg-blue-100"
          title={leftLabel}
        >
          <Plus size={8} /><span>좌</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAddRight() }}
          className="flex cursor-pointer items-center gap-0.5 rounded border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 transition-colors hover:bg-orange-100"
          title={rightLabel}
        >
          <Plus size={8} /><span>우</span>
        </button>
      </div>
    </div>
  )
}

function TreeNode({ nodeId, nodes, effRankMap, gapMap, editingId, pickingRankId, selectedId, showIds, handlers }) {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return null

  const row = layout.childRow(nodeId, nodes)
  const isRoot = !node.parentId
  const addLeft = () => handlers.onAdd(node.id, 'left')
  const addRight = () => handlers.onAdd(node.id, 'right')

  return (
    // data-tree-unit: 팬 범위를 가둘 때 재는 덩어리 — 카드 + [좌][우] 버튼이 다 들어 있다 (usePanZoom.js)
    // data-tree-root: '나' 버튼이 찾아가는 최상단 회원 — 이진 트리라 레이어 가운데에 있다
    <div
      data-tree-unit="true"
      data-tree-root={isRoot ? 'true' : undefined}
      className="flex flex-col items-center"
      style={{ minWidth: row.hasChildren ? row.childRowWidth : CARD_WIDTH }}
    >
      {/*
        삭제로 비워 둔 자리 — 카드 없이 선만 지나간다. 하위의 좌/우를 지키려고 남긴
        자리라 고칠 것도, 하위를 더 붙일 자리도 없다(좌·우가 이미 차 있다).
        다시 채우려면 **윗 회원의 [+좌]/[+우]** 를 누르면 된다.
      */}
      {node.vacated ? (
        <div className="h-4 w-px bg-gray-400" aria-hidden="true" />
      ) : (
        <NodeCard
          node={node}
          effRank={effRankMap.get(node.id)}
          gap={gapMap.get(node.id)}
          isSelected={selectedId === node.id}
          isEditing={editingId === node.id}
          isPickingRank={pickingRankId === node.id}
          showIds={showIds}
          leftLabel={addLabel('좌', 'Q', row.left)}
          rightLabel={addLabel('우', 'W', row.right)}
          onOpenEditor={() => handlers.onOpenEditor(node.id)}
          onOpenRankPicker={() => handlers.onOpenRankPicker(node.id)}
          onPickRank={(r) => handlers.onPickRank(node.id, r)}
          onClosePopups={handlers.onClosePopups}
          onAddLeft={addLeft}
          onAddRight={addRight}
          onRemove={isRoot ? undefined : () => handlers.onRemove(node.id)}
        />
      )}

      {editingId === node.id && !node.vacated && (
        <NodeEditorPopover
          node={node}
          onUpdate={(patch) => handlers.onUpdate(node.id, patch)}
          onClose={handlers.onClosePopups}
          onAddLeft={addLeft}
          onAddRight={addRight}
          onImportSubtree={() => handlers.onImportSubtree(node.id)}
        />
      )}

      {/* 이식 결과 — 갈아 끼운 그 회원 카드 바로 밑에 뜬다 (화면 아래에 두면 계보도에 가렸다) */}
      {handlers.importSummary?.nodeId === node.id && (
        <div className="relative w-0">
          <ImportSummaryBar
            summary={handlers.importSummary}
            onClose={handlers.onCloseImportSummary}
          />
        </div>
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
                    editingId={editingId} pickingRankId={pickingRankId}
                    selectedId={selectedId} showIds={showIds} handlers={handlers}
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
                    editingId={editingId} pickingRankId={pickingRankId}
                    selectedId={selectedId} showIds={showIds} handlers={handlers}
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
  onAdd, onRemove, onUpdate,
  onSaveTree, onLoadTree, onResetTree, onImportSubtree,
  importSummary, onCloseImportSummary,
  onUndo, canUndo, onEndEdit,
  periodLabel, imageName = '팀.jpg',
  showIds, onToggleShowIds,
  style,
}) {
  // 편집창(큰 창)과 직급 고르기 목록(작은 목록)은 한 번에 하나만 뜬다
  const [editingId, setEditingId] = useState(null)
  const [pickingRankId, setPickingRankId] = useState(null)
  const { containerRef, layerRef, onMouseDown, resetView } = usePanZoom(nodes)
  const panelRef = useRef(null)
  const innerRef = useRef(null)
  const { saveImage, print } = usePanelCapture({
    panelRef, containerRef, innerRef, imageName,
  })
  const roots = nodes.filter((n) => !n.parentId)

  const handlers = {
    importSummary,
    onCloseImportSummary,
    onAdd,
    onRemove,
    onUpdate,
    onOpenEditor: (id) => {
      setPickingRankId(null)
      setEditingId((cur) => (cur === id ? null : id))
    },
    onOpenRankPicker: (id) => {
      setEditingId(null)
      setPickingRankId((cur) => (cur === id ? null : id))
    },
    onPickRank: (id, rank) => {
      onUpdate(id, { rank })
      setPickingRankId(null) // 고르면 목록은 할 일을 다 했다
    },
    // 이식하면 이 자리 아래가 통째로 바뀐다 — 편집창이 덮고 있으면 그걸 못 보므로 먼저 닫는다
    onImportSubtree: (id) => {
      setEditingId(null)
      setPickingRankId(null)
      onImportSubtree?.(id)
    },
    onClosePopups: () => {
      setEditingId(null)
      setPickingRankId(null)
      onEndEdit?.() // 되돌리기 단계를 여기서 끊는다 — 다시 열어 고치면 새 단계
    },
  }

  return (
    <aside
      ref={panelRef}
      style={style}
      className="tree-panel split-pane-top flex w-full min-h-0 flex-shrink-0 flex-col overflow-hidden border-b bg-white"
    >
      <TreePanelHeader
        title="나의 계보도"
        onSave={onSaveTree}
        onLoad={onLoadTree}
        onPrint={print}
        onImage={saveImage}
        onFocusRoot={resetView}
        onReset={onResetTree}
        showIds={showIds}
        onToggleShowIds={onToggleShowIds}
      />

      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        // 빈 바탕을 누르면 열려 있던 편집창·직급 목록을 닫는다.
        // 편집창과 목록은 자기 클릭을 멈춰 세우므로(stopPropagation) 여기까지 오지 않는다.
        onClick={(e) => {
          if (e.target.closest?.('.tree-node-card')) return
          handlers.onClosePopups()
        }}
        className="tree-print-area org-tree-pan-area relative min-h-0 flex-1 overflow-hidden bg-slate-50/30 p-4 md:min-h-[340px]"
      >
        {/*
          되돌리기 — 팬 레이어 **밖**에 절대 배치라 화면을 아무리 끌어도 제자리에 떠 있다.
          카드가 hover 때 z-[500] 까지 올라오므로 그보다 위(z-[600])에 둔다.
          `data-no-pan` 은 이 버튼에서 시작한 드래그가 화면을 끌지 않게 한다 (손 모양 커서도 그래서 안 뜬다).
        */}
        {onUndo && (
          <button
            data-no-pan
            onClick={onUndo}
            disabled={!canUndo}
            className={`no-print absolute left-2 top-2 z-[600] flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium shadow-md backdrop-blur transition-colors
              ${canUndo
                ? 'cursor-pointer border-slate-300 bg-white/90 text-slate-700 hover:bg-white hover:text-sky-700'
                : 'cursor-not-allowed border-slate-200 bg-white/60 text-slate-300'}`}
            title={canUndo ? '방금 한 작업 되돌리기' : '되돌릴 작업이 없습니다'}
          >
            <Undo2 size={12} /> 되돌리기
          </button>
        )}

        <div ref={layerRef} className="will-change-transform" style={{ transform: 'translate(0px, 0px) scale(1)', transformOrigin: '0 0' }}>
          <div ref={innerRef} className="origin-top scale-[0.85] transform transition-transform md:scale-100">
            <CaptureCaption title="나의 계보도" periodLabel={periodLabel} />
            {roots.map((root) => (
              <TreeNode
                key={root.id}
                nodeId={root.id}
                nodes={nodes}
                effRankMap={effRankMap}
                gapMap={gapMap}
                editingId={editingId}
                pickingRankId={pickingRankId}
                selectedId={selectedId}
                showIds={showIds}
                handlers={handlers}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
