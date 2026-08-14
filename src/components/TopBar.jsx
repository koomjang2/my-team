const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

/**
 * 맨 위 줄 — 대상 반기만 고른다. 년·월·반기를 한 줄에 늘어놓는다.
 *
 * 예전에는 여기서 '나'의 직급·이름·ID·메모도 고쳤는데, 카드를 누르면 나오는
 * 편집창에서 똑같이 할 수 있어 중복이었다. 좁은 화면에서 계보도가 밀리기만 해서
 * 뺐다 — 되살리려면 이 파일과 `App.jsx` 의 TopBar 호출부를 함께 손봐야 한다.
 */
export default function TopBar({ period, onChangePeriod }) {
  const years = Array.from({ length: 5 }, (_, i) => period.year - 2 + i)

  return (
    <div className="no-print flex flex-shrink-0 flex-wrap items-center gap-2 border-b bg-white px-3 py-2 md:gap-3">
      <span className="text-xs font-medium text-gray-500">기간</span>

      <select
        className="rounded border px-2 py-1 text-sm outline-none"
        value={period.year}
        onChange={(e) => onChangePeriod({ ...period, year: +e.target.value })}
      >
        {years.map((y) => <option key={y} value={y}>{y}년</option>)}
      </select>

      <select
        className="rounded border px-2 py-1 text-sm outline-none"
        value={period.month}
        onChange={(e) => onChangePeriod({ ...period, month: +e.target.value })}
      >
        {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
      </select>

      {/*
        상/하반기는 둘뿐이라 펼침 목록보다 라디오가 한 번에 보인다.
        좁은 화면에서는 날짜 범위를 접어 한 줄에 다 들어가게 한다 —
        괄호까지 다 적으면 375px 에서 줄이 넘어간다.
      */}
      <div className="flex gap-2 sm:gap-3">
        {['first', 'second'].map((h) => (
          <label key={h} className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-sm">
            <input
              type="radio"
              name="half"
              value={h}
              checked={period.half === h}
              onChange={() => onChangePeriod({ ...period, half: h })}
            />
            {h === 'first' ? '상반기' : '하반기'}
            <span className="hidden sm:inline">{h === 'first' ? ' (1~15일)' : ' (16일~말일)'}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
