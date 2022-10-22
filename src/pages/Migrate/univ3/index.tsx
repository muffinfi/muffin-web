import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import DowntimeWarning from 'components/DowntimeWarning'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import PageTitle from 'components/PageTitle/PageTitle'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useScrollToTopOnMount from 'hooks/useScrollToTopOnMount'
import { useV3Positions } from 'hooks/useV3Positions'
import { TokenPricesUpdater } from 'pages/Pool/PositionList/PositionValuesUpdater'
import { useMemo } from 'react'
import { ExternalLink, Inbox } from 'react-feather'
import { useWalletModalToggle } from 'state/application/hooks'
import styled from 'styled-components/macro'
import { HideSmall } from 'theme'

import { LoadingRows } from '../styled'
import { PositionListSection } from './PositionList/PositionListSection'

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

export function UniV3List() {
  const { account } = useActiveWeb3React()
  const toggleWalletModal = useWalletModalToggle()
  const { positions, loading } = useV3Positions(account)
  const activePositions = useMemo(
    () => positions?.filter((position) => position.liquidity.gt(0)).reverse() ?? [],
    [positions]
  )

  const showConnectAWallet = Boolean(!account)

  useScrollToTopOnMount()

  return (
    <>
      <PageTitle title="Migrate Uniswap V3 position to Muffin" />

      <M.Container maxWidth="1050px">
        <M.Column stretch gap="32px">
          <M.Link color="text2" to="/positions">
            <Trans>← Back</Trans>
          </M.Link>

          <M.Text size="xl" weight="bold">
            <Trans>Migrate Liquidity</Trans>
          </M.Text>

          <M.Column>
            <M.Text paragraphLineHeight color="text2" size="sm">
              <Trans>Select a position to migrate liquidity from Uniswap V3 to Muffin.</Trans>
            </M.Text>
            <M.Text paragraphLineHeight color="text2" size="sm">
              <Trans>
                The migration is done by the{' '}
                <M.ExternalLink
                  color="primary0"
                  hoverColor="primary1"
                  href="https://github.com/muffinfi/muffin-migrator"
                >
                  Muffin migrator contract <ExternalLink size="1em" style={{ marginBottom: -1 }} />
                </M.ExternalLink>
              </Trans>
            </M.Text>
          </M.Column>

          {loading ? (
            <M.SectionCard>
              <PositionsLoadingPlaceholder />
            </M.SectionCard>
          ) : activePositions.length > 0 ? (
            <>
              <TokenPricesUpdater positionDetails={activePositions} />
              <PositionListSection positionDetails={activePositions} />
            </>
          ) : (
            <M.SectionCard>
              <NoLiquidity>
                <div>
                  <Inbox size={48} strokeWidth={1} />
                  <div>
                    <Trans>Your unclosed positions from Uniswap V3 will appear here.</Trans>
                  </div>
                </div>
                {showConnectAWallet && (
                  <M.ButtonSecondary onClick={toggleWalletModal}>
                    <Trans>Connect a wallet</Trans>
                  </M.ButtonSecondary>
                )}
              </NoLiquidity>
            </M.SectionCard>
          )}
        </M.Column>
        <HideSmall>
          <NetworkAlert />
          <DowntimeWarning />
        </HideSmall>
        <SwitchLocaleLink />
      </M.Container>
    </>
  )
}
