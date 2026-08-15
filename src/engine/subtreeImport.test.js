/**
 * 서브트리 이식 검증 — `node src/engine/subtreeImport.test.js`
 *
 * 가장 중요한 검사는 **id 가 통째로 겹치는 파일**이다. A 가 예전에 내 파일을 받아
 * 고친 것이라면 id 가 글자 그대로 같을 수 있고, 그때 id 를 새로 발급하지 않으면
 * `parentId` 가 엉뚱한 회원을 가리켜 계보도가 무너진다.
 */
import { validateLineageFile, graftSubtree, mergeMemo, collectDescendants } from './subtreeImport.js'
import { diffSubtree } from './subtreeDiff.js'
import { computeEffectiveRanks, analyzeGap } from './rankEngine.js'

let pass = 0
let fail = 0
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}`)
  if (!ok) console.log(`         받음 ${JSON.stringify(got)}\n         기대 ${JSON.stringify(want)}`)
  ok ? pass++ : fail++
}

/** 예측 가능한 id 발급기 — 순수 함수라 테스트에서 갈아 끼울 수 있다 */
function counter(prefix = 'x') {
  let i = 0
  return () => `${prefix}${++i}`
}

const node = (id, parentId, side, extra = {}) => ({
  id, parentId, side, name: id, memberId: '', nominalRank: 'NONE',
  rank: 'SM', status: 'active', memberPvMan: 0, consumerMan: 0, memo: '', ...extra,
})

/** 내 계보도:  나 ─좌─ 가  ·  나 ─우─ A ─좌─ 나1 */
const mine = [
  node('me', null, null, { name: '나', rank: 'DM' }),
  node('ga', 'me', 'left', { name: '가' }),
  node('A', 'me', 'right', { name: 'A', memo: '내가 본 A' }),
  node('na1', 'A', 'left', { name: '나1' }),
]

/** A 가 준 파일:  A ─좌─ B ─좌─ D  ·  A ─우─ C ─좌─ E · C ─우─ F */
const aFile = {
  nodes: [
    node('r', null, null, { name: 'A', memberId: '12345678', nominalRank: 'DM', rank: 'DM', memberPvMan: 12, memo: 'A 가 쓴 메모' }),
    node('b', 'r', 'left', { name: 'B' }),
    node('c', 'r', 'right', { name: 'C' }),
    node('d', 'b', 'left', { name: 'D' }),
    node('e', 'c', 'left', { name: 'E' }),
    node('f', 'c', 'right', { name: 'F' }),
  ],
}

console.log('=== 파일 검증 — 깨진 파일은 걸러낸다 ===')
check('멀쩡한 파일은 통과', validateLineageFile(aFile).ok, true)
check('nodes 없음', validateLineageFile({}).ok, false)
check('빈 배열', validateLineageFile({ nodes: [] }).ok, false)
check('최상단이 둘', validateLineageFile({ nodes: [node('a', null, null), node('b', null, null)] }).ok, false)
check('최상단이 없음(전원 순환)', validateLineageFile({ nodes: [node('a', 'b', 'left'), node('b', 'a', 'left')] }).ok, false)
check('끊긴 윗 회원', validateLineageFile({ nodes: [node('a', null, null), node('b', 'ghost', 'left')] }).ok, false)
check('한 자리에 둘', validateLineageFile({
  nodes: [node('a', null, null), node('b', 'a', 'left'), node('c', 'a', 'left')],
}).ok, false)
check('좌/우 값이 이상함', validateLineageFile({
  nodes: [node('a', null, null), node('b', 'a', 'middle')],
}).ok, false)
check('떨어져 나온 무리', validateLineageFile({
  nodes: [node('a', null, null), node('b', 'c', 'left'), node('c', 'b', 'right')],
}).ok, false)
check('같은 id 가 두 번', validateLineageFile({
  nodes: [node('a', null, null), node('a', 'a', 'left')],
}).ok, false)

console.log('\n=== 이식 — 자리 정보는 내 것, 나머지는 파일 것 ===')
const after = graftSubtree(mine, 'A', aFile.nodes, counter())
const at = (id) => after.find((n) => n.id === id)

check('접합점은 내 id 를 물려받는다', !!at('A'), true)
check('접합점의 윗 회원은 그대로', at('A').parentId, 'me')
check('접합점의 좌/우도 그대로', at('A').side, 'right')
check('접합점 이름은 파일 것', at('A').name, 'A')
check('접합점 회원ID 는 파일 것', at('A').memberId, '12345678')
check('접합점 명목 직급은 파일 것', at('A').nominalRank, 'DM')
check('접합점 목표 직급은 파일 것', at('A').rank, 'DM')
check('접합점 PV 는 파일 것', at('A').memberPvMan, 12)
check('접합점 메모는 합친다', at('A').memo, '내가 본 A\n---\nA 가 쓴 메모')

check('내 옛 하위는 사라진다', after.some((n) => n.id === 'na1'), false)
check('건드리지 않은 쪽은 그대로', after.filter((n) => ['me', 'ga'].includes(n.id)).length, 2)
check('전체 인원 = 내 2명 + 파일 6명', after.length, 8)
check('파일 하위는 새 id 를 받는다', after.filter((n) => n.id.startsWith('x')).length, 5)
check('접합점의 좌 하위는 B', after.find((n) => n.parentId === 'A' && n.side === 'left').name, 'B')
check('접합점의 우 하위는 C', after.find((n) => n.parentId === 'A' && n.side === 'right').name, 'C')

console.log('\n=== id 가 통째로 겹치는 파일 (A 가 내 파일을 받아 고친 경우) ===')
// 파일의 id 가 내 계보도의 id 와 글자 그대로 같다 — 새로 발급하지 않으면 무너진다
const collidingFile = [
  node('me', null, null, { name: 'A' }),   // 내 루트와 같은 id!
  node('ga', 'me', 'left', { name: 'B' }), // 내 '가' 와 같은 id!
  node('na1', 'me', 'right', { name: 'C' }),
]
const collided = graftSubtree(mine, 'A', collidingFile, counter('c'))
check('내 루트는 살아 있다', collided.find((n) => n.id === 'me').name, '나')
check('내 루트는 여전히 최상단', collided.find((n) => n.id === 'me').parentId, null)
check('내 좌 하위 가 는 살아 있다', collided.find((n) => n.id === 'ga').name, '가')
check('최상단은 여전히 한 명', collided.filter((n) => !n.parentId).length, 1)
check('전체 인원 = 내 2명 + 파일 3명', collided.length, 5)
check('파일의 B 는 접합점 아래로 들어갔다',
  collided.find((n) => n.parentId === 'A' && n.side === 'left').name, 'B')

console.log('\n=== 이식 뒤 직급 계산 ===')
// A 의 좌 레그는 B·D 로 SM 2명, 우 레그는 C·E·F 로 SM 3명 → A 는 DM 을 채운다.
// 나는 우 레그가 6명(A 롤업 포함)인데 좌 레그는 '가' 하나뿐이라 DM 에 못 닿는다.
const effMap = computeEffectiveRanks(after)
check('A 는 좌우 SM 2명씩을 채워 DM 달성', effMap.get('A'), 'DM')
const gap = analyzeGap(after, at('me'), 'DM', effMap)
check('나의 좌 레그 SM 수 (가 하나)', gap.detail.leftCount, 1)
check('나의 우 레그 SM 수 (A·B·C·D·E·F)', gap.detail.rightCount, 6)
check('나는 좌가 모자라 DM 미달', gap.achieved, false)
check('부족분 문구는 좌만', gap.shortfalls, ['좌 SM 1명 부족'])

console.log('\n=== 메모 합치기 ===')
check('둘 다 있으면 줄을 그어 잇는다', mergeMemo('내 것', '파일 것'), '내 것\n---\n파일 것')
check('내 것만 있으면 그대로', mergeMemo('내 것', ''), '내 것')
check('파일 것만 있으면 그대로', mergeMemo('', '파일 것'), '파일 것')
check('둘 다 없으면 빈 값', mergeMemo('', ''), '')
check('이미 들어 있으면 안 붙인다 (두 번 불러도 안 길어진다)',
  mergeMemo('내 것\n---\n파일 것', '파일 것'), '내 것\n---\n파일 것')

console.log('\n=== 하위 모으기 ===')
check('A 아래는 나1 하나', collectDescendants(mine, 'A').map((n) => n.id), ['na1'])
check('루트 아래는 나머지 전부', collectDescendants(mine, 'me').length, 3)
check('잎 아래는 없다', collectDescendants(mine, 'na1'), [])

console.log('\n=== 달라진 점 정리 (스낵바가 읽는 값) ===')
const d = diffSubtree(mine, after, 'A')
check('추가 = B·C·D·E·F 다섯', d.added.map((x) => x.label).sort(), ['B', 'C', 'D', 'E', 'F'])
check('삭제 = 나1 하나', d.removed.map((x) => x.label), ['나1'])
check('변경 = 접합점 A 하나', d.changed.map((x) => x.label), ['A'])
check('A 에서 달라진 칸',
  d.changed[0].fields.map((f) => f.label), ['회원 ID', '명목 직급', '목표 직급', '회원PV', '메모'])
check('목표 직급은 SM → DM',
  d.changed[0].fields.find((f) => f.label === '목표 직급'), { label: '목표 직급', from: 'SM', to: 'DM' })
// 메모는 덮어쓰는 것이 아니라 합치는 것이라 '있음 → 있음' 대신 무슨 일인지 한 마디로 적는다
check('메모는 한 마디로 적는다',
  d.changed[0].fields.find((f) => f.label === '메모'), { label: '메모', note: '합쳐짐' })
const dNewMemo = diffSubtree(
  [node('j', null, null, { name: 'A' })],
  [node('j', null, null, { name: 'A', memo: '파일 메모' })], 'j')
check('내 메모가 없었으면 새로 들어옴',
  dNewMemo.changed[0].fields, [{ label: '메모', note: '새로 들어옴' }])

console.log('\n=== 회원 ID 가 있으면 자리를 옮겨도 따라간다 ===')
const before2 = [
  node('p', null, null, { name: 'P' }),
  node('q', 'p', 'left', { name: 'Q', memberId: '111' }),
]
const after2 = [
  node('p', null, null, { name: 'P' }),
  node('z', 'p', 'right', { name: 'Q', memberId: '111' }),
]
const d2 = diffSubtree(before2, after2, 'p')
check('삭제+추가가 아니라 자리 이동으로 잡힌다', [d2.added.length, d2.removed.length], [0, 0])
check('자리 이동 표시', d2.changed.map((x) => [x.label, x.moved, x.movedFrom, x.where]), [['Q', true, '좌', '우']])

console.log('\n=== 자리가 같아도 다른 사람이면 짝짓지 않는다 ===')
const sameSlot = (name, extra = {}) => [
  node('p', null, null, { name: 'P' }),
  node('q', 'p', 'left', { name, ...extra }),
]
const dSwap = diffSubtree(sameSlot('나1'), sameSlot('B'), 'p')
check('이름이 다르면 변경이 아니라 삭제 + 추가',
  [dSwap.changed.length, dSwap.added.map((x) => x.label), dSwap.removed.map((x) => x.label)],
  [0, ['B'], ['나1']])

const dSameName = diffSubtree(sameSlot('가'), sameSlot('가', { rank: 'DM' }), 'p')
check('이름이 같으면 변경으로 묶는다',
  dSameName.changed.map((x) => [x.label, x.fields[0].from, x.fields[0].to]), [['가', 'SM', 'DM']])

const dFilled = diffSubtree(sameSlot(''), sameSlot('마'), 'p')
check('한쪽이 비어 있으면 뒤늦게 채운 것으로 본다',
  [dFilled.changed.length, dFilled.added.length, dFilled.removed.length], [1, 0, 0])

const dDiffId = diffSubtree(sameSlot('가', { memberId: '111' }), sameSlot('가', { memberId: '222' }), 'p')
check('이름이 같아도 회원 ID 가 다르면 다른 사람',
  [dDiffId.changed.length, dDiffId.added.length, dDiffId.removed.length], [0, 1, 1])

// 접합점은 갈아 끼운 그 자리 자체다 — 내가 'A' 로 불렀고 파일에는 '성대진' 이어도 같은 사람
const dJunction = diffSubtree(
  [node('j', null, null, { name: 'A' })],
  [node('j', null, null, { name: '성대진' })], 'j')
check('접합점은 이름이 달라도 언제나 변경으로 잡힌다',
  dJunction.changed.map((x) => [x.label, x.fields[0].from, x.fields[0].to]), [['성대진', 'A', '성대진']])

console.log('\n=== 아무것도 안 바뀌면 조용하다 ===')
const d3 = diffSubtree(mine, mine, 'A')
check('변경·추가·삭제 모두 없음', [d3.changed.length, d3.added.length, d3.removed.length], [0, 0, 0])

console.log(`\n${fail ? `${fail}건 실패 / ` : ''}${pass}건 통과`)
if (fail) process.exit(1)
