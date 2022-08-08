import { Trans } from '@lingui/macro'
import { InterfaceTrade } from '@muffinfi/state/routing/types'
import * as M from '@muffinfi-ui'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import { useContext, useState } from 'react'
import { AlertTriangle, ArrowDown } from 'react-feather'
import styled, { ThemeContext } from 'styled-components/macro'

import { useUSDCValue } from '../../hooks/useUSDCPrice'
import { isAddress, shortenAddress } from '../../utils'
import { computeFiatValuePriceImpact } from '../../utils/computeFiatValuePriceImpact'
import { LightCard, OutlineCard } from '../Card'
import { FiatValue } from '../CurrencyInputPanel/FiatValue'
import CurrencyLogo from '../CurrencyLogo'
import TradePrice from '../swap/TradePrice'
import AdvancedSwapDetails from './AdvancedSwapDetails'
import { SwapShowAcceptChanges } from './styleds'

const ArrowWrapper = styled.div`
  padding: 4px;
  border-radius: 12px;
  height: 32px;
  width: 32px;
  position: relative;
  margin-top: -18px;
  margin-bottom: -18px;
  left: calc(50% - 16px);
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--layer2);
  border: 4px solid;
  border-color: var(--layer1);
  z-index: 2;
`

const StyledCard = styled(OutlineCard)`
  padding: 12px;
  border: 1px solid var(--borderColor);
`

export default function SwapModalHeader({
  trade,
  allowedSlippage,
  recipient,
  showAcceptChanges,
  toInternalAccount,
  onAcceptChanges,
}: {
  trade: InterfaceTrade<Currency, Currency, TradeType>
  allowedSlippage: Percent
  recipient: string | null
  showAcceptChanges: boolean
  toInternalAccount: boolean
  onAcceptChanges: () => void
}) {
  const theme = useContext(ThemeContext)

  const [showInverted, setShowInverted] = useState<boolean>(false)

  const fiatValueInput = useUSDCValue(trade.inputAmount)
  const fiatValueOutput = useUSDCValue(trade.outputAmount)

  return (
    <M.Column stretch gap="24px">
      <M.Column stretch gap="8px">
        <LightCard padding="0.75rem 1rem">
          <M.Column stretch gap={'8px'}>
            <M.RowBetween>
              <M.Row gap="12px">
                <CurrencyLogo currency={trade.inputAmount.currency} size={'20px'} />
                <M.Text size="lg" weight="medium">
                  {trade.inputAmount.currency.symbol}
                </M.Text>
              </M.Row>
              <M.Text
                size="xl"
                weight="medium"
                color={showAcceptChanges && trade.tradeType === TradeType.EXACT_OUTPUT ? 'primary0' : 'text1'}
                nowrap
                ellipsis
              >
                {trade.inputAmount.toSignificant(6)}
              </M.Text>
            </M.RowBetween>
            <M.RowBetween>
              <div />
              <M.Text size="sm">
                <FiatValue fiatValue={fiatValueInput} />
              </M.Text>
            </M.RowBetween>
          </M.Column>
        </LightCard>

        <ArrowWrapper>
          <ArrowDown size="16" color={theme.text2} />
        </ArrowWrapper>

        <LightCard padding="0.75rem 1rem">
          <M.Column stretch gap={'8px'}>
            <M.RowBetween>
              <M.Row gap="12px">
                <CurrencyLogo currency={trade.outputAmount.currency} size={'20px'} />
                <M.Text size="lg" weight="medium">
                  {trade.outputAmount.currency.symbol}
                </M.Text>
              </M.Row>
              <M.Text
                size="xl"
                weight="medium"
                color={showAcceptChanges && trade.tradeType === TradeType.EXACT_OUTPUT ? 'primary0' : 'text1'}
                nowrap
                ellipsis
              >
                {trade.outputAmount.toSignificant(6)}
              </M.Text>
            </M.RowBetween>
            <M.RowBetween>
              <div />
              <M.Text size="sm">
                <FiatValue
                  fiatValue={fiatValueOutput}
                  fiatValueDiscount={computeFiatValuePriceImpact(fiatValueInput, fiatValueOutput)}
                />
              </M.Text>
            </M.RowBetween>
          </M.Column>
        </LightCard>

        <M.RowBetween style={{ padding: '0 1rem' }}>
          <TradePrice price={trade.executionPrice} showInverted={showInverted} setShowInverted={setShowInverted} />
        </M.RowBetween>
      </M.Column>

      <StyledCard>
        <AdvancedSwapDetails trade={trade} allowedSlippage={allowedSlippage} />
      </StyledCard>

      {showAcceptChanges ? (
        <SwapShowAcceptChanges>
          <M.RowBetween>
            <M.Row gap="8px">
              <AlertTriangle size={20} />
              <M.Text>
                <Trans>Price Updated</Trans>
              </M.Text>
            </M.Row>
            <M.ButtonPrimary onClick={onAcceptChanges}>
              <M.Text size="sm">
                <Trans>Accept</Trans>
              </M.Text>
            </M.ButtonPrimary>
          </M.RowBetween>
        </SwapShowAcceptChanges>
      ) : null}

      <M.RowBetween gap="1em" style={{ padding: '0 0.75rem' }}>
        <M.Text size="sm" weight="semibold">
          <Trans>Receive tokens to</Trans>
        </M.Text>
        <M.Text size="sm">{toInternalAccount ? <M.OutputDestinationAccount /> : <M.OutputDestinationWallet />}</M.Text>
      </M.RowBetween>

      <div style={{ padding: '0 0.75rem' }}>
        <M.TextDiv size="xs" color="text2" paragraphLineHeight>
          {trade.tradeType === TradeType.EXACT_INPUT ? (
            <Trans>
              Output is estimated. You will receive at least{' '}
              <b>
                {trade.minimumAmountOut(allowedSlippage).toSignificant(6)} {trade.outputAmount.currency.symbol}
              </b>{' '}
              or the transaction will revert.
            </Trans>
          ) : (
            <Trans>
              Input is estimated. You will sell at most{' '}
              <b>
                {trade.maximumAmountIn(allowedSlippage).toSignificant(6)} {trade.inputAmount.currency.symbol}
              </b>{' '}
              or the transaction will revert.
            </Trans>
          )}
        </M.TextDiv>
      </div>

      {recipient !== null ? (
        <div>
          <M.Text size="sm">
            <Trans>
              Output will be sent to{' '}
              <b title={recipient}>{isAddress(recipient) ? shortenAddress(recipient) : recipient}</b>
            </Trans>
          </M.Text>
        </div>
      ) : null}
    </M.Column>
  )
}
