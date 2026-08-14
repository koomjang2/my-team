import { Check } from 'lucide-react'
import { ALL_RANKS, RANK_HOTKEY, RANK_SHORT_LABEL, rankDisplay } from '../engine/ranks.js'

/**
 * 카드의 '목표' 상자를 누르면 바로 뜨는 목표 직급 목록.
 *
 * 큰 편집창을 열지 않고 직급만 바꾸려고 만들었다. 단축키는 목록 왼쪽에 적어 두고
 * 실제 키 처리는 카드 쪽(useEditorHotkeys)이 맡는다 — 목록이 닫혀 있어도
 * 회원이 열려 있으면 같은 키가 듣기 때문이다.
 *
 * 카드 안에서 absolute 로 떠서 계보도 배치를 밀지 않는다.
 */
export default function RankQuickPicker({ value, onPick }) {
  return (
    <div
      data-no-pan
      className="absolute left-1/2 top-full z-[400] mt-1 w-[132px] -translate-x-1/2 overflow-hidden rounded-lg border border-gray-300 bg-white py-1 text-left shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {ALL_RANKS.map((r) => {
        const selected = value === r
        return (
          <button
            key={r}
            className={`flex w-full items-center gap-1.5 px-2 py-1 text-[11px] leading-tight transition-colors hover:bg-slate-100
              ${selected ? 'bg-sky-50 font-bold text-sky-600' : 'text-gray-700'}`}
            onClick={(e) => { e.stopPropagation(); onPick(r) }}
            title={RANK_SHORT_LABEL[r]}
          >
            <span className="w-3 shrink-0 text-center text-[9px] font-normal text-gray-400">
              {RANK_HOTKEY[r] ?? ''}
            </span>
            <span className="flex-1 text-left">{rankDisplay(r)}</span>
            {selected && <Check size={11} className="shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}
