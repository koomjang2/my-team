import { useState } from 'react'

/**
 * PV 입력칸 — 0 이 남아 방해하지 않는 숫자 입력.
 *
 * `<input type="number" value={0}>` 를 그냥 쓰면 터치해서 10 을 치면 `100` 또는
 * `010` 이 된다. 그래서 값이 0 일 때만 칸을 비워 두고, 다 지우고 빠져나가면
 * 다시 0 으로 되돌린다. 0 이 아닌 값은 손대지 않는다 — 이어서 고칠 수 있어야 한다.
 */
export default function NumberField({ value, onChange, className = '', ...rest }) {
  const [draft, setDraft] = useState(null) // 편집 중일 때만 문자열을 들고 있는다

  const shown = draft ?? String(value ?? 0)

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      className={className}
      value={shown}
      onFocus={() => setDraft(Number(value ?? 0) === 0 ? '' : String(value))}
      onChange={(e) => {
        setDraft(e.target.value)
        onChange(Number(e.target.value) || 0)
      }}
      onBlur={() => {
        setDraft(null) // 빈 칸으로 두고 나가면 다시 0 이 보인다
        onChange(Number(value) || 0)
      }}
      {...rest}
    />
  )
}
