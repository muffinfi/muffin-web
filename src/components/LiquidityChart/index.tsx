import { Trans } from '@lingui/macro'
import { PoolState } from '@muffinfi/hooks/usePools'
import { priceToNumber } from '@muffinfi/muffin-sdk'
import { formatFeePercent } from '@muffinfi/utils/formatFeePercent'
import { getPriceRangeWithTokenRatio } from '@muffinfi/utils/getPriceRangeWithTokenRatio'
import * as M from '@muffinfi-ui'
import { Currency, Price, Token } from '@uniswap/sdk-core'
import Loader from 'components/Loader'
import * as d3 from 'd3'
import { useColor } from 'hooks/useColor'
import useTierColors from 'hooks/useTierColors'
import { saturate } from 'polished'
import { ReactNode, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { BarChart2, CloudOff, Inbox } from 'react-feather'
import { batch } from 'react-redux'
import styled from 'styled-components/macro'

import { Chart } from './Chart'
import { useIsChanging } from './hooks/useIsChanging'
import { useLiquidityChartData } from './hooks/useLiquidityChartData'
import { VisiblilitySelector } from './periphery/VisibilitySelector'
import { ZoomControl } from './periphery/ZoomControl'
import { toFixed } from './utils/processData'
import { HandleType, ZoomLevel } from './utils/types'

const SIZE = {
  width: 464,
  height: 200,
  margin: { top: 0, right: 0, bottom: 25, left: 0 },
}

const SMALL_ZOOM_LEVEL: ZoomLevel = {
  initialMin: 1 / 1.001,
  initialMax: 1.001,
  min: 1e-45, // 0.00001,
  max: 1.5,
}

const MEDIUM_ZOOM_LEVEL: ZoomLevel = {
  initialMin: 1 / 1.2,
  initialMax: 1.2,
  min: 1e-45, // 0.00001,
  max: 20,
}

const LARGE_ZOOM_LEVEL: ZoomLevel = {
  initialMin: 1 / 2,
  initialMax: 2,
  min: 1e-45, // 0.00001,
  max: 20,
}

const getZoomLevel = (tickSpacing?: number) => {
  if (tickSpacing == null) return LARGE_ZOOM_LEVEL
  return tickSpacing < 15 ? SMALL_ZOOM_LEVEL : tickSpacing < 50 ? MEDIUM_ZOOM_LEVEL : LARGE_ZOOM_LEVEL
}

const InfoBox = ({ message, icon }: { message?: ReactNode; icon: ReactNode }) => (
  <M.ColumnCenter gap="8px">
    <M.Text color="placeholder-text">{icon}</M.Text>
    {message && (
      <M.Text weight="medium" size="lg" color="text2">
        {message}
      </M.Text>
    )}
  </M.ColumnCenter>
)

const Wrapper = styled(M.Column)`
  min-height: 180px;
  align-items: stretch;
  justify-content: center;
  position: relative;
`

const brushKeyToFieldKey: Record<HandleType, 'LOWER' | 'UPPER'> = {
  e: 'LOWER',
  w: 'UPPER',
}

export const LiquidityChart = ({
  currencyBase,
  currencyQuote,
  tierId,
  priceLower,
  priceUpper,
  onLeftRangeInput,
  weightLockedCurrencyBase,
  onRightRangeInput,
  setIndependentRangeField,
  resetRangeNonce,
}: {
  currencyBase: Currency | undefined
  currencyQuote: Currency | undefined
  tierId: number | undefined
  priceLower: Price<Token, Token> | undefined
  priceUpper: Price<Token, Token> | undefined
  weightLockedCurrencyBase: number | undefined
  onLeftRangeInput: (typedValue: string) => void
  onRightRangeInput: (typedValue: string) => void
  setIndependentRangeField: (field: 'LOWER' | 'UPPER') => void
  resetRangeNonce?: any
}) => {
  const tokenAColor = useColor(currencyBase?.wrapped)
  const tokenBColor = useColor(currencyQuote?.wrapped)
  const tierColors = useTierColors()

  const { invertPrice, queryState, priceLiquidityDataList, poolState, pool } = useLiquidityChartData(
    currencyBase,
    currencyQuote
  )

  const priceCurrent = useMemo(() => {
    if (!pool || tierId == null) return undefined
    // Fallback the first tier's price if tier is not found (i.e. creating tier)
    const token0Price = (pool.tiers[tierId] ?? pool.tiers[0])?.token0Price
    if (!token0Price) return undefined
    return priceToNumber(invertPrice ? token0Price.invert() : token0Price)
  }, [pool, tierId, invertPrice])

  const onSelectedRangeChange = useCallback(
    (rawRange: [number, number] | null, lastMovingHandle: HandleType | undefined) => {
      batch(() => {
        if (lastMovingHandle) setIndependentRangeField(brushKeyToFieldKey[lastMovingHandle])
        onLeftRangeInput(rawRange ? toFixed(Math.max(rawRange[0], MIN_PRICE_INPUT)) : '')
        onRightRangeInput(rawRange ? toFixed(Math.max(rawRange[1], MIN_PRICE_INPUT)) : '')
      })
    },
    [onLeftRangeInput, onRightRangeInput, setIndependentRangeField]
  )

  const getHandleLabelText = useCallback(
    (rawRange: [number, number] | null): [string, string] => {
      if (!priceCurrent || !rawRange) return ['', '']
      return rawRange.map((price) => {
        const percent = ((price - priceCurrent) / priceCurrent) * 100
        return `${d3.format(Math.abs(percent) > 1 ? '.2~s' : '.2~f')(percent)}%`
      }) as [string, string]
    },
    [priceCurrent]
  )

  const [hideTiers, setHideTiers] = useState<Record<number, boolean>>({})
  const onToggleTierVisibility = useCallback((i: number) => setHideTiers((state) => ({ ...state, [i]: !state[i] })), [])

  const priceRange = useMemo(() => {
    return priceLower && priceUpper
      ? ([priceToNumber(priceLower), priceToNumber(priceUpper)] as [number, number])
      : null
  }, [priceLower, priceUpper])

  const [zoomInNonce, zoomIn] = useReducer((x) => (x + 1) % Number.MAX_SAFE_INTEGER, 0)
  const [zoomOutNonce, zoomOut] = useReducer((x) => (x + 1) % Number.MAX_SAFE_INTEGER, 0)
  const [zoomToFitRangeNonce, zoomToFitRange] = useReducer((x) => (x + 1) % Number.MAX_SAFE_INTEGER, 0)

  const resetRange = useCallback(() => {
    if (priceCurrent != null) {
      const zoomLevel = getZoomLevel(pool?.tickSpacing)
      onSelectedRangeChange([priceCurrent * zoomLevel.initialMin, priceCurrent * zoomLevel.initialMax], undefined)
    }
  }, [priceCurrent, pool?.tickSpacing, onSelectedRangeChange])

  /**
   * Reset range if requested or if the bases or selected tier change
   */
  const poolIdChanged = useIsChanging(pool?.poolId)
  const tierIdChanged = useIsChanging(tierId)
  const resetRangeNonceChanged = useIsChanging(resetRangeNonce)
  useEffect(() => {
    if (!poolIdChanged && !tierIdChanged && !resetRangeNonceChanged) return
    resetRange()
    setHideTiers({})
    const id = setTimeout(() => zoomToFitRange(), 100) // delay to let range reset first before zoom
    return () => clearTimeout(id)
  }, [poolIdChanged, tierIdChanged, resetRangeNonceChanged, resetRange])

  const sqrtGammas = useMemo(() => pool?.tiers.map((tier) => `${formatFeePercent(tier.feePercent)}%`) ?? [], [pool])

  /**
   * If user locked a desired token weight, we need to compute a correct price range when user is brushing.
   * Note that when brushing, the `range` given from the brush event is NOT necessarily equal to what is displayed on the screen.
   */
  const getNewRangeWhenBrushing = useCallback(
    (range: [number, number], movingHandle: HandleType | undefined): [number, number] | undefined => {
      if (priceCurrent == null || movingHandle == null || weightLockedCurrencyBase == null) return undefined
      return getPriceRangeWithTokenRatio(
        priceCurrent,
        range[0],
        range[1],
        brushKeyToFieldKey[movingHandle],
        weightLockedCurrencyBase
      )
    },
    [priceCurrent, weightLockedCurrencyBase]
  )

  return (
    <Wrapper>
      {queryState.isUninitialized || tierId == null ? (
        <InfoBox message={<Trans>Liquidity chart will appear here.</Trans>} icon={<Inbox size={56} />} />
      ) : queryState.isLoading || poolState === PoolState.LOADING || !pool || priceCurrent == null ? (
        <InfoBox icon={<Loader size="40px" stroke="currentColor" />} />
      ) : queryState.isError ? (
        <InfoBox message={<Trans>There is no liquidity data.</Trans>} icon={<BarChart2 size={56} />} />
      ) : !priceLiquidityDataList ? (
        <InfoBox message={<Trans>Liquidity data not available.</Trans>} icon={<CloudOff size={56} />} />
      ) : (
        <div>
          <ZoomControl
            zoomIn={zoomIn}
            zoomOut={zoomOut}
            zoomToFitSelectedRange={zoomToFitRange}
            resetRange={resetRange}
            showResetButton={false} // NOTE: disabled reset range button
          />
          <div style={{ height: 12 }} />
          <Chart
            size={SIZE}
            zoomLevel={getZoomLevel(pool.tickSpacing)}
            dataList={priceLiquidityDataList}
            midPoint={priceCurrent}
            hideData={hideTiers}
            snappedSelectedRange={priceRange}
            handleSelectedRangeChange={onSelectedRangeChange}
            getNewRangeWhenBrushing={getNewRangeWhenBrushing}
            zoomInNonce={zoomInNonce}
            zoomOutNonce={zoomOutNonce}
            zoomToFitSelectedRangeNonce={zoomToFitRangeNonce}
            getHandleLabelText={getHandleLabelText}
            areaColors={tierColors}
            brushHandleColors={{
              w: saturate(0.1, tokenAColor) ?? '#DA2D2B',
              e: saturate(0.1, tokenBColor) ?? '#0068FC',
            }}
          />
          <div style={{ height: 8 }} />
          {sqrtGammas.length > 1 && (
            <VisiblilitySelector
              displayTexts={sqrtGammas}
              colors={tierColors}
              isHidden={hideTiers}
              onToggleVisibility={onToggleTierVisibility}
            />
          )}
        </div>
      )}
    </Wrapper>
  )
}

const MIN_PRICE_INPUT = 1e-35
