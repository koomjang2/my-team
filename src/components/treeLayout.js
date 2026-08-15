/** 이진 계보도 레이아웃 계산 — 좌/우 패널이 크기만 달리해서 함께 쓴다. */

export function childOf(nodes, parentId, side) {
  return nodes.find((n) => n.parentId === parentId && n.side === side) ?? null
}

/**
 * @param cardWidth       카드 한 장 폭
 * @param emptyLaneWidth  자식이 **하나도 없는** 회원(잎)이 차지하는 최소 레인 폭
 * @param branchGap       좌 레인과 우 레인 사이 틈
 * @param missingLaneWidth 자식이 **한쪽만 있을 때** 없는 쪽에 비워 두는 폭.
 *   이 값이 곧 외자식이 부모에서 좌/우로 비껴 앉는 거리를 만든다((없는쪽 + 틈) / 2).
 *   기본은 레인 하나만큼(`laneMin`) — 넉넉해서 좌/우가 한눈에 갈리지만 그만큼 넓어진다.
 *   좁게 주면 계보도가 확 모이는 대신 비낌이 작아진다.
 */
export function makeLayout({ cardWidth, emptyLaneWidth, branchGap, missingLaneWidth }) {
  const laneMin = Math.max(cardWidth, emptyLaneWidth)
  const missingLane = missingLaneWidth ?? laneMin

  function subtreeWidth(nodeId, nodes, cache = new Map()) {
    if (cache.has(nodeId)) return cache.get(nodeId)
    const left = childOf(nodes, nodeId, 'left')
    const right = childOf(nodes, nodeId, 'right')
    if (!left && !right) {
      cache.set(nodeId, laneMin)
      return laneMin
    }
    const leftWidth = left ? subtreeWidth(left.id, nodes, cache) : missingLane
    const rightWidth = right ? subtreeWidth(right.id, nodes, cache) : missingLane
    const width = leftWidth + rightWidth + branchGap
    cache.set(nodeId, width)
    return width
  }

  /** 한 노드의 자식 행 배치 정보 */
  function childRow(nodeId, nodes) {
    const left = childOf(nodes, nodeId, 'left')
    const right = childOf(nodes, nodeId, 'right')
    const cache = new Map()
    const leftLaneWidth = left ? subtreeWidth(left.id, nodes, cache) : missingLane
    const rightLaneWidth = right ? subtreeWidth(right.id, nodes, cache) : missingLane
    return {
      left,
      right,
      hasLeft: !!left,
      hasRight: !!right,
      hasChildren: !!left || !!right,
      leftLaneWidth,
      rightLaneWidth,
      childRowWidth: leftLaneWidth + rightLaneWidth + branchGap,
      leftCenterX: leftLaneWidth / 2,
      rightCenterX: leftLaneWidth + branchGap + rightLaneWidth / 2,
    }
  }

  return { laneMin, cardWidth, branchGap, subtreeWidth, childRow }
}

/**
 * 숨길 노드를 걷어낸 계보도를 만든다 (오른쪽 실질 계보도 전용).
 *
 * 이진 배치라 한 자리에 두 갈래를 밀어넣을 수 없으므로 세 갈래로 나뉜다.
 *   자식 없음 → 흔적 없이 사라진다
 *   자식 하나 → 그 자식이 자리를 물려받아 부모와 곧바로 이어진다 (한 칸 접힘)
 *   자식 둘   → 카드만 감추고 선은 그대로 지나가게 둔다 (passthrough)
 * 어느 경우든 위아래 연결이 끊기지 않는다.
 *
 * 루트('나')는 숨김 대상이어도 남긴다 — 계보도의 기준점이기 때문이다.
 * 노드 id 는 그대로 두므로 실질 직급·부족분 맵을 그대로 쓸 수 있다.
 */
export function collapseHidden(nodes, shouldHide) {
  function build(node) {
    const leftSrc = childOf(nodes, node.id, 'left')
    const rightSrc = childOf(nodes, node.id, 'right')
    const left = leftSrc ? build(leftSrc) : null
    const right = rightSrc ? build(rightSrc) : null

    if (!shouldHide(node)) return { node, left, right }

    const kept = [left, right].filter(Boolean)
    if (kept.length === 0) return null
    if (kept.length === 1) return kept[0]
    return { node, left, right, passthrough: true }
  }

  function flatten(subtree, parentId, side, out) {
    if (!subtree) return
    const placed = { ...subtree.node, parentId, side }
    if (subtree.passthrough) placed.passthrough = true
    out.push(placed)
    flatten(subtree.left, placed.id, 'left', out)
    flatten(subtree.right, placed.id, 'right', out)
  }

  const out = []
  for (const root of nodes.filter((n) => !n.parentId)) {
    const leftSrc = childOf(nodes, root.id, 'left')
    const rightSrc = childOf(nodes, root.id, 'right')
    flatten(
      {
        node: root,
        left: leftSrc ? build(leftSrc) : null,
        right: rightSrc ? build(rightSrc) : null,
      },
      null,
      null,
      out,
    )
  }
  return out
}
