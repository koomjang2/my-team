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

/** '달성할 직급 선택' 에서 고를 수 있는 전체 분류 (없음 + 소비자 + 직급 8개) */
export const ALL_RANKS = ['NONE', 'CSM', 'SSM', 'SM', 'DM', 'SRM', 'STM', 'RM', 'CM', 'IM']

/**
 * '명목 직급' 으로 고를 수 있는 값 (없음 + 직급 8개 = 9개).
 * 명목 직급은 그 회원이 이름표로 달고 있는 직급이고, 이번 보름에 실제로 달성하는
 * 실질 직급과는 별개다. (예: 명목 STM 이지만 이번엔 실질 SRM)
 * 소비자(CSM)는 명목 직급이 아니므로 제외한다.
 */
export const NOMINAL_RANKS = ['NONE', 'SSM', 'SM', 'DM', 'SRM', 'STM', 'RM', 'CM', 'IM']

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

/**
 * 회원PV(몸PV) 입력란을 띄우는 직급.
 * DM 은 몸PV 로 직급을 달성할 수는 없지만 본인 몸PV 자체는 기록해 둔다.
 */
export const MEMBER_PV_RANKS = ['SSM', 'SM', 'DM']

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

/** 회원PV(몸PV) 를 입력받는 직급인가 */
export function hasMemberPv(rank) {
  return MEMBER_PV_RANKS.includes(rank)
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
