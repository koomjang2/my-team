/**
 * 인쇄·그림 저장에만 딸려 나가는 머리글.
 *
 * 화면에서는 대상 기간이 맨 위 입력 메뉴에 있지만, 인쇄·그림은 계보도 영역만
 * 잘라 내므로 그대로 두면 어느 보름의 계획인지 알 수 없는 그림이 남는다.
 * 그래서 계보도와 같은 영역(innerRef) 안에 넣어 두고 `.capture-only` 규칙으로
 * 평소엔 감춰 둔다 — `src/index.css` 참고.
 */
export default function CaptureCaption({ title, periodLabel }) {
  return (
    <div className="capture-only mb-3 whitespace-nowrap border-b border-slate-300 pb-1.5">
      <span className="text-[13px] font-bold text-gray-800">{title}</span>
      {periodLabel && (
        <span className="ml-2 text-[12px] text-gray-600">대상 기간 · {periodLabel}</span>
      )}
    </div>
  )
}
