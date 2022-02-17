import { area, curveStepAfter, ScaleLinear, select, Series } from 'd3'
import usePrevious from 'hooks/usePrevious'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components/macro'

const Path = styled.path<{ fill: string | undefined }>`
  opacity: 0.5;
  stroke: ${({ fill, theme }) => fill ?? theme.blue2};
  fill: ${({ fill, theme }) => fill ?? theme.blue2};
`

const AnimatedPath = ({ animate, d, fill }: { animate?: boolean; d: any; fill?: string }) => {
  const ref = useRef<SVGPathElement>(null)
  const [didMount, setDidMount] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const element = select(ref.current)
    if (!animate || !didMount) {
      element.attr('d', d)
      if (!didMount) setDidMount(true)
      return
    }
    element.transition().attr('d', d)
    // cleanup by ending transitions
    return () => {
      element.interrupt()
    }
  }, [didMount, d, animate])

  return <Path ref={ref} fill={fill} />
}

export const Area = ({
  stackedData,
  keys,
  selectedKeyIndex,
  xScale,
  yScale,
  fill,
  colors,
}: {
  stackedData: Series<{ [key: string]: number }, string>[]
  keys: string[]
  selectedKeyIndex?: number
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
  fill?: string | undefined
  colors: string[]
}) => {
  const previousSelectedKeyIndex = usePrevious(selectedKeyIndex)
  const previousXScale = usePrevious(xScale)

  return useMemo(
    () => (
      <>
        {stackedData.map((data, index) => (
          <AnimatedPath
            fill={
              typeof selectedKeyIndex !== 'undefined' && data.key === keys[selectedKeyIndex]
                ? undefined
                : colors[(selectedKeyIndex ?? -1) > index ? index : index - 1]
            }
            key={data.key}
            animate={previousSelectedKeyIndex === selectedKeyIndex && previousXScale === xScale}
            d={
              area()
                .curve(curveStepAfter)
                .x((d: any) => xScale(d.data.price0))
                .y0((d: any) => yScale(d[0]))
                .y1((d: any) => yScale(d[1]))(
                data.filter((d) => {
                  const value = xScale(d.data.price0)
                  return value > 0 && value <= window.innerWidth
                }) as Iterable<[number, number]>
              ) ?? undefined
            }
          />
        ))}
      </>
    ),
    [stackedData, selectedKeyIndex, keys, colors, previousSelectedKeyIndex, previousXScale, xScale, yScale]
  )
}
