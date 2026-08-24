import { RANK_NONE, STATUS_ACTIVE } from './ranks.js'
import { matchByPath, walkWithPaths } from './subtreeDiff.js'

/**
 * 다른 사업자가 저장한 계보도 파일을, 내 계보도의 **고른 자리에 통째로 갈아 끼운다.**
 *
 *   내 계보도            A 가 준 파일          이식 결과
 *   나 ─우─ A ─좌─ 가     A' ─좌─ B            나 ─우─ A' ─좌─ B
 *                            └우─ C                     └우─ C
 *
 * 이 앱의 계보도는 평평한 배열이고 부모는 `parentId` 한 칸에만 적혀 있다.
 * 그래서 **파일의 루트에 내 `parentId`·`side` 만 갈아 끼우면 그 자리에 매달린다** —
 * 서브트리 이식에 필요한 수정은 사실상 그것뿐이다.
 *
 * 접합점(고른 자리)에서 내 것으로 남는 것은 셋뿐이다:
 *   id                 — 안 물려받으면 열려 있던 편집창과 selectedId 가 끊긴다
 *   parentId · side    — 파일 루트는 `null` 이라 안 갈면 트리가 두 동강 난다
 *   memo               — 내가 그 사람에 대해 적어 둔 관찰이라 파일 메모와 합친다
 * 나머지(이름·회원ID·명목직급·목표직급·PV)는 **파일이 이긴다** — 본인이 자기를 더 잘 안다.
 *
 * **메모는 하위도 합친다.** 접합점만 합쳐지던 시절이 있었는데, 그건 규칙이라기보다
 * 접합점만 id 를 물려받아 살아남았기 때문이었다. 이제는 `subtreeDiff.js` 의 짝짓기로
 * 없어질 사람과 들어올 사람을 견줘, 같은 사람이면 그 메모도 함께 합친다.
 *
 * **한쪽 라인만 갈아 끼울 수도 있다** (`side`). 반대쪽은 손도 대지 않는다 —
 * `doomed` 에 넣지 않으므로 id 까지 그대로 살아남는다.
 */

/** 옛 판본 파일에 빠진 칸이 있어도 카드가 깨지지 않게 채워 넣는 바닥값 */
const NODE_DEFAULTS = {
  name: '',
  memberId: '',
  nominalRank: RANK_NONE,
  rank: RANK_NONE,
  status: STATUS_ACTIVE,
  memberPvMan: 0,
  consumerMan: 0,
  memo: '',
}

const SIDES = new Set(['left', 'right'])

/**
 * 쓸모없어진 빈 자리를 걷어낸다 — 하위가 하나 남으면 그 하나가 자리를 물려받고,
 * 하나도 없으면 자리도 사라진다. 빈 자리는 **갈림길일 때만** 뜻이 있기 때문이다.
 * 걷어내면서 위쪽 빈 자리가 또 홀쭉해질 수 있어 더 걷을 것이 없을 때까지 돈다.
 */
export function collapseVacated(nodes) {
  let out = nodes
  for (;;) {
    const dead = out.find((n) => n.vacated && out.filter((k) => k.parentId === n.id).length < 2)
    if (!dead) return out
    out = out
      .filter((n) => n.id !== dead.id)
      .map((n) => (n.parentId === dead.id ? { ...n, parentId: dead.parentId, side: dead.side } : n))
  }
}

/**
 * 불러온 파일이 계보도로 성립하는가.
 *
 * 남의 파일을 내 계보도 **한가운데**에 꽂는 일이라 기존 '열기'(통째로 바꾸기)보다
 * 엄격하게 본다. 여기서 걸리면 배열은 **한 글자도 바뀌지 않는다.**
 *
 * @returns {{ok: true, nodes: Array, root: object, savedAt: string|null}} | {{ok: false, error: string}}
 */
export function validateLineageFile(parsed) {
  const nodes = parsed?.nodes
  if (!Array.isArray(nodes) || !nodes.length) {
    return { ok: false, error: '계보도 파일이 아닙니다 — 회원 목록이 없습니다.' }
  }

  const ids = new Set()
  for (const n of nodes) {
    if (!n?.id) return { ok: false, error: '회원 하나에 id 가 없습니다.' }
    if (ids.has(n.id)) return { ok: false, error: `같은 id 가 두 번 나옵니다 (${n.id}).` }
    ids.add(n.id)
  }

  const roots = nodes.filter((n) => !n.parentId)
  if (roots.length !== 1) {
    return { ok: false, error: `최상단 회원이 ${roots.length}명입니다 — 한 명이어야 합니다.` }
  }

  // 끊긴 부모 · 이진 트리 위반(같은 자리에 둘) · 이상한 좌/우 값
  const taken = new Set()
  for (const n of nodes) {
    if (!n.parentId) continue
    if (!ids.has(n.parentId)) {
      return { ok: false, error: `'${n.name || n.id}' 의 윗 회원이 파일에 없습니다.` }
    }
    if (!SIDES.has(n.side)) {
      return { ok: false, error: `'${n.name || n.id}' 의 좌/우 값이 이상합니다 (${n.side}).` }
    }
    const slot = `${n.parentId}:${n.side}`
    if (taken.has(slot)) {
      return { ok: false, error: `한 자리에 회원이 둘입니다 ('${n.name || n.id}' 쪽).` }
    }
    taken.add(slot)
  }

  // 최상단에서 내려가 닿는 수가 전체와 같아야 한다 — 다르면 순환이나 떨어진 무리가 있다
  const byParent = new Map()
  for (const n of nodes) {
    if (!n.parentId) continue
    const list = byParent.get(n.parentId) ?? []
    list.push(n)
    byParent.set(n.parentId, list)
  }
  let reached = 0
  const stack = [roots[0]]
  const seen = new Set()
  while (stack.length) {
    const cur = stack.pop()
    if (seen.has(cur.id)) continue
    seen.add(cur.id)
    reached += 1
    for (const child of byParent.get(cur.id) ?? []) stack.push(child)
  }
  if (reached !== nodes.length) {
    return { ok: false, error: '최상단에서 이어지지 않는 회원이 있습니다 (순환이거나 떨어진 무리).' }
  }

  return { ok: true, nodes, root: roots[0], savedAt: parsed.savedAt ?? null }
}

/**
 * 내 메모와 파일 메모를 합친다.
 * 한쪽만 있으면 그것만 쓰고, **파일 메모가 이미 내 메모 안에 들어 있으면 안 붙인다** —
 * 같은 파일을 두 번 불러도 메모가 한없이 길어지지 않게 하는 최소한의 방어다.
 */
export function mergeMemo(mine, theirs) {
  const a = (mine ?? '').trim()
  const b = (theirs ?? '').trim()
  if (!b) return a
  if (!a) return b
  if (a.includes(b)) return a
  return `${a}\n---\n${b}`
}

/** 그 자리의 **한쪽 레그** — 그 자리의 좌(또는 우) 하위와 그 아래 전부 */
export function sideDescendants(nodes, parentId, side) {
  const child = nodes.find((n) => n.parentId === parentId && n.side === side)
  if (!child) return []
  return [child, ...collectDescendants(nodes, child.id)]
}

/** 그 자리 **아래** 회원들 (자기 자신은 빼고) */
export function collectDescendants(nodes, rootId) {
  const out = []
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()
    for (const n of nodes) {
      if (n.parentId !== id) continue
      out.push(n)
      stack.push(n.id)
    }
  }
  return out
}

/**
 * 고른 자리(`targetId`)와 그 아래를, 불러온 계보도로 갈아 끼운 **새 배열**을 돌려준다.
 *
 * `makeId` 를 밖에서 받는 이유: 파일의 id 를 **전부 새로 발급**해야 하는데
 * (A 가 예전에 내 파일을 받아 고친 것이라면 id 가 글자 그대로 같을 수 있다),
 * 이 함수를 순수하게 두면 테스트에서 예측 가능한 id 를 넣어 검사할 수 있다.
 *
 * @param side `'all'` 이면 그 자리 아래 전부. `'left'`/`'right'` 면 그쪽 레그만 갈아 끼우고
 *   **반대쪽은 손대지 않는다** — 파일에 그쪽이 비어 있으면 내 그쪽도 비워진다(파일이 이긴다).
 */
export function graftSubtree(nodes, targetId, importedNodes, makeId, side = 'all') {
  const target = nodes.find((n) => n.id === targetId)
  if (!target) return nodes

  const importedRoot = importedNodes.find((n) => !n.parentId)
  if (!importedRoot) return nodes

  // 한쪽만 불러올 때는 파일에서도 그쪽 레그만 떼어 온다
  const keepImported = side === 'all'
    ? importedNodes
    : [importedRoot, ...sideDescendants(importedNodes, importedRoot.id, side)]

  // 없어질 사람들. 반대쪽 레그는 여기 안 들어가므로 id 까지 그대로 살아남는다
  const doomed = new Set(
    (side === 'all'
      ? collectDescendants(nodes, targetId)
      : sideDescendants(nodes, targetId, side)
    ).map((n) => n.id),
  )
  doomed.add(targetId)

  /*
   * 없어질 사람 중에 들어올 사람과 **같은 사람**이 있으면 그 메모를 물려준다.
   * 짝짓기 범위를 `doomed` 로 반드시 좁혀야 한다 — `matchByPath` 의 1차(회원 ID)는
   * 자리를 안 보고 전역으로 짝짓기 때문에, 안 그러면 **손대지도 않는 반대쪽 레그**의
   * 회원이 회원 ID 가 같다는 이유로 자기 메모를 넘겨주고는 자신도 그대로 남아
   * 같은 메모가 두 사람에게 겹쳐 적힌다.
   */
  const { pairs } = matchByPath(
    walkWithPaths(nodes, targetId).filter((e) => e.path !== '' && doomed.has(e.node.id)),
    walkWithPaths(keepImported, importedRoot.id).filter((e) => e.path !== ''),
  )
  const inheritedMemo = new Map(pairs.map((p) => [p.new.node.id, p.old.node.memo]))

  // 파일의 id 를 전부 새로 발급한다 — 접합점만 내 id 를 물려받는다
  const idMap = new Map()
  for (const n of keepImported) {
    idMap.set(n.id, n.id === importedRoot.id ? targetId : makeId())
  }

  const grafted = keepImported.map((n) => {
    const isRoot = n.id === importedRoot.id
    return {
      ...NODE_DEFAULTS,
      ...n,
      id: idMap.get(n.id),
      // 접합점만 내 자리 정보를 지킨다 — 나머지는 파일 안의 관계 그대로다
      parentId: isRoot ? target.parentId : idMap.get(n.parentId),
      side: isRoot ? target.side : n.side,
      memo: isRoot
        ? mergeMemo(target.memo, n.memo)
        : mergeMemo(inheritedMemo.get(n.id) ?? '', n.memo),
      // 접합점은 파일 루트의 신원을 물려받은 실존 인물이다. 파일이 빈 자리 표시를
      // 달고 있으면 `collapseVacated` 가 방금 꽂은 이 자리를 도로 걷어 가 버린다.
      ...(isRoot ? { vacated: false } : {}),
    }
  })

  return collapseVacated([...nodes.filter((n) => !doomed.has(n.id)), ...grafted])
}
