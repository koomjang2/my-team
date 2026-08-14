import { useState } from 'react'
import {
  ALL_RANKS, NOMINAL_RANKS, RANK_COLORS_SOFT, RANK_COLORS_STRONG, RANK_HOTKEY, RANK_LABEL,
  RANK_SHORT_LABEL, RANK_NONE, hasMemberPv,
} from '../engine/ranks.js'
import NumberField from './NumberField.jsx'
import { useEditorHotkeys } from './keyboard.js'

/** 고르기 전에는 옅은 직급색, 고르면 같은 계열의 선명한 색 */
function rankButtonClass(rank, selected) {
  return selected
    ? `${RANK_COLORS_STRONG[rank]} ring-2 ring-offset-1 ring-slate-500`
    : `${RANK_COLORS_SOFT[rank]} hover:brightness-95`
}

const RANK_BTN = 'rounded border px-1 py-1 text-[10px] font-bold leading-tight transition-colors'

/**
 * 노드 카드를 터치하면 열리는 편집 팝오버.
 *
 * 직급 칸이 두 개인 이유:
 *   명목 직급   — 그 회원이 이름표로 달고 있는 직급 (예: 명목 STM)
 *   달성할 직급 — 이번 보름에 실제로 맞추려는 직급 (예: 이번엔 SRM)
 * 둘은 서로 독립이다.
 *
 * 위에서부터 이름 → 회원 ID → 명목 직급 → 달성할 직급 → PV → 메모 → 닫기 순이다.
 * 손이 먼저 닿아야 하는 것(이름·ID)을 맨 위에 둔다.
 *
 * 단축키는 커서가 글자 칸에 없을 때만 듣는다 (esc 만 예외) — `keyboard.js` 참고.
 */
export default function NodeEditorPopover({
  node, onUpdate, onClose, onAddLeft, onAddRight, canAddLeft, canAddRight,
}) {
  const isConsumer = node.rank === 'CSM'
  const isNone = node.rank === RANK_NONE
  const nominalRank = node.nominalRank ?? RANK_NONE

  // 명목 직급은 한 번 정하면 다시 볼 일이 드물다 — 정해져 있으면 접어 두고,
  // 접힌 버튼을 누르면 다시 펼쳐서 고칠 수 있게 한다.
  const [nominalOpen, setNominalOpen] = useState(nominalRank === RANK_NONE)

  useEditorHotkeys({
    onClose,
    onPickRank: (r) => onUpdate({ rank: r }),
    onAddLeft: () => canAddLeft && onAddLeft?.(),
    onAddRight: () => canAddRight && onAddRight?.(),
  })

  function pickNominal(r) {
    onUpdate({ nominalRank: r })
    setNominalOpen(false) // 고르면 자연스럽게 접힌다
  }

  return (
    <div
      className="no-print mt-1.5 w-56 rounded-lg border bg-white p-2 text-xs shadow-xl z-[200]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-1.5 flex items-center justify-end">
        <button
          className="flex items-center gap-1 rounded border border-gray-200 px-1.5 py-0.5 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          onClick={onClose}
          title="닫기"
        >
          ✕ 닫기
        </button>
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

      <div className="mb-1.5 border-t pt-1.5">
        <span className="font-semibold text-gray-600">명목 직급</span>
      </div>

      {nominalOpen ? (
        <div className="mb-2 grid grid-cols-3 gap-1">
          {NOMINAL_RANKS.map((r) => (
            <button
              key={r}
              className={`${RANK_BTN} ${rankButtonClass(r, nominalRank === r)}`}
              onClick={() => pickNominal(r)}
              title={RANK_LABEL[r]}
            >
              {r === RANK_NONE ? '없음' : r}
            </button>
          ))}
        </div>
      ) : (
        <button
          className={`${RANK_BTN} mb-2 w-full ${rankButtonClass(nominalRank, true)}`}
          onClick={() => setNominalOpen(true)}
          title="다시 눌러 명목 직급을 고칩니다"
        >
          {nominalRank === RANK_NONE ? '없음' : nominalRank} · 눌러서 변경
        </button>
      )}

      <div className="mb-1.5 flex items-baseline justify-between border-t pt-1.5">
        <span className="font-semibold text-gray-600">목표 직급 선택</span>
        <span className="text-[9px] font-normal text-gray-400">Q 좌 · W 우 추가</span>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1">
        {ALL_RANKS.map((r) => (
          <button
            key={r}
            className={`${RANK_BTN} ${rankButtonClass(r, node.rank === r)}`}
            onClick={() => onUpdate({ rank: r })}
            title={RANK_HOTKEY[r] ? `${RANK_LABEL[r]} · 단축키 ${RANK_HOTKEY[r]}` : RANK_LABEL[r]}
          >
            <div className="flex items-center justify-center gap-0.5">
              <span>{r === RANK_NONE ? '없음' : r}</span>
              {RANK_HOTKEY[r] && (
                <span className="rounded-sm bg-black/10 px-0.5 text-[8px] font-bold leading-tight opacity-70">
                  {RANK_HOTKEY[r]}
                </span>
              )}
            </div>
            <div className="font-normal opacity-80">{RANK_SHORT_LABEL[r]}</div>
          </button>
        ))}
      </div>

      {isNone && (
        <p className="mb-1 rounded-md border border-gray-200 bg-gray-50 p-1.5 text-[10px] text-gray-500">
          목표 직급을 정하지 않은 자리입니다. 어떤 직급 자격에도 포함되지 않지만,
          이 사람 아래의 하위는 그대로 집계됩니다.
        </p>
      )}

      {/* 회원PV(몸PV) — 명목 직급이 SRM 이상이면 숨긴다 */}
      {hasMemberPv(node.nominalRank) && (
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

      <label className="mb-1 block">
        <span className="text-gray-500">메모</span>
        <textarea
          className="mt-0.5 min-h-[52px] w-full resize-y rounded border px-1.5 py-1 text-[11px] outline-none focus:border-sky-400"
          value={node.memo ?? ''}
          onChange={(e) => onUpdate({ memo: e.target.value })}
          placeholder="이 사람에 대한 메모"
        />
      </label>

      {/* 오른쪽 위 ✕ 는 손가락으로 누르기 힘들다 — 폭을 꽉 채운 닫기를 하나 더 둔다 */}
      <button
        className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 py-1.5 text-[11px] font-bold text-gray-700 transition-colors hover:bg-gray-200"
        onClick={onClose}
      >
        닫기(esc)
      </button>
    </div>
  )
}
