import { rankDisplay } from './ranks.js'

/**
 * 이식 **전후**의 계보도를 견줘 무엇이 달라졌는지 정리한다.
 * 이식 직후 스낵바가 이 결과를 그대로 읽어 보여준다.
 *
 * 짝짓기가 이 파일의 전부다. 이식하면서 id 를 전부 새로 발급하므로(`graftSubtree`)
 * **id 로는 같은 사람을 찾을 수 없다.** 그래서 세 단계로 짝짓는다:
 *
 *   1차 · 회원 ID — 양쪽에 다 적혀 있고 각각 한 명뿐일 때만. 자리를 옮겨도 따라간다.
 *   2차 · 이름    — 회원 ID 로 못 짝지은 사람 중, 양쪽에 그 이름이 **딱 한 번씩만**
 *                  나오면 짝으로 본다. 이것도 자리를 옮겨도 따라간다 — 불러오는
 *                  파일의 좌/우 배치가 내 것과 다른 경우가 흔해서, 이름이 같은데
 *                  자리가 달라 못 알아보면 메모가 그냥 파일 것으로 덮인다.
 *   3차 · 자리    — 그래도 남은 사람은 접합점에서부터의 좌/우 경로가 같으면 짝으로 본다
 *                  (이름·회원 ID 가 둘 다 없거나, 동명이인이라 2차에서 걸러진 경우).
 *
 * 2·3차 모두 이름이나 회원 ID 가 **양쪽에 다 적혀 있는데 서로 다르면** 짝짓지
 * 않는다(`looksLikeSamePerson`) — 동명이인의 회원 ID 가 다르면 진짜 다른 사람이다.
 * 한쪽이 비어 있으면 뒤늦게 채워 넣은 것으로 보고 짝짓는다.
 */

/**
 * 스낵바에 견줘 보여줄 칸들 — 카드에 적히는 것과 같은 순서.
 * `kind: 'rank'` 는 알림에서 직급 색 그대로 된 알약으로 그린다 — 한눈에 알아보라고.
 */
const COMPARED = [
  { key: 'name', label: '이름' },
  { key: 'memberId', label: '회원 ID' },
  { key: 'nominalRank', label: '명목 직급', kind: 'rank', show: rankDisplay },
  { key: 'rank', label: '목표 직급', kind: 'rank', show: rankDisplay },
  { key: 'memberPvMan', label: '회원PV', show: (v) => `${Number(v) || 0}만` },
  { key: 'consumerMan', label: '소비 PV', show: (v) => `${Number(v) || 0}만` },
  // 메모는 덮어쓰지 않고 합치므로(`mergeMemo`) '있음 → 있음' 은 아무 말도 안 해 준다.
  // 무슨 일이 일어났는지 한 마디로 적는다.
  { key: 'memo', label: '메모', note: (from, to) => (from.trim() ? '합쳐짐' : '새로 들어옴') },
]

/** 접합점에서부터의 좌/우 경로. 접합점 자신은 `''` */
export function walkWithPaths(nodes, rootId) {
  const out = []
  const stack = [{ id: rootId, path: '' }]
  while (stack.length) {
    const { id, path } = stack.pop()
    const node = nodes.find((n) => n.id === id)
    if (!node) continue
    out.push({ node, path })
    const left = nodes.find((n) => n.parentId === id && n.side === 'left')
    const right = nodes.find((n) => n.parentId === id && n.side === 'right')
    if (left) stack.push({ id: left.id, path: `${path}L` })
    if (right) stack.push({ id: right.id, path: `${path}R` })
  }
  return out
}

/** `'LRL'` → `'좌-우-좌'`. 접합점 자신은 자리 표기가 없다 */
export function pathLabel(path) {
  if (!path) return '고른 자리'
  return path.split('').map((c) => (c === 'L' ? '좌' : '우')).join('-')
}

/** 카드에 이름이 없을 수 있다 — 회원 ID, 그것도 없으면 자리로 부른다 */
export function entryLabel({ node, path }) {
  const name = (node.name ?? '').trim()
  if (name) return name
  const id = (node.memberId ?? '').trim()
  if (id) return `ID ${id}`
  return pathLabel(path)
}

/**
 * 자리가 같을 때, 이 둘을 같은 사람으로 봐도 되는가.
 * 이름이나 회원 ID 가 **양쪽 다 적혀 있는데 서로 다르면** 다른 사람이다.
 * 한쪽이 비어 있으면 뒤늦게 채워 넣은 것으로 보고 같은 사람으로 친다.
 */
function looksLikeSamePerson(a, b) {
  const idA = (a.memberId ?? '').trim()
  const idB = (b.memberId ?? '').trim()
  if (idA && idB) return idA === idB
  const nameA = (a.name ?? '').trim()
  const nameB = (b.name ?? '').trim()
  if (nameA && nameB) return nameA === nameB
  return true
}

/** 양쪽에 딱 한 번씩만 나오는 값만 짝짓기에 쓴다 — 둘 이상이면 누가 누군지 알 수 없다 */
function uniqueBy(entries, pick) {
  const seen = new Map()
  for (const e of entries) {
    const key = pick(e)
    if (!key) continue
    seen.set(key, seen.has(key) ? null : e) // 두 번째로 나오면 못 쓰는 것으로 표시
  }
  const out = new Map()
  for (const [key, e] of seen) if (e) out.set(key, e)
  return out
}

const uniqueByMemberId = (entries) => uniqueBy(entries, (e) => (e.node.memberId ?? '').trim())
const uniqueByName = (entries) => uniqueBy(entries, (e) => (e.node.name ?? '').trim())

/**
 * 옛 사람들과 새 사람들을 짝짓는다 — 위에 적은 두 단계 그대로다.
 *
 * 이식(`subtreeImport.js`)도 메모를 넘겨받을 짝을 찾을 때 이 함수를 쓴다.
 * 화면에 적히는 '같은 사람' 과 메모가 실제로 합쳐지는 '같은 사람' 이 서로 다른
 * 셈법을 쓰면, 알림에 적힌 말과 벌어진 일이 어긋난다.
 *
 * @returns {{pairs: Array<{old, new}>, oldLeft: Set, newLeft: Set}} 짝 못 지은 쪽이 `*Left`
 */
export function matchByPath(oldEntries, newEntries) {
  const pairs = []          // [{ old, new }]
  const oldLeft = new Set(oldEntries)
  const newLeft = new Set(newEntries)

  /*
   * 접합점(경로 '')은 갈아 끼운 그 자리 자체라 다른 어떤 짝짓기보다 먼저, 무조건
   * 서로 짝짓는다 — 안 그러면 이름·회원 ID 짝짓기가 전역으로 돌면서, 우연히 접합점과
   * 이름(또는 회원 ID)이 같은 **엉뚱한 하위 사람**을 접합점 대신 채 갈 수 있다.
   */
  const oldJunction = oldEntries.find((e) => e.path === '')
  const newJunction = newEntries.find((e) => e.path === '')
  if (oldJunction && newJunction) {
    pairs.push({ old: oldJunction, new: newJunction })
    oldLeft.delete(oldJunction)
    newLeft.delete(newJunction)
  }

  // 1차 · 회원 ID 로 짝짓기 (자리를 옮겨도 따라간다)
  const oldById = uniqueByMemberId(oldEntries)
  const newById = uniqueByMemberId(newEntries)
  for (const [id, oldEntry] of oldById) {
    const newEntry = newById.get(id)
    if (!newEntry) continue
    pairs.push({ old: oldEntry, new: newEntry })
    oldLeft.delete(oldEntry)
    newLeft.delete(newEntry)
  }

  // 2차 · 이름으로 짝짓기 (역시 자리를 옮겨도 따라간다 — 양쪽에 그 이름이 한 번씩만 있을 때)
  const oldByName = uniqueByName([...oldLeft])
  const newByName = uniqueByName([...newLeft])
  for (const [name, oldEntry] of oldByName) {
    const newEntry = newByName.get(name)
    if (!newEntry) continue
    // 이름은 같아도 회원 ID 가 서로 다르면 동명이인이다 — 짝짓지 않는다
    if (!looksLikeSamePerson(oldEntry.node, newEntry.node)) continue
    pairs.push({ old: oldEntry, new: newEntry })
    oldLeft.delete(oldEntry)
    newLeft.delete(newEntry)
  }

  // 3차 · 그래도 남은 사람은 자리(경로)로 짝짓기 (접합점은 위에서 이미 처리했다)
  const newByPath = new Map()
  for (const e of newLeft) newByPath.set(e.path, e)
  for (const oldEntry of [...oldLeft]) {
    const newEntry = newByPath.get(oldEntry.path)
    if (!newEntry) continue
    if (!looksLikeSamePerson(oldEntry.node, newEntry.node)) continue
    pairs.push({ old: oldEntry, new: newEntry })
    oldLeft.delete(oldEntry)
    newLeft.delete(newEntry)
    newByPath.delete(oldEntry.path)
  }

  return { pairs, oldLeft, newLeft }
}

/**
 * @param before 이식 **전** 전체 배열
 * @param after  이식 **후** 전체 배열
 * @param junctionId 갈아 끼운 자리의 id (이식 전후로 같다 — 접합점은 id 를 물려받는다)
 * @returns {{changed: Array, added: Array, removed: Array}}
 */
export function diffSubtree(before, after, junctionId) {
  const { pairs, oldLeft, newLeft } = matchByPath(
    walkWithPaths(before, junctionId),
    walkWithPaths(after, junctionId),
  )

  const changed = []
  for (const { old: o, new: n } of pairs) {
    const fields = []
    for (const f of COMPARED) {
      const a = o.node[f.key] ?? ''
      const b = n.node[f.key] ?? ''
      if (String(a) === String(b)) continue
      if (f.note) {
        fields.push({ label: f.label, note: f.note(String(a), String(b)) })
        continue
      }
      const show = f.show ?? ((v) => (String(v).trim() ? String(v) : '없음'))
      // 직급은 원래 값도 함께 넘긴다 — 알림이 직급 색을 칠하는 데 쓴다
      fields.push({
        label: f.label, from: show(a), to: show(b),
        ...(f.kind === 'rank' ? { kind: 'rank', fromRank: String(a), toRank: String(b) } : {}),
      })
    }
    const moved = o.path !== n.path
    if (!fields.length && !moved) continue
    changed.push({
      label: entryLabel(n),
      where: pathLabel(n.path),
      fields,
      moved,
      movedFrom: moved ? pathLabel(o.path) : null,
    })
  }

  // 자리 순서대로 보이는 편이 읽기 좋다 (얕은 곳 먼저, 같은 깊이면 좌 먼저)
  const byPath = (a, b) => a.path.length - b.path.length || a.path.localeCompare(b.path)

  const entry = (e) => ({
    label: entryLabel(e), where: pathLabel(e.path),
    rank: rankDisplay(e.node.rank), rankKey: e.node.rank,
  })
  const added = [...newLeft].sort(byPath).map(entry)
  const removed = [...oldLeft].sort(byPath).map(entry)

  return { changed, added, removed }
}
