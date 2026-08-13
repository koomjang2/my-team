import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import OrgTreePanel from './components/OrgTreePanel.jsx'
import EffectiveTreePanel from './components/EffectiveTreePanel.jsx'
import MemoSnackbar from './components/MemoSnackbar.jsx'
import TopBar from './components/TopBar.jsx'
import { computeEffectiveRanks, analyzeGap } from './engine/rankEngine.js'
import { RANK_NONE, STATUS_ACTIVE } from './engine/ranks.js'

const STORAGE_KEY = 'my-team-lineage-v1'
const FILE_FORMAT = 'my-team-lineage-v1'
// 화면 접힘 같은 UI 취향은 계보도 파일과 섞이면 안 되므로 따로 담는다
const UI_KEY = 'my-team-ui-v1'

const makeId = () => 'n_' + Math.random().toString(36).slice(2, 10)

// 좁은 화면(세로 모바일)에서는 두 패널을 위/아래로 절반씩 나눠 쓴다.
// 높이 비율은 항상 인라인으로 걸고, md 이상에서는 CSS(.split-pane-top)가 이를 무효화한다 —
// 미디어쿼리 JS 상태에 의존하지 않으므로 회전·리사이즈에도 좌우 배치가 깨지지 않는다.
const SPLIT_MIN = 15
const SPLIT_MAX = 85

function makeNode({ parentId = null, side = null, rank = 'SM', name = '', memberId = '' } = {}) {
  return {
    id: makeId(),
    parentId,
    side,
    name,
    memberId,
    nominalRank: RANK_NONE, // 달고 있는 이름표 직급
    rank,                   // 이번 보름에 달성할 직급
    status: STATUS_ACTIVE,
    memberPvMan: 0,         // 회원PV(몸PV)
    consumerMan: 0,         // CSM 의 예상 소비 PV
    memo: '',
  }
}

function defaultState() {
  const me = makeNode({ rank: 'DM', name: '나' })
  return {
    nodes: [me],
    period: { year: new Date().getFullYear(), month: new Date().getMonth() + 1, half: 'first' },
  }
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.nodes) && parsed.nodes.length) {
      return { ...defaultState(), ...parsed }
    }
    return defaultState()
  } catch {
    return defaultState()
  }
}

/** 인쇄·그림에 찍히는 한 줄짜리 기간 표기 — 화면 선택지(TopBar)와 같은 말로 맞춘다 */
function formatPeriod(period) {
  if (!period) return ''
  const half = period.half === 'first' ? '상반기(1~15일)' : '하반기(16일~말일)'
  return `${period.year}년 ${period.month}월 ${half}`
}

function collectSubtreeIds(nodeId, nodes) {
  const ids = [nodeId]
  for (const child of nodes.filter((n) => n.parentId === nodeId)) {
    ids.push(...collectSubtreeIds(child.id, nodes))
  }
  return ids
}

export default function App() {
  const [state, setState] = useState(loadInitialState)
  const [selectedId, setSelectedId] = useState(null)
  const [memoNodeId, setMemoNodeId] = useState(null)
  const loadInputRef = useRef(null)

  // 맨 위 입력 메뉴 접기 — 좁은 화면에서 계보도에 자리를 내주기 위한 것이라 취향을 기억해 둔다
  const [menuOpen, setMenuOpen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(UI_KEY) ?? '{}').menuOpen !== false
    } catch {
      return true
    }
  })

  // 오른쪽 패널의 요약줄(목표·달성 여부·직급별 인원) 접기 — 같은 이유로 취향을 기억해 둔다
  const [summaryOpen, setSummaryOpen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(UI_KEY) ?? '{}').summaryOpen !== false
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ menuOpen, summaryOpen }))
    } catch {
      /* 저장 실패는 무시 — 접힘 상태를 못 기억할 뿐이다 */
    }
  }, [menuOpen, summaryOpen])

  // 좁은 화면 상하 분할 — 기준선을 끌어 비율을 바꾼다 (기본 절반)
  const [splitPct, setSplitPct] = useState(50)
  const splitAreaRef = useRef(null)
  const splitDragRef = useRef(false)

  const { nodes, period } = state
  const me = nodes.find((n) => !n.parentId) ?? null

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // 계보도가 바뀔 때마다 실질 직급을 다시 계산 — 오른쪽 패널은 이 값에서 파생되므로 자동 반영된다
  const { effRankMap, gapMap } = useMemo(() => {
    const effRankMap = computeEffectiveRanks(nodes)
    const gapMap = new Map()
    for (const node of nodes) {
      gapMap.set(node.id, analyzeGap(nodes, node, node.rank, effRankMap))
    }
    return { effRankMap, gapMap }
  }, [nodes])

  // 기준선 드래그 — 터치/마우스 공용. 컨테이너 안에서의 Y 비율이 곧 위쪽 패널 높이다.
  function moveSplitTo(clientY) {
    const rect = splitAreaRef.current?.getBoundingClientRect()
    if (!rect?.height) return
    const pct = ((clientY - rect.top) / rect.height) * 100
    setSplitPct(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct)))
  }

  function startSplitDrag(e) {
    splitDragRef.current = true
    document.body.classList.add('is-splitting')
    // 터치는 React 가 passive 로 붙이므로 preventDefault 가 먹지 않는다 —
    // 기준선의 touch-action:none 이 스크롤을 대신 막는다. 마우스만 선택 방지.
    if (e.type === 'mousedown') e.preventDefault()
  }

  useEffect(() => {
    function onMove(e) {
      if (!splitDragRef.current) return
      const clientY = e.touches ? e.touches[0]?.clientY : e.clientY
      if (clientY == null) return
      moveSplitTo(clientY)
      e.preventDefault()
    }
    function onEnd() {
      if (!splitDragRef.current) return
      splitDragRef.current = false
      document.body.classList.remove('is-splitting')
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  function setNodes(updater) {
    setState((prev) => ({ ...prev, nodes: typeof updater === 'function' ? updater(prev.nodes) : updater }))
  }

  function handleAdd(parentId, side) {
    setNodes((prev) => [...prev, makeNode({ parentId, side, rank: 'SM', name: '' })])
  }

  function handleRemove(nodeId) {
    const doomed = new Set(collectSubtreeIds(nodeId, nodes))
    setNodes((prev) => prev.filter((n) => !doomed.has(n.id)))
    if (selectedId && doomed.has(selectedId)) setSelectedId(null)
    if (memoNodeId && doomed.has(memoNodeId)) setMemoNodeId(null)
  }

  function handleUpdate(nodeId, patch) {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)))
  }

  function handleSaveMemo(nodeId, memo) {
    handleUpdate(nodeId, { memo })
  }

  function handleSaveTree() {
    try {
      const payload = { format: FILE_FORMAT, savedAt: new Date().toISOString(), ...state }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const half = period.half === 'first' ? '상반기' : '하반기'
      a.href = url
      a.download = `실질계보도-${period.year}-${String(period.month).padStart(2, '0')}-${half}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('파일 저장 실패')
    }
  }

  function handleLoadTreeFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? '{}'))
        const restoredNodes = Array.isArray(parsed?.nodes) ? parsed.nodes : null
        if (!restoredNodes?.length) {
          alert('파일 형식이 올바르지 않습니다')
          return
        }
        setState({
          nodes: restoredNodes,
          period: parsed.period ?? defaultState().period,
        })
        setSelectedId(null)
        setMemoNodeId(null)
      } catch {
        alert('파일 파싱 실패')
      } finally {
        event.target.value = ''
      }
    }
    reader.onerror = () => {
      alert('파일 읽기 실패')
      event.target.value = ''
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleResetTree() {
    if (!window.confirm('계보도를 초기화할까요? 현재 구성이 모두 삭제됩니다.')) return
    setState(defaultState())
    setSelectedId(null)
    setMemoNodeId(null)
  }

  const memoNode = nodes.find((n) => n.id === memoNodeId) ?? null

  return (
    <div className="app-root relative flex h-[100dvh] flex-col overflow-hidden bg-slate-50">
      <input
        ref={loadInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleLoadTreeFile}
      />

      <header className="no-print flex flex-shrink-0 items-center gap-2 border-b bg-white px-3 py-1.5">
        <h1 className="min-w-0 flex-1 truncate text-[13px] font-bold leading-tight text-gray-800">
          My Team{' '}
          <span className="font-normal text-gray-500">
            - 나와 함께 하는 회원들을 입력하고 직급을 계획해보세요.
          </span>
        </h1>
        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="glass-btn h-6 shrink-0 gap-0.5 px-1.5 text-[10px] leading-none"
          title={menuOpen ? '입력 메뉴 접기' : '입력 메뉴 펼치기'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {menuOpen ? '접기' : '펼치기'}
        </button>
      </header>

      {menuOpen && (
        <TopBar
          me={me}
          period={period}
          onUpdateMe={(patch) => me && handleUpdate(me.id, patch)}
          onChangePeriod={(next) => setState((prev) => ({ ...prev, period: next }))}
          onOpenMemo={() => me && setMemoNodeId(me.id)}
        />
      )}

      <div ref={splitAreaRef} className="split-area flex min-h-0 flex-1 flex-col">
        <OrgTreePanel
          style={{ height: `${splitPct}%` }}
          nodes={nodes}
          effRankMap={effRankMap}
          gapMap={gapMap}
          selectedId={selectedId}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onUpdate={handleUpdate}
          onOpenMemo={(id) => setMemoNodeId(id)}
          onSaveTree={handleSaveTree}
          onLoadTree={() => loadInputRef.current?.click()}
          onResetTree={handleResetTree}
          periodLabel={formatPeriod(period)}
        />

        {/* 상하 분할 기준선 — 누른 채 위아래로 끌면 두 패널 비율이 바뀐다 (좌우 배치에서는 숨는다) */}
        <div
          role="separator"
          aria-orientation="horizontal"
          className="split-divider no-print flex h-4 flex-shrink-0 touch-none cursor-row-resize items-center justify-center border-y border-slate-300 bg-slate-100 active:bg-slate-200"
          onMouseDown={startSplitDrag}
          onTouchStart={startSplitDrag}
          onDoubleClick={() => setSplitPct(50)}
          title="누른 채 위아래로 끌면 화면 비율이 바뀝니다 (두 번 누르면 절반)"
        >
          <div className="h-1 w-10 rounded-full bg-slate-400" />
        </div>

        <EffectiveTreePanel
          nodes={nodes}
          effRankMap={effRankMap}
          gapMap={gapMap}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onOpenMemo={(id) => setMemoNodeId(id)}
          rootNode={me}
          onSaveTree={handleSaveTree}
          onLoadTree={() => loadInputRef.current?.click()}
          onResetTree={handleResetTree}
          periodLabel={formatPeriod(period)}
          summaryOpen={summaryOpen}
          onToggleSummary={() => setSummaryOpen((open) => !open)}
        />
      </div>

      <MemoSnackbar
        node={memoNode}
        onSave={handleSaveMemo}
        onClose={() => setMemoNodeId(null)}
      />
    </div>
  )
}
