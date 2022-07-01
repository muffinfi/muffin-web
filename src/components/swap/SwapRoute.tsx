import { Trans } from '@lingui/macro'
import { InterfaceTrade } from '@muffinfi/state/routing/types'
import * as M from '@muffinfi-ui'
import { Currency, TradeType } from '@uniswap/sdk-core'
import AnimatedDropdown from 'components/AnimatedDropdown'
import { LoadingRows } from 'components/Loader/styled'
import RoutingDiagram from 'components/RoutingDiagram/RoutingDiagram'
import { SUPPORTED_GAS_ESTIMATE_CHAIN_IDS } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { getTokenPath } from 'lib/components/Swap/RoutingDiagram/utils'
import { memo, useMemo, useState } from 'react'
import { Plus } from 'react-feather'
import styled from 'styled-components/macro'
import { Separator } from 'theme'

import { AutoRouterLabel, AutoRouterLogo } from './RouterLabel'

const Wrapper = styled(M.Column).attrs({ stretch: true })<{ fixedOpen?: boolean; hover?: boolean }>`
  font-size: 0.8125rem; // 13px
  border-radius: 12px;
  border: 1px solid
    ${({ fixedOpen, hover }) => (fixedOpen ? 'transparent' : hover ? 'var(--borderColor1)' : 'var(--borderColor)')};
  transition: border-color 150ms;
`

const WrapperUpper = styled.div`
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
`

const WrapperLower = styled.div`
  padding: 0 12px 12px;
  border-radius: 12px;
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
  const routes = useMemo(() => getTokenPath(trade), [trade])
  const [open, setOpen] = useState(false)
  const { chainId } = useActiveWeb3React()

  const formattedGasPriceString = trade?.gasUseEstimateUSD
    ? trade.gasUseEstimateUSD.toFixed(2) === '0.00'
      ? '<$0.01'
      : '$' + trade.gasUseEstimateUSD.toFixed(2)
    : undefined

  const [hover, setHover] = useState(false)

  return (
    <Wrapper {...rest} fixedOpen={fixedOpen} hover={hover}>
      <WrapperUpper
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <M.RowBetween>
          <M.Row gap="0.5em">
            <AutoRouterLogo />
            <AutoRouterLabel />
          </M.Row>
          {fixedOpen ? null : <OpenCloseIcon open={open} />}
        </M.RowBetween>
      </WrapperUpper>

      <AnimatedDropdown open={open || fixedOpen}>
        <WrapperLower>
          <M.Column stretch gap="8px">
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
        </WrapperLower>
      </AnimatedDropdown>
    </Wrapper>
  )
})
