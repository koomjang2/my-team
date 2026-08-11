import { useEffect, useMemo, useRef, useState } from 'react'
import OrgTreePanel from './components/OrgTreePanel.jsx'
import EffectiveTreePanel from './components/EffectiveTreePanel.jsx'
import MemoSnackbar from './components/MemoSnackbar.jsx'
import TopBar from './components/TopBar.jsx'
import { computeEffectiveRanks, analyzeGap } from './engine/rankEngine.js'
import { RANK_NONE, STATUS_ACTIVE } from './engine/ranks.js'

const STORAGE_KEY = 'my-team-lineage-v1'
const FILE_FORMAT = 'my-team-lineage-v1'

const makeId = () => 'n_' + Math.random().toString(36).slice(2, 10)

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
    <div className="relative flex min-h-screen flex-col bg-slate-50">
      <input
        ref={loadInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleLoadTreeFile}
      />

      <TopBar
        me={me}
        period={period}
        onUpdateMe={(patch) => me && handleUpdate(me.id, patch)}
        onChangePeriod={(next) => setState((prev) => ({ ...prev, period: next }))}
        onOpenMemo={() => me && setMemoNodeId(me.id)}
      />

      <div className="flex flex-1 flex-col md:flex-row">
        <OrgTreePanel
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
          onPrintTree={() => window.dispatchEvent(new CustomEvent('print-org-tree'))}
          onResetTree={handleResetTree}
        />

        <EffectiveTreePanel
          nodes={nodes}
          effRankMap={effRankMap}
          gapMap={gapMap}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onOpenMemo={(id) => setMemoNodeId(id)}
          rootNode={me}
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
