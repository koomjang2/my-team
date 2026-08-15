import { useEffect, useRef } from 'react'
import { HOTKEY_CODE_TO_RANK, HOTKEY_KEY_TO_RANK } from '../engine/ranks.js'

// 한글 자판에서 Q·W 자리에 찍히는 글자 — `code` 를 못 받는 경우의 뒷받침
const ADD_LEFT_KEYS = new Set(['q', 'Q', 'ㅂ', 'ㅃ'])
const ADD_RIGHT_KEYS = new Set(['w', 'W', 'ㅈ', 'ㅉ'])

/**
 * 지금 커서가 글자를 치는 칸에 들어가 있는가.
 * 여기 커서가 있으면 단축키를 잡지 않는다 — '2' 를 치면 직급이 아니라 글자여야 한다.
 */
export function isTypingTarget(el) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true
}

/**
 * 회원 하나가 열려 있는 동안(편집창 또는 직급 고르기 목록) 창 전체의 키를 듣는다.
 *
 *   esc      → 닫기. 글자 칸에 커서가 있어도 듣는다.
 *   ` 1~8    → 목표 직급 (CSM · SSM~IM)
 *   Q / W    → 좌 · 우 하위 추가
 *
 * esc 를 뺀 나머지는 커서가 글자 칸에 없을 때만 듣는다.
 */
export function useEditorHotkeys({ enabled = true, onClose, onPickRank, onAddLeft, onAddRight }) {
  // 부모가 인라인 함수를 넘겨도 매 렌더마다 리스너를 다시 달지 않도록 최신 것만 담아 둔다
  const handlers = useRef({})
  handlers.current = { onClose, onPickRank, onAddLeft, onAddRight }

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(e) {
      const h = handlers.current
      if (e.key === 'Escape') {
        e.preventDefault()
        h.onClose?.()
        return
      }
      // 조합키는 브라우저·OS 몫으로 넘긴다
      if (e.altKey || e.ctrlKey || e.metaKey) return
      // 한글 조합 중(IME)에는 키가 확정된 것이 아니라 건드리지 않는다
      if (e.isComposing || e.keyCode === 229) return
      if (isTypingTarget(document.activeElement)) return

      const rank = HOTKEY_CODE_TO_RANK[e.code] ?? HOTKEY_KEY_TO_RANK[e.key]
      if (rank) {
        e.preventDefault()
        h.onPickRank?.(rank)
        return
      }
      if (e.code === 'KeyQ' || ADD_LEFT_KEYS.has(e.key)) {
        e.preventDefault()
        h.onAddLeft?.()
        return
      }
      if (e.code === 'KeyW' || ADD_RIGHT_KEYS.has(e.key)) {
        e.preventDefault()
        h.onAddRight?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}

/**
 * 글자 칸에서 엔터를 치면 입력을 끝내고 커서를 뺀다.
 *
 * 커서가 칸에 남아 있으면 단축키를 잡지 않으므로(`isTypingTarget`), 이름을 다 치고
 * 바로 ` 1~8 로 목표 직급을 고를 수가 없었다. 엔터가 그 사이를 끊어 준다.
 * 편집창은 닫지 않는다 — 이어서 다른 칸을 고칠 수 있어야 한다.
 *
 * 한글 조합 중의 엔터는 조합을 확정하는 키다. 그때는 그냥 흘려보내고,
 * 확정된 뒤 한 번 더 누른 엔터에서 커서가 빠진다.
 * React 의 합성 이벤트에는 `isComposing` 이 없다 — 원본 이벤트에서 한 번 더 본다.
 */
export function commitOnEnter(e) {
  if (e.key !== 'Enter') return
  if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229) return
  e.preventDefault()
  e.currentTarget.blur()
}
