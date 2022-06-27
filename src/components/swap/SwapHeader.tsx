import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { Percent } from '@uniswap/sdk-core'
import SettingsTab from 'components/Settings'
import { memo, ReactNode } from 'react'
import { swapStateToQueryParameters } from 'state/swap/hooks'
import { SwapState } from 'state/swap/reducer'
import styled from 'styled-components/macro'

const appendQuery = (base: string, search?: string) => {
  return search ? `${base}?${search}` : base
}

const StyledNavLink = styled(M.NavLink).attrs({
  color: 'placeholder-text',
  size: 'sm',
  weight: 'semibold',
  $activeColor: 'text1',
  $activeWeight: 'semibold',
})``

export default memo(function SwapHeader({
  swapState,
  allowedSlippage,
  extraContents,
}: {
  swapState: SwapState
  allowedSlippage: Percent
  extraContents?: () => ReactNode
}) {
  return (
    <M.RowBetween>
      <M.Row gap="2em">
        <StyledNavLink to={appendQuery('/swap', swapStateToQueryParameters(swapState).toString())}>
          <Trans>Swap</Trans>
        </StyledNavLink>
        <StyledNavLink to={appendQuery('/limit-range', swapStateToQueryParameters(swapState).toString())}>
          <Trans>Limit Range</Trans>
        </StyledNavLink>
      </M.Row>
      <M.Row gap="0.75em">
        {extraContents?.()}
        <M.AccountWalletButton />
        <SettingsTab placeholderSlippage={allowedSlippage} />
      </M.Row>
    </M.RowBetween>
  )
})
