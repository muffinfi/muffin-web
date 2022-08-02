import { faBuildingColumns, faWallet } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Trans } from '@lingui/macro'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { formatTokenBalance, formatTokenBalanceWithSymbol } from '@muffinfi/utils/formatTokenBalance'
import * as M from '@muffinfi-ui'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import useCurrencyBalance from 'lib/hooks/useCurrencyBalance'
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components/macro'
import { maxAmountSpend } from 'utils/maxAmountSpend'

const BalanceWrapper = styled(M.Column).attrs({ stretch: true })`
  position: relative;
  border-radius: 16px;
  transition: height 1s ease;
  will-change: height;
  border: 1px solid var(--borderColor);
  padding: 14px;
`

const Seperator = styled.div`
  height: 1px;
  background: var(--borderColor);
`

interface DepositWithdrawInputRowProps {
  inputBalanceSource: BalanceSource
  currencyAmount: CurrencyAmount<Currency> | undefined
  showRemoveButton: boolean
  onUserInput: (index: number, input: string, max: CurrencyAmount<Currency> | undefined) => void
  onRemoveRow: (index: number) => void
  onCurrencySelect: (index: number, currency: Currency) => void
  id: string
  index: number
  isCurrencySelected?: (iterCurrency: Currency, selectedCurrency: Currency | null | undefined) => boolean
}

export default function DepositWithdrawInputRow({
  inputBalanceSource,
  id,
  index,
  currencyAmount,
  showRemoveButton,
  onUserInput,
  onCurrencySelect,
  onRemoveRow,
  isCurrencySelected,
}: DepositWithdrawInputRowProps) {
  const { account } = useActiveWeb3React()
  const [value, setValue] = useState('')
  const isDeposit = inputBalanceSource === BalanceSource.WALLET

  const isNative = currencyAmount?.currency.isNative ?? false
  const accountCurrency = isNative ? currencyAmount?.currency.wrapped : currencyAmount?.currency

  const walletBalance =
    useCurrencyBalance(account ?? undefined, currencyAmount?.currency, BalanceSource.WALLET) ??
    (currencyAmount && CurrencyAmount.fromRawAmount(currencyAmount?.currency, 0))
  const accountBalance =
    useCurrencyBalance(account ?? undefined, accountCurrency, BalanceSource.INTERNAL_ACCOUNT) ??
    (accountCurrency && CurrencyAmount.fromRawAmount(accountCurrency, 0))
  const fiatValue = useUSDCValue(currencyAmount)

  const maxBalance = isDeposit ? walletBalance : accountBalance

  const handleUserInput = useCallback(
    (input: string) => {
      setValue(input)
      onUserInput(index, input, maxBalance)
    },
    [index, onUserInput, maxBalance]
  )

  const onMax = useCallback(() => {
    const input = maxAmountSpend(maxBalance)?.toExact() ?? ''
    setValue(input)
    onUserInput(index, input, maxBalance)
  }, [onUserInput, index, maxBalance])

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      onCurrencySelect(index, currency)
    },
    [onCurrencySelect, index]
  )

  const handleRemove = useCallback(() => {
    onRemoveRow(index)
  }, [onRemoveRow, index])

  const renderBalance = useCallback(
    (amount: CurrencyAmount<Currency>) =>
      isDeposit ? (
        <M.Row gap="0.5em">
          <M.Text size="xs">
            <FontAwesomeIcon icon={faWallet} />
          </M.Text>
          <Trans>Wallet: {formatTokenBalance(amount)}</Trans>
        </M.Row>
      ) : (
        <M.Row gap="0.5em">
          <M.Text size="xs">
            <FontAwesomeIcon icon={faBuildingColumns} />
          </M.Text>
          <Trans>Account: {formatTokenBalance(amount.currency.isNative ? accountBalance : amount)}</Trans>
        </M.Row>
      ),
    [isDeposit, accountBalance]
  )

  useEffect(() => {
    onUserInput(index, value, maxBalance)
  }, [index, onUserInput, value, maxBalance])

  return (
    <M.Column stretch gap="8px">
      <CurrencyInputPanel
        label={isDeposit ? <Trans>Deposit Token</Trans> : <Trans>Withdraw Token</Trans>}
        value={value}
        showMaxButton
        currency={currencyAmount?.currency ?? null}
        onUserInput={handleUserInput}
        onMax={onMax}
        fiatValue={fiatValue}
        onCurrencySelect={handleCurrencySelect}
        showCommonBases
        id={id}
        renderBalance={renderBalance}
        balanceSource={inputBalanceSource}
        isCurrencySelected={isCurrencySelected}
      />
      {true && (
        <M.TextContents size="sm">
          <BalanceWrapper gap="8px">
            <M.Row>
              <M.Text weight="semibold">Current Balances</M.Text>
            </M.Row>
            <M.RowBetween gap="1em">
              <M.Row gap="0.5em">
                <M.Text size="xs">
                  <FontAwesomeIcon icon={faWallet} />
                </M.Text>
                <Trans>Wallet</Trans>
              </M.Row>
              <M.Text>{formatTokenBalanceWithSymbol(walletBalance, 6)}</M.Text>
            </M.RowBetween>
            <M.RowBetween gap="1em">
              <M.Row gap="0.5em">
                <M.Text size="xs">
                  <FontAwesomeIcon icon={faBuildingColumns} />
                </M.Text>
                <Trans>Account</Trans>
              </M.Row>
              <M.Text>{formatTokenBalanceWithSymbol(accountBalance, 6)}</M.Text>
            </M.RowBetween>
          </BalanceWrapper>
        </M.TextContents>
      )}
      {showRemoveButton && (
        <>
          <div style={{ paddingRight: '4px', alignSelf: 'flex-end' }}>
            <M.Anchor size="sm" color="primary0" hoverColor="primary1" role="button" onClick={handleRemove}>
              Remove
            </M.Anchor>
          </div>
          <Seperator />
        </>
      )}
    </M.Column>
  )
}
