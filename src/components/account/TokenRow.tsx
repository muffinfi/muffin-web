import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { Token } from '@uniswap/sdk-core'
import { ButtonEmpty } from 'components/Button'
import Column from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import Loader from 'components/Loader'
import { RowBetween, RowFixed } from 'components/Row'
import { useActiveWeb3React } from 'hooks/web3'
import { MouseEventHandler } from 'react'
import { Minus, Plus } from 'react-feather'
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

export default function TokenRow({
  token,
  hideOnZero,
  onDeposit,
  onWithdraw,
}: {
  token: Token
  hideOnZero?: boolean
  onDeposit?: MouseEventHandler<HTMLButtonElement>
  onWithdraw?: MouseEventHandler<HTMLButtonElement>
}) {
  const { account } = useActiveWeb3React()
  const key = token.address
  const balance = useTokenBalance(account ?? undefined, token, BalanceSource.INTERNAL_ACCOUNT)

  if (balance?.greaterThan(0) !== true && hideOnZero) {
    return null
  }

  // only show add or remove buttons if not on selected list
  return (
    <MenuItem className={`token-item-${key}`}>
      <CurrencyLogo currency={token} size={'24px'} />
      <Column>
        <Text title={token.name} fontWeight={500}>
          {token.symbol}
        </Text>
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
        <SmallButton onClick={onDeposit} data-token={key}>
          <ButtonLabel>
            <Plus size={18} />
          </ButtonLabel>
        </SmallButton>
        <SmallButton onClick={onWithdraw} data-token={key}>
          <ButtonLabel>
            <Minus size={18} />
          </ButtonLabel>
        </SmallButton>
      </RowFixed>
    </MenuItem>
  )
}
