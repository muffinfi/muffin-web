import { Trans } from '@lingui/macro'
import { useAccountTokens } from '@muffinfi/hooks/account/useAccountTokens'
import { useUserShowUntrustesTokens, useUserShowZeroBalanceTokens } from '@muffinfi/state/user/hooks'
import * as M from '@muffinfi-ui'
import TokenRow from 'components/account/TokenRow'
import { LoadingRows } from 'components/Loader/styled'
import PageTitle from 'components/PageTitle/PageTitle'
import { SubgraphIndexingAlertCard } from 'components/SubgraphIndexingNote'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import { MouseoverTooltip } from 'components/Tooltip'
import { useAllTokens } from 'hooks/Tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useScrollToTopOnMount from 'hooks/useScrollToTopOnMount'
import { Info } from 'react-feather'
import { Link, RouteComponentProps } from 'react-router-dom'
import styled from 'styled-components/macro'

const StyledLoadingRows = styled(LoadingRows)`
  row-gap: 8px;

  & > div {
    height: 56px;
  }
`

const NoTokens = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 10rem;
`

const InputCheckbox = styled.input.attrs({ type: 'checkbox' })`
  width: 12px;
  height: 12px;
`

export default function Account(props: RouteComponentProps) {
  const { account } = useActiveWeb3React()
  const { isLoading, tokenIds, subgraphBlockNumber } = useAccountTokens(account)
  const allTokens = useAllTokens()

  const [showZeroBalance, setShowZeroBalance] = useUserShowZeroBalanceTokens()
  const [showUntrustedTokens, setShowUntrustedTokens] = useUserShowUntrustesTokens()

  const hasTokens = tokenIds && tokenIds.length > 0

  useScrollToTopOnMount()

  return (
    <>
      <PageTitle title="Account" />

      <M.Container maxWidth="34rem">
        <M.Column stretch gap="32px">
          <M.RowBetween wrap="wrap" gap="1em">
            <M.Column gap="8px">
              <M.Text size="xl" weight="bold">
                <Trans>Account</Trans>
              </M.Text>
              <M.Column gap="8px" style={{ maxWidth: '17rem' }}>
                <M.Text color="text2" size="sm">
                  <Trans>Your internal token balances in Muffin.</Trans>
                </M.Text>
                <M.TextDiv color="primary1" size="sm" weight="medium">
                  <MouseoverTooltip
                    text={
                      <Trans>
                        You can use Account to pay or receive tokens in swap or liquidity addition or removal.
                        <br />
                        <br />
                        <M.Text weight="semibold">It saves 10&ndash;30% gas</M.Text> comparing to using your own wallet.
                        Useful when you&rsquo;re an active trader or LP here.
                      </Trans>
                    }
                  >
                    <M.Row gap="0.33em">
                      <Info size="1em" />
                      When to use?
                    </M.Row>
                  </MouseoverTooltip>
                </M.TextDiv>
              </M.Column>
            </M.Column>

            <M.Row wrap="wrap" gap="0.75em">
              <M.ButtonSecondary id="account-withdraw-button" as={Link} to="/account/withdraw">
                <Trans>Withdraw</Trans>
              </M.ButtonSecondary>
              <M.ButtonPrimary id="account-withdraw-button" as={Link} to="/account/deposit">
                <Trans>Deposit</Trans>
              </M.ButtonPrimary>
            </M.Row>
          </M.RowBetween>

          <M.SectionCard padding="1.5rem 1.5rem 1rem">
            <M.Column stretch gap="24px">
              <M.RowBetween>
                <M.Text size="sm" weight="semibold">
                  <Trans>Account Balances</Trans>
                </M.Text>
                <M.TextDiv size="xs" color="text2">
                  <M.Row wrap="wrap" columnGap="1em" rowGap="0.25em" style={{ justifyContent: 'flex-end' }}>
                    <M.Row gap="0.25em" as="label">
                      <InputCheckbox
                        checked={showZeroBalance}
                        onChange={(event) => setShowZeroBalance(event.target.checked)}
                      />
                      <Trans>Show zero</Trans>
                    </M.Row>

                    <M.Row gap="0.25em" as="label">
                      <InputCheckbox
                        checked={showUntrustedTokens}
                        onChange={(event) => setShowUntrustedTokens(event.target.checked)}
                      />
                      <Trans>Show untrusted tokens</Trans>
                    </M.Row>
                  </M.Row>
                </M.TextDiv>
              </M.RowBetween>

              {isLoading ? (
                <StyledLoadingRows>
                  <div />
                  <div />
                  <div />
                  <div />
                </StyledLoadingRows>
              ) : hasTokens ? (
                <M.Column stretch gap="0px">
                  {tokenIds?.map((tokenId) => (
                    <TokenRow
                      key={tokenId}
                      tokenId={tokenId}
                      showZeroBalance={showZeroBalance}
                      trusted={Boolean(allTokens[tokenId])}
                      showUntrusted={showUntrustedTokens}
                    />
                  ))}
                </M.Column>
              ) : (
                <NoTokens>
                  <Trans>No tokens found</Trans>
                </NoTokens>
              )}
            </M.Column>
          </M.SectionCard>

          <SubgraphIndexingAlertCard blockNumber={subgraphBlockNumber}>
            <Trans>
              If you can&apos;t see your recent deposited tokens, please wait awhile due to the delay in subgraph
              indexing.
            </Trans>
          </SubgraphIndexingAlertCard>
        </M.Column>
      </M.Container>

      <SwitchLocaleLink />
    </>
  )
}
