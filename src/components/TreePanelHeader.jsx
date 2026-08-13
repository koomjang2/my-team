/**
 * 두 계보도 패널의 공용 머리줄 — 패널 이름과 메뉴를 같은 줄, 같은 글자 크기로 놓는다.
 *
 * 좁은 화면에서도 절대 두 줄이 되지 않아야 하므로 flex-nowrap 으로 묶고,
 * 그래도 넘치면 줄바꿈 대신 가로 스크롤로 흘린다.
 */
const BTN = 'glass-btn h-6 shrink-0 gap-0.5 px-0.5 text-[10px] leading-none'

export default function TreePanelHeader({
  title, onSave, onLoad, onPrint, onImage, onFocusRoot, onReset,
  summaryOpen, onToggleSummary,
}) {
  return (
    <div className="flex flex-nowrap items-center gap-1 border-b px-1.5 py-1.5">
      <span className="shrink-0 text-[13px] font-bold text-gray-700">{title}</span>
      <div className="no-scrollbar flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto">
        <button onClick={onSave} className={BTN} title="계보도를 파일로 저장">🗂 저장</button>
        <button onClick={onLoad} className={BTN} title="저장한 파일 열기">📂 열기</button>
        <button onClick={onPrint} className={BTN} title="이 패널만 인쇄">🖨 인쇄</button>
        <button onClick={onImage} className={BTN} title="이 패널을 그림으로 저장">🖼 그림</button>
        <button onClick={onFocusRoot} className={BTN} title="'나' 를 화면 맨 위로">🎯 나</button>
        <button onClick={onReset} className={BTN} title="계보도 초기화">♻ 초기화</button>
      </div>
      {/* 요약줄이 있는 패널에만 붙는다 — 좁은 화면에서 계보도에 자리를 내주기 위한 것 */}
      {onToggleSummary && (
        <button
          onClick={onToggleSummary}
          className={`${BTN} ml-auto`}
          title={summaryOpen ? '요약 접기' : '요약 펼치기'}
          aria-expanded={summaryOpen}
        >
          {summaryOpen ? '접기' : '펼치기'}
        </button>
      )}
    </div>
  )
}
