import { Trans } from '@lingui/macro'
import styled from 'styled-components/macro'
import { ThemedText } from '../../theme'
import { RowBetween, RowFixed } from '../Row'

const StyledAccountHeader = styled.div`
  padding: 1rem 1.25rem 0.5rem 1.25rem;
  width: 100%;
  color: ${({ theme }) => theme.text2};
`

export default function AccountHeader() {
  return (
    <StyledAccountHeader>
      <RowBetween>
        <RowFixed>
          <ThemedText.Black fontWeight={500} fontSize={16} style={{ marginRight: '8px' }}>
            <Trans>Balances</Trans>
          </ThemedText.Black>
        </RowFixed>
        {/* <RowFixed>
          <SettingsTab placeholderSlippage={allowedSlippage} />
        </RowFixed> */}
      </RowBetween>
    </StyledAccountHeader>
  )
}
