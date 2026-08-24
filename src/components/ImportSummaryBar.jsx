import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { RANK_COLORS } from '../engine/ranks.js'

/**
 * 계보도를 이식한 직후 **그 회원 카드 바로 밑**에 뜨는 알림 — 무엇이 달라졌는지 알려준다.
 * 화면 아래에 두면 계보도에 가려 안 보였다. 팬 레이어 안에 있어 화면을 끌면 함께 따라온다.
 *
 * **스스로 사라지지 않는다.** 목록이 길 수 있고 되돌릴지 정하는 근거라
 * 다 읽기 전에 없어지면 안 된다. '✕ 닫기' 를 누르거나 다음 이식 때 갈린다.
 *
 * 읽기 쉬우려면 **한 줄에 한 칸**이어야 한다 — 여러 칸을 이어 붙이면 어디서 끊기는지
 * 알 수 없다. 그래서 이름표와 값을 두 칸짜리 격자로 나누고, 직급은 카드와 **같은 색**의
 * 알약으로 그린다.
 */

const SECTIONS = [
  { key: 'changed', label: '변경', chip: 'bg-amber-100 text-amber-800 border-amber-300', bar: 'border-l-amber-400' },
  { key: 'added', label: '추가', chip: 'bg-emerald-100 text-emerald-800 border-emerald-300', bar: 'border-l-emerald-400' },
  { key: 'removed', label: '삭제', chip: 'bg-rose-100 text-rose-800 border-rose-300', bar: 'border-l-rose-400' },
]

const CHIP = 'inline-block shrink-0 rounded border px-1 py-px text-[10px] font-bold leading-tight'

/** 직급은 카드와 같은 색을 쓴다 — 알림에서도 눈이 같은 것을 찾게 */
function RankPill({ rankKey, children }) {
  const color = RANK_COLORS[rankKey] ?? 'border-gray-300 bg-gray-100 text-gray-600'
  return <span className={`${CHIP} ${color}`}>{children}</span>
}

/** 값 하나 — 직급이면 색 알약, 아니면 그냥 글자 */
function Value({ text, rankKey, muted }) {
  if (rankKey !== undefined) return <RankPill rankKey={rankKey}>{text}</RankPill>
  return <span className={muted ? 'text-gray-400' : 'font-semibold text-gray-800'}>{text}</span>
}

/** 달라진 칸 한 줄 — `이름표 │ 이전 → 이후` */
function FieldLine({ field }) {
  return (
    <div className="grid grid-cols-[52px_1fr] items-baseline gap-1.5 py-px">
      <span className="text-right text-[10px] text-gray-500">{field.label}</span>
      {field.note ? (
        <span className="text-[11px] font-semibold text-gray-800">{field.note}</span>
      ) : (
        <span className="flex flex-wrap items-baseline gap-1 text-[11px]">
          <Value text={field.from} rankKey={field.kind === 'rank' ? field.fromRank : undefined} muted />
          <span className="text-gray-400">→</span>
          <Value text={field.to} rankKey={field.kind === 'rank' ? field.toRank : undefined} />
        </span>
      )}
    </div>
  )
}

/** 회원 하나 — 이름줄 + 그 아래 달라진 칸들 */
function Entry({ sectionKey, item }) {
  return (
    <li className="border-t border-gray-100 py-1 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-[12px] font-bold text-gray-800">{item.label}</span>
        <span className="rounded bg-gray-100 px-1 text-[10px] text-gray-500">{item.where}</span>
        {sectionKey !== 'changed' && <RankPill rankKey={item.rankKey}>{item.rank}</RankPill>}
        {item.moved && (
          <span className={`${CHIP} border-sky-300 bg-sky-100 text-sky-700`}>
            자리 이동 {item.movedFrom} → {item.where}
          </span>
        )}
      </div>
      {!!item.fields?.length && (
        <div className="mt-0.5">
          {item.fields.map((f) => <FieldLine key={f.label} field={f} />)}
        </div>
      )}
    </li>
  )
}

export default function ImportSummaryBar({ summary, onClose }) {
  const [open, setOpen] = useState(true) // 이식 직후에는 펼쳐서 보여준다 — 그러라고 띄운 것이다
  if (!summary) return null

  const { diff, name, error } = summary

  const closeBtn = (
    <button
      data-no-pan
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-bold text-gray-600 shadow-sm hover:bg-gray-100 hover:text-gray-900"
      onClick={onClose}
    >
      <X size={13} />
      닫기
    </button>
  )

  // 파일이 깨졌을 때 — 계보도는 한 글자도 안 바뀐 상태다
  if (error) {
    return (
      <Shell tone="border-rose-300 bg-rose-50">
        <div className="flex items-start gap-2 p-2">
          <span className={`${CHIP} border-rose-300 bg-rose-100 text-rose-800`}>실패</span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-rose-800">불러오지 못했습니다</p>
            <p className="mt-0.5 text-[11px] text-rose-700">{error}</p>
            <p className="mt-1 text-[10px] text-rose-600">계보도는 그대로입니다 — 아무것도 바뀌지 않았습니다.</p>
          </div>
          {closeBtn}
        </div>
      </Shell>
    )
  }

  const counts = SECTIONS.map((s) => ({ ...s, items: diff[s.key] }))
  const total = counts.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <Shell tone="border-sky-300 bg-white">
      <div className="flex items-center gap-1.5 border-b border-gray-200 bg-sky-50/70 p-1.5">
        <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-gray-800">
          '{name}' 갱신됨
        </span>
        {total > 0 && (
          <button
            data-no-pan
            className="flex shrink-0 items-center gap-0.5 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-bold text-gray-600 shadow-sm hover:bg-gray-100"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {open ? '접기' : '자세히'}
          </button>
        )}
        {closeBtn}
      </div>

      <div className="flex flex-wrap gap-1 px-2 py-1.5">
        {total === 0
          ? <span className="text-[11px] text-gray-500">달라진 것이 없습니다.</span>
          : counts.map((s) => (
            <span key={s.key} className={`${CHIP} ${s.chip} ${s.items.length ? '' : 'opacity-40'}`}>
              {s.label} {s.items.length}
            </span>
          ))}
      </div>

      {open && total > 0 && (
        // 큰 계보도를 불러오면 수십 줄이 된다 — 칸 안에서만 구르게 한다
        <div className="max-h-64 overflow-y-auto border-t border-gray-200 px-2 py-1.5">
          {counts.filter((s) => s.items.length).map((s) => (
            <div key={s.key} className={`mb-2 border-l-[3px] pl-2 last:mb-0 ${s.bar}`}>
              <div className={`${CHIP} ${s.chip} mb-0.5`}>{s.label}된 부분 · {s.items.length}명</div>
              <ul>
                {s.items.map((item, i) => (
                  <Entry key={`${item.label}-${item.where}-${i}`} sectionKey={s.key} item={item} />
                ))}
              </ul>
            </div>
          ))}
          <p className="border-t border-gray-200 pt-1 text-[10px] text-gray-500">
            되돌리기 버튼을 누르면 불러오기 전으로 돌아갑니다.
          </p>
        </div>
      )}
    </Shell>
  )
}

/**
 * 카드 바로 밑에 겹쳐 띄우는 틀.
 * `absolute` 라 계보도 배치를 밀어내지 않는다 — 하위 회원들이 아래로 밀리면
 * 무엇이 바뀌었는지 견주기가 더 어려워진다.
 * `data-no-pan` 은 알림 위에서 시작한 드래그가 화면을 끌지 않게 한다 (목록을 굴려야 한다).
 */
function Shell({ tone, children }) {
  return (
    <div
      data-no-pan
      onClick={(e) => e.stopPropagation()}
      className={`no-print absolute left-1/2 top-full z-[650] mt-1.5 w-[290px] -translate-x-1/2 rounded-lg border-2 text-xs shadow-xl ${tone}`}
    >
      {children}
    </div>
  )
}
