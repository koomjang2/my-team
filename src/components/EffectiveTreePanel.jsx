import { useMemo, useRef } from 'react'
import { RANK_COLORS, BUSINESS_RANKS, RANK_NONE, RANK_RULES, hasMemberPv, isNonRank, rankDisplay } from '../engine/ranks.js'
import { makeLayout, collapseHidden } from './treeLayout.js'
import TreeConnectors from './TreeConnectors.jsx'
import CopyableId from './CopyableId.jsx'
import TreePanelHeader from './TreePanelHeader.jsx'
import CaptureCaption from './CaptureCaption.jsx'
import { usePanZoom } from './usePanZoom.js'
import { usePanelCapture } from './usePanelCapture.js'

const CARD_WIDTH = 96
const layout = makeLayout({ cardWidth: CARD_WIDTH, emptyLaneWidth: 114, branchGap: 40 })

/**
 * 이 패널이 **글자로** 보여주는 직급은 실질 직급뿐이다 — 명목 직급은 왼쪽 관심사다.
 * 다만 카드 **색**은 그 사람을 어느 직급으로 보내기로 했는지(달성할 직급)를 따른다.
 * 목표색 카드에 실질 직급이 적히므로, 목표와 결과가 어긋난 자리가 눈에 띈다.
 */
function EffectiveCard({ node, effRank, gap, onSelect, isSelected }) {
  const nonRank = isNonRank(node.rank)
  const colorClass = RANK_COLORS[node.rank] ?? 'border-gray-300 bg-gray-100 text-gray-500'
  const displayRank = rankDisplay(nonRank ? node.rank : effRank)

  return (
    <div
      data-tree-node="true"
      className={`tree-node-card relative cursor-pointer rounded-lg border-2 px-1.5 py-1 text-center transition-all
        ${colorClass} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:-translate-y-[1px]'}`}
      style={{ width: CARD_WIDTH }}
      onClick={onSelect}
    >
      {/* 흰 박스 없이 글자만 — 왼쪽 카드처럼 카드 색(달성할 직급)의 글자색을 물려받는다 */}
      <div className="text-[11px] font-bold leading-tight">{displayRank}</div>
      {/* 이름·ID 는 왼쪽 카드와 같은 크기·굵기로 맞춘다 */}
      <div className="mt-0.5 truncate text-xs font-semibold text-gray-800">{node.name || '이름 없음'}</div>
      <CopyableId value={node.memberId} size="name" />

      {/* 회원PV 도 왼쪽과 같은 조건·같은 모양으로 — 한쪽에만 보이면 헷갈린다 */}
      {hasMemberPv(node.rank) && (node.memberPvMan ?? 0) > 0 && (
        <div className="truncate text-[9px] text-emerald-700">회원PV {node.memberPvMan}만</div>
      )}

      {/* 좌·우를 한 줄씩 나눠 적는다 — 이어 붙이면 어디가 부족한지 눈에 안 들어온다 */}
      {!nonRank && !gap?.achieved && gap?.shortfalls?.length > 0 && (
        <div className="mt-0.5 rounded bg-white/70 px-0.5 py-0.5 text-[9px] leading-tight text-rose-700">
          {gap.shortfalls.map((s) => <div key={s}>{s}</div>)}
        </div>
      )}
    </div>
  )
}

function EffectiveNode({ nodeId, nodes, effRankMap, gapMap, selectedId, onSelect }) {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return null
  const row = layout.childRow(nodeId, nodes)

  return (
    <div className="flex flex-col items-center" style={{ minWidth: row.hasChildren ? row.childRowWidth : CARD_WIDTH }}>
      {/* 좌우 갈래가 둘 다 살아있어 접을 수 없는 '없음' 자리 — 카드는 감추고 선만 지나간다 */}
      {node.passthrough ? (
        <div className="h-4 w-px bg-gray-400" aria-hidden="true" />
      ) : (
        <EffectiveCard
          node={node}
          effRank={effRankMap.get(node.id)}
          gap={gapMap.get(node.id)}
          isSelected={selectedId === node.id}
          onSelect={() => onSelect(node.id)}
        />
      )}
      {row.hasChildren && (
        <div className="flex flex-col items-center" style={{ width: row.childRowWidth }}>
          <TreeConnectors row={row} height={10} />
          <div className="flex" style={{ width: row.childRowWidth }}>
            <div className="flex flex-col items-center" style={{ width: row.leftLaneWidth }}>
              {row.hasLeft && (
                <EffectiveNode nodeId={row.left.id} nodes={nodes} effRankMap={effRankMap} gapMap={gapMap} selectedId={selectedId} onSelect={onSelect} />
              )}
            </div>
            <div style={{ width: layout.branchGap }} />
            <div className="flex flex-col items-center" style={{ width: row.rightLaneWidth }}>
              {row.hasRight && (
                <EffectiveNode nodeId={row.right.id} nodes={nodes} effRankMap={effRankMap} gapMap={gapMap} selectedId={selectedId} onSelect={onSelect} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EffectiveTreePanel({
  nodes, effRankMap, gapMap, selectedId, onSelect, rootNode, style,
  onSaveTree, onLoadTree, onResetTree,
  periodLabel, summaryOpen, onToggleSummary,
}) {
  const { containerRef, layerRef, onMouseDown, resetView } = usePanZoom()
  const panelRef = useRef(null)
  const innerRef = useRef(null)
  const { saveImage, print } = usePanelCapture({
    panelRef, containerRef, innerRef, imageName: '목표계보도.jpg',
  })

  // 달성할 직급을 아직 안 정한('없음') 회원은 실질 계보도에 띄우지 않는다.
  // 노드 id 는 그대로라 effRankMap/gapMap 을 그대로 쓴다.
  const displayNodes = useMemo(
    () => collapseHidden(nodes, (n) => n.rank === RANK_NONE),
    [nodes],
  )
  const roots = displayNodes.filter((n) => !n.parentId)

  // 실질 직급 기준 직급별 인원
  const counts = {}
  for (const n of nodes) {
    const eff = effRankMap.get(n.id)
    if (eff && !isNonRank(eff)) counts[eff] = (counts[eff] || 0) + 1
  }
  const consumerCount = nodes.filter((n) => n.rank === 'CSM').length

  const rootGap = rootNode ? gapMap.get(rootNode.id) : null
  const rootEff = rootNode ? effRankMap.get(rootNode.id) : null
  const rootRule = rootNode ? RANK_RULES[rootNode.rank] : null
  const rootIsNone = rootNode ? isNonRank(rootNode.rank) : false

  return (
    <section
      ref={panelRef}
      style={style}
      className="tree-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white"
    >
      <TreePanelHeader
        title="목표 계보도"
        onSave={onSaveTree}
        onLoad={onLoadTree}
        onPrint={print}
        onImage={saveImage}
        onFocusRoot={resetView}
        onReset={onResetTree}
        summaryOpen={summaryOpen}
        onToggleSummary={onToggleSummary}
      />

      {summaryOpen && rootNode && rootIsNone && (
        <div className="border-b bg-slate-50 px-3 py-2 text-xs text-gray-500">
          맨 위에서 달성하고자 하는 직급을 정하면 무엇이 부족한지 계산합니다.
        </div>
      )}

      {summaryOpen && rootNode && !rootIsNone && (
        <div className={`border-b px-3 py-2 text-xs ${rootGap?.achieved ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <div className="font-semibold text-gray-800">
            {rootNode.name || '나'} · 목표 {rankDisplay(rootNode.rank)}
            <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${rootGap?.achieved ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'}`}>
              {rootGap?.achieved ? '달성' : '미달성'}
            </span>
            <span className="ml-2 text-[11px] font-normal text-gray-600">실질 {rankDisplay(rootEff)}</span>
          </div>
          {rootRule?.type === 'leg' && rootGap?.detail && (
            <div className="mt-1 text-[11px] text-gray-700">
              좌 {rootRule.requires} {rootGap.detail.leftCount}/{rootRule.count}명 · 우 {rootRule.requires}{' '}
              {rootGap.detail.rightCount}/{rootRule.count}명
            </div>
          )}
          {rootRule?.type === 'pv' && (
            <div className="mt-1 text-[11px] text-gray-700">
              좌/우 각 {rootRule.targetMan}만 PV 필요
              {rootGap?.detail?.memberPvMan > 0 && ` · 회원PV ${rootGap.detail.memberPvMan}만`}
            </div>
          )}
          {!rootGap?.achieved && rootGap?.shortfalls?.length > 0 && (
            <div className="mt-1 font-medium text-rose-700">→ {rootGap.shortfalls.join(' / ')}</div>
          )}
        </div>
      )}

      <div className={`${summaryOpen ? 'flex' : 'hidden'} flex-wrap gap-1 border-b px-3 py-1.5`}>
        {BUSINESS_RANKS.slice().reverse().map((r) =>
          counts[r] ? (
            <span key={r} className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${RANK_COLORS[r]}`}>
              {r} {counts[r]}
            </span>
          ) : null,
        )}
        {consumerCount > 0 && (
          <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            소비자 {consumerCount}
          </span>
        )}
        {Object.keys(counts).length === 0 && consumerCount === 0 && (
          <span className="text-[10px] text-gray-400">아직 달성한 직급자가 없습니다</span>
        )}
      </div>

      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        className="tree-print-area org-tree-pan-area min-h-0 flex-1 overflow-hidden bg-slate-50/40 p-4 md:min-h-[340px]"
      >
        <div ref={layerRef} className="will-change-transform" style={{ transform: 'translate(0px, 0px) scale(1)', transformOrigin: '0 0' }}>
          <div ref={innerRef} className="origin-top scale-[0.85] transform md:scale-100">
            <CaptureCaption title="목표 계보도" periodLabel={periodLabel} />
            {roots.map((root) => (
              <EffectiveNode
                key={root.id}
                nodeId={root.id}
                nodes={displayNodes}
                effRankMap={effRankMap}
                gapMap={gapMap}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
