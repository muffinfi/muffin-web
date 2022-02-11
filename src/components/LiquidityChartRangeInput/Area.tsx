import { area, curveStepAfter, ScaleLinear, Series } from 'd3'
import React, { useMemo } from 'react'
import styled from 'styled-components/macro'

const Path = styled.path<{ fill: string | undefined }>`
  opacity: 0.5;
  stroke: ${({ fill, theme }) => fill ?? theme.blue2};
  fill: ${({ fill, theme }) => fill ?? theme.blue2};
`

export const Area = ({
  stackedData,
  keys,
  selectedKey,
  xScale,
  yScale,
  fill,
}: {
  stackedData: Series<{ [key: string]: number }, string>[]
  keys: string[]
  selectedKey?: string
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
  fill?: string | undefined
}) =>
  useMemo(
    () => (
      <>
        {stackedData.map((data) => (
          <Path
            fill={data.key === selectedKey ? undefined : fill}
            key={data.key}
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
    [fill, selectedKey, stackedData, xScale, yScale]
  )
