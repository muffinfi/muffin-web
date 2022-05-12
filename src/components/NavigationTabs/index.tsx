import { Trans } from '@lingui/macro'
import { Percent } from '@uniswap/sdk-core'
import useTheme from 'hooks/useTheme'
import { ReactNode } from 'react'
import { ArrowLeft } from 'react-feather'
import { Link as HistoryLink } from 'react-router-dom'
import { Box } from 'rebass'
import { useAppDispatch } from 'state/hooks'
// import { resetMintState } from 'state/mint/actions'
import { resetMintState as resetMintV3State } from 'state/mint/v3/actions'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'

import Row, { RowBetween } from '../Row'
import SettingsTab from '../Settings'

const Tabs = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  border-radius: 3rem;
  justify-content: space-evenly;
`

const StyledHistoryLink = styled(HistoryLink)<{ flex?: string }>`
  flex: ${({ flex }) => flex ?? 'none'};

  ${({ theme }) => theme.mediaWidth.upToMedium`
    flex: none;
    margin-right: 10px;
  `};
`

const ActiveText = styled.div`
  font-weight: 500;
  font-size: 20px;
`

const StyledArrowLeft = styled(ArrowLeft)`
  color: ${({ theme }) => theme.text1};
`

export function AddRemoveTabs({
  adding,
  creating,
  defaultSlippage,
  positionID,
  children,
}: {
  adding: boolean
  creating: boolean
  defaultSlippage: Percent
  positionID?: string | undefined
  showBackLink?: boolean
  children?: ReactNode | undefined
}) {
  const theme = useTheme()
  // reset states on back
  const dispatch = useAppDispatch()

  return (
    <Tabs>
      <RowBetween style={{ marginBottom: '20px' }}>
        <StyledHistoryLink
          to={'/positions' + (!!positionID ? `/${positionID.toString()}` : '')}
          onClick={() => {
            if (adding) {
              // not 100% sure both of these are needed
              // dispatch(resetMintState())
              dispatch(resetMintV3State())
            }
          }}
          flex={children ? '1' : undefined}
        >
          <StyledArrowLeft stroke={theme.text2} />
        </StyledHistoryLink>
        <ThemedText.MediumHeader
          fontWeight={600}
          fontSize={20}
          style={{ flex: '1', margin: 'auto', textAlign: children ? 'start' : 'center' }}
        >
          {creating ? (
            <Trans>Create a pair</Trans>
          ) : adding ? (
            <Trans>Add Liquidity</Trans>
          ) : (
            <Trans>Remove Liquidity</Trans>
          )}
        </ThemedText.MediumHeader>
        <Box style={{ marginRight: '.5rem' }}>{children}</Box>
        <SettingsTab placeholderSlippage={defaultSlippage} noDeadline={true} />
      </RowBetween>
    </Tabs>
  )
}

export function CreateProposalTabs() {
  return (
    <Tabs>
      <Row style={{ padding: '1rem 1rem 0 1rem' }}>
        <HistoryLink to="/vote">
          <StyledArrowLeft />
        </HistoryLink>
        <ActiveText style={{ marginLeft: 'auto', marginRight: 'auto' }}>Create Proposal</ActiveText>
      </Row>
    </Tabs>
  )
}

export function DepositWithdrawTabs({ title }: { title: ReactNode }) {
  const theme = useTheme()
  return (
    <Tabs>
      <RowBetween style={{ padding: '1rem 1rem 0 1rem', position: 'relative' }}>
        <StyledHistoryLink to="/account">
          <StyledArrowLeft stroke={theme.text2} />
        </StyledHistoryLink>
        <ThemedText.MediumHeader
          fontWeight={500}
          fontSize={20}
          textAlign="center"
          flexGrow={1}
          style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
        >
          {title}
        </ThemedText.MediumHeader>
      </RowBetween>
    </Tabs>
  )
}
