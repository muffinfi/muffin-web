import { Trans } from '@lingui/macro'
import QuestionHelper from 'components/QuestionHelper'
import { RowBetween, RowFixed } from 'components/Row'
import { ToggleElement, ToggleWrapper } from 'components/Toggle/MultiToggle'
import useTheme from 'hooks/useTheme'
import { ReactNode } from 'react'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'

const StyledToggleContainer = styled.div`
  width: fit-content;
  display: flex;
  align-items: center;
`

type TokenDestinationToggleRowProps = {
  toInternalAccount: boolean
  questionHelperContent?: ReactNode
  onToggle: () => void
} & Parameters<typeof RowBetween>[0]

export default function TokenDestinationToggleRow({
  toInternalAccount,
  questionHelperContent,
  onToggle,
  ...props
}: TokenDestinationToggleRowProps) {
  const theme = useTheme()
  return (
    <RowBetween {...props}>
      <RowFixed>
        <ThemedText.Black fontWeight={400} fontSize={14} color={theme.text2}>
          <Trans>Store token into</Trans>
        </ThemedText.Black>
        {questionHelperContent && <QuestionHelper text={questionHelperContent} />}
      </RowFixed>
      <RowFixed>
        <StyledToggleContainer onClick={onToggle}>
          <ToggleWrapper width="fit-content">
            <ToggleElement isActive={toInternalAccount} fontSize="12px">
              <Trans>Muffin Account</Trans>
            </ToggleElement>
            <ToggleElement isActive={!toInternalAccount} fontSize="12px">
              <Trans>Wallet</Trans>
            </ToggleElement>
          </ToggleWrapper>
        </StyledToggleContainer>
      </RowFixed>
    </RowBetween>
  )
}
