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
