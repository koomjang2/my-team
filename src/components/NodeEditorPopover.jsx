import {
  ALL_RANKS, NOMINAL_RANKS, RANK_COLORS_SOFT, RANK_COLORS_STRONG, RANK_LABEL, RANK_SHORT_LABEL,
  RANK_RULES, RANK_NONE, hasMemberPv, isNonRank,
  STATUS_ACTIVE, STATUS_PROSPECT, STATUS_LABEL,
} from '../engine/ranks.js'
import NumberField from './NumberField.jsx'

/** 고르기 전에는 옅은 직급색, 고르면 같은 계열의 선명한 색 */
function rankButtonClass(rank, selected) {
  return selected
    ? `${RANK_COLORS_STRONG[rank]} ring-2 ring-offset-1 ring-slate-500`
    : `${RANK_COLORS_SOFT[rank]} hover:brightness-95`
}

/**
 * 노드 카드를 터치하면 열리는 편집 팝오버.
 *
 * 직급 칸이 두 개인 이유:
 *   명목 직급   — 그 회원이 이름표로 달고 있는 직급 (예: 명목 STM)
 *   달성할 직급 — 이번 보름에 실제로 맞추려는 직급 (예: 이번엔 SRM)
 * 둘은 서로 독립이다.
 */
export default function NodeEditorPopover({ node, onUpdate, onClose }) {
  const rule = RANK_RULES[node.rank]
  const isPvRank = rule?.type === 'pv'
  const isConsumer = node.rank === 'CSM'
  const isNone = node.rank === RANK_NONE
  const nonRank = isNonRank(node.rank)
  const nominalRank = node.nominalRank ?? RANK_NONE

  return (
    <div
      className="no-print mt-1.5 w-56 rounded-lg border bg-white p-2 text-xs shadow-xl z-[200]"
      onClick={(e) => e.stopPropagation()}
      data-no-pan
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-semibold text-gray-600">명목 직급</span>
        <button
          className="flex items-center gap-1 rounded border border-gray-200 px-1.5 py-0.5 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          onClick={onClose}
          title="닫기"
        >
          ✕ 닫기
        </button>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1">
        {NOMINAL_RANKS.map((r) => (
          <button
            key={r}
            className={`rounded border px-1 py-1 text-[10px] font-bold leading-tight transition-colors
              ${rankButtonClass(r, nominalRank === r)}`}
            onClick={() => onUpdate({ nominalRank: r })}
            title={RANK_LABEL[r]}
          >
            {r === RANK_NONE ? '없음' : r}
          </button>
        ))}
      </div>

      <div className="mb-1.5 border-t pt-1.5">
        <span className="font-semibold text-gray-600">달성할 직급 선택</span>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1">
        {ALL_RANKS.map((r) => (
          <button
            key={r}
            className={`rounded border px-1 py-1 text-[10px] font-bold leading-tight transition-colors
              ${rankButtonClass(r, node.rank === r)}`}
            onClick={() => onUpdate({ rank: r })}
            title={RANK_LABEL[r]}
          >
            <div>{r === RANK_NONE ? '없음' : r}</div>
            <div className="font-normal opacity-80">{RANK_SHORT_LABEL[r]}</div>
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

      {/* 직급 조건 안내 */}
      {isPvRank && (
        <p className="mb-1 rounded-md border border-sky-100 bg-sky-50/60 p-1.5 text-[10px] text-sky-800">
          {node.rank} 조건 · 좌/우 각 {rule.targetMan}만 PV
        </p>
      )}

      {!isPvRank && !nonRank && (
        <p className="mb-1 rounded-md border border-orange-100 bg-orange-50/70 p-1.5 text-[10px] text-orange-800">
          {node.rank} 조건 · 좌/우 각 {rule.requires} {rule.count}명
        </p>
      )}

      {isNone && (
        <p className="mb-1 rounded-md border border-gray-200 bg-gray-50 p-1.5 text-[10px] text-gray-500">
          달성할 직급을 정하지 않은 자리입니다. 어떤 직급 자격에도 포함되지 않지만,
          이 사람 아래의 하위는 그대로 집계됩니다.
        </p>
      )}

      {/* 회원PV(몸PV) — SSM / SM / DM */}
      {hasMemberPv(node.rank) && (
        <label className="mb-1 block rounded-md border border-emerald-100 bg-emerald-50/60 p-1.5">
          <span className="text-[10px] font-medium text-emerald-800">회원PV(몸PV) · 만</span>
          <NumberField
            className="mt-0.5 w-full rounded border px-1 py-0.5 text-center text-[10px] outline-none focus:border-emerald-400"
            value={node.memberPvMan ?? 0}
            onChange={(v) => onUpdate({ memberPvMan: v })}
          />
        </label>
      )}

      {isConsumer && (
        <label className="mb-1 block rounded-md border border-slate-200 bg-slate-50 p-1.5">
          <span className="text-[10px] text-gray-600">예상 소비 PV(만)</span>
          <NumberField
            className="mt-0.5 w-full rounded border px-1 py-0.5 text-center text-[10px] outline-none focus:border-sky-400"
            value={node.consumerMan ?? 0}
            onChange={(v) => onUpdate({ consumerMan: v })}
          />
        </label>
      )}

      {/* 오른쪽 위 ✕ 는 손가락으로 누르기 힘들다 — 폭을 꽉 채운 닫기를 하나 더 둔다 */}
      <button
        className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 py-1.5 text-[11px] font-bold text-gray-700 transition-colors hover:bg-gray-200"
        onClick={onClose}
      >
        닫기
      </button>
    </div>
  )
}
