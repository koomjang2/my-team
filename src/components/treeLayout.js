/** 이진 계보도 레이아웃 계산 — 좌/우 패널이 크기만 달리해서 함께 쓴다. */

export function childOf(nodes, parentId, side) {
  return nodes.find((n) => n.parentId === parentId && n.side === side) ?? null
}

export function makeLayout({ cardWidth, emptyLaneWidth, branchGap }) {
  const laneMin = Math.max(cardWidth, emptyLaneWidth)

  function subtreeWidth(nodeId, nodes, cache = new Map()) {
    if (cache.has(nodeId)) return cache.get(nodeId)
    const left = childOf(nodes, nodeId, 'left')
    const right = childOf(nodes, nodeId, 'right')
    if (!left && !right) {
      cache.set(nodeId, laneMin)
      return laneMin
    }
    const leftWidth = left ? subtreeWidth(left.id, nodes, cache) : laneMin
    const rightWidth = right ? subtreeWidth(right.id, nodes, cache) : laneMin
    const width = leftWidth + rightWidth + branchGap
    cache.set(nodeId, width)
    return width
  }

  /** 한 노드의 자식 행 배치 정보 */
  function childRow(nodeId, nodes) {
    const left = childOf(nodes, nodeId, 'left')
    const right = childOf(nodes, nodeId, 'right')
    const cache = new Map()
    const leftLaneWidth = left ? subtreeWidth(left.id, nodes, cache) : laneMin
    const rightLaneWidth = right ? subtreeWidth(right.id, nodes, cache) : laneMin
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
