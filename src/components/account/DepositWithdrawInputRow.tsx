import { Trans } from '@lingui/macro'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { ButtonText } from 'components/Button'
import { AutoColumn } from 'components/Column'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import { RowBetween } from 'components/Row'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import useCurrencyBalance from 'lib/hooks/useCurrencyBalance'
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'
import { formatCurrencyAmount, formatCurrencyAmountWithSymbol } from 'utils/formatCurrencyAmount'
import { maxAmountSpend } from 'utils/maxAmountSpend'

const BalanceWrapper = styled(AutoColumn)`
  ${({ theme }) => theme.flexColumnNoWrap}
  position: relative;
  border-radius: 20px;
  transition: height 1s ease;
  border: 1px solid ${({ theme }) => theme.bg1};
  padding: 1rem;
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
        <Trans>Wallet Balance: {formatCurrencyAmount(amount, 4)}</Trans>
      ) : (
        <Trans>Account Balance: {formatCurrencyAmount(amount.currency.isNative ? accountBalance : amount, 4)}</Trans>
      ),
    [isDeposit, accountBalance]
  )

  useEffect(() => {
    onUserInput(index, value, maxBalance)
  }, [index, onUserInput, value, maxBalance])

  return (
    <AutoColumn gap="sm">
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
      {currencyAmount && (
        <BalanceWrapper gap="sm">
          <RowBetween>
            <ThemedText.Main>
              <Trans>Current Wallet Balance</Trans>
            </ThemedText.Main>
            <ThemedText.Main>{formatCurrencyAmountWithSymbol(walletBalance, 6)}</ThemedText.Main>
          </RowBetween>
          <RowBetween>
            <ThemedText.Main>
              <Trans>Current Account Balance</Trans>
            </ThemedText.Main>
            <ThemedText.Main>{formatCurrencyAmountWithSymbol(accountBalance, 6)}</ThemedText.Main>
          </RowBetween>
        </BalanceWrapper>
      )}
      {showRemoveButton && (
        <AutoColumn justify="flex-end" style={{ paddingRight: '4px' }}>
          <ButtonText onClick={handleRemove}>Remove</ButtonText>
        </AutoColumn>
      )}
    </AutoColumn>
  )
}
