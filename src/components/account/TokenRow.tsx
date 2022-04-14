import { Trans } from '@lingui/macro'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import Badge, { BadgeVariant } from 'components/Badge'
import { ButtonEmpty } from 'components/Button'
import Column from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import Loader from 'components/Loader'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import { MouseoverTooltip } from 'components/Tooltip'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useCurrency from 'lib/hooks/useCurrency'
import { AlertCircle, Minus, Plus } from 'react-feather'
import { Link } from 'react-router-dom'
import { Text } from 'rebass'
import { useTokenBalance } from 'state/wallet/hooks'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'

const MenuItem = styled(RowBetween)`
  padding: 4px 8px;
  height: 56px;
  display: grid;
  grid-template-columns: auto minmax(auto, 1fr) auto minmax(0, 72px);
  grid-gap: 16px;
`

const StyledBalanceText = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  max-width: 5rem;
  text-overflow: ellipsis;
`

const SmallButton = styled(ButtonEmpty)`
  width: 32px;
  height: 32px;
  padding: 0;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    width: 24px;
    height: 24px;
  `};
`

const ButtonLabel = styled(ThemedText.White)`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.bg2};
  &:hover {
    background-color: ${({ theme }) => theme.bg3};
  }
`

const BadgeWrapper = styled.div`
  font-size: 14px;
  display: flex;
  justify-content: flex-end;
`

export default function TokenRow({
  tokenId,
  trusted,
  showZeroBalance,
  showUntrusted,
}: {
  tokenId: string
  trusted?: boolean
  showZeroBalance?: boolean
  showUntrusted?: boolean
}) {
  const { account } = useActiveWeb3React()
  const token = useCurrency(tokenId)
  const balance = useTokenBalance(
    account ?? undefined,
    token?.isToken ? token : undefined,
    BalanceSource.INTERNAL_ACCOUNT
  )

  if (
    !token ||
    !token.isToken ||
    (!showZeroBalance && balance?.greaterThan(0) !== true) ||
    (!showUntrusted && !trusted)
  ) {
    return null
  }

  // only show add or remove buttons if not on selected list
  return (
    <MenuItem className={`token-item-${tokenId}`}>
      <CurrencyLogo currency={token} size={'24px'} />
      <Column>
        <AutoRow gap="4px">
          <Text title={token.name} fontWeight={500}>
            {token.symbol}
          </Text>
          {!trusted && (
            <BadgeWrapper>
              <MouseoverTooltip
                text={
                  <Trans>
                    This token doesn&apos;t appear on the active token lists. Make sure this is a token you trust before
                    using it.
                  </Trans>
                }
              >
                <Badge variant={BadgeVariant.DEFAULT}>
                  <AlertCircle width={14} height={14} />
                  &nbsp;
                  <Text fontWeight={500} fontSize={14}>
                    <Trans>Untrusted</Trans>
                  </Text>
                </Badge>
              </MouseoverTooltip>
            </BadgeWrapper>
          )}
        </AutoRow>
        <ThemedText.DarkGray ml="0px" fontSize={'12px'} fontWeight={300}>
          {token.name}
        </ThemedText.DarkGray>
      </Column>
      <RowFixed style={{ justifySelf: 'flex-end' }}>
        {balance ? (
          <StyledBalanceText title={balance.toExact()}>{balance.toSignificant(4)}</StyledBalanceText>
        ) : account ? (
          <Loader />
        ) : null}
      </RowFixed>
      <RowFixed style={{ justifySelf: 'flex-end', columnGap: '4px' }}>
        <SmallButton as={Link} to={`/account/deposit?currency=${token.address}`} data-token={tokenId}>
          <ButtonLabel>
            <Plus size={18} />
          </ButtonLabel>
        </SmallButton>
        <SmallButton as={Link} to={`/account/withdraw?currency=${token.address}`} data-token={tokenId}>
          <ButtonLabel>
            <Minus size={18} />
          </ButtonLabel>
        </SmallButton>
      </RowFixed>
    </MenuItem>
  )
}
