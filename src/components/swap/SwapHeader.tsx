import { Trans } from '@lingui/macro'
import { Percent } from '@uniswap/sdk-core'
import { TabNavLink } from 'components/RouterTab'
import { ReactNode } from 'react'
import { swapStateToQueryParameters } from 'state/swap/hooks'
import { SwapState } from 'state/swap/reducer'
import styled from 'styled-components/macro'
import { RowBetween, RowFixed } from '../Row'
import SettingsTab from '../Settings'

const StyledSwapHeader = styled.div`
  padding: 1rem 1.25rem 0.5rem 1.25rem;
  width: 100%;
  color: ${({ theme }) => theme.text2};
`

const appendQuery = (base: string, search?: string) => {
  return search ? `${base}?${search}` : base
}

export default function SwapHeader({
  swapState,
  allowedSlippage,
  extraContents,
}: {
  swapState: SwapState
  allowedSlippage: Percent
  extraContents?: () => ReactNode
}) {
  return (
    <StyledSwapHeader>
      <RowBetween>
        <RowFixed>
          <TabNavLink to={appendQuery('/swap', swapStateToQueryParameters(swapState))} title={<Trans>Swap</Trans>} />
          <TabNavLink
            to={appendQuery('/limit-range', swapStateToQueryParameters(swapState))}
            title={<Trans>Limit Range</Trans>}
          />
        </RowFixed>
        <RowFixed>
          {extraContents?.()}
          <SettingsTab placeholderSlippage={allowedSlippage} />
        </RowFixed>
      </RowBetween>
    </StyledSwapHeader>
  )
}
