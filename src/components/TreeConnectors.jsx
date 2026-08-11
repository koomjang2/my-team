/** 부모 카드 아래에서 좌/우 자식으로 뻗는 연결선 */
export default function TreeConnectors({ row, height = 12 }) {
  const { hasLeft, hasRight, childRowWidth, leftCenterX, rightCenterX } = row
  return (
    <>
      <div className="w-px bg-gray-400" style={{ height }} />
      <div className="relative" style={{ width: childRowWidth, height }}>
        {hasLeft && hasRight && (
          <>
            <div className="absolute bg-gray-400" style={{ top: 0, left: leftCenterX, width: rightCenterX - leftCenterX, height: 2 }} />
            <div className="absolute w-px bg-gray-400" style={{ top: 0, left: leftCenterX, height }} />
            <div className="absolute w-px bg-gray-400" style={{ top: 0, left: rightCenterX, height }} />
          </>
        )}
        {hasLeft && !hasRight && (
          <>
            <div className="absolute bg-gray-400" style={{ top: 0, left: leftCenterX, width: childRowWidth / 2 - leftCenterX, height: 2 }} />
            <div className="absolute w-px bg-gray-400" style={{ top: 0, left: leftCenterX, height }} />
          </>
        )}
        {!hasLeft && hasRight && (
          <>
            <div className="absolute bg-gray-400" style={{ top: 0, left: childRowWidth / 2, width: rightCenterX - childRowWidth / 2, height: 2 }} />
            <div className="absolute w-px bg-gray-400" style={{ top: 0, left: rightCenterX, height }} />
          </>
        )}
      </div>
    </>
  )
}
