// 애터미 직급 체계 정의
//
// 이 앱은 두 가지 직급을 구분한다.
//   명목 직급(node.rank) — 왼쪽 '나의 계보도'에서 사용자가 지정하는 값
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

/** '목표 직급 선택' 에서 고를 수 있는 전체 분류 (없음 + 소비자 + 직급 8개) */
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

/** 목표 직급 단축키 — 화면 버튼에 적는 글자. '없음' 에는 단축키가 없다. */
export const RANK_HOTKEY = {
  CSM: '`', SSM: '1', SM: '2', DM: '3', SRM: '4', STM: '5', RM: '6', CM: '7', IM: '8',
}

/**
 * KeyboardEvent.code → 목표 직급.
 * `key` 가 아니라 `code` 로 보는 이유: 한글 입력 상태에서도 자판의 물리 위치는
 * 그대로라 `q` 가 `ㅂ` 로 바뀌어도 단축키가 살아 있다.
 */
export const HOTKEY_CODE_TO_RANK = {
  Backquote: 'CSM',
  Digit1: 'SSM', Digit2: 'SM', Digit3: 'DM', Digit4: 'SRM',
  Digit5: 'STM', Digit6: 'RM', Digit7: 'CM', Digit8: 'IM',
  Numpad1: 'SSM', Numpad2: 'SM', Numpad3: 'DM', Numpad4: 'SRM',
  Numpad5: 'STM', Numpad6: 'RM', Numpad7: 'CM', Numpad8: 'IM',
}

/** `code` 를 주지 않는 자판·입력기를 위한 뒷받침 — 찍힌 글자로 한 번 더 본다 */
export const HOTKEY_KEY_TO_RANK = {
  '`': 'CSM', '~': 'CSM',
  1: 'SSM', 2: 'SM', 3: 'DM', 4: 'SRM', 5: 'STM', 6: 'RM', 7: 'CM', 8: 'IM',
}

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
 * 회원PV(몸PV) 입력란을 띄우는 기준 직급.
 * SRM(4) 이상은 이미 위 단계로 올라간 사람이라 몸PV 를 더 기록할 이유가 없다.
 * 이 값 미만(NONE·SSM·SM·DM)이면 보여준다.
 */
export const MEMBER_PV_CEILING = 'SRM'

export const RANK_COLORS = {
  NONE: 'bg-white text-gray-400 border-dashed border-gray-300',
  // 직급 글자에서 흰 박스를 걷어낸 뒤로는 이 색이 곧 글자색이다.
  // slate-500 은 카드 배경(slate-100) 대비 4.3:1 로 모자라 한 단계 진하게 둔다.
  CSM: 'bg-slate-100 text-slate-600 border-slate-300',
  SSM: 'bg-gray-200 text-gray-700 border-gray-400',
  SM: 'bg-blue-100 text-blue-800 border-blue-400',
  DM: 'bg-orange-100 text-orange-800 border-orange-400',
  SRM: 'bg-green-100 text-green-700 border-green-500',
  STM: 'bg-purple-100 text-purple-800 border-purple-500',
  RM: 'bg-yellow-100 text-yellow-800 border-yellow-500',
  CM: 'bg-pink-100 text-pink-800 border-pink-500',
  IM: 'bg-red-100 text-red-800 border-red-500',
}

/**
 * 직급 선택 버튼용 두 벌 — 고르기 전에는 옅게(SOFT), 고르면 선명하게(STRONG).
 * 색만 다를 뿐 RANK_COLORS 와 같은 계열이라 카드 색과 눈으로 이어진다.
 * Tailwind 는 소스에서 문자열을 그대로 훑어가므로 반드시 완성된 클래스명으로 적는다.
 */
export const RANK_COLORS_SOFT = {
  NONE: 'bg-white text-gray-400 border-dashed border-gray-300',
  CSM: 'bg-slate-50 text-slate-400 border-slate-200',
  SSM: 'bg-gray-50 text-gray-400 border-gray-200',
  SM: 'bg-blue-50 text-blue-400 border-blue-200',
  DM: 'bg-orange-50 text-orange-400 border-orange-200',
  SRM: 'bg-green-50 text-green-500 border-green-200',
  STM: 'bg-purple-50 text-purple-400 border-purple-200',
  RM: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  CM: 'bg-pink-50 text-pink-400 border-pink-200',
  IM: 'bg-red-50 text-red-400 border-red-200',
}

export const RANK_COLORS_STRONG = {
  NONE: 'bg-gray-500 text-white border-gray-600',
  CSM: 'bg-slate-500 text-white border-slate-700',
  SSM: 'bg-gray-500 text-white border-gray-700',
  SM: 'bg-blue-500 text-white border-blue-700',
  DM: 'bg-orange-500 text-white border-orange-700',
  SRM: 'bg-green-600 text-white border-green-800',
  STM: 'bg-purple-500 text-white border-purple-700',
  RM: 'bg-yellow-500 text-white border-yellow-700',
  CM: 'bg-pink-500 text-white border-pink-700',
  IM: 'bg-red-500 text-white border-red-700',
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
/**
 * 회원PV(몸PV) 입력란을 보여줄지 — **명목 직급** 기준으로 판단한다
 * (예전엔 목표 직급 기준이었다). 명목 직급이 정해지지 않았으면(undefined) NONE 취급.
 */
export function hasMemberPv(nominalRank) {
  return RANK_LEVEL[nominalRank ?? RANK_NONE] < RANK_LEVEL[MEMBER_PV_CEILING]
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
