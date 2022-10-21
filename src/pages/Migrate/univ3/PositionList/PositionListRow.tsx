import { Trans } from '@lingui/macro'
import { useUniV3PositionFromDetails } from '@muffinfi/migrator/uniswap'
import { formatFeePercent } from '@muffinfi/utils/formatFeePercent'
import * as M from '@muffinfi-ui'
import AlertHelper from '@muffinfi-ui/components/AlertHelper'
import { Fraction } from '@uniswap/sdk-core'
import { nearestUsableTick, TickMath } from '@uniswap/v3-sdk'
import { ReactComponent as Logo } from 'assets/svg/uniswap_logo.svg'
import Badge from 'components/Badge'
import CurrencyLogo from 'components/CurrencyLogo'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import FormattedCurrencyAmount from 'components/FormattedCurrencyAmount'
import Loader from 'components/Loader'
import { usePricesFromPositionForUI } from 'hooks/usePricesFromPositionForUI'
import { useETHPriceUSD, useTokenValueETH } from 'pages/Pool/PositionList/PositionValuesUpdater'
import { memo, MouseEventHandler, useCallback, useMemo } from 'react'
import { ExternalLink } from 'react-feather'
import { Bound } from 'state/mint/v3/actions'
import styled, { css } from 'styled-components/macro'
import { PositionDetails } from 'types/position'
import { unwrappedToken } from 'utils/unwrappedToken'

export const BasePositionRow = css`
  display: grid;
  align-items: center;
  grid-template-columns: 48px 1fr 1fr 0.8fr 120px 60px;
  gap: 1rem;
  padding: 24px 24px;
  border-bottom: 1px solid var(--borderColor);

  &:last-child {
    border-bottom: 0;
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding-left: 16px;
    padding-right: 16px;
  `}

  ${({ theme }) => theme.mediaWidth.upToSmall`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  `}

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    padding-left: 0;
    padding-right: 0;
  `}
`

export const PriceRangeBarWrapper = styled.div`
  ${({ theme }) => theme.mediaWidth.upToMedium`
    display: none
  `}
`

const PoolTier = styled(M.Row)`
  ${({ theme }) => theme.mediaWidth.upToMedium`
    flex-direction: column;
    align-items: flex-start;
    `}
  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: row;
    align-items: center;
  `}
`

const LastColumn = styled.div`
  & > div {
    align-items: flex-end;

    ${({ theme }) => theme.mediaWidth.upToSmall`
      align-items: flex-start;
    `}
  }
`

const PositionRow = styled(M.Link)`
  ${BasePositionRow}
  min-height: 83px;
  transition: background-color 100ms;
  :hover {
    background: var(--layer2);
  }
`

const LoaderWrapper = styled(M.Row)`
  justify-content: center;
  padding-right: 2.5em;
  grid-column: 2 / 6;
`

const InfoLink = styled(M.Button)`
  padding: 0;

  > div {
    border-bottom: 1px solid transparent;
  }

  :hover > div {
    border-bottom-color: currentColor;
  }
`

export default memo(function PositionListRow({ positionDetails }: { positionDetails: PositionDetails }) {
  const { tokenId, token0: token0Address, token1: token1Address, fee, tickLower, tickUpper } = positionDetails

  const position = useUniV3PositionFromDetails(positionDetails)

  const feePercent = useMemo(() => formatFeePercent(new Fraction(fee ?? 0, 10_000)), [fee])

  // NOTE: fetch token basic info, init Token objects from sdk-core
  const pool = position?.pool
  const { token1 } = pool ?? {}

  const tickAtLimit = useMemo(
    () => ({
      [Bound.LOWER]:
        tickLower && pool?.tickSpacing
          ? tickLower === nearestUsableTick(TickMath.MIN_TICK, pool.tickSpacing)
          : undefined,
      [Bound.UPPER]:
        tickUpper && pool?.tickSpacing
          ? tickUpper === nearestUsableTick(TickMath.MAX_TICK, pool.tickSpacing)
          : undefined,
    }),
    [tickLower, tickUpper, pool?.tickSpacing]
  )

  // prices
  const { priceLower, priceUpper, quote, base } = usePricesFromPositionForUI(position)

  // NOTE: unwrap Token into Currency (i.e. WETH -> ETH, if there is WETH)
  const currencyQuote = quote && unwrappedToken(quote)
  const currencyBase = base && unwrappedToken(base)

  const invertPrice = base && token1 && base.equals(token1)

  const ethPriceUSD = useETHPriceUSD()
  const token0ETH = useTokenValueETH(token0Address)
  const token1ETH = useTokenValueETH(token1Address)

  const missingToken0Value = token0ETH == null || ethPriceUSD == null
  const missingToken1Value = token1ETH == null || ethPriceUSD == null

  const valueETH = useMemo(
    () =>
      (token0ETH ?? 0) * parseFloat(position?.amount0.toExact() ?? '0') +
      (token1ETH ?? 0) * parseFloat(position?.amount1.toExact() ?? '0'),
    [position?.amount0, position?.amount1, token0ETH, token1ETH]
  )

  const valueUSD = useMemo(() => valueETH * (ethPriceUSD ?? 0), [ethPriceUSD, valueETH])

  const onClickInfo: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.preventDefault()
      window.open(`https://app.uniswap.org/#/pool/${tokenId.toString()}`, '_blank', 'noopener,noreferrer')
    },
    [tokenId]
  )

  return (
    <PositionRow to={`/migrate/univ3/${tokenId}`}>
      {/* 1 */}
      <div>
        <Logo color="#ff007a" width={42} height={42} />
      </div>

      {currencyBase && currencyQuote && priceLower && priceUpper ? (
        <>
          {/* 2 */}
          <M.Column gap="0.5rem">
            <PoolTier gap="0.5em">
              <M.Row gap="0.5em">
                <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} margin={false} em={1.4} />
                <M.Text weight="semibold">
                  {currencyQuote?.symbol}&nbsp;/&nbsp;{currencyBase?.symbol}
                </M.Text>
              </M.Row>
              <Badge>{feePercent}%</Badge>
            </PoolTier>
          </M.Column>

          {/* 3 */}
          <M.Column gap="0.15em">
            <M.Text weight="medium">
              <M.PriceRangeExpr priceLower={priceLower} priceUpper={priceUpper} tickAtLimit={tickAtLimit} />
            </M.Text>
            <M.TextDiv size="xs" color="text2">
              <Trans>Current:</Trans>{' '}
              {(invertPrice ? position?.pool.token1Price : position?.pool.token0Price)?.toSignificant(5)}
            </M.TextDiv>
          </M.Column>

          {/* 4 */}
          <M.Column gap="0.2em">
            <M.Row gap="0.5rem">
              <CurrencyLogo currency={currencyBase} size="1.2em" />
              <span>
                {position && (
                  <FormattedCurrencyAmount currencyAmount={invertPrice ? position.amount1 : position.amount0} />
                )}{' '}
                {currencyBase.symbol}
              </span>
            </M.Row>
            <M.Row gap="0.5rem">
              <CurrencyLogo currency={currencyQuote} size="1.2em" />
              <span>
                {position && (
                  <FormattedCurrencyAmount currencyAmount={invertPrice ? position.amount0 : position.amount1} />
                )}{' '}
                {currencyQuote.symbol}
              </span>
            </M.Row>
          </M.Column>

          {/* 5 */}
          <M.Column gap="0.15em">
            <M.TextDiv weight="semibold">
              ${valueUSD.toLocaleString(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}{' '}
              {missingToken0Value || missingToken1Value ? (
                <AlertHelper
                  text={
                    <Trans>
                      We are unable to evaluate {missingToken0Value ? `${position?.pool.token0.symbol ?? '---'}` : ''}{' '}
                      {missingToken0Value && missingToken1Value ? 'and' : ''}{' '}
                      {missingToken1Value ? `${position?.pool.token1.symbol ?? '---'}` : ''} value.
                    </Trans>
                  }
                />
              ) : null}
            </M.TextDiv>
            <M.TextDiv size="xs" color="text2">
              Ξ{valueETH.toLocaleString(undefined, { maximumFractionDigits: 3, minimumFractionDigits: 3 })}
            </M.TextDiv>
          </M.Column>

          {/* 6 */}
          <LastColumn>
            <M.Column gap="0.5rem">
              <InfoLink onClick={onClickInfo}>
                <M.TextDiv size="sm">
                  <M.Row gap="0.25rem">
                    Info
                    <ExternalLink size="1em" />
                  </M.Row>
                </M.TextDiv>
              </InfoLink>
            </M.Column>
          </LastColumn>
        </>
      ) : (
        <LoaderWrapper>
          <Loader />
        </LoaderWrapper>
      )}
    </PositionRow>
  )
})
