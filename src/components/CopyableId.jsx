import { useEffect, useRef, useState } from 'react'
import { Copy, Check } from 'lucide-react'

/** clipboard API 를 못 쓰는 환경(비보안 컨텍스트 등)을 위한 대체 복사 */
function fallbackCopy(text) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    return true
  } catch {
    return false
  } finally {
    ta.remove()
  }
}

/** 회원 ID + 오른쪽 복사 아이콘. 아이콘을 누르면 ID 가 클립보드에 복사된다. */
export default function CopyableId({ value, size = 'sm' }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)
  const id = (value ?? '').trim()

  useEffect(() => () => clearTimeout(timerRef.current), [])

  async function handleCopy(e) {
    e.stopPropagation()
    if (!id) return
    let ok = false
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(id)
        ok = true
      } else {
        ok = fallbackCopy(id)
      }
    } catch {
      ok = fallbackCopy(id)
    }
    if (!ok) return
    setCopied(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 1200)
  }

  // 'name' 은 카드의 이름줄과 같은 크기·굵기 — ID 를 이름만큼 또렷하게 보여줄 때 쓴다
  const STYLE = {
    sm: { text: 'text-[9px]', weight: '', icon: 9 },
    md: { text: 'text-[10px]', weight: '', icon: 10 },
    name: { text: 'text-xs', weight: 'font-bold', icon: 11 },
  }
  const { text: textClass, weight, icon: iconSize } = STYLE[size] ?? STYLE.sm

  return (
    <div className={`flex items-center justify-center gap-0.5 ${textClass} ${weight} text-gray-500`}>
      <span className="truncate">{id || 'ID 없음'}</span>
      {id && (
        <button
          type="button"
          onClick={handleCopy}
          className={`flex-shrink-0 rounded p-0.5 transition-colors ${
            copied ? 'text-emerald-600' : 'text-gray-400 hover:bg-black/5 hover:text-gray-700'
          }`}
          title={copied ? '복사됨' : 'ID 복사'}
          aria-label={copied ? 'ID 복사됨' : 'ID 복사'}
        >
          {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
        </button>
      )}
    </div>
  )
}
