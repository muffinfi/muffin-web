import { Trans } from '@lingui/macro'
import { MuffinPositionDetail, useMuffinPositionDetails } from '@muffinfi/hooks/usePositions'
import { useMigratorContract } from '@muffinfi/migrator/hooks/useMigratorContract'
import * as M from '@muffinfi-ui'
import AlertHelper from '@muffinfi-ui/components/AlertHelper'
import { ReactComponent as UniLogo } from 'assets/svg/uniswap_logo.svg'
// import CTACards from './CTACards'
import DowntimeWarning from 'components/DowntimeWarning'
import Loader from 'components/Loader'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import PageTitle from 'components/PageTitle/PageTitle'
import { SubgraphIndexingAlertCard } from 'components/SubgraphIndexingNote'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import { getDefaultCurrencyId } from 'constants/tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useDebounce from 'hooks/useDebounce'
import useScrollToTopOnMount from 'hooks/useScrollToTopOnMount'
import { memo, useMemo } from 'react'
import { Inbox } from 'react-feather'
import { Link } from 'react-router-dom'
import { useWalletModalToggle } from 'state/application/hooks'
import { useUserHideClosedPositions } from 'state/user/hooks'
import styled from 'styled-components/macro'
import { HideSmall } from 'theme'

import { PositionListSection } from './PositionList/PositionListSection'
import { PositionValuesUpdater, usePositionValues } from './PositionList/PositionValuesUpdater'
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

const PositionsSummary = memo(function PositionsSummary({
  positionsLoading,
  positions,
}: {
  positionsLoading: boolean
  positions: MuffinPositionDetail[]
}) {
  const { isLoading: valuesLoading, totalValueETH, totalValueUSD, missingTokens } = usePositionValues(positions)
  const isLoadingDebounced = useDebounce(positionsLoading || valuesLoading, 100)
  const isLoading = isLoadingDebounced || positionsLoading || valuesLoading // only debounce "true -> false"

  const symbols = useMemo(() => missingTokens.map((t) => t.symbol).join(', '), [missingTokens])

  return (
    <M.Row gap="32px" wrap="wrap">
      <M.Column gap="8px" style={{ minWidth: 140 }}>
        <M.Text size="sm" color="text2">
          <Trans>Total Value (USD)</Trans>
        </M.Text>
        <M.Text size="xl" weight="semibold">
          ${totalValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}{' '}
          {isLoading ? (
            <Loader stroke="var(--text2)" />
          ) : missingTokens.length > 0 ? (
            <AlertHelper text={<Trans>We are unable to evaluate {symbols} value.</Trans>} />
          ) : null}
        </M.Text>
      </M.Column>

      <M.Column gap="8px" style={{ minWidth: 140 }}>
        <M.Text size="sm" color="text2">
          <Trans>Total Value (ETH)</Trans>
        </M.Text>
        <M.Text size="xl" weight="semibold">
          Ξ{totalValueETH.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}{' '}
          {isLoading ? (
            <Loader stroke="var(--text2)" />
          ) : missingTokens.length > 0 ? (
            <AlertHelper text={<Trans>We are unable to evaluate {symbols} value.</Trans>} />
          ) : null}
        </M.Text>
      </M.Column>

      <M.Column gap="8px" style={{ minWidth: 140 }}>
        <M.Text size="sm" color="text2">
          <Trans>Position Count</Trans>
        </M.Text>
        <M.Text size="xl" weight="semibold">
          {positions.length} {positionsLoading ? <Loader stroke="var(--text2)" /> : null}
        </M.Text>
      </M.Column>
    </M.Row>
  )
})

export default function Pool() {
  const { account, chainId } = useActiveWeb3React()
  const toggleWalletModal = useWalletModalToggle()

  const migratorContract = useMigratorContract()
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
      <PageTitle title="Positions" />
      <M.Container maxWidth="1050px">
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
            <M.Row gap="0.5rem">
              {migratorContract && (
                <M.ButtonSecondary id="migrate-from-uniswap-button" as={Link} to="/migrate/univ3">
                  <UniLogo style={{ marginLeft: -4 }} width={24} height={24} />
                  <Trans>Migrate</Trans>
                </M.ButtonSecondary>
              )}
              <M.ButtonPrimary id="join-pool-button" as={Link} to={`/add/${getDefaultCurrencyId(chainId)}`}>
                + <Trans>New Position</Trans>
              </M.ButtonPrimary>
            </M.Row>
          </M.RowBetween>

          <PositionsSummary positionsLoading={positionsLoading} positions={filteredPositions} />

          {positionsLoading ? (
            <M.SectionCard>
              <PositionsLoadingPlaceholder />
            </M.SectionCard>
          ) : filteredPositions && closedPositions && filteredPositions.length > 0 ? (
            <>
              <PositionValuesUpdater positionDetails={filteredPositions} />
              <PositionListSection positionDetails={filteredPositions} />
            </>
          ) : (
            <M.SectionCard>
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
            </M.SectionCard>
          )}

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
