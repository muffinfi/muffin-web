import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { InterfaceTrade } from '@muffinfi/state/routing/types'
import { Currency, TradeType } from '@uniswap/sdk-core'
import AnimatedDropdown from 'components/AnimatedDropdown'
import { LoadingRows } from 'components/Loader/styled'
import RoutingDiagram from 'components/RoutingDiagram/RoutingDiagram'
import { SUPPORTED_GAS_ESTIMATE_CHAIN_IDS } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { getTokenPath } from 'lib/components/Swap/RoutingDiagram/utils'
import { memo, useState } from 'react'
import { Plus } from 'react-feather'
import { useDarkModeManager } from 'state/user/hooks'
import styled from 'styled-components/macro'
import { Separator } from 'theme'
import { AutoRouterLabel, AutoRouterLogo } from './RouterLabel'

const Wrapper = styled(M.Column).attrs({ stretch: true })<{ darkMode?: boolean; fixedOpen?: boolean }>`
  padding: ${({ fixedOpen }) => (fixedOpen ? '14px' : '14px 14px 14px 14px')};
  border-radius: 12px;
  border: 1px solid ${({ fixedOpen }) => (fixedOpen ? 'transparent' : 'var(--layer3)')};
  cursor: pointer;
`

const OpenCloseIcon = styled(Plus)<{ open?: boolean }>`
  height: 20px;
  width: 20px;
  stroke-width: 2px;
  transition: transform 0.1s;
  transform: ${({ open }) => (open ? 'rotate(45deg)' : 'none')};
  stroke: var(--text2);
  cursor: pointer;
  :hover {
    opacity: 0.8;
  }
`

interface SwapRouteProps extends React.HTMLAttributes<HTMLDivElement> {
  trade: InterfaceTrade<Currency, Currency, TradeType>
  syncing: boolean
  fixedOpen?: boolean // fixed in open state, hide open/close icon
}

export default memo(function SwapRoute({ trade, syncing, fixedOpen = false, ...rest }: SwapRouteProps) {
  // const autoRouterSupported = useAutoRouterSupported()
  const autoRouterSupported = false
  const routes = getTokenPath(trade)
  const [open, setOpen] = useState(false)
  const { chainId } = useActiveWeb3React()

  const [darkMode] = useDarkModeManager()

  const formattedGasPriceString = trade?.gasUseEstimateUSD
    ? trade.gasUseEstimateUSD.toFixed(2) === '0.00'
      ? '<$0.01'
      : '$' + trade.gasUseEstimateUSD.toFixed(2)
    : undefined

  return (
    <Wrapper {...rest} darkMode={darkMode} fixedOpen={fixedOpen}>
      <M.TextContents size="sm">
        <M.RowBetween onClick={() => setOpen(!open)}>
          <M.Row gap="0.5em">
            <AutoRouterLogo />
            <AutoRouterLabel />
          </M.Row>
          {fixedOpen ? null : <OpenCloseIcon open={open} />}
        </M.RowBetween>

        <AnimatedDropdown open={open || fixedOpen}>
          <M.Column stretch gap="8px" style={{ paddingTop: 10 }}>
            {syncing ? (
              <LoadingRows>
                <div style={{ width: '100%', height: '30px' }} />
              </LoadingRows>
            ) : (
              <RoutingDiagram
                currencyIn={trade.inputAmount.currency}
                currencyOut={trade.outputAmount.currency}
                routes={routes}
              />
            )}

            {autoRouterSupported && (
              <>
                <Separator />
                {syncing ? (
                  <LoadingRows>
                    <div style={{ width: '250px', height: '15px' }} />
                  </LoadingRows>
                ) : (
                  <M.Text size="xs">
                    {trade?.gasUseEstimateUSD && chainId && SUPPORTED_GAS_ESTIMATE_CHAIN_IDS.includes(chainId) ? (
                      <Trans>Best price route costs ~{formattedGasPriceString} in gas. </Trans>
                    ) : null}{' '}
                    <Trans>
                      This route optimizes your total output by considering split routes, multiple hops, and the gas
                      cost of each step.
                    </Trans>
                  </M.Text>
                )}
              </>
            )}
          </M.Column>
        </AnimatedDropdown>
      </M.TextContents>
    </Wrapper>
  )
})
