// 실행: node src/engine/rankEngine.test.js
//
// 핵심 검증: 롤업 + "자격자 아래로 계속 내려가며 세기" 규칙이
// rank_logic.md 의 필요 인원 수치를 그대로 재현하는가?
//   STM = SRM 4명 / DM 12명 / SM 36명 (합계 52명)
//   RM  = STM 4명 / SRM 12명 / DM 36명 / SM 108명 (합계 160명)
// 이 수치가 안 맞으면 레그 카운팅 규칙이 틀린 것이다.

import { RANK_RULES } from './ranks.js'
import { computeEffectiveRanks, countQualifiersInLeg } from './rankEngine.js'

let seq = 0
const nid = () => `t${++seq}`

let failures = 0

/** 객체 키 순서에 영향받지 않도록 정렬해서 직렬화 */
function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  const keys = Object.keys(v).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
}

function check(label, actual, expected) {
  const pass = stable(actual) === stable(expected)
  if (!pass) failures++
  const mark = pass ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${label}` + (pass ? '' : `\n        기대: ${stable(expected)}\n        실제: ${stable(actual)}`))
}

/**
 * 해당 직급을 달성하는 최소 트리를 만든다.
 * SM/SSM 은 PV 로 달성하므로 자식이 필요 없다.
 */
function buildMinimal(rank, nodes, parentId = null, side = null) {
  const rule = RANK_RULES[rank]
  const node = { id: nid(), parentId, side, name: rank, rank, memberPvMan: 0 }
  nodes.push(node)

  // SSM/SM 은 지정만으로 달성 — 자식이 필요 없다
  if (rule.type === 'pv') return node

  buildNestedPair(rule.requires, nodes, node.id, 'left')
  buildNestedPair(rule.requires, nodes, node.id, 'right')
  return node
}

/**
 * 한쪽 레그에 requires 직급 2명을 "겹쳐서" 배치한다.
 * 위쪽 자격자(qA)의 좌측 다리 자리를 아래 자격자(qB)가 대신 차지한다.
 * qB 는 롤업으로 qA 의 하위 직급 요건도 동시에 만족시키므로 인원이 절약된다.
 */
function buildNestedPair(rank, nodes, parentId, side) {
  const qA = buildMinimal(rank, nodes, parentId, side)
  // qA 의 좌측 서브트리를 통째로 제거하고 그 자리에 qB 를 넣는다
  const qaLeft = nodes.find((n) => n.parentId === qA.id && n.side === 'left')
  if (qaLeft) removeSubtree(qaLeft.id, nodes)
  buildMinimal(rank, nodes, qA.id, 'left')
  return qA
}

function removeSubtree(id, nodes) {
  const kids = nodes.filter((n) => n.parentId === id)
  for (const k of kids) removeSubtree(k.id, nodes)
  const idx = nodes.findIndex((n) => n.id === id)
  if (idx >= 0) nodes.splice(idx, 1)
}

function headcount(rootRank) {
  seq = 0
  const nodes = []
  const root = buildMinimal(rootRank, nodes)
  const eff = computeEffectiveRanks(nodes)

  const counts = {}
  for (const n of nodes) {
    if (n.id === root.id) continue
    const e = eff.get(n.id)
    if (e) counts[e] = (counts[e] || 0) + 1
  }
  return { rootEffective: eff.get(root.id), counts, total: nodes.length - 1 }
}

console.log('=== PV 직급(SSM/SM) — 지정한 것이 곧 달성 전제 ===')
{
  const nodes = [{ id: 'a', parentId: null, side: null, rank: 'SM' }]
  check('SM 으로 지정하면 실질 SM', computeEffectiveRanks(nodes).get('a'), 'SM')
}
{
  const nodes = [{ id: 'a', parentId: null, side: null, rank: 'SSM' }]
  check('SSM 으로 지정하면 SSM 까지만 (SM 아님)', computeEffectiveRanks(nodes).get('a'), 'SSM')
}
{
  // DM 이상은 구조로만 달성된다 — 하위가 없으면 SM 수준으로 내려앉는다
  const nodes = [{ id: 'a', parentId: null, side: null, rank: 'DM', memberPvMan: 9999 }]
  check('회원PV 아무리 많아도 하위 없으면 DM 불가 (SM 까지)', computeEffectiveRanks(nodes).get('a'), 'SM')
}

console.log('\n=== 소비자(CSM) 는 자격에 포함되지 않는다 ===')
{
  const nodes = [
    { id: 'r', parentId: null, side: null, rank: 'DM' },
    { id: 'l1', parentId: 'r', side: 'left', rank: 'CSM', consumerMan: 500 },
    { id: 'l2', parentId: 'l1', side: 'left', rank: 'CSM', consumerMan: 500 },
    { id: 'r1', parentId: 'r', side: 'right', rank: 'CSM', consumerMan: 500 },
  ]
  const eff = computeEffectiveRanks(nodes)
  check('CSM 4명이어도 DM 불가 (SM 까지)', eff.get('r'), 'SM')
  check('CSM 은 SM 으로 카운트 안 됨', countQualifiersInLeg(nodes, 'l1', 2, eff), 0)
}

console.log("\n=== '없음'(NONE) 명목 직급 ===")
{
  const sm = (id, parentId, side) => ({ id, parentId, side, rank: 'SM' })
  const nodes = [
    { id: 'me', parentId: null, side: null, rank: 'DM' },
    { id: 'L1', parentId: 'me', side: 'left', rank: 'NONE', memberPvMan: 9999 },
    sm('L2', 'L1', 'left'), sm('L3', 'L2', 'left'),
    sm('R1', 'me', 'right'), sm('R2', 'R1', 'right'),
  ]
  const eff = computeEffectiveRanks(nodes)
  check('NONE 은 회원PV 가 아무리 많아도 직급 없음', eff.get('L1'), 'NONE')
  check('NONE 은 자격자로 세지 않는다', countQualifiersInLeg(nodes, 'L1', 2, eff), 2)
  check('NONE 을 건너뛰고 그 아래까지 집계 → DM 달성', eff.get('me'), 'DM')
}
{
  // 중간의 NONE 이 하위 집계를 막아버리면 안 된다
  const sm = (id, parentId, side) => ({ id, parentId, side, rank: 'SM' })
  const nodes = [
    { id: 'me', parentId: null, side: null, rank: 'DM' },
    { id: 'L1', parentId: 'me', side: 'left', rank: 'NONE' },
    sm('L2', 'L1', 'left'),
    { id: 'R1', parentId: 'me', side: 'right', rank: 'CSM', consumerMan: 300 },
    sm('R2', 'R1', 'right'), sm('R3', 'R2', 'right'),
  ]
  const eff = computeEffectiveRanks(nodes)
  check('NONE 아래 SM 1명뿐 → 좌 부족으로 DM 불가 (SM 까지)', eff.get('me'), 'SM')
  check('CSM 아래 SM 2명은 정상 집계', countQualifiersInLeg(nodes, 'R1', 2, eff), 2)
}

console.log('\n=== 롤업 · 중첩 카운팅 (문서 인원 수치 대조) ===')
{
  const dm = headcount('DM')
  check('DM 실질 달성', dm.rootEffective, 'DM')
  check('DM 필요 인원 = SM 4명', dm.counts, { SM: 4 })
}
{
  const srm = headcount('SRM')
  check('SRM 실질 달성', srm.rootEffective, 'SRM')
  check('SRM 필요 인원 = DM 4 / SM 12', srm.counts, { SM: 12, DM: 4 })
}
{
  const stm = headcount('STM')
  check('STM 실질 달성', stm.rootEffective, 'STM')
  // rank_logic.md: STM — SRM 4명, DM 12명, SM 36명 (합계 52명)
  check('STM 필요 인원 = SRM 4 / DM 12 / SM 36', stm.counts, { SM: 36, DM: 12, SRM: 4 })
  check('STM 합계 52명', stm.total, 52)
}
{
  const rm = headcount('RM')
  // rank_logic.md: RM — STM 4명, SRM 12명, DM 36명, SM 108명 (합계 160명)
  check('RM 필요 인원 = STM 4 / SRM 12 / DM 36 / SM 108', rm.counts, { SM: 108, DM: 36, SRM: 12, STM: 4 })
  check('RM 합계 160명', rm.total, 160)
}
{
  const cm = headcount('CM')
  // rank_logic.md: CM — RM 4명, STM 12명, SRM 36명, DM 108명, SM 324명 (합계 484명)
  check('CM 필요 인원 = RM 4 / STM 12 / SRM 36 / DM 108 / SM 324', cm.counts, { SM: 324, DM: 108, SRM: 36, STM: 12, RM: 4 })
  check('CM 합계 484명', cm.total, 484)
}
{
  const im = headcount('IM')
  // rank_logic.md: IM — CM 4명, RM 12명, STM 36명, SRM 108명, DM 324명, SM 972명 (합계 1,456명)
  check('IM 합계 1456명', im.total, 1456)
}

console.log('\n=== rank_logic.md 의 DM 구조 예시 ===')
{
  // 나 → 좌(SM1) → 좌의 좌(SM2) / 우(SM1) → 우의 우(SM2)
  const sm = (id, parentId, side) => ({ id, parentId, side, rank: 'SM' })
  const nodes = [
    { id: 'me', parentId: null, side: null, rank: 'DM' },
    sm('L1', 'me', 'left'), sm('L2', 'L1', 'left'),
    sm('R1', 'me', 'right'), sm('R2', 'R1', 'right'),
  ]
  check('같은 라인에 SM 2명 중첩 → DM 달성', computeEffectiveRanks(nodes).get('me'), 'DM')
}
{
  // 한쪽에만 SM 3명이면 DM 불가 (좌 AND 우 각각 2명)
  const sm = (id, parentId, side) => ({ id, parentId, side, rank: 'SM' })
  const nodes = [
    { id: 'me', parentId: null, side: null, rank: 'DM' },
    sm('L1', 'me', 'left'), sm('L2', 'L1', 'left'), sm('L3', 'L2', 'left'),
  ]
  check('좌에만 SM 3명 → DM 불가 (SM 까지)', computeEffectiveRanks(nodes).get('me'), 'SM')
}

console.log('\n=== 명목 직급은 실질 직급과 무관하다 ===')
{
  // 명목 STM 이지만 이번 보름 구조상 실질은 DM
  const sm = (id, parentId, side) => ({ id, parentId, side, rank: 'SM' })
  const nodes = [
    { id: 'me', parentId: null, side: null, rank: 'DM', nominalRank: 'STM' },
    sm('L1', 'me', 'left'), sm('L2', 'L1', 'left'),
    sm('R1', 'me', 'right'), sm('R2', 'R1', 'right'),
  ]
  check('명목 STM · 실질 DM', computeEffectiveRanks(nodes).get('me'), 'DM')
}

console.log(failures === 0 ? '\n모든 검증 통과' : `\n${failures}건 실패`)
process.exit(failures === 0 ? 0 : 1)
