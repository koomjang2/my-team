import { useEffect, useState } from 'react'
import { Pencil, X } from 'lucide-react'

/** '메모' 를 터치하면 아래에서 올라오는 스낵바. 수정 / 닫기 버튼을 가진다. */
export default function MemoSnackbar({ node, onSave, onClose }) {
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
    <div className="fixed bottom-6 left-1/2 z-[9999] w-[92%] max-w-[460px] -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-800/95 px-5 py-4 text-white shadow-2xl backdrop-blur-sm no-print">
      <div className="flex items-center justify-between gap-2 border-b border-slate-600 pb-2">
        <span className="truncate text-sm font-bold text-sky-400">
          {node.name || '이름 없음'}
          {node.memberId ? <span className="ml-1 text-xs font-normal text-slate-400">({node.memberId})</span> : null}
          <span className="ml-2 text-xs font-normal text-slate-300">메모</span>
        </span>
        <div className="flex flex-shrink-0 items-center gap-1">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-amber-300 transition-colors hover:bg-slate-700"
              title="메모 수정"
            >
              <Pencil size={13} /> 수정
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            title="닫기"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 max-h-[35vh] overflow-y-auto">
        {editing ? (
          <>
            <textarea
              autoFocus
              className="min-h-[110px] w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="이 사람에 대한 메모를 입력하세요"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => { setDraft(node.memo ?? ''); setEditing(false) }}
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
              >
                취소
              </button>
              <button
                onClick={commit}
                className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
              >
                저장
              </button>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-slate-200">
            {node.memo?.trim() ? node.memo : <span className="text-slate-500">메모가 없습니다. 수정을 눌러 입력하세요.</span>}
          </p>
        )}
      </div>
    </div>
  )
}
