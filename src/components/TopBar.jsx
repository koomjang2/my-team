const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

/**
 * 맨 위 줄 — 대상 반기만 고른다.
 *
 * 예전에는 여기서 '나'의 직급·이름·ID·메모도 고쳤는데, 카드를 누르면 나오는
 * 편집창에서 똑같이 할 수 있어 중복이었다. 좁은 화면에서 계보도가 밀리기만 해서
 * 뺐다 — 되살리려면 이 파일과 `App.jsx` 의 TopBar 호출부를 함께 손봐야 한다.
 */
export default function TopBar({ period, onChangePeriod }) {
  const years = Array.from({ length: 5 }, (_, i) => period.year - 2 + i)

  return (
    <div className="no-print flex flex-shrink-0 flex-wrap items-end gap-2 border-b bg-white px-3 py-2">
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
  )
}
