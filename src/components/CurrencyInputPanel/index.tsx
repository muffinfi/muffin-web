import { Trans } from '@lingui/macro'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { formatTokenBalance } from '@muffinfi/utils/formatTokenBalance'
import * as M from '@muffinfi-ui'
import { Currency, CurrencyAmount, Percent, Token } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
import { LoadingOpacityContainer, loadingOpacityMixin } from 'components/Loader/styled'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { ReactNode, useCallback, useMemo, useState } from 'react'
import { Lock } from 'react-feather'
import styled, { css } from 'styled-components/macro'

import { ReactComponent as DropDown } from '../../assets/images/dropdown.svg'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import CurrencyLogo from '../CurrencyLogo'
import DoubleCurrencyLogo from '../DoubleLogo'
import { Input as NumericalInput } from '../NumericalInput'
import CurrencySearchModal from '../SearchModal/CurrencySearchModal'
import { FiatValue } from './FiatValue'

const InputPanel = styled.div<{ hideInput?: boolean }>`
  position: relative;
  z-index: 1;
  width: ${({ hideInput }) => (hideInput ? '100%' : 'initial')};
  transition: height 1s ease;
  will-change: height;
`

const FixedContainer = styled(M.ColumnCenter)`
  position: absolute;
  z-index: 2;
  width: 100%;
  height: 100%;
  border-radius: 16px;
  background-color: var(--layer2);
  justify-content: center;
  gap: 0.5em;
  padding: 0 8%;
`

const Container = styled.div<{ hideInput: boolean; $focused: boolean }>`
  ${({ hideInput, $focused }) =>
    hideInput
      ? css``
      : css`
          width: initial;
          padding: 14px 14px;
          border-radius: 16px;
          background-color: var(--layer2);
          border: 1px solid var(--layer2);
          transition: border-color 150ms;
          :focus,
          :hover {
            border-color: var(--borderColor1);
          }
          ${$focused && 'border-color: var(--borderColor1);'}
        `}
`

const CurrencySelect = styled(M.Button)<{ $visible: boolean; $selected: boolean; $hideInput?: boolean }>`
  justify-content: space-between;
  gap: 0.5rem;

  visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
  height: ${({ $hideInput }) => ($hideInput ? '2.8rem' : '2.4rem')};
  width: ${({ $hideInput }) => ($hideInput ? '100%' : 'initial')};
  padding: 0 0.75rem 0 0.5rem;

  font-size: var(--text-lg);
  font-weight: var(--medium);
  border-radius: 16px;
  ${({ $selected }) => ($selected ? M.buttonMixins.color.tertiary : M.buttonMixins.color.primary)}

  ${({ $selected }) => ($selected ? 'transition: none;' : null)}

  ${({ $selected, theme }) => theme.mediaWidth.upToExtraSmall`
    font-size: ${$selected ? undefined : 'var(--text-base)'};
  `};
`

const StyledDropDown = styled(DropDown)`
  height: 35%;

  path {
    stroke: var(--btn-text);
    stroke-width: 1.5px;
  }
`

const StyledNumericalInput = styled(NumericalInput)<{ $loading: boolean }>`
  ${loadingOpacityMixin};
  text-align: right;
`

interface CurrencyInputPanelProps {
  value: string
  onUserInput: (value: string) => void
  onMax?: () => void
  showMaxButton: boolean
  label?: ReactNode
  onCurrencySelect?: (currency: Currency) => void
  currency?: Currency | null
  hideBalance?: boolean
  pair?: Pair | null
  hideInput?: boolean
  otherCurrency?: Currency | null
  fiatValue?: CurrencyAmount<Token> | null
  priceImpact?: Percent
  id: string
  showCommonBases?: boolean
  showCurrencyAmount?: boolean
  disableNonToken?: boolean
  renderBalance?: (amount: CurrencyAmount<Currency>) => ReactNode
  locked?: boolean
  loading?: boolean
  balanceSource?: BalanceSource
  isCurrencySelected?: (iterCurrency: Currency, selectedCurrency: Currency | null | undefined) => boolean
}

export default function CurrencyInputPanel({
  label,
  value,
  onUserInput,
  onMax,
  showMaxButton,
  onCurrencySelect,
  currency,
  otherCurrency,
  id,
  showCommonBases,
  showCurrencyAmount,
  disableNonToken,
  renderBalance,
  fiatValue,
  priceImpact,
  balanceSource,
  isCurrencySelected,
  hideBalance = false,
  pair = null, // used for double token logo
  hideInput = false,
  locked = false,
  loading = false,
  ...rest
}: CurrencyInputPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const { account } = useActiveWeb3React()
  const selectedCurrencyBalance = useCurrencyBalance(account ?? undefined, currency ?? undefined, balanceSource)

  const handleDismissSearch = useCallback(() => {
    setModalOpen(false)
  }, [setModalOpen])

  // generate random string for input id
  const inputFieldId = useMemo(() => `${Date.now()}-${Math.random()}`, [])

  // input focus state, for ui
  const [focused, setFocused] = useState(false)
  const onFocus = useCallback(() => setFocused(true), [])
  const onBlur = useCallback(() => setFocused(false), [])

  return (
    <>
      <InputPanel id={id} hideInput={hideInput} as="label" htmlFor={inputFieldId} {...rest}>
        {locked && (
          <FixedContainer>
            <Lock />
            <M.Text size="xs" align="center" paragraphLineHeight>
              <Trans>The current market price is outside your specified price range. Single-asset deposit only.</Trans>
            </M.Text>
          </FixedContainer>
        )}
        <Container hideInput={hideInput} $focused={focused}>
          <M.Column stretch gap="12px">
            <M.RowBetween wrap="nowrap" gap="0.75em">
              <CurrencySelect
                $visible={currency !== undefined}
                $selected={!!currency}
                $hideInput={hideInput}
                className="open-currency-select-button"
                onClick={() => {
                  if (onCurrencySelect) {
                    setModalOpen(true)
                  }
                }}
              >
                <M.Row gap="0.75rem">
                  {pair ? (
                    <DoubleCurrencyLogo currency0={pair.token0} currency1={pair.token1} size={24} margin={true} />
                  ) : currency ? (
                    <CurrencyLogo currency={currency} size={'24px'} />
                  ) : null}
                  {pair ? (
                    <span className="pair-name-container">
                      {pair?.token0.symbol}:{pair?.token1.symbol}
                    </span>
                  ) : (
                    <span className="token-symbol-container">
                      {(currency && currency.symbol && currency.symbol.length > 20
                        ? currency.symbol.slice(0, 4) +
                          '...' +
                          currency.symbol.slice(currency.symbol.length - 5, currency.symbol.length)
                        : currency?.symbol) || (
                        <span style={{ marginLeft: '0.25rem' }}>
                          <Trans>Select token</Trans>
                        </span>
                      )}
                    </span>
                  )}
                </M.Row>
                {onCurrencySelect && <StyledDropDown />}
              </CurrencySelect>

              {!hideInput && (
                <StyledNumericalInput
                  id={inputFieldId}
                  className="token-amount-input"
                  value={value}
                  $loading={loading}
                  onUserInput={onUserInput}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              )}
            </M.RowBetween>

            {!hideInput && !hideBalance && currency ? (
              <M.RowBetween style={{ height: 17 }}>
                {account ? (
                  <>
                    {!hideBalance && currency && selectedCurrencyBalance ? (
                      renderBalance ? (
                        <M.Row gap="0.5rem">
                          <M.TextDiv size="sm" color="text2">
                            {renderBalance(selectedCurrencyBalance)}
                          </M.TextDiv>
                          {onMax && (
                            <M.ButtonSecondary size="badge" onClick={onMax}>
                              Max
                            </M.ButtonSecondary>
                          )}
                        </M.Row>
                      ) : (
                        <M.Row gap="0.5rem">
                          <M.Text size="sm" color="text2">
                            <Trans>Balance: {formatTokenBalance(selectedCurrencyBalance)}</Trans>
                          </M.Text>
                          {onMax && (
                            <M.ButtonSecondary size="badge" onClick={onMax}>
                              Max
                            </M.ButtonSecondary>
                          )}
                        </M.Row>
                      )
                    ) : null}
                  </>
                ) : (
                  <div /> // spacer
                )}

                <LoadingOpacityContainer $loading={loading}>
                  <M.TextContents size="sm">
                    <FiatValue fiatValue={fiatValue} fiatValueDiscount={priceImpact} />
                  </M.TextContents>
                </LoadingOpacityContainer>
              </M.RowBetween>
            ) : !hideInput ? (
              <div style={{ height: 17 }} />
            ) : null}
          </M.Column>
        </Container>

        {onCurrencySelect && (
          <CurrencySearchModal
            isOpen={modalOpen}
            onDismiss={handleDismissSearch}
            onCurrencySelect={onCurrencySelect}
            selectedCurrency={currency}
            otherSelectedCurrency={otherCurrency}
            isCurrencySelected={isCurrencySelected}
            showCommonBases={showCommonBases}
            showCurrencyAmount={showCurrencyAmount}
            disableNonToken={disableNonToken}
            balanceSource={balanceSource}
          />
        )}
      </InputPanel>
    </>
  )
}
