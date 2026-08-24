import { useEffect } from 'react'
import { FolderInput } from 'lucide-react'

/**
 * 계보도 이식 직전에 뜨는 확인창. **이 저장소에서 유일한 전체화면 모달이다.**
 *
 * 다른 떠 있는 것들(편집창·직급 목록·이식 결과)은 전부 카드 밑에 붙는 `absolute`
 * 팝오버지만, 이것만 `fixed inset-0` 인 이유는 둘이다:
 *   - 되돌리기로만 물릴 수 있는 파괴적인 결정이라, 답하는 동안 나머지 화면을
 *     계속 만질 수 있게 두고 싶지 않다.
 *   - 팬/줌으로 카드가 화면 밖에 나가 있어도 PC·모바일에서 똑같이 보여야 한다.
 *
 * 버튼은 `NodeEditorPopover` 의 닫기 버튼과 같은 해법을 쓴다 — 손가락으로 누르기
 * 힘든 문제는 글자를 키워서가 아니라 **폭을 꽉 채우고 위아래 여백을 주어** 푼다.
 *
 * 파일에 그쪽 레그가 비어 있으면 그 버튼을 **막는다.** 엔진은 그대로 밀어붙여
 * 내 그쪽을 비워 버리므로(파일이 이긴다), 실수로 눌러 잃는 일이 없게 여기서 막는다.
 */
export default function ImportConfirmDialog({
  targetName, fileName, currentCount, fileTotalCount,
  fileLeftCount, fileRightCount, periodWarning,
  onPick, onCancel,
}) {
  // 편집창의 esc(`keyboard.js`)는 편집창이 열려 있을 때만 듣는데, 이식을 시작하면
  // 그 창은 이미 닫혀 있다. 그래서 이 창이 제 esc 를 스스로 듣는다.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="no-print fixed inset-0 z-[900] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-lg border bg-white p-3 text-xs shadow-xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-1.5 font-bold text-gray-800">
          <FolderInput size={14} className="text-sky-600" />
          계보도 불러오기
        </div>

        <p className="mb-2 text-[11px] text-gray-700">
          <b>{targetName}</b> 자리를 파일 내용으로 바꿉니다.
        </p>

        <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 rounded-md bg-slate-50 p-2 text-[11px]">
          <dt className="text-gray-500">지금 계보도</dt>
          <dd className="text-gray-800">{targetName} (아래 {currentCount}명)</dd>
          <dt className="text-gray-500">불러올 파일</dt>
          <dd className="text-gray-800">{fileName} (아래 {fileTotalCount}명)</dd>
          {periodWarning && (
            <>
              <dt className="text-amber-700">파일 기간</dt>
              <dd className="text-amber-700">{periodWarning} ← 지금 화면과 다릅니다</dd>
            </>
          )}
        </dl>

        <div className="flex flex-col gap-1">
          <LineButton
            label="모두 불러오기"
            hint={`${fileTotalCount}명`}
            tone="sky"
            onClick={() => onPick('all')}
          />
          <LineButton
            label="좌라인만 불러오기"
            hint={`파일 좌: ${fileLeftCount}명`}
            tone="blue"
            disabled={fileLeftCount === 0}
            onClick={() => onPick('left')}
          />
          <LineButton
            label="우라인만 불러오기"
            hint={`파일 우: ${fileRightCount}명`}
            tone="orange"
            disabled={fileRightCount === 0}
            onClick={() => onPick('right')}
          />
          <button
            className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 py-2.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-200"
            onClick={onCancel}
          >
            취소(esc)
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-gray-400">되돌리기로 되돌릴 수 있습니다.</p>
      </div>
    </div>
  )
}

// 좌·우 버튼 색은 계보도의 좌(파랑)·우(주황) 이름표와 맞춘다 — 눈이 같은 것을 찾게
const TONES = {
  sky: 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100',
  blue: 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100',
  orange: 'border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100',
}

function LineButton({ label, hint, tone, disabled, onClick }) {
  return (
    <button
      className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-xs font-bold transition-colors
        ${disabled ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300' : TONES[tone]}`}
      disabled={disabled}
      onClick={onClick}
      title={disabled ? '파일에 이 쪽 하위가 없습니다' : undefined}
    >
      <span>{label}</span>
      <span className="text-[10px] font-normal opacity-70">{hint}</span>
    </button>
  )
}
