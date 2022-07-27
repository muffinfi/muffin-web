import { Trans } from '@lingui/macro'
import { LimitOrderType } from '@muffinfi/muffin-sdk'
import { Token } from '@uniswap/sdk-core'
import Badge, { BadgeVariant } from 'components/Badge'
import styled from 'styled-components/macro'

import { MouseoverTooltip } from '../../components/Tooltip'

const StyledBadge = styled(Badge)`
  font-size: 0.875em;
  gap: 0.5em;
`

export default function RangeOrderBadge({
  limitOrderType,
  token0,
  token1,
}: {
  limitOrderType: LimitOrderType | undefined
  token0: Token | null | undefined
  token1: Token | null | undefined
}) {
  if (!limitOrderType || !token0 || !token1) return null

  const sellingToken = limitOrderType === LimitOrderType.ZeroForOne ? token0 : token1
  const buyingToken = limitOrderType === LimitOrderType.ZeroForOne ? token1 : token0

  return (
    <MouseoverTooltip
      text={
        <Trans>
          This is a limit range order to sell {sellingToken.symbol} for {buyingToken.symbol}.
        </Trans>
      }
    >
      <StyledBadge variant={BadgeVariant.DEFAULT}>
        {sellingToken.symbol} ⟶ {buyingToken.symbol}
      </StyledBadge>
    </MouseoverTooltip>
  )
}
