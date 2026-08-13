# 작업 인계 문서

이 파일은 "작업파일 이어서 하자" 라고 말했을 때 Claude 가 최근 상황을 그대로
이어받기 위한 스냅샷이다. `CLAUDE.md` 에서 이 파일을 가리키고 있으니,
다른 컴퓨터에서 이 저장소를 열고 그 말을 하면 자동으로 여기부터 읽는다.

## 최근 커밋

```
(이 문서를 커밋하기 직전 HEAD)
5fe036b 데스크탑도 화면 높이 고정해 페이지 스크롤 제거, 패널 내부 팬으로 통일
a0ea179 작업 인계 문서 추가
02c04b8 모바일 UI 개선: 메뉴 접기, 패널 헤더 통일, 없음 회원 숨김
```

브랜치: `master`, 원격: `https://github.com/koomjang2/my-team.git`

## 이번 세션에서 한 일 (2) — 화면 손보기 5가지

사용자가 휴대폰 화면을 캡처해 표시해 준 요청 그대로 처리했다.

1. **패널 제목 키우기** — '계보도 구성' · '실질 직급 계보도' 를 `text-[10px]
   uppercase text-gray-500` → `text-[13px] font-bold text-gray-700`
   (`TreePanelHeader.jsx`)
2. **삭제(×) 버튼 잘 보이게** — 카드 오른쪽 위 × 버튼을
   `bg-gray-300 text-gray-500 opacity-30` → `bg-gray-400 text-white
   opacity-75 hover:opacity-100` (`OrgTreePanel.jsx`)
3. **오른쪽 요약줄 접기** — 목표/달성 여부 줄과 직급별 인원 줄을 한꺼번에
   접는 '접기/펼치기' 버튼을 `TreePanelHeader` 에 선택적으로 붙였다
   (`onToggleSummary` 가 넘어온 패널에만 나온다). 상태는 `App.jsx` 의
   `summaryOpen` 이고 `localStorage['my-team-ui-v1']` 에 `menuOpen` 과
   함께 저장된다. 접으면 계보도 영역이 데스크탑 기준 462px → 575px 로 늘어난다.
4. **가로 화면이면 좌우 배치** — 예전엔 `md:flex-row`(폭 768px) 로만 갈랐는데,
   눕힌 휴대폰은 폭이 768px 에 못 미치는 경우가 많아 위아래로 눌린 채였다.
   이제 `src/index.css` 의 `@media (min-width: 768px), (orientation: landscape)`
   가 `.split-area`(좌우) · `.split-pane-top`(50%) · `.split-divider`(숨김)를
   함께 처리한다. 세로가 짧은 화면(`max-height: 520px`)에서는
   `.org-tree-pan-area` 의 최소 높이도 풀어 준다.
   → **Tailwind 의 `md:` 유틸리티가 아니라 이 CSS 블록이 배치의 단일 출처다.**
   `@layer` 밖에 두어야 유틸리티(`flex-col`·`w-full`·`border-b`)를 이긴다.
5. **인쇄·그림에 대상 기간 찍기** — 새 컴포넌트 `CaptureCaption.jsx` 를 두
   패널의 `innerRef` 안(즉 잘라내는 영역 안)에 넣었다. 평소엔
   `.capture-only { display: none }` 로 숨어 있다가 인쇄(`body.print-panel-mode`
   + 그 패널의 `.print-target`) 또는 그림 저장(`usePanelCapture` 가 붙이는
   `body.capture-mode`) 일 때만 나온다. 문구는 `App.jsx` 의 `formatPeriod()`.

곁들여 고친 것: 머리줄 버튼 묶음에 `.no-scrollbar` 를 붙였다. 접기 버튼이
늘면서 375px 폭에서 가로 스크롤막대가 생겨 머리줄이 37px → 52px 로
두꺼워졌기 때문이다.

**검증**: 375×812(세로) 위아래 배치 · 740×380 과 812×375(가로) 좌우 절반씩
· 1280×720 좌우 — 모두 페이지 스크롤 없음, 머리줄 한 줄 유지. 인쇄/그림용
머리글은 각 모드에서 해당 패널만 켜지는 것까지 확인. `npm test` 통과,
`npm run build` 통과.

## 그 전 세션에서 한 일 — 데스크탑 페이지 스크롤 제거

지난 세션에서 물어봤던 질문("데스크탑도 모바일처럼 화면에 고정하고 패널 안에서만
팬 하도록 통일할지")에 사용자가 **그렇게 하라**고 답해서 바로 적용했다.

- `src/App.jsx` 의 `app-root` 클래스에서 `md:h-auto md:min-h-screen
  md:overflow-visible` 를 제거. 이제 데스크탑도 모바일과 동일하게
  `h-[100dvh] overflow-hidden` 로 화면에 고정된다.
- 원인이었던 구조: `app-root` 가 데스크탑에서 높이 제약을 풀고 있었기 때문에,
  그 안의 `splitAreaRef`(`flex-1 min-h-0`)가 기준으로 삼을 "정해진 높이"가
  없어져서 계보도가 커질 때 패널이 콘텐츠 크기만큼 실제로 늘어나 버렸고,
  결국 `body` 전체가 늘어나 브라우저 스크롤이 생겼다.
- `.split-pane-top { height: auto !important }` 은 상하 분할 비율(`splitPct`)을
  무효화해 좌우 배치에서 두 패널이 각각 풀 높이를 쓰게 하는 별개의 규칙이라
  이번 버그와 무관했다. (다음 세션에서 가로 배치 조건과 함께 묶었다 — 위 4번)
- 인쇄용 CSS(`body.print-panel-mode .app-root { height:auto; overflow:visible }`)
  는 그대로 유지되므로 인쇄 동작에는 영향 없음.

**검증**: 개발 서버에서 데스크탑(1280×720) 뷰포트로 계보도를 6단계 깊이까지
늘려 패널 내부 콘텐츠(`scrollHeight` 1676px)가 뷰포트보다 훨씬 커지게
만든 뒤 `document.documentElement.scrollHeight` 가 여전히 `720`(창 높이)
그대로임을 확인 — 페이지 스크롤 없이 패널 내부 팬으로만 접근됨. 모바일
(375×812) 회귀 없음도 확인. 콘솔 에러 없음.

## 지금 답 기다리는 질문

없음. 이 세션에서 나왔던 질문은 위 항목으로 마무리됐다. 다음 대화에서
"이어서 하자" 라고 하면 사용자에게 다음에 뭘 하고 싶은지 물어보면 된다.

## 참고: Vercel 연동

이 저장소는 Vercel 프로젝트 `koomjang2s-projects/my-team` 과 Git 연동 배포다
(`vercel.com` 에서 GitHub push 를 감지해 자동 빌드). 별도로 Vercel 쪽에만
있는 최신 소스 파일 같은 건 없다 — 배포본은 항상 `origin/master` 의 최신
커밋을 그대로 빌드한 것이다. 로컬에 `.vercel/` 폴더가 있으면 그건
`vercel link` + `vercel pull` 로 받은 프로젝트 설정/환경변수 캐시이고
`.gitignore` 에 등록돼 있어 커밋되지 않는다.

## 새 컴퓨터에서 이어받는 법

```bash
git clone https://github.com/koomjang2/my-team.git
cd my-team
npm install
npm run dev
```

`npm test` 로 직급 계산 엔진 검증(`src/engine/rankEngine.test.js`)도 같이
돌려보면 좋다 — STM 52명 / RM 160명 / CM 484명 / IM 1,456명이 나와야 정상.

## 참고

- 도메인 규칙·직급 3종 구분·폴더 구조는 `CLAUDE.md` 에 있다.
- 이 문서는 그때그때 스냅샷이라, 다음에 다시 "이어서 하자" 라고 할 때는
  이 파일을 최신 상황으로 덮어써서 갱신해두는 게 좋다.
