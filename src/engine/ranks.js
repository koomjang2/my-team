// 애터미 직급 체계 정의
//
// 이 앱은 두 가지 직급을 구분한다.
//   명목 직급(node.rank) — 왼쪽 '계보도 구성'에서 사용자가 지정하는 값
//   실질 직급(effective) — 달성 조건을 실제로 만족해 오른쪽 패널에 표시되는 값
//
// NONE('없음') 과 CSM('소비자') 은 직급자가 아니다.
// SSM(1) 미만의 레벨을 주어 어떤 자격 판정에도 포함되지 않게 한다.

export const RANK_NONE = 'NONE'

export const RANK_LEVEL = {
  NONE: -1,
  CSM: 0,
  SSM: 1,
  SM: 2,
  DM: 3,
  SRM: 4,
  STM: 5,
  RM: 6,
  CM: 7,
  IM: 8,
}

/** 명목 직급으로 고를 수 있는 전체 분류 (없음 + 소비자 + 직급 8개) */
export const ALL_RANKS = ['NONE', 'CSM', 'SSM', 'SM', 'DM', 'SRM', 'STM', 'RM', 'CM', 'IM']

/** 실제 직급 (없음·소비자 제외) — 낮은 직급부터 */
export const BUSINESS_RANKS = ['SSM', 'SM', 'DM', 'SRM', 'STM', 'RM', 'CM', 'IM']

export const RANK_LABEL = {
  NONE: '없음',
  CSM: '소비자',
  SSM: '세미세일즈마스터',
  SM: '세일즈마스터',
  DM: '다이아몬드마스터',
  SRM: '샤론로즈마스터',
  STM: '스타마스터',
  RM: '로얄마스터',
  CM: '크라운마스터',
  IM: '임페리얼마스터',
}

export const RANK_SHORT_LABEL = {
  NONE: '미지정',
  CSM: '소비자',
  SSM: '세미',
  SM: '판매사',
  DM: '팀장',
  SRM: '국장',
  STM: '본부장',
  RM: '총장',
  CM: '단장',
  IM: '임페리얼',
}

/**
 * 직급 달성 조건.
 * - pv  : 보름 소실적 기준 좌/우 PV (만 단위). 몸PV 합산 가능.
 * - leg : 좌/우 각 레그에 requires 직급 이상이 count 명 이상.
 */
export const RANK_RULES = {
  SSM: { type: 'pv', targetMan: 150 },
  SM: { type: 'pv', targetMan: 250 },
  DM: { type: 'leg', requires: 'SM', count: 2 },
  SRM: { type: 'leg', requires: 'DM', count: 2 },
  STM: { type: 'leg', requires: 'SRM', count: 2 },
  RM: { type: 'leg', requires: 'STM', count: 2 },
  CM: { type: 'leg', requires: 'RM', count: 2 },
  IM: { type: 'leg', requires: 'CM', count: 2 },
}

/** 몸PV 를 쓸 수 있는 직급 (DM 이상은 몸PV 로 직급 달성 불가) */
export const BODY_PV_RANKS = ['SSM', 'SM']

export const RANK_COLORS = {
  NONE: 'bg-white text-gray-400 border-dashed border-gray-300',
  CSM: 'bg-slate-100 text-slate-500 border-slate-300',
  SSM: 'bg-gray-200 text-gray-700 border-gray-400',
  SM: 'bg-blue-100 text-blue-800 border-blue-400',
  DM: 'bg-orange-100 text-orange-800 border-orange-400',
  SRM: 'bg-green-100 text-green-700 border-green-500',
  STM: 'bg-purple-100 text-purple-800 border-purple-500',
  RM: 'bg-yellow-100 text-yellow-800 border-yellow-500',
  CM: 'bg-pink-100 text-pink-800 border-pink-500',
  IM: 'bg-red-100 text-red-800 border-red-500',
}

/** 사업자 분류: 실질(지금 직급을 맞추고 있는) / 예비(앞으로 맞추게 될) */
export const STATUS_ACTIVE = 'active'
export const STATUS_PROSPECT = 'prospect'

export const STATUS_LABEL = {
  [STATUS_ACTIVE]: '실질',
  [STATUS_PROSPECT]: '예비',
}

export function isBusinessRank(rank) {
  return BUSINESS_RANKS.includes(rank)
}

export function canUseBodyPv(rank) {
  return BODY_PV_RANKS.includes(rank)
}

/** 해당 직급의 기본 목표 PV (만 단위). leg 타입 직급은 PV 목표가 없다. */
export function defaultTargetMan(rank) {
  const rule = RANK_RULES[rank]
  return rule?.type === 'pv' ? rule.targetMan : 0
}

/** 직급자가 아닌 분류 (없음 / 소비자) */
export function isNonRank(rank) {
  return rank === RANK_NONE || rank === 'CSM'
}

/** 화면 표기용 — NONE 은 '없음' 으로 보여준다 */
export function rankDisplay(rank) {
  if (!rank) return '—'
  return rank === RANK_NONE ? '없음' : rank
}
