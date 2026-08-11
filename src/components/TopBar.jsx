import { BUSINESS_RANKS, RANK_COLORS, RANK_SHORT_LABEL } from '../engine/ranks.js'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

/** 맨 위 — 내가 달성하고자 하는 직급 / 이름 / ID / 메모 + 대상 반기 */
export default function TopBar({ me, period, onUpdateMe, onChangePeriod, onOpenMemo }) {
  const years = Array.from({ length: 5 }, (_, i) => period.year - 2 + i)

  return (
    <div className="no-print flex flex-shrink-0 flex-wrap items-end gap-2 border-b bg-white px-3 py-2">
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase text-gray-500">달성하고자 하는 직급</span>
        <select
          className={`h-8 rounded-lg border-2 px-2 text-sm font-bold outline-none ${RANK_COLORS[me?.rank] ?? 'border-gray-300 bg-white'}`}
          value={me?.rank ?? 'SM'}
          onChange={(e) => onUpdateMe({ rank: e.target.value })}
        >
          {BUSINESS_RANKS.map((r) => (
            <option key={r} value={r}>
              {r} ({RANK_SHORT_LABEL[r]})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase text-gray-500">이름</span>
        <input
          className="h-8 w-28 rounded-lg border px-2 text-sm outline-none focus:border-sky-400"
          value={me?.name ?? ''}
          onChange={(e) => onUpdateMe({ name: e.target.value })}
          placeholder="내 이름"
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase text-gray-500">ID</span>
        <input
          className="h-8 w-28 rounded-lg border px-2 text-sm outline-none focus:border-sky-400"
          value={me?.memberId ?? ''}
          onChange={(e) => onUpdateMe({ memberId: e.target.value })}
          placeholder="회원번호"
        />
      </label>

      <button
        onClick={onOpenMemo}
        className="glass-btn h-8 px-3 text-sm"
        title="메모 열기"
      >
        메모{me?.memo?.trim() ? ' •' : ''}
      </button>

      <div className="ml-auto flex items-end gap-1">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase text-gray-500">대상 기간</span>
          <div className="flex gap-1">
            <select
              className="h-8 rounded-lg border px-1.5 text-sm outline-none"
              value={period.year}
              onChange={(e) => onChangePeriod({ ...period, year: +e.target.value })}
            >
              {years.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select
              className="h-8 rounded-lg border px-1.5 text-sm outline-none"
              value={period.month}
              onChange={(e) => onChangePeriod({ ...period, month: +e.target.value })}
            >
              {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
            </select>
            <select
              className="h-8 rounded-lg border px-1.5 text-sm outline-none"
              value={period.half}
              onChange={(e) => onChangePeriod({ ...period, half: e.target.value })}
            >
              <option value="first">상반기 (1~15일)</option>
              <option value="second">하반기 (16일~말일)</option>
            </select>
          </div>
        </label>
      </div>
    </div>
  )
}
