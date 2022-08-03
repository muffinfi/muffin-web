import { Trans } from '@lingui/macro'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { formatTokenBalance } from '@muffinfi/utils/formatTokenBalance'
import * as M from '@muffinfi-ui'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { LightGreyCard } from 'components/Card'
import QuestionHelper from 'components/QuestionHelper'
import { getChainDisplayName } from 'constants/chains'
import { isDisallowedCurrency } from 'constants/tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useTheme from 'hooks/useTheme'
import { useCurrencyBalanceWithLoadingIndicator } from 'lib/hooks/useCurrencyBalance'
import { CSSProperties, memo, MutableRefObject, useCallback, useEffect, useMemo, useState } from 'react'
import { FixedSizeList } from 'react-window'
import { Text } from 'rebass'
import styled from 'styled-components/macro'

import TokenListLogo from '../../assets/svg/tokenlist.svg'
import { useIsUserAddedToken } from '../../hooks/Tokens'
import { useCombinedActiveList } from '../../state/lists/hooks'
import { WrappedTokenInfo } from '../../state/lists/wrappedTokenInfo'
import { ThemedText } from '../../theme'
import { isTokenOnList } from '../../utils'
import Column from '../Column'
import CurrencyLogo from '../CurrencyLogo'
import Loader from '../Loader'
import { RowBetween, RowFixed } from '../Row'
import { MouseoverTooltip } from '../Tooltip'
import ImportRow from './ImportRow'
import { MenuItem } from './styleds'

function currencyKey(currency: Currency): string {
  return currency.isToken ? currency.address : 'ETHER'
}

const StyledBalanceText = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  max-width: 7rem;
  text-overflow: ellipsis;
`

const Tag = styled.div`
  background-color: ${({ theme }) => theme.bg3};
  color: ${({ theme }) => theme.text2};
  font-size: 14px;
  border-radius: 4px;
  padding: 0.25rem 0.3rem 0.25rem 0.3rem;
  max-width: 6rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  justify-self: flex-end;
  margin-right: 4px;
`

const FixedContentRow = styled.div`
  padding: 4px 20px;
  height: 56px;
  display: grid;
  grid-gap: 16px;
  align-items: center;
`

function Balance({ balance }: { balance: CurrencyAmount<Currency> }) {
  return <StyledBalanceText title={balance.toExact()}>{formatTokenBalance(balance)}</StyledBalanceText>
}

const TagContainer = styled.div`
  display: flex;
  justify-content: flex-end;
`

const TokenListLogoWrapper = styled.img`
  height: 20px;
`

function TokenTags({ currency }: { currency: Currency }) {
  if (!(currency instanceof WrappedTokenInfo)) {
    return <span />
  }

  const tags = currency.tags
  if (!tags || tags.length === 0) return <span />

  const tag = tags[0]

  return (
    <TagContainer>
      <MouseoverTooltip text={tag.description}>
        <Tag key={tag.id}>{tag.name}</Tag>
      </MouseoverTooltip>
      {tags.length > 1 ? (
        <MouseoverTooltip
          text={tags
            .slice(1)
            .map(({ name, description }) => `${name}: ${description}`)
            .join('; \n')}
        >
          <Tag>...</Tag>
        </MouseoverTooltip>
      ) : null}
    </TagContainer>
  )
}

const CurrencyBalance = memo(function CurrencyBalance({
  account,
  currency,
  balanceSource,
}: {
  account: string | null | undefined
  currency: Currency
  balanceSource?: BalanceSource
}) {
  const [balance, loading] = useCurrencyBalanceWithLoadingIndicator(account ?? undefined, currency, balanceSource)
  return balance ? <Balance balance={balance} /> : loading ? <Loader stroke="var(--text2)" /> : null
})

function CurrencyRow({
  currency,
  onSelect,
  isSelected,
  otherSelected,
  style,
  showCurrencyAmount,
  balanceSource,
}: {
  currency: Currency
  onSelect: () => void
  isSelected: boolean
  otherSelected: boolean
  style: CSSProperties
  showCurrencyAmount?: boolean
  balanceSource?: BalanceSource
}) {
  const { account, chainId } = useActiveWeb3React()
  const key = currencyKey(currency)
  const selectedTokenList = useCombinedActiveList()
  const isOnSelectedList = isTokenOnList(selectedTokenList, currency.isToken ? currency : undefined)
  const customAdded = useIsUserAddedToken(currency)

  const isDisallowed = isDisallowedCurrency(chainId, currency)
  const chainName = getChainDisplayName(chainId)

  // debounce loading currency balance
  const [loadCurrencyBalance, setLoadCurrencyBalance] = useState(false)
  useEffect(() => {
    const timeoutId = setTimeout(() => setLoadCurrencyBalance(true), 200) // 200ms
    return () => clearTimeout(timeoutId)
  }, [])

  // only show add or remove buttons if not on selected list
  return (
    <MenuItem
      style={style}
      className={`token-item-${key}`}
      onClick={() => (isSelected || isDisallowed ? null : onSelect())}
      disabled={isSelected || isDisallowed}
      selected={otherSelected}
    >
      <CurrencyLogo currency={currency} size={'24px'} />
      <Column>
        <M.Row gap="0.5em">
          <Text title={currency.name} fontWeight={500}>
            {currency.symbol}
          </Text>
          {isDisallowed ? (
            <M.Text size="xs" color="text1">
              <Trans> • Disallowed on {chainName}</Trans>
            </M.Text>
          ) : null}
        </M.Row>
        <ThemedText.DarkGray ml="0px" fontSize={'12px'} fontWeight={300}>
          {!currency.isNative && !isOnSelectedList && customAdded ? (
            <Trans>{currency.name} • Added by user</Trans>
          ) : (
            currency.name
          )}
        </ThemedText.DarkGray>
      </Column>
      <TokenTags currency={currency} />
      {showCurrencyAmount && (
        <RowFixed style={{ justifySelf: 'flex-end' }}>
          {loadCurrencyBalance ? (
            <CurrencyBalance account={account} currency={currency} balanceSource={balanceSource} />
          ) : account ? (
            <Loader stroke="var(--text2)" />
          ) : null}
        </RowFixed>
      )}
    </MenuItem>
  )
}

const BREAK_LINE = 'BREAK'
type BreakLine = typeof BREAK_LINE
function isBreakLine(x: unknown): x is BreakLine {
  return x === BREAK_LINE
}

function BreakLineComponent({ style }: { style: CSSProperties }) {
  const theme = useTheme()
  return (
    <FixedContentRow style={style}>
      <LightGreyCard padding="8px 12px" $borderRadius="8px">
        <RowBetween>
          <RowFixed>
            <TokenListLogoWrapper src={TokenListLogo} />
            <ThemedText.Main ml="6px" fontSize="12px" color={theme.text1}>
              <Trans>Expanded results from inactive Token Lists</Trans>
            </ThemedText.Main>
          </RowFixed>
          <QuestionHelper
            text={
              <Trans>
                Tokens from inactive lists. Import specific tokens below or click Manage to activate more lists.
              </Trans>
            }
          />
        </RowBetween>
      </LightGreyCard>
    </FixedContentRow>
  )
}

export default function CurrencyList({
  height,
  currencies,
  otherListTokens,
  selectedCurrency,
  onCurrencySelect,
  otherCurrency,
  fixedListRef,
  showImportView,
  setImportToken,
  showCurrencyAmount,
  balanceSource,
  isCurrencySelected,
}: {
  height: number
  currencies: Currency[]
  otherListTokens?: WrappedTokenInfo[]
  selectedCurrency?: Currency | null
  onCurrencySelect: (currency: Currency) => void
  otherCurrency?: Currency | null
  fixedListRef?: MutableRefObject<FixedSizeList | undefined>
  showImportView: () => void
  setImportToken: (token: Token) => void
  showCurrencyAmount?: boolean
  balanceSource?: BalanceSource
  isCurrencySelected?: (iterCurrency: Currency, selectedCurrency: Currency | null | undefined) => boolean
}) {
  const itemData: (Currency | BreakLine)[] = useMemo(() => {
    if (otherListTokens && otherListTokens?.length > 0) {
      return [...currencies, BREAK_LINE, ...otherListTokens]
    }
    return currencies
  }, [currencies, otherListTokens])

  const Row = useCallback(
    function TokenRow({ data, index, style }) {
      const row: Currency | BreakLine = data[index]

      if (isBreakLine(row)) {
        return <BreakLineComponent style={style} />
      }

      const currency = row

      const isSelected = Boolean(
        (currency && selectedCurrency && selectedCurrency.equals(currency)) ||
          isCurrencySelected?.(currency, selectedCurrency)
      )
      const otherSelected = Boolean(currency && otherCurrency && otherCurrency.equals(currency))
      const handleSelect = () => currency && onCurrencySelect(currency)

      const token = currency?.wrapped

      const showImport = index > currencies.length

      if (showImport && token) {
        return (
          <ImportRow style={style} token={token} showImportView={showImportView} setImportToken={setImportToken} dim />
        )
      } else if (currency) {
        return (
          <CurrencyRow
            style={style}
            currency={currency}
            isSelected={isSelected}
            onSelect={handleSelect}
            otherSelected={otherSelected}
            showCurrencyAmount={showCurrencyAmount}
            balanceSource={balanceSource}
          />
        )
      } else {
        return null
      }
    },
    [
      currencies.length,
      onCurrencySelect,
      otherCurrency,
      selectedCurrency,
      setImportToken,
      showImportView,
      isCurrencySelected,
      showCurrencyAmount,
      balanceSource,
    ]
  )

  const itemKey = useCallback((index: number, data: typeof itemData) => {
    const currency = data[index]
    if (isBreakLine(currency)) return BREAK_LINE
    return currencyKey(currency)
  }, [])

  return (
    <FixedSizeList
      height={height}
      ref={fixedListRef as any}
      width="100%"
      itemData={itemData}
      itemCount={itemData.length}
      itemSize={56}
      itemKey={itemKey}
    >
      {Row}
    </FixedSizeList>
  )
}
