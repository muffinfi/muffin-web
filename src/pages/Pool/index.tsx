import { Trans } from '@lingui/macro'
import { MuffinPositionDetail, useMuffinPositionDetails } from '@muffinfi/hooks/usePositions'
import * as M from '@muffinfi-ui'
// import CTACards from './CTACards'
import DowntimeWarning from 'components/DowntimeWarning'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import { SubgraphIndexingAlertCard } from 'components/SubgraphIndexingNote'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import { getDefaultCurrencyId } from 'constants/tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useScrollToTopOnMount from 'hooks/useScrollToTopOnMount'
import { useMemo } from 'react'
import { Inbox } from 'react-feather'
import { Link } from 'react-router-dom'
import { useWalletModalToggle } from 'state/application/hooks'
import { useUserHideClosedPositions } from 'state/user/hooks'
import styled from 'styled-components/macro'
import { HideSmall } from 'theme'

import PositionList from './PositionList'
import { LoadingRows } from './styleds'

const NoLiquidity = styled(M.ColumnCenter)`
  margin: auto;

  min-height: 25vh;
  max-width: 300px;
  text-align: center;
  padding: 24px 0;
  color: var(--text3);

  justify-content: center;
  gap: 16px;
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
  const { account, chainId } = useActiveWeb3React()
  const toggleWalletModal = useWalletModalToggle()

  const [userHideClosedPositions, setUserHideClosedPositions] = useUserHideClosedPositions()

  const { positions, loading: positionsLoading, subgraphBlockNumber } = useMuffinPositionDetails(account)

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

  useScrollToTopOnMount()

  return (
    <>
      <M.Container maxWidth="980px">
        <M.Column stretch gap="32px">
          <M.RowBetween wrap="wrap" gap="1em">
            <M.Column gap="8px">
              <M.Text size="xl" weight="bold">
                <Trans>Positions</Trans>
              </M.Text>
              <M.Text color="text2" size="sm">
                <Trans>Provide liquidity and earn fees on Muffin.</Trans>
              </M.Text>
            </M.Column>
            <M.ButtonPrimary id="join-pool-button" as={Link} to={`/add/${getDefaultCurrencyId(chainId)}`}>
              + <Trans>New Position</Trans>
            </M.ButtonPrimary>
          </M.RowBetween>

          <M.SectionCard>
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
                    <Trans>Your active liquidity positions will appear here.</Trans>
                  </div>
                </div>
                {!showConnectAWallet && closedPositions.length > 0 && (
                  <M.Anchor color="text1" onClick={() => setUserHideClosedPositions(!userHideClosedPositions)}>
                    <Trans>Show closed positions</Trans>
                  </M.Anchor>
                )}
                {showConnectAWallet && (
                  <M.ButtonSecondary onClick={toggleWalletModal}>
                    <Trans>Connect a wallet</Trans>
                  </M.ButtonSecondary>
                )}
              </NoLiquidity>
            )}
          </M.SectionCard>

          <SubgraphIndexingAlertCard blockNumber={subgraphBlockNumber}>
            <Trans>
              If you can&apos;t see your new positions, please wait for a few minutes due to the delay in subgraph
              indexing.
            </Trans>
          </SubgraphIndexingAlertCard>
        </M.Column>
        <HideSmall>
          <NetworkAlert />
          <DowntimeWarning />
          {/* DW: TODO: add CTA cards */}
          {/* <CTACards /> */}
        </HideSmall>
        <SwitchLocaleLink />
      </M.Container>
    </>
  )
}
