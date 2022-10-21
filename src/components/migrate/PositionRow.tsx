import { MAX_TICK, MIN_TICK, nearestUsableTick, Position, sqrtGammaToFeePercent } from '@muffinfi/muffin-sdk'
import { formatFeePercent } from '@muffinfi/utils/formatFeePercent'
import * as M from '@muffinfi-ui'
import { CurrencyAmount, Fraction } from '@uniswap/sdk-core'
import {
  nearestUsableTick as uniV3NearestUsableTick,
  Position as UniV3Position,
  TickMath as UniV3TickMath,
} from '@uniswap/v3-sdk'
import { ReactComponent as MuffinLogo } from 'assets/svg/muffin_logo.svg'
import { ReactComponent as UniLogo } from 'assets/svg/uniswap_logo.svg'
import Badge from 'components/Badge'
import CurrencyLogo from 'components/CurrencyLogo'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import FormattedCurrencyAmount from 'components/FormattedCurrencyAmount'
import { usePricesFromPositionForUI } from 'hooks/usePricesFromPositionForUI'
import JSBI from 'jsbi'
import { useMemo } from 'react'
import { Bound } from 'state/mint/v3/actions'
import styled from 'styled-components/macro'
import { unwrappedToken } from 'utils/unwrappedToken'

const Container = styled.div`
  width: 100%;
  padding: 24px 14px;
  border-radius: 16px;
  background-color: var(--layer2);
  border: 1px solid var(--layer2);
  transition: border-color 150ms;

  font-size: var(--text-sm);
`

const MuffinLogoWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    justify-content: start;
  `}
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 48px 1.66fr 1fr;
  gap: 1rem;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    display: flex;
    flex-direction: column;
  `}
`

const Logo = ({ position }: { position: Position | UniV3Position | undefined }) => {
  const color = position instanceof UniV3Position ? '#ff007a' : 'var(--primary0)'
  return (
    <MuffinLogoWrapper>
      {position instanceof Position ? (
        <MuffinLogo fill={color} width={26} height={26} />
      ) : position instanceof UniV3Position ? (
        <UniLogo color={color} width={42} height={42} />
      ) : null}
    </MuffinLogoWrapper>
  )
}

export default function PositionRow({
  position,
  amounts,
}: {
  position: Position | UniV3Position | undefined
  amounts: { amount0: JSBI; amount1: JSBI } | undefined
}) {
  const fee = useMemo(
    () =>
      position instanceof Position
        ? `${formatFeePercent(sqrtGammaToFeePercent(position.poolTier.sqrtGamma))}%`
        : position instanceof UniV3Position
        ? `${formatFeePercent(new Fraction(position.pool.fee, 10_000))}%`
        : null,
    [position]
  )

  const tickAtLimit = useMemo(
    () => ({
      [Bound.LOWER]: position
        ? position instanceof Position
          ? position.tickLower === nearestUsableTick(MIN_TICK, position.pool.tickSpacing)
          : position.tickLower === uniV3NearestUsableTick(UniV3TickMath.MIN_TICK, position.pool.tickSpacing)
        : undefined,
      [Bound.UPPER]: position
        ? position instanceof Position
          ? position.tickUpper === nearestUsableTick(MAX_TICK, position.pool.tickSpacing)
          : position.tickUpper === uniV3NearestUsableTick(UniV3TickMath.MAX_TICK, position.pool.tickSpacing)
        : undefined,
    }),
    [position]
  )
  const { priceLower, priceUpper, quote, base } = usePricesFromPositionForUI(position)
  const invertPrice = base && position?.pool.token1 && base.equals(position.pool.token1)

  // NOTE: unwrap Token into Currency (i.e. WETH -> ETH, if there is WETH)
  const currencyQuote = quote && unwrappedToken(quote)
  const currencyBase = base && unwrappedToken(base)

  const [amount0, amount1] = useMemo(
    () =>
      !position?.pool.token0 || !position?.pool.token1 || !amounts
        ? []
        : [
            CurrencyAmount.fromRawAmount(position.pool.token0, amounts.amount0),
            CurrencyAmount.fromRawAmount(position.pool.token1, amounts.amount1),
          ],
    [position?.pool.token0, position?.pool.token1, amounts]
  )

  return (
    <Container>
      <Row>
        <Logo position={position} />
        {position ? (
          <>
            <M.Column gap="0.5em">
              <M.Row gap="0.5em">
                <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} margin={false} em={1.4} />
                <M.Text weight="semibold">
                  {currencyQuote?.symbol}&nbsp;/&nbsp;{currencyBase?.symbol}
                </M.Text>
                <Badge>{fee}</Badge>
              </M.Row>
              <M.Text weight="medium">
                <M.PriceRangeExpr priceLower={priceLower} priceUpper={priceUpper} tickAtLimit={tickAtLimit} />
              </M.Text>
            </M.Column>
            <M.Column gap="0.5em" style={{ justifyContent: 'center' }}>
              <M.Row gap="0.5em">
                <CurrencyLogo currency={currencyBase} size="1.2em" />
                <span>
                  {position && amount1 && amount0 && (
                    <FormattedCurrencyAmount currencyAmount={invertPrice ? amount1 : amount0} />
                  )}{' '}
                  {currencyBase?.symbol}
                </span>
              </M.Row>
              <M.Row gap="0.5em">
                <CurrencyLogo currency={currencyQuote} size="1.2em" />
                <span>
                  {position && amount1 && amount0 && (
                    <FormattedCurrencyAmount currencyAmount={invertPrice ? amount0 : amount1} />
                  )}{' '}
                  {currencyQuote?.symbol}
                </span>
              </M.Row>
            </M.Column>
          </>
        ) : null}
      </Row>
    </Container>
  )
}
