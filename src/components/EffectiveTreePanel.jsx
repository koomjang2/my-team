import { useRef } from 'react'
import { RANK_COLORS, BUSINESS_RANKS, RANK_RULES, isNonRank, rankDisplay } from '../engine/ranks.js'
import { makeLayout } from './treeLayout.js'
import TreeConnectors from './TreeConnectors.jsx'
import CopyableId from './CopyableId.jsx'
import { usePanZoom } from './usePanZoom.js'

const CARD_WIDTH = 96
const layout = makeLayout({ cardWidth: CARD_WIDTH, emptyLaneWidth: 114, branchGap: 40 })

const TONE_STYLE = {
  ok: 'border-emerald-500 bg-emerald-50',
  short: 'border-rose-400 bg-rose-50',
  none: 'border-slate-300 bg-slate-50',
}

/**
 * 이 패널은 실질 직급만 보여준다 — 명목 직급은 왼쪽 '계보도 구성' 쪽 관심사다.
 * 달성 여부에 따라 색만 갈라 두고, 못 간 경우 무엇이 부족한지 덧붙인다.
 */
function EffectiveCard({ node, effRank, gap, onSelect, onOpenMemo, isSelected }) {
  const nonRank = isNonRank(node.rank)
  const tone = nonRank ? 'none' : gap?.achieved ? 'ok' : 'short'
  const displayRank = rankDisplay(nonRank ? node.rank : effRank)

  return (
    <div
      data-tree-node="true"
      className={`tree-node-card cursor-pointer rounded-lg border-2 px-1.5 py-1 text-center transition-all
        ${TONE_STYLE[tone]} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:-translate-y-[1px]'}`}
      style={{ width: CARD_WIDTH }}
      onClick={onSelect}
    >
      <div className={`mx-auto inline-block rounded border px-1.5 text-[11px] font-bold ${RANK_COLORS[effRank] ?? 'border-gray-300 bg-gray-100 text-gray-500'}`}>
        {displayRank}
      </div>
      <div className="mt-0.5 truncate text-[11px] font-semibold text-gray-800">{node.name || '이름 없음'}</div>
      <CopyableId value={node.memberId} />

      {!nonRank && !gap?.achieved && gap?.shortfalls?.length > 0 && (
        <div className="mt-0.5 rounded bg-white/70 px-0.5 py-0.5 text-[9px] leading-tight text-rose-700">
          {gap.shortfalls.join(' · ')}
        </div>
      )}

      <button
        className="mt-1 w-full rounded border border-white/70 bg-white/80 py-0.5 text-[10px] font-medium text-gray-600 transition-colors hover:bg-white"
        onClick={(e) => { e.stopPropagation(); onOpenMemo() }}
        title="메모 보기"
        data-no-pan
      >
        메모{node.memo?.trim() ? ' •' : ''}
      </button>
    </div>
  )
}

function EffectiveNode({ nodeId, nodes, effRankMap, gapMap, selectedId, onSelect, onOpenMemo }) {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return null
  const row = layout.childRow(nodeId, nodes)

  return (
    <div className="flex flex-col items-center" style={{ minWidth: row.hasChildren ? row.childRowWidth : CARD_WIDTH }}>
      <EffectiveCard
        node={node}
        effRank={effRankMap.get(node.id)}
        gap={gapMap.get(node.id)}
        isSelected={selectedId === node.id}
        onSelect={() => onSelect(node.id)}
        onOpenMemo={() => onOpenMemo(node.id)}
      />
      {row.hasChildren && (
        <div className="flex flex-col items-center" style={{ width: row.childRowWidth }}>
          <TreeConnectors row={row} height={10} />
          <div className="flex" style={{ width: row.childRowWidth }}>
            <div className="flex flex-col items-center" style={{ width: row.leftLaneWidth }}>
              {row.hasLeft && (
                <EffectiveNode nodeId={row.left.id} nodes={nodes} effRankMap={effRankMap} gapMap={gapMap} selectedId={selectedId} onSelect={onSelect} onOpenMemo={onOpenMemo} />
              )}
            </div>
            <div style={{ width: layout.branchGap }} />
            <div className="flex flex-col items-center" style={{ width: row.rightLaneWidth }}>
              {row.hasRight && (
                <EffectiveNode nodeId={row.right.id} nodes={nodes} effRankMap={effRankMap} gapMap={gapMap} selectedId={selectedId} onSelect={onSelect} onOpenMemo={onOpenMemo} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EffectiveTreePanel({ nodes, effRankMap, gapMap, selectedId, onSelect, onOpenMemo, rootNode }) {
  const { containerRef, layerRef, onMouseDown, resetView } = usePanZoom()
  const innerRef = useRef(null)
  const roots = nodes.filter((n) => !n.parentId)

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
    <section className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="flex flex-col justify-between gap-1 border-b px-3 py-2 lg:flex-row lg:items-center">
        <span className="text-[11px] font-bold uppercase text-gray-500">실질 직급 계보도</span>
        <button onClick={resetView} className="glass-btn h-7 w-fit min-w-fit px-2 text-[10px]">🎯 화면 맞춤</button>
      </div>

      {rootNode && rootIsNone && (
        <div className="border-b bg-slate-50 px-3 py-2 text-xs text-gray-500">
          맨 위에서 달성하고자 하는 직급을 정하면 무엇이 부족한지 계산합니다.
        </div>
      )}

      {rootNode && !rootIsNone && (
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
          {rootRule?.type === 'pv' && rootGap?.detail && (
            <div className="mt-1 text-[11px] text-gray-700">
              몸PV 반영 후 좌 {rootGap.detail.effLeft}만 · 우 {rootGap.detail.effRight}만 (각 {rootRule.targetMan}만 필요)
            </div>
          )}
          {!rootGap?.achieved && rootGap?.shortfalls?.length > 0 && (
            <div className="mt-1 font-medium text-rose-700">→ {rootGap.shortfalls.join(' / ')}</div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b px-3 py-1.5">
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
        className="org-tree-pan-area min-h-[340px] flex-1 overflow-hidden bg-slate-50/40 p-4"
      >
        <div ref={layerRef} className="will-change-transform" style={{ transform: 'translate(0px, 0px) scale(1)', transformOrigin: '0 0' }}>
          <div ref={innerRef} className="origin-top scale-[0.85] transform md:scale-100">
            {roots.map((root) => (
              <EffectiveNode
                key={root.id}
                nodeId={root.id}
                nodes={nodes}
                effRankMap={effRankMap}
                gapMap={gapMap}
                selectedId={selectedId}
                onSelect={onSelect}
                onOpenMemo={onOpenMemo}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
