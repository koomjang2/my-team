import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import OrgTreePanel from './components/OrgTreePanel.jsx'
import EffectiveTreePanel from './components/EffectiveTreePanel.jsx'
import TopBar from './components/TopBar.jsx'
import ImportSummaryBar from './components/ImportSummaryBar.jsx'
import { computeEffectiveRanks, analyzeGap } from './engine/rankEngine.js'
import { collapseVacated, collectDescendants, graftSubtree, validateLineageFile } from './engine/subtreeImport.js'
import { diffSubtree } from './engine/subtreeDiff.js'
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

/**
 * 저장 파일이름 맨 앞에 붙는 최상단 회원(루트, '나') 이름.
 * 아직 이름을 안 적었으면 카드와 같은 말 '이름 없음' 을 쓰고, 파일이름에 못 쓰는
 * 문자(윈도우 기준 \/:*?"<>|)는 지운다 — 회원 이름은 자유 입력이라 그대로 쓸 수 없다.
 */
function rootNameForFile(rootNode) {
  const raw = (rootNode?.name ?? '').trim() || '이름 없음'
  return raw.replace(/[\\/:*?"<>|]/g, '')
}

/** 불러온 파일이 같은 보름을 계획한 것인가 — 다르면 이식 확인창에서 짚어 준다 */
function samePeriod(a, b) {
  return a?.year === b?.year && a?.month === b?.month && a?.half === b?.half
}

/** 인쇄·그림에 찍히는 한 줄짜리 기간 표기 — 화면 선택지(TopBar)와 같은 말로 맞춘다 */
function formatPeriod(period) {
  if (!period) return ''
  const half = period.half === 'first' ? '상반기(1~15일)' : '하반기(16일~말일)'
  return `${period.year}년 ${period.month}월 ${half}`
}

/**
 * 저장 파일 이름에 쓰는 '연-월-반기' 조각. 예: `2026-08-상반기`
 * PV 최적화 시뮬레이터(atomy-simul)의 `periodStamp` 와 같은 꼴로 맞춰 둔다 —
 * 두 앱에서 뽑은 파일이 한 폴더에 섞여도 같은 보름끼리 나란히 정렬된다.
 */
function periodStamp(period) {
  if (!period) return ''
  const half = period.half === 'first' ? '상반기' : '하반기'
  return `${period.year}-${String(period.month).padStart(2, '0')}-${half}`
}

/**
 * 사람만 비우고 자리는 남긴다 — 하위의 좌/우를 지키기 위한 '빈 자리'.
 * 직급을 `NONE` 으로 두므로 레그 카운팅이 건너뛰고, 오른쪽 패널도 알아서 감춘다.
 */
function vacate(node) {
  return {
    ...node,
    vacated: true,
    name: '',
    memberId: '',
    nominalRank: RANK_NONE,
    rank: RANK_NONE,
    memberPvMan: 0,
    consumerMan: 0,
    memo: '',
  }
}

// 되돌리기로 거슬러 올라갈 수 있는 최대 단계
const HISTORY_LIMIT = 50
// 한 글자씩 들어오는 칸 — 되돌리기 단계를 글자 수만큼 쌓지 않도록 묶어서 다룬다
const TYPED_FIELDS = new Set(['name', 'memberId', 'memo', 'memberPvMan', 'consumerMan'])

export default function App() {
  const [state, setState] = useState(loadInitialState)
  const [selectedId, setSelectedId] = useState(null)
  const loadInputRef = useRef(null)

  // 계보도 이식 — 어느 자리에 꽂을지(`importTargetRef`)와 무엇이 달라졌는지(`importSummary`).
  // 요약은 스스로 사라지지 않는다 — 되돌릴지 정하는 근거라 다 읽을 때까지 남는다.
  const importInputRef = useRef(null)
  const importTargetRef = useRef(null)
  const [importSummary, setImportSummary] = useState(null)

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

  // 카드에 회원 ID 를 보일지 — 패널마다 따로 기억한다.
  // 왼쪽 '나의 계보도' 는 내가 짜는 화면이라 **기본 켜짐**,
  // 오른쪽 '목표 계보도' 는 남에게 보여줄 때가 있어 **기본 꺼짐**이다.
  // 그래서 저장된 값이 없을 때 읽는 방향이 서로 반대다 (`!== false` vs `=== true`).
  const [showOrgIds, setShowOrgIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(UI_KEY) ?? '{}').showOrgIds !== false
    } catch {
      return true
    }
  })

  const [showEffectiveIds, setShowEffectiveIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(UI_KEY) ?? '{}').showEffectiveIds === true
    } catch {
      return false
    }
  })

  // 두 패널의 비율 — 세로 배치(좁은 화면)는 높이, 가로 배치(PC·눕힌 화면)는 너비로 나뉜다.
  // 배치를 가르는 것은 CSS 미디어쿼리 하나뿐이므로(index.css), 두 값을 따로 들고 있다가
  // 각 기준선이 자기 값만 고친다 — JS 로 화면 폭을 재지 않아 회전·리사이즈에도 어긋나지 않는다.
  // 좌우 비율만 기억한다 — 상하 비율은 그때그때 화면 높이에 맞춰 잡는 값이라 남기지 않는다.
  const [splitPct, setSplitPct] = useState(50)         // 상하(세로 배치)
  const [splitPctX, setSplitPctX] = useState(() => {   // 좌우(가로 배치)
    try {
      const saved = JSON.parse(localStorage.getItem(UI_KEY) ?? '{}').splitPctX
      return Number.isFinite(saved) ? Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, saved)) : 50
    } catch {
      return 50
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ menuOpen, summaryOpen, showOrgIds, showEffectiveIds, splitPctX }))
    } catch {
      /* 저장 실패는 무시 — 접힘 상태를 못 기억할 뿐이다 */
    }
  }, [menuOpen, summaryOpen, showOrgIds, showEffectiveIds, splitPctX])

  const splitAreaRef = useRef(null)
  const splitDragRef = useRef(false)   // 상하 기준선을 잡고 있는가
  const splitDragXRef = useRef(false)  // 좌우 기준선을 잡고 있는가

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

  /** 좌우 배치에서 기준선을 끌 때 — 컨테이너 안에서의 X 비율이 곧 왼쪽 패널 너비다 */
  function moveSplitXTo(clientX) {
    const rect = splitAreaRef.current?.getBoundingClientRect()
    if (!rect?.width) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setSplitPctX(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct)))
  }

  function startSplitDrag(e) {
    splitDragRef.current = true
    document.body.classList.add('is-splitting')
    // 터치는 React 가 passive 로 붙이므로 preventDefault 가 먹지 않는다 —
    // 기준선의 touch-action:none 이 스크롤을 대신 막는다. 마우스만 선택 방지.
    if (e.type === 'mousedown') e.preventDefault()
  }

  function startSplitDragX(e) {
    splitDragXRef.current = true
    document.body.classList.add('is-splitting-x')
    if (e.type === 'mousedown') e.preventDefault()
  }

  useEffect(() => {
    function onMove(e) {
      const clientX = e.touches ? e.touches[0]?.clientX : e.clientX
      const clientY = e.touches ? e.touches[0]?.clientY : e.clientY
      if (splitDragXRef.current) {
        if (clientX == null) return
        moveSplitXTo(clientX)
        e.preventDefault()
        return
      }
      if (!splitDragRef.current) return
      if (clientY == null) return
      moveSplitTo(clientY)
      e.preventDefault()
    }
    function onEnd() {
      if (!splitDragRef.current && !splitDragXRef.current) return
      splitDragRef.current = false
      splitDragXRef.current = false
      document.body.classList.remove('is-splitting', 'is-splitting-x')
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

  /**
   * 되돌리기 — 손대기 **직전** 상태를 쌓아 두었다가 한 단계씩 돌려놓는다.
   *
   * 쌓는 시점은 항상 `set...` 을 부르기 **전**이다. `setState(prev => …)` 안에서
   * 쌓으면 StrictMode 가 개발 중에 갱신 함수를 두 번 부르면서 같은 상태가 두 번 들어간다.
   *
   * `coalesceKey` 는 글자를 칠 때 한 글자마다 한 단계가 쌓이는 것을 막는다 —
   * 같은 회원의 같은 칸을 이어서 고치는 동안은 첫 상태 하나만 남는다.
   * (시간이 아니라 '무엇을 고치는 중인가' 로 묶으므로 타이머 조정이 필요 없다)
   */
  const [history, setHistory] = useState([])
  const lastCoalesceKeyRef = useRef(null)

  function pushHistory(coalesceKey = null) {
    if (coalesceKey && lastCoalesceKeyRef.current === coalesceKey) return
    lastCoalesceKeyRef.current = coalesceKey
    setHistory((past) => [...past, state].slice(-HISTORY_LIMIT))
  }

  /** 편집창을 닫으면 '이어 고치던 흐름' 이 끝난 것으로 본다 — 다시 열어 고치면 새 단계가 쌓인다 */
  function handleEndEdit() {
    lastCoalesceKeyRef.current = null
  }

  function handleUndo() {
    setHistory((past) => {
      if (!past.length) return past
      const prev = past[past.length - 1]
      setState(prev)
      // 되돌린 뒤에는 이어치던 흐름이 끊긴 것으로 본다 — 다음 편집은 새 단계가 된다
      lastCoalesceKeyRef.current = null
      if (selectedId && !prev.nodes.some((n) => n.id === selectedId)) setSelectedId(null)
      return past.slice(0, -1)
    })
  }

  /**
   * 좌/우 하위 추가. 그 자리가 비어 있으면 그냥 붙이고,
   * **이미 회원이 있으면 사이에 끼워 넣는다** — 새 회원이 부모 바로 아래로 들어가고
   * 원래 있던 회원은 하위 계보도를 통째로 달고 같은 방향(좌/우)으로 한 칸 내려간다.
   * 실제 후원 라인에 중간 스폰서를 하나 끼우는 것과 같은 모양이다.
   */
  function handleAdd(parentId, side) {
    pushHistory()
    setNodes((prev) => {
      const inserted = makeNode({ parentId, side, rank: 'SM', name: '' })
      const occupant = prev.find((n) => n.parentId === parentId && n.side === side)
      if (!occupant) return [...prev, inserted]

      // 그 자리가 삭제로 비워 둔 자리라면 위에 끼우지 않고 **그 자리를 채운다** —
      // 하위는 그대로 매달린 채 사람만 다시 들어온다 (id 를 물려받아야 하위가 안 끊긴다)
      if (occupant.vacated) {
        return prev.map((n) => (n.id === occupant.id ? { ...inserted, id: n.id } : n))
      }

      // 자리를 내준 회원만 부모를 바꾼다 — 그 아래는 손대지 않아도 함께 따라 내려간다
      return [
        ...prev.map((n) => (n.id === occupant.id ? { ...n, parentId: inserted.id } : n)),
        inserted,
      ]
    })
  }

  /**
   * 회원 한 명만 지운다 — **하위 회원의 좌/우는 절대 바뀌지 않는다.**
   *
   *   A ─좌─ B                    A ─좌─ B
   *     └우─ C ─좌─ D ─F    →       └우─ (빈 자리) ─좌─ D ─F
   *            └우─ E ─G                          └우─ E ─G
   *
   * 하위가 **둘**이면 자리 자체를 남기고 사람만 비운다(`vacated`). 화면에서는 카드가
   * 사라지고 선만 지나가므로 A 밑이 세 갈래로 보이지만, 실제로는 D·E·F·G 가 모두
   * A 의 **우** 레그다. 빈 자리는 직급이 `NONE` 이라 레그 카운팅이 건너뛰고 그 아래까지
   * 계속 세므로 직급 계산은 달라지지 않는다.
   *
   * 하위가 하나면 그 하나가 자리를 물려받고, 없으면 자리도 함께 사라진다
   * (오른쪽 '목표 계보도' 가 '없음' 회원을 접는 규칙과 같다 — `collapseHidden`).
   */
  function handleRemove(nodeId) {
    pushHistory()
    setNodes((prev) => {
      const target = prev.find((n) => n.id === nodeId)
      if (!target) return prev
      // 루트('나')는 물려줄 윗자리가 없다 — 카드에 삭제 버튼도 달리지 않는다
      if (!target.parentId) return prev

      const childCount = prev.filter((n) => n.parentId === nodeId).length
      const next = childCount >= 2
        ? prev.map((n) => (n.id === nodeId ? vacate(n) : n))
        : prev
            .filter((n) => n.id !== nodeId)
            .map((n) => (n.parentId === nodeId ? { ...n, parentId: target.parentId, side: target.side } : n))

      return collapseVacated(next)
    })
    if (selectedId === nodeId) setSelectedId(null)
  }

  function handleUpdate(nodeId, patch) {
    // 이름·ID·PV·메모는 한 글자마다 들어오므로 같은 칸을 이어 고치는 동안 한 단계로 묶는다.
    // 직급 고르기는 한 번 누르면 끝나는 동작이라 묶지 않는다 — 매번 되돌릴 수 있어야 한다.
    const keys = Object.keys(patch)
    const coalesceKey = keys.length === 1 && TYPED_FIELDS.has(keys[0]) ? `${nodeId}:${keys[0]}` : null
    pushHistory(coalesceKey)
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)))
  }

  /**
   * 계보도를 JSON 으로 저장한다. 두 패널이 이 함수를 공용으로 쓰지만 파일이름은
   * `{최상단 회원 이름}-{팀|팀목표}-{연-월-반기}.json` 꼴이다 — 어느 패널에서 눌렀는지에
   * 따라 접두어만 다르다. (계보도 데이터 자체는 한 벌이라 어느 쪽에서 저장해도 내용은 같다)
   */
  function handleSaveTree(prefix = '팀') {
    try {
      // `ui` 는 계보도가 아니라 보기 취향이다. PV 최적화 시뮬레이터가 이 파일을
      // 불러올 때 ID 를 보일지 판단하는 데 쓰므로 파일에 함께 담는다.
      const payload = {
        format: FILE_FORMAT,
        savedAt: new Date().toISOString(),
        ...state,
        ui: { showOrgIds, showEffectiveIds },
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${rootNameForFile(me)}-${prefix}-${periodStamp(period)}.json`
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
        pushHistory()
        setState({
          nodes: restoredNodes,
          period: parsed.period ?? defaultState().period,
        })
        setSelectedId(null)
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

  /**
   * 카드의 '계보도 불러오기' — 어느 자리에 꽂을지 기억해 두고 파일 고르기를 연다.
   * 파일 입력칸은 '열기'(계보도 통째로 바꾸기)와 따로 둔다 — 하는 일이 전혀 다르다.
   */
  function handleImportSubtree(nodeId) {
    importTargetRef.current = nodeId
    importInputRef.current?.click()
  }

  /**
   * 고른 자리와 그 아래를 파일 내용으로 갈아 끼운다.
   * 검증에서 걸리면 **계보도는 한 글자도 바뀌지 않고** 무엇이 잘못됐는지만 알린다.
   */
  function handleImportFile(event) {
    const file = event.target.files?.[0]
    const targetId = importTargetRef.current
    event.target.value = '' // 같은 파일을 다시 골라도 change 가 뜨도록 비워 둔다
    if (!file || !targetId) return

    const reader = new FileReader()
    reader.onload = () => {
      let parsed
      try {
        parsed = JSON.parse(String(reader.result ?? '{}'))
      } catch {
        setImportSummary({ error: '파일을 읽을 수 없습니다 — JSON 형식이 아닙니다.' })
        return
      }

      const checked = validateLineageFile(parsed)
      if (!checked.ok) {
        setImportSummary({ error: checked.error })
        return
      }

      const before = state.nodes
      const target = before.find((n) => n.id === targetId)
      if (!target) return

      const targetName = (target.name ?? '').trim() || '이름 없음'
      const fileName = (checked.root.name ?? '').trim() || '이름 없음'
      const lines = [
        `'${targetName}' 자리를 파일 내용으로 바꿉니다.`,
        '',
        `  지금 계보도 : ${targetName} (아래 ${collectDescendants(before, targetId).length}명)`,
        `  불러올 파일 : ${fileName} (아래 ${checked.nodes.length - 1}명)`,
      ]
      // 파일이 다른 보름을 계획한 것이면 짚어 준다 — 기간 자체는 가져오지 않는다
      if (parsed.period && !samePeriod(parsed.period, state.period)) {
        lines.push(`  파일 기간   : ${formatPeriod(parsed.period)} ← 지금 화면과 다릅니다`)
      }
      lines.push('', '되돌리기로 되돌릴 수 있습니다.')
      if (!window.confirm(lines.join('\n'))) return

      pushHistory()
      const after = graftSubtree(before, targetId, checked.nodes, makeId)
      setNodes(after)
      setImportSummary({ name: fileName, diff: diffSubtree(before, after, targetId) })
    }
    reader.onerror = () => setImportSummary({ error: '파일 읽기에 실패했습니다.' })
    reader.readAsText(file, 'utf-8')
  }

  function handleResetTree() {
    if (!window.confirm('계보도를 초기화할까요? 현재 구성이 모두 삭제됩니다.')) return
    pushHistory()
    setState(defaultState())
    setSelectedId(null)
  }

  return (
    <div className="app-root relative flex h-[100dvh] flex-col overflow-hidden bg-slate-50">
      <input
        ref={loadInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleLoadTreeFile}
      />

      {/* 계보도 이식 전용 — '열기'(통째로 바꾸기)와 하는 일이 달라 입력칸도 따로 둔다 */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFile}
      />

      <ImportSummaryBar summary={importSummary} onClose={() => setImportSummary(null)} />

      <header className="no-print flex flex-shrink-0 items-center gap-2 border-b bg-white px-3 py-2 shadow-sm">
        <h1 className="flex min-w-0 flex-1 items-center gap-2 leading-tight">
          <span className="shrink-0 text-base font-bold md:text-lg" style={{ color: 'rgb(0, 181, 239)' }}>
            My Team
          </span>
          <span className="shrink-0 rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600 md:text-xs">
            BETA
          </span>
          <span className="min-w-0 truncate text-[13px] font-normal text-gray-500">
            - 함께 성공할 팀을 입력하고 직급을 계획해 보세요.
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
          period={period}
          onChangePeriod={(next) => {
            pushHistory()
            setState((prev) => ({ ...prev, period: next }))
          }}
        />
      )}

      <div
        ref={splitAreaRef}
        className="split-area flex min-h-0 flex-1 flex-col"
        // 가로 배치일 때 왼쪽 패널 너비 — index.css 의 미디어쿼리 안에서만 쓰인다
        style={{ '--split-w': `${splitPctX}%` }}
      >
        <OrgTreePanel
          style={{ height: `${splitPct}%` }}
          nodes={nodes}
          effRankMap={effRankMap}
          gapMap={gapMap}
          selectedId={selectedId}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onUpdate={handleUpdate}
          onSaveTree={() => handleSaveTree('팀')}
          onLoadTree={() => loadInputRef.current?.click()}
          onImportSubtree={handleImportSubtree}
          onResetTree={handleResetTree}
          onUndo={handleUndo}
          canUndo={history.length > 0}
          onEndEdit={handleEndEdit}
          periodLabel={formatPeriod(period)}
          imageName={`팀-${periodStamp(period)}.jpg`}
          showIds={showOrgIds}
          onToggleShowIds={() => setShowOrgIds((on) => !on)}
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

        {/* 좌우 분할 기준선 — 가로 배치(PC·눕힌 화면)에서만 보인다. 보이고 숨기는 것은
            index.css 의 미디어쿼리가 맡는다 (Tailwind 의 md: 가 아니라 — 배치의 단일 출처) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="두 계보도 너비 조절"
          className="split-divider-v no-print w-2 flex-shrink-0 cursor-col-resize touch-none items-center justify-center border-x border-slate-300 bg-slate-100 active:bg-slate-200"
          onMouseDown={startSplitDragX}
          onTouchStart={startSplitDragX}
          onDoubleClick={() => setSplitPctX(50)}
          title="누른 채 좌우로 끌면 화면 비율이 바뀝니다 (두 번 누르면 절반)"
        >
          <div className="h-10 w-1 rounded-full bg-slate-400" />
        </div>

        <EffectiveTreePanel
          nodes={nodes}
          effRankMap={effRankMap}
          gapMap={gapMap}
          selectedId={selectedId}
          onSelect={setSelectedId}
          rootNode={me}
          onSaveTree={() => handleSaveTree('팀목표')}
          onLoadTree={() => loadInputRef.current?.click()}
          periodLabel={formatPeriod(period)}
          imageName={`팀목표-${periodStamp(period)}.jpg`}
          summaryOpen={summaryOpen}
          onToggleSummary={() => setSummaryOpen((open) => !open)}
          showIds={showEffectiveIds}
          onToggleShowIds={() => setShowEffectiveIds((on) => !on)}
        />
      </div>
    </div>
  )
}

