import { Trans } from '@lingui/macro'
import { MuffinPositionDetail, useMuffinPositionDetails } from '@muffinfi/hooks/usePositions'
import * as DS from 'components/@DS'
import { ButtonText } from 'components/Button'
import { AutoColumn } from 'components/Column'
import DowntimeWarning from 'components/DowntimeWarning'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import PositionList from 'components/PositionList'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useMemo } from 'react'
import { Inbox } from 'react-feather'
import { Link } from 'react-router-dom'
import { useWalletModalToggle } from 'state/application/hooks'
import { useUserHideClosedPositions } from 'state/user/hooks'
import styled from 'styled-components/macro'
import { HideSmall } from 'theme'
// import CTACards from './CTACards'
import { LoadingRows } from './styleds'

const PageWrapper = styled(AutoColumn)`
  max-width: 800px;
  width: 100%;
`

const MainCard = styled.main`
  display: flex;
  flex-direction: column;

  background-color: var(--bg0);
  padding: 24px;
  border-radius: 20px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    padding: 8px;
  `}
`

const NoLiquidity = styled.div`
  align-self: center;

  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;

  max-width: 300px;
  min-height: 25vh;

  color: var(--text3);
  text-align: center;

  padding: 24px 0;
  gap: 8px;
`

function PositionsLoadingPlaceholder() {
  return (
    <LoadingRows>
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
    </LoadingRows>
  )
}

export default function Pool() {
  const { account } = useActiveWeb3React()
  const toggleWalletModal = useWalletModalToggle()

  const [userHideClosedPositions, setUserHideClosedPositions] = useUserHideClosedPositions()

  const { positions, loading: positionsLoading } = useMuffinPositionDetails(account)

  const [openPositions, closedPositions] = useMemo(
    () =>
      positions?.reduce<[MuffinPositionDetail[], MuffinPositionDetail[]]>(
        (acc, p) => {
          acc[p.liquidityD8?.isZero() ? 1 : 0].push(p)
          return acc
        },
        [[], []]
      ) ?? [[], []],
    [positions]
  )

  const filteredPositions = useMemo(
    () => [...openPositions, ...(userHideClosedPositions ? [] : closedPositions)],
    [userHideClosedPositions, openPositions, closedPositions]
  )
  const showConnectAWallet = Boolean(!account)

  return (
    <>
      <PageWrapper gap="lg">
        <DS.PageTitleRow style={{ marginTop: '1rem' }}>
          <DS.H1>
            <Trans>Pools Overview</Trans>
          </DS.H1>
          <DS.ButtonPrimary id="join-pool-button" as={Link} to="/add/ETH">
            + <Trans>New Position</Trans>
          </DS.ButtonPrimary>
        </DS.PageTitleRow>

        <MainCard>
          {positionsLoading ? (
            <PositionsLoadingPlaceholder />
          ) : filteredPositions && closedPositions && filteredPositions.length > 0 ? (
            <PositionList
              positions={filteredPositions}
              setUserHideClosedPositions={setUserHideClosedPositions}
              userHideClosedPositions={userHideClosedPositions}
            />
          ) : (
            <NoLiquidity>
              <div>
                <Inbox size={48} strokeWidth={1} />
                <div>
                  <Trans>Your active V3 liquidity positions will appear here.</Trans>
                </div>
              </div>
              {!showConnectAWallet && closedPositions.length > 0 && (
                <ButtonText onClick={() => setUserHideClosedPositions(!userHideClosedPositions)}>
                  <Trans>Show closed positions</Trans>
                </ButtonText>
              )}
              {showConnectAWallet && (
                <DS.ButtonPrimary style={{ marginTop: '1em' }} onClick={toggleWalletModal}>
                  <Trans>Connect a wallet</Trans>
                </DS.ButtonPrimary>
              )}
            </NoLiquidity>
          )}
        </MainCard>
        <HideSmall>
          <NetworkAlert />
          <DowntimeWarning />
          {/* DW: TODO: add CTA cards */}
          {/* <CTACards /> */}
        </HideSmall>
      </PageWrapper>
      <SwitchLocaleLink />
    </>
  )
}
