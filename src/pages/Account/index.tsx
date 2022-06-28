import { Trans } from '@lingui/macro'
import { useAccountTokens } from '@muffinfi/hooks/account/useAccountTokens'
import { useUserShowUntrustesTokens, useUserShowZeroBalanceTokens } from '@muffinfi/state/user/hooks'
import * as M from '@muffinfi-ui'
import TokenRow from 'components/account/TokenRow'
import { LoadingRows } from 'components/Loader/styled'
import { SubgraphIndexingAlertCard } from 'components/SubgraphIndexingNote'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import { useAllTokens } from 'hooks/Tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useScrollToTopOnMount from 'hooks/useScrollToTopOnMount'
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
      <M.Container maxWidth="28rem">
        <M.Column stretch gap="32px">
          <M.RowBetween wrap="wrap" gap="2em">
            <M.Text size="xl" weight="bold">
              <Trans>Account</Trans>
            </M.Text>

            <M.Row wrap="wrap" gap="0.75em">
              <M.ButtonSecondary id="account-withdraw-button" as={Link} to="/account/withdraw">
                <Trans>Withdraw</Trans>
              </M.ButtonSecondary>
              <M.ButtonPrimary id="account-withdraw-button" as={Link} to="/account/deposit">
                <Trans>Deposit</Trans>
              </M.ButtonPrimary>
            </M.Row>
          </M.RowBetween>

          <M.SectionCard greedyMargin>
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
                <NoTokens>No tokens found</NoTokens>
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
