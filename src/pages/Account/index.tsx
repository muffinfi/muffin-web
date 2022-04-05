import { Trans } from '@lingui/macro'
import { useAccountTokens } from '@muffinfi/hooks/account/useAccountTokens'
import { useUserShowUntrustesTokens, useUserShowZeroBalanceTokens } from '@muffinfi/state/user/hooks'
import AccountHeader from 'components/account/AccountHeader'
import { Wrapper } from 'components/account/styleds'
import TokenRow from 'components/account/TokenRow'
import { ButtonLight, ButtonPrimary } from 'components/Button'
import { LoadingRows } from 'components/Loader/styled'
import { RowBetween, RowFixed } from 'components/Row'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import { useAllTokens } from 'hooks/Tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import AppBody from 'pages/AppBody'
import { Link, RouteComponentProps } from 'react-router-dom'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'

const TitleRow = styled(RowBetween)`
  position: relative;
  max-width: 480px;
  width: 100%;

  padding: 0 4px;

  color: ${({ theme }) => theme.text2};
  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-wrap: wrap;
    gap: 12px;
  `};
`

const ButtonRow = styled(RowFixed)`
  & > * {
    border-radius: 12px;
    padding: 6px 8px;
    width: fit-content;
  }

  & > *:not(:last-child) {
    margin-right: 8px;
  }

  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    flex-direction: row-reverse;

    & > * {
      flex: 1 1 auto;
      width: 100%;
    }

    & > *:not(:last-child) {
      margin-right: 0;
      margin-left: 8px;
    }
  `};
`

const StyledLoadingRows = styled(LoadingRows)`
  row-gap: 8px;

  & > div {
    height: 56px;
  }
`

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
`

const NoTokens = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 10rem;
`

export default function Account(props: RouteComponentProps) {
  const { account } = useActiveWeb3React()
  const { isLoading, tokenIds } = useAccountTokens(account)
  const allTokens = useAllTokens()

  const [showZeroBalance, setShowZeroBalance] = useUserShowZeroBalanceTokens()
  const [showUntrustedTokens, setShowUntrustedTokens] = useUserShowUntrustesTokens()

  const hasTokens = tokenIds && tokenIds.length > 0

  return (
    <>
      <TitleRow style={{ marginTop: '1rem' }} padding={'0'}>
        <ThemedText.Body fontSize={'20px'}>
          <Trans>Account Overview</Trans>
        </ThemedText.Body>
        <ButtonRow>
          <ButtonLight id="account-withdraw-button" as={Link} to="/account/withdraw">
            <Trans>Withdraw</Trans>
          </ButtonLight>
          <ButtonPrimary id="account-deposit-button" as={Link} to="/account/deposit">
            <Trans>Deposit</Trans>
          </ButtonPrimary>
        </ButtonRow>
      </TitleRow>
      <AppBody>
        <AccountHeader
          showFilter={hasTokens}
          showZeroBalance={showZeroBalance}
          setShowZeroBalance={setShowZeroBalance}
          showUntrusted={showUntrustedTokens}
          setShowUntrusted={setShowUntrustedTokens}
        />
        <Wrapper>
          {isLoading ? (
            <StyledLoadingRows>
              <div />
              <div />
              <div />
              <div />
              <div />
            </StyledLoadingRows>
          ) : hasTokens ? (
            <StyledList>
              {tokenIds?.map((tokenId) => (
                <TokenRow
                  key={tokenId}
                  tokenId={tokenId}
                  showZeroBalance={showZeroBalance}
                  trusted={Boolean(allTokens[tokenId])}
                  showUntrusted={showUntrustedTokens}
                />
              ))}
            </StyledList>
          ) : (
            <NoTokens>No tokens found</NoTokens>
          )}
        </Wrapper>
      </AppBody>
      <SwitchLocaleLink />
    </>
  )
}
