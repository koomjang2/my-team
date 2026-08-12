# 작업 인계 문서

이 파일은 "작업파일 이어서 하자" 라고 말했을 때 Claude 가 최근 상황을 그대로
이어받기 위한 스냅샷이다. `CLAUDE.md` 에서 이 파일을 가리키고 있으니,
다른 컴퓨터에서 이 저장소를 열고 그 말을 하면 자동으로 여기부터 읽는다.

## 최근 커밋

```
02c04b8 모바일 UI 개선: 메뉴 접기, 패널 헤더 통일, 없음 회원 숨김
25b5f04 위쪽 빈 공간 제거 등
8c33210 Add nominal rank as its own field; single 회원PV input
```

브랜치: `master`, 원격: `https://github.com/koomjang2/my-team.git`

방금 `02c04b8` 을 로컬에 커밋했다 (2026-08-12). **아직 push 하지 않았다면**
새 컴퓨터에서 받은 origin 에는 이 커밋이 없을 수 있다 — `git log --oneline -3`
으로 위 해시가 보이는지 먼저 확인할 것.

## `02c04b8` 에서 한 일 (모바일 UI 개선 5가지)

1. 상단 입력 메뉴(직급/이름/ID/메모/대상기간) 접기·펼치기 버튼 — `App.jsx` 의
   `menuOpen` state, `localStorage['my-team-ui-v1']` 에 저장돼 다음에도 유지됨
2. 좌우 두 패널 헤더를 이름+메뉴 한 줄로 통일, 같은 10px 폰트 —
   새 컴포넌트 `src/components/TreePanelHeader.jsx`
3. 실질 직급 계보도(오른쪽)에도 저장/열기/인쇄/그림/나/초기화 메뉴를
   왼쪽과 동일하게 배치 — 인쇄·그림은 새 훅 `src/components/usePanelCapture.js`
   로 공용화해서 **누른 패널만** 대상으로 하도록 고침 (기존엔 왼쪽 전용이었음)
4. 과녁 아이콘 '화면 맞춤' → '나' 로 이름 변경 (좌우 공통)
5. 달성할 직급을 '없음'(`RANK_NONE`) 으로 둔 회원은 오른쪽 실질 계보도에서
   숨기되, 위아래 연결이 끊기지 않게 함 — `treeLayout.js` 의 `collapseHidden()`
   - 자식 없음 → 사라짐
   - 자식 1개 → 그 자식이 자리를 물려받아 부모와 직접 연결
   - 자식 2개 → 카드만 숨기고 연결선만 통과(`passthrough`)

## 지금 답 기다리는 질문 (여기서부터 이어가면 됨)

이 커밋을 만들고 나서 사용자에게 다음을 물어본 상태였고, **아직 답을 못 들었다**:

> 데스크탑 화면에서는 계보도가 커지면 페이지 자체가 세로로 늘어나서
> (브라우저) 스크롤이 생긴다. 원래 의도는 패널 안에서만 팬/줌으로 움직이는
> 것인데, 모바일은 `100dvh` 로 화면에 고정돼 있어 문제가 없지만 데스크탑은
> 안 그렇다. **데스크탑도 모바일처럼 화면에 고정하고 패널 안에서만 팬 하도록
> 통일할지** 물어본 상태.

다음 대화에서 사용자가 이 질문에 답하면 그대로 작업을 진행하면 된다.
(참고: `App.jsx` 의 `className="app-root ... h-[100dvh] ... md:h-auto md:min-h-screen md:overflow-visible"`
부분이 데스크탑에서 `md:h-auto`/`overflow-visible` 로 풀어주고 있는 지점이다.)

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
