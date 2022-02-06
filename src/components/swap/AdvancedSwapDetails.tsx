import { Trans } from '@lingui/macro'
import { useTradeAdvancedDetails } from '@muffinfi/hooks/swap/useTradeAdvancedDetails'
import { Trade } from '@muffinfi/muffin-v1-sdk'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import { LoadingRows } from 'components/Loader/styled'
import { useContext } from 'react'
import { ThemeContext } from 'styled-components/macro'
import { ThemedText } from '../../theme'
import { AutoColumn } from '../Column'
import { RowBetween, RowFixed } from '../Row'
import FormattedPriceImpact from './FormattedPriceImpact'
import { TransactionDetailsLabel } from './styleds'

interface AdvancedSwapDetailsProps {
  trade?: Trade<Currency, Currency, TradeType>
  allowedSlippage: Percent
  syncing?: boolean
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

export function AdvancedSwapDetails({ trade, allowedSlippage, syncing = false }: AdvancedSwapDetailsProps) {
  const theme = useContext(ThemeContext)

  const { priceImpact, feePercent } = useTradeAdvancedDetails(trade)
  const priceImpactExcludingLPFee = priceImpact && feePercent ? priceImpact.subtract(feePercent) : undefined

  return !trade ? null : (
    <AutoColumn gap="8px">
      <TransactionDetailsLabel fontWeight={500} fontSize={14}>
        <Trans>Transaction Details</Trans>
      </TransactionDetailsLabel>
      {/* <RowBetween>
        <RowFixed>
          <ThemedText.SubHeader color={theme.text1}>
            <Trans>Liquidity Provider Fee</Trans>
          </ThemedText.SubHeader>
        </RowFixed>
        <TextWithLoadingPlaceholder syncing={syncing} width={65}>
          <ThemedText.Black textAlign="right" fontSize={14}>
            {feeAmount ? `${feeAmount.toSignificant(4)} ${feeAmount.currency.symbol}` : '-'}
          </ThemedText.Black>
        </TextWithLoadingPlaceholder>
      </RowBetween> */}

      <RowBetween>
        <RowFixed>
          <ThemedText.SubHeader color={theme.text1}>
            <Trans>Price Impact</Trans>
          </ThemedText.SubHeader>
        </RowFixed>
        <TextWithLoadingPlaceholder syncing={syncing} width={50}>
          <ThemedText.Black textAlign="right" fontSize={14}>
            <FormattedPriceImpact priceImpact={priceImpactExcludingLPFee} />
          </ThemedText.Black>
        </TextWithLoadingPlaceholder>
      </RowBetween>

      <RowBetween>
        <RowFixed>
          <ThemedText.SubHeader color={theme.text1}>
            <Trans>Allowed Slippage</Trans>
          </ThemedText.SubHeader>
        </RowFixed>
        <TextWithLoadingPlaceholder syncing={syncing} width={45}>
          <ThemedText.Black textAlign="right" fontSize={14}>
            {allowedSlippage.toFixed(2)}%
          </ThemedText.Black>
        </TextWithLoadingPlaceholder>
      </RowBetween>

      <RowBetween>
        <RowFixed>
          <ThemedText.SubHeader color={theme.text1}>
            {trade.tradeType === TradeType.EXACT_INPUT ? <Trans>Minimum received</Trans> : <Trans>Maximum sent</Trans>}
          </ThemedText.SubHeader>
        </RowFixed>
        <TextWithLoadingPlaceholder syncing={syncing} width={70}>
          <ThemedText.Black textAlign="right" fontSize={14}>
            {trade.tradeType === TradeType.EXACT_INPUT
              ? `${trade.minimumAmountOut(allowedSlippage).toSignificant(6)} ${trade.outputAmount.currency.symbol}`
              : `${trade.maximumAmountIn(allowedSlippage).toSignificant(6)} ${trade.inputAmount.currency.symbol}`}
          </ThemedText.Black>
        </TextWithLoadingPlaceholder>
      </RowBetween>
    </AutoColumn>
  )
}
