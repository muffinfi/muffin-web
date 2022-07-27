import * as d3 from 'd3'
import { memo, useLayoutEffect, useRef } from 'react'
import styled from 'styled-components/macro'

const StyledG = styled.g`
  text {
    font-size: 11px;
  }
`

export const XAxis = memo(function XAxis({ x }: { x: d3.ScaleLinear<number, number> }) {
  const ref = useRef<SVGGElement | null>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    d3.select(ref.current).call(d3.axisBottom(x).ticks(7).tickSizeOuter(0))
  }, [x])

  return <StyledG ref={ref} color="var(--text2)" />
})
