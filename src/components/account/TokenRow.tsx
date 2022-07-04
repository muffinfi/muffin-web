import { Trans } from '@lingui/macro'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { formatTokenBalance } from '@muffinfi/utils/formatTokenBalance'
import * as M from '@muffinfi-ui'
import Badge, { BadgeVariant } from 'components/Badge'
import CurrencyLogo from 'components/CurrencyLogo'
import Loader from 'components/Loader'
import { MouseoverTooltip } from 'components/Tooltip'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useCurrency from 'hooks/useCurrency'
import { memo } from 'react'
import { AlertCircle, ExternalLink as LinkIcon, Minus, Plus } from 'react-feather'
import { useTokenBalance } from 'state/wallet/hooks'
import styled from 'styled-components/macro'
import { ExplorerDataType, getExplorerLink } from 'utils/getExplorerLink'

const MenuItem = styled.div`
  padding: 12px 5px;
  margin: 0 -5px;
  width: calc(100% + 10px);

  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 16px;
  border-top: 1px solid var(--borderColor);
`

const StyledBalanceText = styled(M.Text).attrs({
  nowrap: true,
  ellipsis: true,
})`
  max-width: 8rem;
`

const ButtonLabel = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;

  color: var(--primary-text);
  background-color: var(--borderColor1);
  &:hover {
    background-color: var(--text2);
  }

  svg {
    stroke-width: 3px;
  }
`

export default memo(function TokenRow({
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
  const { account, chainId } = useActiveWeb3React()
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

  return (
    <MenuItem className={`token-item-${tokenId}`}>
      <CurrencyLogo currency={token} size={'28px'} />

      <M.Column stretch gap="4px">
        <M.Row gap="8px">
          <M.Row gap="8px" wrap="nowrap" style={{ alignItems: 'baseline' }}>
            <M.Text title={token.name} weight="medium" nowrap ellipsis>
              {token.symbol}
            </M.Text>
            {chainId ? (
              <M.ExternalLink
                href={getExplorerLink(chainId, token.address, ExplorerDataType.TOKEN)}
                color="placeholder-text"
                hoverColor="text2"
                size="sm"
              >
                <LinkIcon size="1em" />
              </M.ExternalLink>
            ) : null}
          </M.Row>
          {!trusted && (
            <M.Row gap="4px">
              <MouseoverTooltip
                text={
                  <Trans>
                    This token doesn&apos;t appear on the active token lists. Make sure this is a token you trust before
                    using it.
                  </Trans>
                }
              >
                <Badge variant={BadgeVariant.DEFAULT}>
                  <AlertCircle width={12} height={12} />
                  &nbsp;
                  <M.Text weight="medium" size="xs">
                    <Trans>Untrusted</Trans>
                  </M.Text>
                </Badge>
              </MouseoverTooltip>
            </M.Row>
          )}
        </M.Row>
        <M.Text size="xs" color="text2">
          {token.name}
        </M.Text>
      </M.Column>

      <M.Row style={{ justifySelf: 'flex-end' }}>
        {balance ? (
          <StyledBalanceText title={balance.toExact()}>{formatTokenBalance(balance)}</StyledBalanceText>
        ) : account ? (
          <Loader />
        ) : null}
      </M.Row>

      <M.Row gap="0.667em">
        <M.Link to={`/account/deposit?currency=${token.address}`} data-token={tokenId}>
          <ButtonLabel>
            <Plus size={16} />
          </ButtonLabel>
        </M.Link>
        <M.Link to={`/account/withdraw?currency=${token.address}`} data-token={tokenId}>
          <ButtonLabel>
            <Minus size={16} />
          </ButtonLabel>
        </M.Link>
      </M.Row>
    </MenuItem>
  )
})
