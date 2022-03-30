import { Trans } from '@lingui/macro'
import { Token } from '@uniswap/sdk-core'
import { ButtonText } from 'components/Button'
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
    justify-content: space-between;
    & > div:last-child {
      text-align: right;
      margin-right: 12px;
    }
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
  tokenList,
  showZeroTokens,
  setShowZeroTokens,
}: {
  tokenList?: Token[]
  showZeroTokens: boolean
  setShowZeroTokens: (show: boolean) => void
}) {
  return (
    <StyledAccountHeader>
      <DesktopHeader>
        <div>
          <Trans>Balances</Trans>
        </div>
        {tokenList && tokenList.length > 0 && (
          <ButtonText style={{ opacity: 0.6 }} onClick={() => setShowZeroTokens(!showZeroTokens)}>
            {showZeroTokens ? <Trans>Hide zero balances</Trans> : <Trans>Show zero balances</Trans>}
          </ButtonText>
        )}
      </DesktopHeader>
      <MobileHeader>
        <Trans>Balances</Trans>
      </MobileHeader>
    </StyledAccountHeader>
  )
}
