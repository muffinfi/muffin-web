import { Trans } from '@lingui/macro'
import { Trade } from '@muffinfi/muffin-v1-sdk'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
// import Badge from 'components/Badge'
import { AutoColumn } from 'components/Column'
import { LoadingRows } from 'components/Loader/styled'
import RoutingDiagram, { RoutingDiagramEntry } from 'components/RoutingDiagram/RoutingDiagram'
import { AutoRow, RowBetween } from 'components/Row'
import { memo } from 'react'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'
import { AutoRouterLabel, AutoRouterLogo } from './RouterLabel'

const Separator = styled.div`
  border-top: 1px solid ${({ theme }) => theme.bg2};
  height: 1px;
  width: 100%;
`

export default memo(function SwapRoute({
  trade,
  syncing,
}: {
  trade: Trade<Currency, Currency, TradeType>
  syncing: boolean
}) {
  const routingAPIEnabled = false // = useRoutingAPIEnabled()

  return (
    <AutoColumn gap="12px">
      <RowBetween>
        <AutoRow gap="4px" width="auto">
          <AutoRouterLogo />
          <AutoRouterLabel />
        </AutoRow>
        {syncing ? (
          <LoadingRows>
            <div style={{ width: '30px', height: '24px' }} />
          </LoadingRows>
        ) : null}
        {/* {!syncing ? (
          <Badge>
            <ThemedText.Black fontSize={12}>
              {getTradeVersion(trade) === Version.v2 ? <Trans>V2</Trans> : <Trans>V3</Trans>}
            </ThemedText.Black>
          </Badge>
        ) : null} */}
      </RowBetween>
      <Separator />
      {syncing ? (
        <LoadingRows>
          <div style={{ width: '400px', height: '30px' }} />
        </LoadingRows>
      ) : (
        <RoutingDiagram
          currencyIn={trade.inputAmount.currency}
          currencyOut={trade.outputAmount.currency}
          routes={getTokenPath(trade)}
        />
      )}
      {routingAPIEnabled && (
        <ThemedText.Main fontSize={12} width={400}>
          <Trans>This route optimizes your price by considering split routes, multiple hops, and gas costs.</Trans>
        </ThemedText.Main>
      )}
    </AutoColumn>
  )
})

function getTokenPath(trade: Trade<Currency, Currency, TradeType>): RoutingDiagramEntry[] {
  return trade.swaps.map(({ route, inputAmount, outputAmount }) => {
    const proportion =
      trade.tradeType === TradeType.EXACT_INPUT
        ? inputAmount.divide(trade.inputAmount)
        : outputAmount.divide(trade.outputAmount)

    const percent = new Percent(proportion.numerator, proportion.denominator)

    const path: [Currency, Currency, number][] = []
    for (let i = 0; i < route.pools.length; i++) {
      const tokenIn = route.tokenPath[i]
      const tokenOut = route.tokenPath[i + 1]
      const tierChoices = route.tierChoicesList[i]

      path.push([tokenIn, tokenOut, tierChoices])
    }

    return {
      percent,
      path,
    }
  })
}
