import { Trans } from '@lingui/macro'
import { Position } from '@muffinfi/muffin-sdk'
import { formatTokenBalance } from '@muffinfi/utils/formatTokenBalance'
import * as M from '@muffinfi-ui'
import { Currency } from '@uniswap/sdk-core'
import RangeBadge from 'components/Badge/RangeBadge'
import { LightCard } from 'components/Card'
import CurrencyLogo from 'components/CurrencyLogo'
import RateToggle from 'components/RateToggle'
import JSBI from 'jsbi'
import { ReactNode, useCallback, useState } from 'react'
import { Bound } from 'state/mint/v3/actions'
import { formatTickPrice } from 'utils/formatTickPrice'
import { unwrappedToken } from 'utils/unwrappedToken'

export const PositionPreview = ({
  position,
  title,
  inRange,
  baseCurrencyDefault,
  ticksAtLimit,
}: {
  position: Position
  title?: ReactNode
  inRange: boolean
  baseCurrencyDefault?: Currency | undefined
  ticksAtLimit: { [key in Bound]?: boolean | undefined }
}) => {
  const currency0 = unwrappedToken(position.pool.token0)
  const currency1 = unwrappedToken(position.pool.token1)

  // track which currency should be base
  // prettier-ignore
  const [baseCurrency, setBaseCurrency] = useState(
    baseCurrencyDefault
      ? baseCurrencyDefault === currency0 ? currency0 :
        baseCurrencyDefault === currency1 ? currency1 : currency0
      : currency0
  )

  const sorted = baseCurrency === currency0
  const quoteCurrency = sorted ? currency1 : currency0

  const price = sorted
    ? position.poolTier.priceOf(position.pool.token0)
    : position.poolTier.priceOf(position.pool.token1)

  const priceLower = sorted ? position.token0PriceLower : position.token0PriceUpper.invert()
  const priceUpper = sorted ? position.token0PriceUpper : position.token0PriceLower.invert()

  const handleRateChange = useCallback(() => {
    setBaseCurrency(quoteCurrency)
  }, [quoteCurrency])

  const removed = position?.liquidity && JSBI.equal(position.liquidity, JSBI.BigInt(0))

  return (
    <M.Column stretch gap="24px">
      <M.RowBetween gap="1em" wrap="wrap">
        <M.TextContents size="lg" weight="bold">
          <M.PoolTierExpr currencyBase={currency1} currencyQuote={currency0} tier={position.poolTier} />
        </M.TextContents>
        <RangeBadge removed={removed} inRange={inRange} settled={position.settled} isLimit={position.isLimitOrder} />
      </M.RowBetween>

      <LightCard>
        <M.Column stretch gap="8px">
          <M.RowBetween>
            <M.Row gap="0.75em">
              <CurrencyLogo currency={currency0} />
              <M.Text weight="medium">{currency0?.symbol}</M.Text>
            </M.Row>
            <M.Text weight="medium">{formatTokenBalance(position.amount0, 4, 0)}</M.Text>
          </M.RowBetween>
          <M.RowBetween>
            <M.Row gap="0.75em">
              <CurrencyLogo currency={currency1} />
              <M.Text weight="medium">{currency1?.symbol}</M.Text>
            </M.Row>
            <M.Text weight="medium">{formatTokenBalance(position.amount1, 4, 0)}</M.Text>
          </M.RowBetween>
        </M.Column>
      </LightCard>

      <M.Column stretch gap="12px">
        <M.RowBetween>
          {title ? <M.Text weight="semibold">{title}</M.Text> : <div />}
          <RateToggle
            currencyA={sorted ? currency0 : currency1}
            currencyB={sorted ? currency1 : currency0}
            handleRateToggle={handleRateChange}
          />
        </M.RowBetween>

        <M.RowBetween gap="12px">
          <LightCard padding="8px">
            <M.ColumnCenter gap="0.425em">
              <M.Text size="xs" align="center">
                <Trans>Min Price</Trans>
              </M.Text>
              <M.Text size="lg" weight="medium" align="center">
                {`${formatTickPrice(priceLower, ticksAtLimit, Bound.LOWER)}`}
              </M.Text>
              <M.Text size="xs" align="center">
                <Trans>
                  {quoteCurrency.symbol} per {baseCurrency.symbol}
                </Trans>
              </M.Text>
              <M.Text size="xs" color="text2" align="center">
                <Trans>This position will be 100% {baseCurrency?.symbol} at or below this price</Trans>
              </M.Text>
            </M.ColumnCenter>
          </LightCard>

          <LightCard padding="8px">
            <M.ColumnCenter gap="0.333em">
              <M.Text size="xs" align="center">
                <Trans>Max Price</Trans>
              </M.Text>
              <M.Text size="lg" weight="medium" align="center">
                {`${formatTickPrice(priceUpper, ticksAtLimit, Bound.UPPER)}`}
              </M.Text>
              <M.Text size="xs" align="center">
                <Trans>
                  {quoteCurrency.symbol} per {baseCurrency.symbol}
                </Trans>
              </M.Text>
              <M.Text size="xs" color="text2" align="center">
                <Trans>This position will be 100% {quoteCurrency?.symbol} at or above this price</Trans>
              </M.Text>
            </M.ColumnCenter>
          </LightCard>
        </M.RowBetween>

        <LightCard padding="8px">
          <M.ColumnCenter gap="0.333em">
            <M.Text size="xs" color="text2">
              <Trans>Current price</Trans>
            </M.Text>
            <M.Text size="lg" weight="medium">
              {`${price.toSignificant(5)} `}
            </M.Text>
            <M.Text size="xs" color="text2">
              <Trans>
                {quoteCurrency.symbol} per {baseCurrency.symbol}
              </Trans>
            </M.Text>
          </M.ColumnCenter>
        </LightCard>
      </M.Column>
    </M.Column>
  )
}
