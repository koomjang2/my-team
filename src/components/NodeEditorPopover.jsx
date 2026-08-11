import { ALL_RANKS, RANK_COLORS, RANK_LABEL, RANK_SHORT_LABEL, RANK_RULES, RANK_NONE, canUseBodyPv, isNonRank, STATUS_ACTIVE, STATUS_PROSPECT, STATUS_LABEL } from '../engine/ranks.js'

/**
 * 노드 카드를 터치하면 열리는 편집 팝오버.
 * 1순위 동작은 "어떤 명목 직급을 달성하게 할 건지" 선택이고,
 * 이름/ID/분류/PV 목표를 함께 손볼 수 있다.
 */
export default function NodeEditorPopover({ node, onUpdate, onClose }) {
  const rule = RANK_RULES[node.rank]
  const isPvRank = rule?.type === 'pv'
  const isConsumer = node.rank === 'CSM'
  const isNone = node.rank === RANK_NONE
  const nonRank = isNonRank(node.rank)

  return (
    <div
      className="mt-1.5 w-56 rounded-lg border bg-white p-2 text-xs shadow-xl z-[200]"
      onClick={(e) => e.stopPropagation()}
      data-no-pan
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-semibold text-gray-600">달성할 직급 선택 <span className="font-normal text-gray-400">(명목)</span></span>
        <button
          className="rounded px-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          onClick={onClose}
          title="닫기"
        >
          ✕
        </button>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1">
        {ALL_RANKS.map((r) => (
          <button
            key={r}
            className={`rounded border px-1 py-1 text-[10px] font-bold leading-tight transition-colors
              ${node.rank === r ? `${RANK_COLORS[r]} ring-2 ring-blue-500` : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => onUpdate({ rank: r })}
            title={RANK_LABEL[r]}
          >
            <div>{r === RANK_NONE ? '없음' : r}</div>
            <div className="font-normal opacity-70">{RANK_SHORT_LABEL[r]}</div>
          </button>
        ))}
      </div>

      <label className="mb-1 block">
        <span className="text-gray-500">이름</span>
        <input
          className="mt-0.5 w-full rounded border px-1.5 py-1 outline-none focus:border-sky-400"
          value={node.name ?? ''}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="이름"
        />
      </label>

      <label className="mb-1.5 block">
        <span className="text-gray-500">회원 ID</span>
        <input
          className="mt-0.5 w-full rounded border px-1.5 py-1 outline-none focus:border-sky-400"
          value={node.memberId ?? ''}
          onChange={(e) => onUpdate({ memberId: e.target.value })}
          placeholder="회원번호"
        />
      </label>

      {!nonRank && (
        <div className="mb-1.5">
          <span className="text-gray-500">분류</span>
          <div className="mt-0.5 flex gap-1">
            {[STATUS_ACTIVE, STATUS_PROSPECT].map((s) => (
              <button
                key={s}
                className={`flex-1 rounded border px-1 py-1 text-[10px] font-medium transition-colors
                  ${node.status === s
                    ? 'border-sky-400 bg-sky-50 text-sky-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                onClick={() => onUpdate({ status: s })}
              >
                {STATUS_LABEL[s]} 사업자
              </button>
            ))}
          </div>
        </div>
      )}

      {isPvRank && (
        <div className="mb-1 rounded-md border border-sky-100 bg-sky-50/60 p-1.5">
          <div className="mb-1 text-[10px] text-sky-800">
            {node.rank} 조건 · 좌/우 각 {rule.targetMan}만 PV
          </div>
          <div className={`grid gap-1 ${canUseBodyPv(node.rank) ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <label className="flex flex-col items-center gap-0.5 text-[10px] text-gray-600">
              <span>좌 PV(만)</span>
              <input
                type="number"
                min={0}
                className="w-full rounded border px-1 py-0.5 text-center outline-none focus:border-sky-400"
                value={node.leftMan ?? 0}
                onChange={(e) => onUpdate({ leftMan: +e.target.value || 0 })}
              />
            </label>
            <label className="flex flex-col items-center gap-0.5 text-[10px] text-gray-600">
              <span>우 PV(만)</span>
              <input
                type="number"
                min={0}
                className="w-full rounded border px-1 py-0.5 text-center outline-none focus:border-sky-400"
                value={node.rightMan ?? 0}
                onChange={(e) => onUpdate({ rightMan: +e.target.value || 0 })}
              />
            </label>
            {canUseBodyPv(node.rank) && (
              <label className="flex flex-col items-center gap-0.5 text-[10px] text-gray-600">
                <span>몸PV(만)</span>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded border px-1 py-0.5 text-center outline-none focus:border-sky-400"
                  value={node.bodyMan ?? 0}
                  onChange={(e) => onUpdate({ bodyMan: +e.target.value || 0 })}
                />
              </label>
            )}
          </div>
        </div>
      )}

      {!isPvRank && !nonRank && (
        <p className="mb-1 rounded-md border border-orange-100 bg-orange-50/70 p-1.5 text-[10px] text-orange-800">
          {node.rank} 는 좌/우 각 {RANK_RULES[node.rank].requires} {RANK_RULES[node.rank].count}명으로 달성합니다.
          몸PV 합산으로는 달성할 수 없습니다.
        </p>
      )}

      {isNone && (
        <p className="mb-1 rounded-md border border-gray-200 bg-gray-50 p-1.5 text-[10px] text-gray-500">
          명목 직급을 정하지 않은 자리입니다. 어떤 직급 자격에도 포함되지 않지만,
          이 사람 아래의 하위는 그대로 집계됩니다.
        </p>
      )}

      {isConsumer && (
        <label className="mb-1 block rounded-md border border-slate-200 bg-slate-50 p-1.5">
          <span className="text-[10px] text-gray-600">예상 소비 PV(만)</span>
          <input
            type="number"
            min={0}
            className="mt-0.5 w-full rounded border px-1 py-0.5 text-center text-[10px] outline-none focus:border-sky-400"
            value={node.consumerMan ?? 0}
            onChange={(e) => onUpdate({ consumerMan: +e.target.value || 0 })}
          />
        </label>
      )}
    </div>
  )
}
