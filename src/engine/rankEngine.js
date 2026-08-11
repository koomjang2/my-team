import {
  RANK_LEVEL,
  BUSINESS_RANKS,
  RANK_RULES,
  isNonRank,
} from './ranks.js'

function childOf(nodes, parentId, side) {
  return nodes.find((n) => n.parentId === parentId && n.side === side) ?? null
}

/**
 * 레그(한쪽 다리) 안에서 minLevel 이상인 사람 수를 센다.
 *
 * 두 가지 규칙이 동시에 적용된다:
 *  1) 롤업 — 상위 직급자는 하위 직급 자격도 만족한다 (DM 은 SM 으로도 카운트).
 *  2) 자격자를 만나도 그 아래로 계속 내려가며 센다.
 *     rank_logic.md 의 "나 → 좌 SM1 → 좌의 좌 SM2 = 좌에 SM 2명 달성" 구조가 근거다.
 *
 * 이 두 규칙의 조합이 문서의 필요 인원 수(STM = SRM 4 / DM 12 / SM 36)를 만들어낸다.
 * 상위 직급자가 자기 부모의 하위 직급 자리를 겸하기 때문에 4배가 아니라 3배씩 늘어난다.
 */
export function countQualifiersInLeg(nodes, rootId, minLevel, effRankMap) {
  if (!rootId) return 0
  const eff = effRankMap.get(rootId)
  const level = eff ? RANK_LEVEL[eff] : -1
  const self = level >= minLevel ? 1 : 0

  const left = childOf(nodes, rootId, 'left')
  const right = childOf(nodes, rootId, 'right')

  return (
    self +
    countQualifiersInLeg(nodes, left?.id, minLevel, effRankMap) +
    countQualifiersInLeg(nodes, right?.id, minLevel, effRankMap)
  )
}

/**
 * PV 타입 직급(SSM/SM) 달성 여부.
 *
 * 이 앱은 좌/우 PV 를 직접 입력받지 않는다 — 계보도 구조를 짜는 도구이기 때문이다.
 * 따라서 "그 사람을 그 직급으로 보내기로 정했는가"(달성할 직급 = node.rank)로 판정한다.
 * SM 으로 지정하면 SM 조건(좌/우 각 250만)을 채운다는 전제이고,
 * 그 위 DM 이상은 이 전제 위에서 구조 조건으로 검증된다.
 */
function meetsPvRank(node, rank) {
  return (RANK_LEVEL[node.rank] ?? -1) >= RANK_LEVEL[rank]
}

/** leg 타입 직급(DM 이상) 달성 여부 */
function meetsLegRank(nodes, node, rank, effRankMap) {
  const rule = RANK_RULES[rank]
  const minLevel = RANK_LEVEL[rule.requires]
  const left = childOf(nodes, node.id, 'left')
  const right = childOf(nodes, node.id, 'right')
  const leftCount = countQualifiersInLeg(nodes, left?.id, minLevel, effRankMap)
  const rightCount = countQualifiersInLeg(nodes, right?.id, minLevel, effRankMap)
  return leftCount >= rule.count && rightCount >= rule.count
}

/**
 * 트리 전체의 "실질 직급"(실제로 달성 가능한 최고 직급)을 아래에서 위로 계산한다.
 * 한 사람의 직급은 자기 하위에만 의존하므로 순환 없이 한 번에 정해진다.
 *
 * @returns Map<nodeId, rank|null>  null 은 어떤 직급도 달성 못함
 */
export function computeEffectiveRanks(nodes) {
  const effRankMap = new Map()
  const byId = new Map(nodes.map((n) => [n.id, n]))

  function resolve(nodeId) {
    if (effRankMap.has(nodeId)) return effRankMap.get(nodeId)
    const node = byId.get(nodeId)
    if (!node) return null

    // 순환 트리 방어 — 계산 중임을 표시
    effRankMap.set(nodeId, null)

    // 하위부터 확정
    const left = childOf(nodes, nodeId, 'left')
    const right = childOf(nodes, nodeId, 'right')
    if (left) resolve(left.id)
    if (right) resolve(right.id)

    // 없음/소비자는 직급 판정 대상이 아니다 — 명목 분류를 그대로 실질로 넘긴다.
    // 레그 카운팅은 이런 노드를 건너뛰고 그 아래까지 계속 내려가므로 하위는 그대로 집계된다.
    if (isNonRank(node.rank)) {
      effRankMap.set(nodeId, node.rank)
      return node.rank
    }

    // 낮은 직급부터 검사해 만족하는 가장 높은 직급을 실질 직급으로 삼는다
    let best = null
    for (const rank of BUSINESS_RANKS) {
      const rule = RANK_RULES[rank]
      const ok =
        rule.type === 'pv'
          ? meetsPvRank(node, rank)
          : meetsLegRank(nodes, node, rank, effRankMap)
      if (ok) best = rank
    }

    effRankMap.set(nodeId, best)
    return best
  }

  for (const node of nodes) resolve(node.id)
  return effRankMap
}

/**
 * 한 사람이 "목표 직급"에 도달하기 위해 무엇이 부족한지 계산한다.
 * @returns { achieved, shortfalls: string[], detail }
 */
export function analyzeGap(nodes, node, goalRank, effRankMap) {
  // 없음/소비자는 달성할 조건 자체가 없다
  if (!goalRank || isNonRank(goalRank)) {
    return { achieved: true, shortfalls: [], detail: null }
  }

  const rule = RANK_RULES[goalRank]
  if (!rule) return { achieved: true, shortfalls: [], detail: null }

  // SSM/SM 은 좌/우 PV 를 입력받지 않으므로 지정한 것 자체가 곧 달성 전제다.
  // 조건 수치는 화면에 안내용으로만 내보낸다.
  if (rule.type === 'pv') {
    return {
      achieved: true,
      shortfalls: [],
      detail: { type: 'pv', targetMan: rule.targetMan, memberPvMan: node.memberPvMan || 0 },
    }
  }

  const minLevel = RANK_LEVEL[rule.requires]
  const left = childOf(nodes, node.id, 'left')
  const right = childOf(nodes, node.id, 'right')
  const leftCount = countQualifiersInLeg(nodes, left?.id, minLevel, effRankMap)
  const rightCount = countQualifiersInLeg(nodes, right?.id, minLevel, effRankMap)

  const shortfalls = []
  if (leftCount < rule.count) {
    shortfalls.push(`좌 ${rule.requires} ${rule.count - leftCount}명 부족`)
  }
  if (rightCount < rule.count) {
    shortfalls.push(`우 ${rule.requires} ${rule.count - rightCount}명 부족`)
  }

  return {
    achieved: shortfalls.length === 0,
    shortfalls,
    detail: {
      type: 'leg',
      requires: rule.requires,
      need: rule.count,
      leftCount,
      rightCount,
    },
  }
}

/** 하위 소비자(CSM)의 예상 소비 PV 를 좌/우 레그별로 합산 — 목표 PV 의 근거 확인용 */
export function sumConsumerPvByLeg(nodes, nodeId) {
  function sumSubtree(id) {
    if (!id) return 0
    const node = nodes.find((n) => n.id === id)
    if (!node) return 0
    const own = node.rank === 'CSM' ? node.consumerMan || 0 : 0
    const left = childOf(nodes, id, 'left')
    const right = childOf(nodes, id, 'right')
    return own + sumSubtree(left?.id) + sumSubtree(right?.id)
  }
  const left = childOf(nodes, nodeId, 'left')
  const right = childOf(nodes, nodeId, 'right')
  return { left: sumSubtree(left?.id), right: sumSubtree(right?.id) }
}

/** 트리 전체 통계 — 실질 직급 기준 직급별 인원 */
export function summarizeTree(nodes, effRankMap) {
  const counts = {}
  for (const node of nodes) {
    const eff = effRankMap.get(node.id)
    if (!eff) continue
    counts[eff] = (counts[eff] || 0) + 1
  }
  return counts
}
