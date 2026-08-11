import { useEffect, useRef, useState } from 'react'
import OrgTreePanel from './components/OrgTreePanel.jsx'

const STORAGE_KEY = 'my-team-tree-v1'
const FILE_FORMAT = 'my-team-tree-v1'

function makeId() {
  return 'n_' + Math.random().toString(36).slice(2, 10)
}

function defaultNodes() {
  return [{ id: makeId(), parentId: null, side: null, name: '대표', title: '', memo: '', color: 'slate' }]
}

function loadInitialNodes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultNodes()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length) return parsed
    return defaultNodes()
  } catch {
    return defaultNodes()
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
  const [nodes, setNodes] = useState(loadInitialNodes)
  const [selectedId, setSelectedId] = useState(null)
  const loadInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes))
  }, [nodes])

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null

  function handleAdd(parentId, side, name, title) {
    const node = { id: makeId(), parentId, side, name, title: title || '', memo: '', color: 'slate' }
    setNodes((prev) => [...prev, node])
  }

  function handleRemove(nodeId) {
    setNodes((prev) => {
      const toRemove = new Set(collectSubtreeIds(nodeId, prev))
      return prev.filter((n) => !toRemove.has(n.id))
    })
    if (selectedId && collectSubtreeIds(nodeId, nodes).includes(selectedId)) {
      setSelectedId(null)
    }
  }

  function handleChangeColor(nodeId, color) {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, color } : n)))
  }

  function handleChangeName(nodeId, name) {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, name } : n)))
  }

  function handleChangeTitle(nodeId, title) {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, title } : n)))
  }

  function handleChangeMemo(nodeId, memo) {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, memo } : n)))
  }

  function handleSaveTree() {
    try {
      const payload = { format: FILE_FORMAT, savedAt: new Date().toISOString(), nodes }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `조직도-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('파일 저장 실패')
    }
  }

  function handleLoadTree() {
    loadInputRef.current?.click()
  }

  function handleLoadTreeFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? '{}'))
        const restored = Array.isArray(parsed?.nodes) ? parsed.nodes : parsed
        if (!Array.isArray(restored) || !restored.length) {
          alert('파일 형식이 올바르지 않습니다')
          return
        }
        setNodes(restored)
        setSelectedId(null)
        alert('파일을 불러왔습니다')
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

  function handlePrintTree() {
    window.dispatchEvent(new CustomEvent('print-org-tree'))
  }

  function handleResetTree() {
    if (!window.confirm('조직도를 초기화할까요? 현재 구조가 모두 삭제됩니다.')) return
    setNodes(defaultNodes())
    setSelectedId(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <input
        ref={loadInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleLoadTreeFile}
      />

      <header className="bg-white border-b no-print px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <span className="text-base font-bold text-gray-800">My Team</span>
        <span className="text-xs text-gray-400">조직도 빌더</span>
      </header>

      <div className="flex flex-col md:flex-row flex-1">
        <OrgTreePanel
          nodes={nodes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onChangeColor={handleChangeColor}
          onChangeName={handleChangeName}
          onChangeTitle={handleChangeTitle}
          onSaveTree={handleSaveTree}
          onLoadTree={handleLoadTree}
          onPrintTree={handlePrintTree}
          onResetTree={handleResetTree}
        />

        <main className="flex-1 p-4 min-w-0 bg-white">
          {selectedNode ? (
            <div className="max-w-md">
              <h2 className="text-lg font-bold mb-1">{selectedNode.name}</h2>
              {selectedNode.title && <p className="text-sm text-gray-500 mb-4">{selectedNode.title}</p>}
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">메모</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[140px] outline-none focus:border-sky-400"
                placeholder="연락처, 담당 업무 등 자유롭게 기록하세요"
                value={selectedNode.memo ?? ''}
                onChange={(e) => handleChangeMemo(selectedNode.id, e.target.value)}
              />
            </div>
          ) : (
            <p className="text-gray-400 p-10 text-center">좌측 조직도에서 구성원을 선택하세요.</p>
          )}
        </main>
      </div>
    </div>
  )
}
