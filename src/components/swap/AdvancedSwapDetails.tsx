import { Trans } from '@lingui/macro'
import { useTradeAdvancedDetails } from '@muffinfi/hooks/swap/useTradeAdvancedDetails'
import { InterfaceTrade } from '@muffinfi/state/routing/types'
import * as M from '@muffinfi-ui'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import { LoadingRows } from 'components/Loader/styled'
import { QuestionHelperInline } from 'components/QuestionHelper'
import { SUPPORTED_GAS_ESTIMATE_CHAIN_IDS } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { memo } from 'react'
import styled from 'styled-components/macro'
import { HideSmall } from 'theme'

import FormattedPriceImpact from './FormattedPriceImpact'

// const Separator = styled.div`
//   width: 100%;
//   height: 1px;
//   background-color: var(--borderColor);
// `

const Wrapper = styled(M.TextContents)`
  font-size: 0.8125rem; // 13px
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
  const priceImpactExcludingLPFee = priceImpact && feePercent ? priceImpact.subtract(feePercent) : undefined // TODO: ???
  const expectedOutputAmount = trade?.outputAmount

  //
  const allowedSlippageFormatted = allowedSlippage.toSignificant(3)
  const amountAfterSlippageFormatted = trade
    ? trade.tradeType === TradeType.EXACT_INPUT
      ? `${trade.minimumAmountOut(allowedSlippage).toSignificant(6)} ${trade.outputAmount.currency.symbol}`
      : `${trade.maximumAmountIn(allowedSlippage).toSignificant(6)} ${trade.inputAmount.currency.symbol}`
    : undefined

  return !trade ? null : (
    <Wrapper>
      <M.Column stretch gap="12px">
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
            <QuestionHelperInline
              text={
                <Trans>
                  Buying a token makes it relatively more scarce in liquidity pool, thus causing its token price to
                  increase.
                </Trans>
              }
            />
          </M.Text>
          <TextWithLoadingPlaceholder syncing={syncing} width={50}>
            <M.Text align="right">
              <FormattedPriceImpact priceImpact={priceImpactExcludingLPFee} />
            </M.Text>
          </TextWithLoadingPlaceholder>
        </M.RowBetween>

        <M.TextContents>
          <M.RowBetween gap="1.25em">
            <M.Text>
              {trade.tradeType === TradeType.EXACT_INPUT ? (
                <Trans>Minimum received</Trans>
              ) : (
                <Trans>Maximum paid</Trans>
              )}
              <HideSmall>
                {' '}
                <M.Text size="xs" color="text2">
                  <Trans>({allowedSlippageFormatted}% slippage)</Trans>
                </M.Text>
              </HideSmall>
              <QuestionHelperInline
                text={
                  trade.tradeType === TradeType.EXACT_INPUT ? (
                    <Trans>
                      After slippage, you&apos;ll receive at least this amount, or else the transaction will revert.
                      This amount is derived from your slippage tolerance.
                    </Trans>
                  ) : (
                    <Trans>
                      After slippage, you&apos;ll pay at most this amount, or else the transaction will revert. This
                      amount is derived from your slippage tolerance.
                    </Trans>
                  )
                }
              />
            </M.Text>
            <TextWithLoadingPlaceholder syncing={syncing} width={70}>
              <M.Text align="right">
                {/* {trade.tradeType === TradeType.EXACT_INPUT ? (
                  <Trans>
                    <HideSmall>At least </HideSmall>
                    <span style={{ display: 'inline-block' }}>{amountAfterSlippageFormatted}</span>
                  </Trans>
                ) : (
                  <Trans>
                    <HideSmall>At most </HideSmall>
                    <span style={{ display: 'inline-block' }}>{amountAfterSlippageFormatted}</span>
                  </Trans>
                )} */}
                {amountAfterSlippageFormatted}
              </M.Text>
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
    </Wrapper>
  )
})
