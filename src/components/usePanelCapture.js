/**
 * 계보도 패널 하나를 그림(JPG)·인쇄로 뽑아낸다 — 좌/우 두 패널이 함께 쓴다.
 *
 * 두 경우 모두 팬/줌 변형과 스크롤 잘림을 잠시 걷어내고 원본 크기로 되돌린 뒤 찍는다.
 * 인쇄는 대상 패널에만 `print-target` 을 붙여, 인쇄 CSS 가 그 패널만 남기게 한다.
 */
export function usePanelCapture({ panelRef, containerRef, innerRef, imageName }) {
  async function saveImage() {
    const inner = innerRef.current
    const container = containerRef.current
    if (!inner || !container) return

    const prevTransform = inner.style.transform
    const prevOverflow = container.style.overflow
    inner.style.transform = 'none'
    container.style.overflow = 'visible'
    // 대상 기간 머리글은 평소 숨겨져 있다 — 크기를 재기 전에 먼저 띄운다
    document.body.classList.add('capture-mode')
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    try {
      const { toJpeg } = await import('html-to-image')
      const dataUrl = await toJpeg(inner, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
        quality: 0.92,
        width: inner.scrollWidth,
        height: inner.scrollHeight,
      })
      const a = document.createElement('a')
      a.download = imageName
      a.href = dataUrl
      a.click()
    } catch (e) {
      alert('이미지 저장 실패: ' + e.message)
    } finally {
      document.body.classList.remove('capture-mode')
      inner.style.transform = prevTransform
      container.style.overflow = prevOverflow
    }
  }

  function print() {
    const panel = panelRef.current
    if (!panel) return
    panel.classList.add('print-target')
    document.body.classList.add('print-panel-mode')
    const cleanup = () => {
      panel.classList.remove('print-target')
      document.body.classList.remove('print-panel-mode')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  return { saveImage, print }
}
