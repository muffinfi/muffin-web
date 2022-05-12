import { Trans } from '@lingui/macro'
import { useTradeAdvancedDetails } from '@muffinfi/hooks/swap/useTradeAdvancedDetails'
import { InterfaceTrade } from '@muffinfi/state/routing/types'
import * as M from '@muffinfi-ui'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import { LoadingRows } from 'components/Loader/styled'
import { SUPPORTED_GAS_ESTIMATE_CHAIN_IDS } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { memo } from 'react'
import styled from 'styled-components/macro'

import FormattedPriceImpact from './FormattedPriceImpact'

const Separator = styled.div`
  width: 100%;
  height: 1px;
  background-color: var(--borderColor);
`

interface AdvancedSwapDetailsProps {
  trade?: InterfaceTrade<Currency, Currency, TradeType>
  allowedSlippage: Percent
  syncing?: boolean
  hideRouteDiagram?: boolean
}

function TextWithLoadingPlaceholder({
  syncing,
  width,
  children,
}: {
  syncing: boolean
  width: number
  children: JSX.Element
}) {
  return syncing ? (
    <LoadingRows>
      <div style={{ height: '15px', width: `${width}px` }} />
    </LoadingRows>
  ) : (
    children
  )
}

export default memo(function AdvancedSwapDetails({
  trade,
  allowedSlippage,
  syncing = false,
}: AdvancedSwapDetailsProps) {
  const { chainId } = useActiveWeb3React()

  const { priceImpact, feePercent } = useTradeAdvancedDetails(trade)
  const priceImpactExcludingLPFee = priceImpact && feePercent ? priceImpact.subtract(feePercent) : undefined
  const expectedOutputAmount = trade?.outputAmount

  // const { expectedOutputAmount, priceImpact } = useMemo(() => {
  //   if (!trade) return { expectedOutputAmount: undefined, priceImpact: undefined }
  //   const expectedOutputAmount = trade.outputAmount
  //   const realizedLpFeePercent = computeRealizedLPFeePercent(trade)
  //   const priceImpact = trade.priceImpact.subtract(realizedLpFeePercent)
  //   return { expectedOutputAmount, priceImpact }
  // }, [trade])

  return !trade ? null : (
    <M.TextContents color="text1" size="sm">
      <M.Column stretch gap="10px">
        <M.RowBetween>
          <M.Text>
            <Trans>Expected Output</Trans>
          </M.Text>
          <TextWithLoadingPlaceholder syncing={syncing} width={65}>
            <M.Text align="right">
              {expectedOutputAmount
                ? `${expectedOutputAmount.toSignificant(6)}  ${expectedOutputAmount.currency.symbol}`
                : '-'}
            </M.Text>
          </TextWithLoadingPlaceholder>
        </M.RowBetween>

        <M.RowBetween>
          <M.Text>
            <Trans>Price Impact</Trans>
          </M.Text>
          <TextWithLoadingPlaceholder syncing={syncing} width={50}>
            <M.Text align="right">
              <FormattedPriceImpact priceImpact={priceImpactExcludingLPFee} />
            </M.Text>
          </TextWithLoadingPlaceholder>
        </M.RowBetween>

        <Separator />

        <M.TextContents color="text2">
          <M.RowBetween gap="1.25em">
            <M.Text>
              {trade.tradeType === TradeType.EXACT_INPUT ? (
                <Trans>Minimum received</Trans>
              ) : (
                <Trans>Maximum sent</Trans>
              )}{' '}
              <Trans>after slippage</Trans> ({allowedSlippage.toFixed(2)}%)
            </M.Text>
            <TextWithLoadingPlaceholder syncing={syncing} width={70}>
              <M.Text align="right">
                {trade.tradeType === TradeType.EXACT_INPUT
                  ? `${trade.minimumAmountOut(allowedSlippage).toSignificant(6)} ${trade.outputAmount.currency.symbol}`
                  : `${trade.maximumAmountIn(allowedSlippage).toSignificant(6)} ${trade.inputAmount.currency.symbol}`}
              </M.Text>
            </TextWithLoadingPlaceholder>
          </M.RowBetween>

          <M.RowBetween>
            <M.Text>
              <Trans>Network Fee</Trans>
            </M.Text>
            <TextWithLoadingPlaceholder syncing={syncing} width={50}>
              <M.Text align="right">~$123</M.Text>
            </TextWithLoadingPlaceholder>
          </M.RowBetween>

          {!trade?.gasUseEstimateUSD || !chainId || !SUPPORTED_GAS_ESTIMATE_CHAIN_IDS.includes(chainId) ? null : (
            <M.RowBetween>
              <M.Text>
                <Trans>Network Fee</Trans>
              </M.Text>
              <TextWithLoadingPlaceholder syncing={syncing} width={50}>
                <M.Text align="right">~${trade.gasUseEstimateUSD.toFixed(2)}</M.Text>
              </TextWithLoadingPlaceholder>
            </M.RowBetween>
          )}
        </M.TextContents>
      </M.Column>
    </M.TextContents>
  )
})
