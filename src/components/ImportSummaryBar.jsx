import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

/**
 * 계보도를 이식한 직후 화면 아래에 뜨는 알림 — 무엇이 달라졌는지 알려준다.
 *
 * **스스로 사라지지 않는다.** 목록이 길 수 있고 되돌릴지 말지 정하는 근거라
 * 다 읽기 전에 없어지면 안 된다. ✕ 를 누르거나 다음 이식 때 갈린다.
 *
 * 요약 줄만 늘 보이고 목록은 접혀 있다 — 큰 계보도를 불러오면 수십 줄이 되기 때문이다.
 * 인쇄·그림 저장에는 나오지 않는다 (`no-print`).
 */

const SECTIONS = [
  { key: 'changed', label: '변경', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  { key: 'added', label: '추가', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { key: 'removed', label: '삭제', tone: 'text-rose-700 bg-rose-50 border-rose-200' },
]

/** 한 항목이 차지하는 줄 — 이름, 자리, 그리고 무엇이 어떻게 바뀌었는지 */
function Row({ sectionKey, item }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 py-0.5">
      <span className="font-bold">{item.label}</span>
      <span className="text-[10px] text-gray-500">{item.where}</span>

      {sectionKey !== 'changed' && (
        <span className="text-[10px] text-gray-600">목표 {item.rank}</span>
      )}

      {item.moved && (
        <span className="rounded bg-sky-100 px-1 text-[10px] font-medium text-sky-700">
          자리 이동 {item.movedFrom} → {item.where}
        </span>
      )}

      {item.fields?.map((f) => (
        <span key={f.label} className="text-[10px] text-gray-600">
          {f.label}{' '}
          {/* 메모처럼 '무엇 → 무엇' 으로 적기 어려운 칸은 한 마디로 적는다 */}
          {f.note ? (
            <span className="font-medium text-gray-800">{f.note}</span>
          ) : (
            <>
              <span className="text-gray-400">{f.from}</span>
              {' → '}
              <span className="font-medium text-gray-800">{f.to}</span>
            </>
          )}
        </span>
      ))}
    </li>
  )
}

export default function ImportSummaryBar({ summary, onClose }) {
  const [open, setOpen] = useState(false)
  if (!summary) return null

  const { diff, name, error } = summary

  // 파일이 깨졌을 때 — 계보도는 한 글자도 안 바뀐 상태다
  if (error) {
    return (
      <div className="no-print pointer-events-auto absolute inset-x-2 bottom-2 z-[700] rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs shadow-xl">
        <div className="flex items-start gap-2">
          <span className="font-bold text-rose-700">불러오지 못했습니다</span>
          <span className="min-w-0 flex-1 text-rose-800">{error}</span>
          <button className="shrink-0 rounded p-0.5 text-rose-400 hover:bg-rose-100 hover:text-rose-700" onClick={onClose} title="닫기">
            <X size={14} />
          </button>
        </div>
        <p className="mt-1 text-[10px] text-rose-600">계보도는 그대로입니다 — 아무것도 바뀌지 않았습니다.</p>
      </div>
    )
  }

  const counts = SECTIONS.map((s) => ({ ...s, items: diff[s.key] }))
  const total = counts.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="no-print pointer-events-auto absolute inset-x-2 bottom-2 z-[700] rounded-lg border border-gray-300 bg-white/95 text-xs shadow-xl backdrop-blur">
      <div className="flex items-center gap-2 p-2">
        <span className="shrink-0 font-bold text-gray-700">'{name}' 갱신됨</span>

        {total === 0 ? (
          <span className="min-w-0 flex-1 text-gray-500">달라진 것이 없습니다.</span>
        ) : (
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {counts.map((s) => (
              <span key={s.key} className={`rounded border px-1.5 py-0.5 font-medium ${s.tone}`}>
                {s.label} {s.items.length}
              </span>
            ))}
          </span>
        )}

        {total > 0 && (
          <button
            className="flex shrink-0 items-center gap-0.5 rounded border border-gray-300 px-1.5 py-0.5 font-medium text-gray-600 hover:bg-gray-100"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '접기' : '자세히'}
            {open ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        )}

        <button className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" onClick={onClose} title="닫기">
          <X size={14} />
        </button>
      </div>

      {open && total > 0 && (
        // 큰 계보도를 불러오면 수십 줄이 된다 — 칸 안에서만 구르게 한다
        <div className="max-h-52 overflow-y-auto border-t px-2 py-1.5">
          {counts.filter((s) => s.items.length).map((s) => (
            <div key={s.key} className="mb-1.5 last:mb-0">
              <div className={`mb-0.5 inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold ${s.tone}`}>
                {s.label}된 부분 · {s.items.length}명
              </div>
              <ul className="pl-1">
                {s.items.map((item, i) => (
                  <Row key={`${item.label}-${item.where}-${i}`} sectionKey={s.key} item={item} />
                ))}
              </ul>
            </div>
          ))}
          <p className="mt-1 border-t pt-1 text-[10px] text-gray-500">
            되돌리기 버튼을 누르면 불러오기 전으로 돌아갑니다.
          </p>
        </div>
      )}
    </div>
  )
}
