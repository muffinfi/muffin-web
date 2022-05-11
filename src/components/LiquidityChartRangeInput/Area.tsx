import { area, curveStepAfter, ScaleLinear, select, Series } from 'd3'
import usePrevious from 'hooks/usePrevious'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components/macro'
import filterTicksLiquidityData from 'utils/filterTicksLiquidityData'

const Path = styled.path<{ fill: string | undefined }>`
  opacity: 0.5;
  stroke: ${({ fill, theme }) => fill ?? theme.blue2};
  fill: ${({ fill, theme }) => fill ?? theme.blue2};
`

const AnimatedPath = ({ animate, d, fill, hidden }: { animate?: boolean; d: any; fill?: string; hidden?: boolean }) => {
  const ref = useRef<SVGPathElement>(null)
  const [didMount, setDidMount] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const element = select(ref.current)
    if (!animate || !didMount) {
      element.attr('d', d)
      element.style('opacity', hidden ? 0 : 1)
      if (!didMount) setDidMount(true)
      return
    }
    element
      .transition()
      .attr('d', d)
      .style('opacity', hidden ? 0 : 1)
    // cleanup by ending transitions
    return () => {
      element.interrupt()
    }
  }, [didMount, d, animate, hidden])

  return <Path ref={ref} fill={fill} />
}

export const Area = ({
  stackedData,
  selectedKeyIndex,
  hiddenKeyIndexes,
  xScale,
  yScale,
  colors,
}: {
  stackedData: Series<{ [key: string]: number }, string>[]
  selectedKeyIndex?: number
  hiddenKeyIndexes: number[]
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
  colors: (string | undefined)[]
}) => {
  const previousSelectedKeyIndex = usePrevious(selectedKeyIndex)
  const previousXScale = usePrevious(xScale)

  return useMemo(
    () => (
      <>
        {stackedData.map((data, index) => {
          const iterator = filterTicksLiquidityData(data, xScale)
          return (
            <AnimatedPath
              fill={colors[index % colors.length]}
              key={data.key}
              animate={previousSelectedKeyIndex === selectedKeyIndex && previousXScale === xScale}
              hidden={hiddenKeyIndexes.includes(index)}
              d={
                (iterator &&
                  area()
                    .curve(curveStepAfter)
                    .x((d: any) => xScale(d.data.price0))
                    .y0((d: any) => yScale(d[0]))
                    .y1((d: any) => yScale(d[1]))(iterator)) ??
                undefined
              }
            />
          )
        })}
      </>
    ),
    [stackedData, colors, previousSelectedKeyIndex, selectedKeyIndex, previousXScale, xScale, hiddenKeyIndexes, yScale]
  )
}
