import { Trans } from '@lingui/macro'
import { Pool } from '@muffinfi/muffin-sdk'
import * as M from '@muffinfi-ui'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { atom, useAtom, useAtomValue } from 'jotai'
import { memo, useMemo } from 'react'
import { usePoolTierFeeGrowthQuery } from 'state/data/enhanced'
import { PoolTierFeeGrowthQuery } from 'state/data/generated'

enum RatePeriod {
  ANNUAL = 'annual',
  MONTHLY = 'monthly',
  DAILY = 'daily',
}

const ratePeriodAtom = atom(RatePeriod.ANNUAL)

export const RatePeriodToggle = memo(function RatePeriodToggle() {
  const [ratePeriod, setRatePeriod] = useAtom(ratePeriodAtom)
  return (
    <M.TextContents size="xs">
      <M.Toggle $size="sm" $variant="primary">
        <M.ToggleElement $active={ratePeriod === RatePeriod.ANNUAL} onClick={() => setRatePeriod(RatePeriod.ANNUAL)}>
          <Trans>Annual</Trans>
        </M.ToggleElement>
        <M.ToggleElement $active={ratePeriod === RatePeriod.MONTHLY} onClick={() => setRatePeriod(RatePeriod.MONTHLY)}>
          <Trans>Monthly</Trans>
        </M.ToggleElement>
        <M.ToggleElement $active={ratePeriod === RatePeriod.DAILY} onClick={() => setRatePeriod(RatePeriod.DAILY)}>
          <Trans>Daily</Trans>
        </M.ToggleElement>
      </M.Toggle>
    </M.TextContents>
  )
})

export const RateHelpText = memo(function RateHelpText() {
  const ratePeriod = useAtomValue(ratePeriodAtom)

  const more = (
    <M.ExternalLink
      href="https://resources.muffin.fi/position-apr/"
      weight="semibold"
      color="text1"
      hoverColor="text2"
      style={{ textDecoration: 'underline' }}
    >
      Learn about the math.
    </M.ExternalLink>
  )

  return (
    <span>
      {ratePeriod === RatePeriod.ANNUAL ? (
        <Trans>Estimated returns based on yesterday 24hr trade fees, projected to a year.</Trans>
      ) : ratePeriod === RatePeriod.MONTHLY ? (
        <Trans>Estimated returns based on yesterday 24hr trade fees, projected to a month.</Trans>
      ) : ratePeriod === RatePeriod.DAILY ? (
        <Trans>Estimated returns based on yesterday 24hr trade fees.</Trans>
      ) : null}
      <br />
      <br />
      <Trans>
        This value does not include the risk of divergence loss (IL), and assumes the position is &ldquo;in-range&rdquo;
        all the time.
      </Trans>{' '}
      {more}
    </span>
  )
})

export const RateName = memo(function RateName() {
  const ratePeriod = useAtomValue(ratePeriodAtom)
  if (ratePeriod === RatePeriod.ANNUAL) return <Trans>APR</Trans>
  if (ratePeriod === RatePeriod.MONTHLY) return <Trans>Monthly Rate</Trans>
  if (ratePeriod === RatePeriod.DAILY) return <Trans>Daily Rate</Trans>
  return null
})

/**
 * Show APR (or rate in other period).
 */
export const Rate = memo(function Rate({
  pool,
  tierId,
  capitalEfficiency,
}: {
  pool: Pool | undefined
  tierId: number | undefined
  capitalEfficiency: number | undefined
}) {
  // get all tier's fee growth from subgraph
  const { isLoading, data } = usePoolTierFeeGrowthQuery(pool ? { pool: pool.poolId } : skipToken)
  const result = data as PoolTierFeeGrowthQuery | undefined

  // get fee growth of the specified tier
  const tierData = useMemo(() => result?.tiers.find((tier) => tier.tierId === tierId), [result, tierId])

  // calculate liquidity growth per unit of liquidity per day
  const liquidityGrowthDaily = useMemo(() => {
    const today = Math.floor(Date.now() / 1000 / 86400) * 86400

    // find yesterday data and the data right before yesterday
    const i = tierData?.tierDayData.findIndex((data) => data.date === today - 86400)
    const dataYtd = i != null ? tierData?.tierDayData[i] : undefined
    const dataDayBeforeYtd = i != null ? tierData?.tierDayData[i + 1] : undefined //

    if (dataYtd && dataDayBeforeYtd && tierData?.sqrtPrice) {
      const feeGrowthGlobal0Delta = (+dataYtd.feeGrowthGlobal0X64 - +dataDayBeforeYtd.feeGrowthGlobal0X64) / 2 ** 64
      const feeGrowthGlobal1Delta = (+dataYtd.feeGrowthGlobal1X64 - +dataDayBeforeYtd.feeGrowthGlobal1X64) / 2 ** 64

      // convert feeGrowth into liquidityGrowth
      const sqrtPrice = tierData.sqrtPrice / 2 ** 72
      const liquidityGrowth0 = (feeGrowthGlobal0Delta * sqrtPrice) / 2
      const liquidityGrowth1 = feeGrowthGlobal1Delta / (2 * sqrtPrice)
      return liquidityGrowth0 + liquidityGrowth1
    }

    return undefined
  }, [tierData])

  const notEnoughData = tierData == null || liquidityGrowthDaily == null // due to either new pool or zero swaps yesterday

  const ratePeriod = useAtomValue(ratePeriodAtom)

  // projected the daily number to other period
  const liquidityGrowth =
    liquidityGrowthDaily != null
      ? liquidityGrowthDaily * (ratePeriod === RatePeriod.ANNUAL ? 365 : ratePeriod === RatePeriod.MONTHLY ? 30 : 1)
      : undefined

  // make sure capitial efficiency is valid
  const sanitizedCE =
    capitalEfficiency != null && Number.isFinite(capitalEfficiency) && capitalEfficiency > 0
      ? capitalEfficiency
      : undefined

  if (isLoading) {
    return <>-</>
  }
  if (notEnoughData) {
    return (
      <M.Text color="placeholder-text" size="xs">
        <Trans>Not enough data</Trans>
      </M.Text>
    )
  }
  if (liquidityGrowth == null || sanitizedCE == null) {
    return <>-</>
  }
  return (
    <>
      <M.Text color="text2" size="xs">
        {formatPercent(liquidityGrowth * 100)}% * {sanitizedCE.toFixed(2)} ={' '}
      </M.Text>
      {formatPercent(liquidityGrowth * sanitizedCE * 100)}%
    </>
  )
})

const formatPercent = (x: number) => {
  if (x < 1) return `${x.toLocaleString(undefined, { maximumSignificantDigits: 2, useGrouping: false })}`
  if (x < 10) return `${x.toLocaleString(undefined, { maximumFractionDigits: 2, useGrouping: false })}`
  return `${x.toLocaleString(undefined, { maximumFractionDigits: 1, useGrouping: false })}`
}
