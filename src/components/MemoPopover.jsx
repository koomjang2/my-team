import { useEffect, useState } from 'react'
import { Pencil, X } from 'lucide-react'

/**
 * '메모' 를 누르면 **그 회원 카드 바로 밑에** 뜨는 쪽지창. 수정 / 닫기를 가진다.
 *
 * 예전에는 화면 맨 아래 스낵바였는데, 어느 회원의 메모인지 눈으로 잇기 어려웠다.
 * 카드의 `relative` 래퍼 안에서 absolute 로 띄우므로 계보도 배치를 밀지 않는다.
 */
export default function MemoPopover({ node, onSave, onClose }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node?.memo ?? '')

  useEffect(() => {
    setDraft(node?.memo ?? '')
    setEditing(false)
  }, [node?.id])

  if (!node) return null

  function commit() {
    onSave(node.id, draft)
    setEditing(false)
  }

  return (
    <div
      className="no-print absolute left-1/2 top-full z-[400] mt-1.5 w-56 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-800/95 px-3 py-2 text-white shadow-2xl backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
      data-no-pan
    >
      <div className="flex items-center justify-between gap-1 border-b border-slate-600 pb-1.5">
        <span className="truncate text-[11px] font-bold text-sky-400">
          {node.name || '이름 없음'}
          <span className="ml-1 text-[10px] font-normal text-slate-300">메모</span>
        </span>
        <div className="flex flex-shrink-0 items-center gap-1">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] text-amber-300 transition-colors hover:bg-slate-700"
              title="메모 수정"
            >
              <Pencil size={11} /> 수정
            </button>
          )}
          {/* ✕ 만 있으면 손가락으로 누르기 힘들다 — '수정' 처럼 글자를 붙여 과녁을 넓힌다 */}
          <button
            onClick={onClose}
            className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            title="닫기"
          >
            <X size={11} /> 닫기
          </button>
        </div>
      </div>

      <div className="mt-2 max-h-[30vh] overflow-y-auto">
        {editing ? (
          <>
            <textarea
              autoFocus
              className="min-h-[80px] w-full rounded-lg border border-slate-600 bg-slate-900/70 px-2 py-1.5 text-[11px] text-white outline-none focus:border-sky-500"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="이 사람에 대한 메모를 입력하세요"
            />
            <div className="mt-1.5 flex justify-end gap-1.5">
              <button
                onClick={() => { setDraft(node.memo ?? ''); setEditing(false) }}
                className="rounded-lg bg-slate-700 px-2.5 py-1 text-[10px] text-slate-300 hover:bg-slate-600"
              >
                취소
              </button>
              <button
                onClick={commit}
                className="rounded-lg bg-sky-600 px-3 py-1 text-[10px] font-medium text-white hover:bg-sky-500"
              >
                저장
              </button>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-[11px] text-slate-200">
            {node.memo?.trim() ? node.memo : <span className="text-slate-500">메모가 없습니다. 수정을 눌러 입력하세요.</span>}
          </p>
        )}
      </div>
    </div>
  )
}
