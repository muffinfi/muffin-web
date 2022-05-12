import { Trans } from '@lingui/macro'
import { ButtonText } from 'components/Button'
import { AutoRow } from 'components/Row'
import { Text } from 'rebass'
import styled from 'styled-components/macro'

import { MEDIA_WIDTHS } from '../../theme'

const StyledAccountHeader = styled.div`
  padding: 1rem 1.25rem 0.5rem 1.25rem;
  width: 100%;
  color: ${({ theme }) => theme.text2};
`

const DesktopHeader = styled.div`
  display: none;
  font-size: 14px;
  font-weight: 500;

  @media screen and (min-width: ${MEDIA_WIDTHS.upToSmall}px) {
    align-items: center;
    display: flex;
  }
`

const MobileHeader = styled.div`
  font-weight: medium;
  font-size: 16px;
  font-weight: 500;

  @media screen and (min-width: ${MEDIA_WIDTHS.upToSmall}px) {
    display: none;
  }
`

export default function AccountHeader({
  showFilter,
  showZeroBalance,
  setShowZeroBalance,
  showUntrusted,
  setShowUntrusted,
}: {
  showFilter?: boolean
  showZeroBalance?: boolean
  setShowZeroBalance?: (show: boolean) => void
  showUntrusted?: boolean
  setShowUntrusted?: (show: boolean) => void
}) {
  return (
    <StyledAccountHeader>
      <DesktopHeader>
        <Text>
          <Trans>Balances</Trans>
        </Text>
        {showFilter && (
          <AutoRow justify="flex-end" gap="8px" flexGrow={1}>
            {setShowZeroBalance && (
              <ButtonText style={{ opacity: 0.6 }} onClick={() => setShowZeroBalance(!showZeroBalance)}>
                {showZeroBalance ? <Trans>Hide zero</Trans> : <Trans>Show zero</Trans>}
              </ButtonText>
            )}
            {setShowUntrusted && (
              <ButtonText style={{ opacity: 0.6 }} onClick={() => setShowUntrusted(!showUntrusted)}>
                {showUntrusted ? <Trans>Hide untrusted tokens</Trans> : <Trans>Show untrusted tokens</Trans>}
              </ButtonText>
            )}
          </AutoRow>
        )}
      </DesktopHeader>
      <MobileHeader>
        <Trans>Balances</Trans>
      </MobileHeader>
    </StyledAccountHeader>
  )
}
