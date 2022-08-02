import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { Currency } from '@uniswap/sdk-core'
import Card, { OutlineCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import Modal from 'components/Modal'
import { AutoRow, RowBetween } from 'components/Row'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useState } from 'react'
import styled from 'styled-components/macro'
import { CloseIcon, ExternalLink, ThemedText } from 'theme'
import { currencyId } from 'utils/currencyId'

import { useUnsupportedCurrenciesById } from '../../hooks/Tokens'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'

const AddressText = styled(ThemedText.Blue)`
  font-size: 12px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size: 10px;
`}
`

export default function UnsupportedCurrencyFooter({ currencies }: { currencies: (Currency | undefined | null)[] }) {
  const { chainId } = useActiveWeb3React()
  const [showDetails, setShowDetails] = useState(false)

  const unsupportedCurrenciesById = useUnsupportedCurrenciesById()

  return (
    <div>
      <Modal isOpen={showDetails} onDismiss={() => setShowDetails(false)}>
        <Card padding="2rem">
          <AutoColumn gap="lg">
            <RowBetween>
              <ThemedText.MediumHeader>
                <Trans>Unsupported Assets</Trans>
              </ThemedText.MediumHeader>
              <CloseIcon onClick={() => setShowDetails(false)} />
            </RowBetween>
            {currencies.map((currency) => {
              return (
                currency &&
                unsupportedCurrenciesById &&
                Object.keys(unsupportedCurrenciesById).includes(currencyId(currency)) && (
                  <OutlineCard key={currencyId(currency).concat('not-supported')}>
                    <AutoColumn gap="10px">
                      <AutoRow gap="5px" align="center">
                        <CurrencyLogo currency={currency} size={'24px'} />
                        <ThemedText.Body fontWeight={500}>{currency.symbol}</ThemedText.Body>
                      </AutoRow>
                      {currency.isToken && chainId && (
                        <ExternalLink href={getExplorerLink(chainId, currency.address, ExplorerDataType.ADDRESS)}>
                          <AddressText>{currency.address}</AddressText>
                        </ExternalLink>
                      )}
                    </AutoColumn>
                  </OutlineCard>
                )
              )
            })}
            <AutoColumn gap="lg">
              <ThemedText.Body fontWeight={500}>
                <Trans>
                  Some assets are not available through this interface because they may not work well with the smart
                  contracts or we are unable to allow trading for legal reasons.
                </Trans>
              </ThemedText.Body>
            </AutoColumn>
          </AutoColumn>
        </Card>
      </Modal>

      <M.Anchor
        color="primary0"
        hoverColor="primary2"
        weight="medium"
        role="button"
        onClick={() => setShowDetails(true)}
      >
        <Trans>Read more about unsupported assets</Trans>
      </M.Anchor>
    </div>
  )
}
