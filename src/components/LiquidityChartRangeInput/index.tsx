import { Trans } from '@lingui/macro'
import { Pool } from '@muffinfi/muffin-sdk'
import { formatFeePercent } from '@muffinfi/utils/formatFeePercent'
import { Currency, Price, Token } from '@uniswap/sdk-core'
import { AutoColumn, ColumnCenter } from 'components/Column'
import Loader from 'components/Loader'
import { format } from 'd3'
import { useColor } from 'hooks/useColor'
import usePrevious from 'hooks/usePrevious'
import useTheme from 'hooks/useTheme'
import useTierColors from 'hooks/useTierColors'
import { saturate } from 'polished'
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart2, CloudOff, Inbox } from 'react-feather'
import ReactGA from 'react-ga'
import { batch } from 'react-redux'
import { Bound } from 'state/mint/v3/actions'
import styled from 'styled-components/macro'

import { ThemedText } from '../../theme'
import { Chart } from './Chart'
import { useDensityChartData } from './hooks'
import { ZoomLevels } from './types'
import { VisiblilitySelector } from './VisibilitySelector'

const SMALL_ZOOM_LEVEL: ZoomLevels = {
  initialMin: 1 / 1.001,
  initialMax: 1.001,
  min: 0.00001,
  max: 1.5,
}

const MEDIUM_ZOOM_LEVEL: ZoomLevels = {
  initialMin: 1 / 1.2,
  initialMax: 1.2,
  min: 0.00001,
  max: 20,
}

const LARGE_ZOOM_LEVEL: ZoomLevels = {
  initialMin: 1 / 2,
  initialMax: 2,
  min: 0.00001,
  max: 20,
}

const getZoomLevel = (tickSpacing?: number) => {
  if (tickSpacing == null) return LARGE_ZOOM_LEVEL
  return tickSpacing < 15 ? SMALL_ZOOM_LEVEL : tickSpacing < 50 ? MEDIUM_ZOOM_LEVEL : LARGE_ZOOM_LEVEL
}

const ChartWrapper = styled.div`
  position: relative;

  justify-content: center;
  align-content: center;
`

function InfoBox({ message, icon }: { message?: ReactNode; icon: ReactNode }) {
  return (
    <ColumnCenter style={{ height: '100%', justifyContent: 'center' }}>
      {icon}
      {message && (
        <ThemedText.MediumHeader padding={10} marginTop="20px" textAlign="center">
          {message}
        </ThemedText.MediumHeader>
      )}
    </ColumnCenter>
  )
}

export default function LiquidityChartRangeInput({
  currencyA,
  currencyB,
  pool,
  tierId,
  ticksAtLimit,
  price,
  priceLower,
  priceUpper,
  onLeftRangeInput,
  onRightRangeInput,
  interactive,
}: {
  currencyA: Currency | undefined
  currencyB: Currency | undefined
  pool: Pool | undefined
  tierId?: number
  ticksAtLimit: { [bound in Bound]?: boolean | undefined }
  price: number | undefined
  priceLower?: Price<Token, Token>
  priceUpper?: Price<Token, Token>
  onLeftRangeInput: (typedValue: string) => void
  onRightRangeInput: (typedValue: string) => void
  interactive: boolean
}) {
  const theme = useTheme()

  const tokenAColor = useColor(currencyA?.wrapped)
  const tokenBColor = useColor(currencyB?.wrapped)

  const previousTierId = usePrevious(tierId)

  const tierColors = useTierColors()

  const keys = useMemo(() => pool?.tiers.map((tier) => `${formatFeePercent(tier.feePercent)}%`) ?? [], [pool])
  const [hiddenKeyIndexes, setHiddenKeyIndexes] = useState<number[]>([])

  const isSorted = currencyA && currencyB && currencyA?.wrapped.sortsBefore(currencyB?.wrapped)

  const { isLoading, isUninitialized, isError, error, formattedData } = useDensityChartData({
    currencyA,
    currencyB,
    tierId,
  })

  const onBrushDomainChangeEnded = useCallback(
    (domain, mode) => {
      let leftRangeValue = Number(domain[0])
      const rightRangeValue = Number(domain[1])

      if (leftRangeValue <= 0) {
        leftRangeValue = 1 / 10 ** 6
      }

      batch(() => {
        // simulate user input for auto-formatting and other validations
        if (
          (!ticksAtLimit[isSorted ? Bound.LOWER : Bound.UPPER] || mode === 'handle' || mode === 'reset') &&
          leftRangeValue > 0
        ) {
          onLeftRangeInput(leftRangeValue.toFixed(6))
        }

        if ((!ticksAtLimit[isSorted ? Bound.UPPER : Bound.LOWER] || mode === 'reset') && rightRangeValue > 0) {
          // todo: remove this check. Upper bound for large numbers
          // sometimes fails to parse to tick.
          if (rightRangeValue < 1e35) {
            onRightRangeInput(rightRangeValue.toFixed(6))
          }
        }
      })
    },
    [isSorted, onLeftRangeInput, onRightRangeInput, ticksAtLimit]
  )

  interactive = interactive && Boolean(formattedData?.length)

  const brushDomain: [number, number] | undefined = useMemo(() => {
    const leftPrice = isSorted ? priceLower : priceUpper?.invert()
    const rightPrice = isSorted ? priceUpper : priceLower?.invert()

    return leftPrice && rightPrice
      ? [parseFloat(leftPrice?.toSignificant(6)), parseFloat(rightPrice?.toSignificant(6))]
      : undefined
  }, [isSorted, priceLower, priceUpper])

  const brushLabelValue = useCallback(
    (d: 'w' | 'e', x: number) => {
      if (!price) return ''

      if (d === 'w' && ticksAtLimit[isSorted ? Bound.LOWER : Bound.UPPER]) return '0'
      if (d === 'e' && ticksAtLimit[isSorted ? Bound.UPPER : Bound.LOWER]) return '∞'

      const percent = (x < price ? -1 : 1) * ((Math.max(x, price) - Math.min(x, price)) / price) * 100

      return price ? `${format(Math.abs(percent) > 1 ? '.2~s' : '.2~f')(percent)}%` : ''
    },
    [isSorted, price, ticksAtLimit]
  )

  const onToggleVisibility = useCallback((index: number) => {
    setHiddenKeyIndexes((preVal) => {
      const curIndex = preVal.findIndex((val) => val === index)
      if (curIndex < 0) {
        return [...preVal, index]
      }
      return preVal.filter((val) => val !== index)
    })
  }, [])

  if (isError) {
    ReactGA.exception({
      ...error,
      category: 'Liquidity',
      fatal: false,
    })
  }

  useEffect(() => {
    setHiddenKeyIndexes([])
  }, [keys])

  useEffect(() => {
    if (typeof tierId === 'number' && previousTierId !== tierId && hiddenKeyIndexes.includes(tierId)) {
      setHiddenKeyIndexes(hiddenKeyIndexes.filter((val) => val !== tierId))
    }
  }, [hiddenKeyIndexes, tierId, previousTierId])

  return (
    <AutoColumn gap="md" style={{ minHeight: '175px' }}>
      {isUninitialized ? (
        <InfoBox
          message={<Trans>Your position will appear here.</Trans>}
          icon={<Inbox size={56} stroke={theme.text1} />}
        />
      ) : isLoading ? (
        <InfoBox icon={<Loader size="40px" stroke={theme.text4} />} />
      ) : isError ? (
        <InfoBox
          message={<Trans>Liquidity data not available.</Trans>}
          icon={<CloudOff size={56} stroke={theme.text4} />}
        />
      ) : !formattedData || formattedData === [] || !price ? (
        <InfoBox
          message={<Trans>There is no liquidity data.</Trans>}
          icon={<BarChart2 size={56} stroke={theme.text4} />}
        />
      ) : (
        <>
          <ChartWrapper>
            <Chart
              data={{ series: formattedData, current: price }}
              keys={keys}
              hiddenKeyIndexes={hiddenKeyIndexes}
              selectedKeyIndex={tierId}
              dimensions={{ width: 400, height: 175 }}
              margins={{ top: 10, right: 2, bottom: 20, left: 0 }}
              styles={{
                area: {
                  colors: tierColors,
                },
                brush: {
                  handle: {
                    west: saturate(0.1, tokenAColor) ?? theme.red1,
                    east: saturate(0.1, tokenBColor) ?? theme.blue1,
                  },
                },
              }}
              interactive={interactive}
              brushLabels={brushLabelValue}
              brushDomain={brushDomain}
              onBrushDomainChange={onBrushDomainChangeEnded}
              zoomLevels={getZoomLevel(pool?.tickSpacing)}
              ticksAtLimit={ticksAtLimit}
            />
          </ChartWrapper>
          {keys.length > 1 && (
            <VisiblilitySelector
              options={keys}
              hiddenOptionsIndexes={hiddenKeyIndexes}
              selectedKeyIndex={tierId}
              onToggleOption={onToggleVisibility}
              colors={tierColors}
            />
          )}
        </>
      )}
    </AutoColumn>
  )
}
