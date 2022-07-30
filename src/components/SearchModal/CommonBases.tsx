import { Trans } from '@lingui/macro'
import { Currency } from '@uniswap/sdk-core'
import { AutoColumn } from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import { AutoRow } from 'components/Row'
import { MouseoverTooltip } from 'components/Tooltip'
import { getChainDisplayName } from 'constants/chains'
import { COMMON_BASES } from 'constants/routing'
import { isDisallowedCurrency } from 'constants/tokens'
import { useTokenInfoFromActiveList } from 'hooks/useTokenInfoFromActiveList'
import { useMemo } from 'react'
import { Text } from 'rebass'
import styled from 'styled-components/macro'
import { currencyId } from 'utils/currencyId'

const MobileWrapper = styled(AutoColumn)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    display: none;
  `};
`

const BaseWrapper = styled.div<{ disable?: boolean }>`
  border: 1px solid ${({ disable }) => (disable ? 'transparent' : 'var(--borderColor)')};
  border-radius: 10px;
  display: flex;
  padding: 6px;

  align-items: center;
  :hover {
    cursor: ${({ disable }) => !disable && 'pointer'};
    background-color: ${({ disable }) => !disable && 'var(--layer2)'};
  }

  opacity: ${({ disable }) => disable && '0.6'};
  color: ${({ disable }) => disable && 'var(--disabled-text)'};
  background-color: ${({ disable }) => disable && 'var(--disabled)'};
  filter: ${({ disable }) => disable && 'grayscale(1)'};
`

export default function CommonBases({
  chainId,
  onSelect,
  selectedCurrency,
  disableNonToken,
  isCurrencySelected,
}: {
  chainId?: number
  selectedCurrency?: Currency | null
  isCurrencySelected?: (iterCurrency: Currency, selectedCurrency: Currency | null | undefined) => boolean
  disableNonToken?: boolean
  onSelect: (currency: Currency) => void
}) {
  const bases = useMemo(() => {
    if (typeof chainId === 'undefined') return []
    const currencies = COMMON_BASES[chainId] ?? []

    if (!disableNonToken) return currencies
    return currencies.filter((currency) => currency.isToken)
  }, [chainId, disableNonToken])

  return bases.length > 0 ? (
    <MobileWrapper gap="md">
      <AutoRow gap="4px">
        {bases.map((currency: Currency) => {
          const disallowed = isDisallowedCurrency(chainId, currency)
          const disallowedOrSelected =
            disallowed || selectedCurrency?.equals(currency) || isCurrencySelected?.(currency, selectedCurrency)

          const makeInner = () => (
            <BaseWrapper
              onClick={() => !disallowedOrSelected && onSelect(currency)}
              disable={disallowedOrSelected}
              key={currencyId(currency)}
            >
              <CurrencyLogoFromList currency={currency} />
              <Text fontWeight={500} fontSize={16}>
                {currency.symbol}
              </Text>
            </BaseWrapper>
          )

          if (disallowed) {
            const chainName = getChainDisplayName(chainId)
            return (
              <MouseoverTooltip
                key={currencyId(currency)}
                text={<Trans>This token is disallowed here on {chainName}.</Trans>}
              >
                {makeInner()}
              </MouseoverTooltip>
            )
          }

          return makeInner()
        })}
      </AutoRow>
    </MobileWrapper>
  ) : null
}

/** helper component to retrieve a base currency from the active token lists */
function CurrencyLogoFromList({ currency }: { currency: Currency }) {
  const token = useTokenInfoFromActiveList(currency)

  return <CurrencyLogo currency={token} style={{ marginRight: 8 }} />
}
