import { Trans } from '@lingui/macro'
import { InterfaceTrade } from '@muffinfi/state/routing/types'
import * as M from '@muffinfi-ui'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import AnimatedDropdown from 'components/AnimatedDropdown'
import { OutlineCard } from 'components/Card'
import { LoadingOpacityContainer } from 'components/Loader/styled'
import { SUPPORTED_GAS_ESTIMATE_CHAIN_IDS } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { memo, useState } from 'react'
import { ChevronDown } from 'react-feather'
import styled, { keyframes } from 'styled-components/macro'

import AdvancedSwapDetails from './AdvancedSwapDetails'
import GasEstimateBadge from './GasEstimateBadge'
import SwapRoute from './SwapRoute'
import TradePrice from './TradePrice'

const StyledCard = styled(OutlineCard)`
  padding: 12px;
  border: 1px solid var(--borderColor);
`

const StyledHeaderRow = styled(M.RowBetween)<{ disabled: boolean; open: boolean }>`
  min-height: 44px;
  padding: 4px 8px 4px 12px;
  border-radius: 12px;
  cursor: ${({ disabled }) => (disabled ? 'initial' : 'pointer')};

  transition: border-color 150ms, background-color 150ms;
  border: 1px solid ${({ open }) => (open ? 'var(--layer2)' : 'var(--borderColor)')};
  background-color: ${({ open }) => (open ? 'var(--layer2)' : 'transparent')};
  :hover {
    border: 1px solid ${({ open }) => (open ? 'var(--layer2)' : 'var(--borderColor1)')};
    background-color: ${({ open }) => (open ? 'var(--layer3)' : 'transparent')};
  }
`

const RotatingArrow = styled(ChevronDown)<{ open?: boolean }>`
  transform: ${({ open }) => (open ? 'rotate(180deg)' : 'none')};
  transition: transform 0.1s linear;
`

const StyledPolling = styled.div`
  display: flex;
  height: 16px;
  width: 16px;
  margin-right: 2px;
  margin-left: 5px;
  align-items: center;
  color: ${({ theme }) => theme.text1};
  transition: 250ms ease color;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    display: none;
  `}
`

const StyledPollingDot = styled.div`
  width: 8px;
  height: 8px;
  min-height: 8px;
  min-width: 8px;
  border-radius: 50%;
  position: relative;
  background-color: ${({ theme }) => theme.bg2};
  transition: 250ms ease background-color;
`

const rotate360 = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

const Spinner = styled.div`
  animation: ${rotate360} 1s cubic-bezier(0.83, 0, 0.17, 1) infinite;
  transform: translateZ(0);
  border-top: 1px solid transparent;
  border-right: 1px solid transparent;
  border-bottom: 1px solid transparent;
  border-left: 2px solid ${({ theme }) => theme.text1};
  background: transparent;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  position: relative;
  transition: 250ms ease border-color;
  left: -3px;
  top: -3px;
`

interface SwapDetailsInlineProps {
  trade: InterfaceTrade<Currency, Currency, TradeType> | undefined
  syncing: boolean
  loading: boolean
  showInverted: boolean
  setShowInverted: React.Dispatch<React.SetStateAction<boolean>>
  allowedSlippage: Percent
}

export default memo(function SwapDetailsDropdown({
  trade,
  syncing,
  loading,
  showInverted,
  setShowInverted,
  allowedSlippage,
}: SwapDetailsInlineProps) {
  const { chainId } = useActiveWeb3React()
  const [showDetails, setShowDetails] = useState(false)

  return (
    <>
      <M.Column stretch gap="16px" style={{ marginBottom: -16 }}>
        <StyledHeaderRow onClick={() => setShowDetails(!showDetails)} disabled={!trade} open={showDetails}>
          <M.Row gap="4px" style={{ position: 'relative' }}>
            {
              loading || syncing ? (
                <StyledPolling>
                  <StyledPollingDot>
                    <Spinner />
                  </StyledPollingDot>
                </StyledPolling>
              ) : null
              // <HideSmall>
              //   <MouseoverTooltipContent
              //     wrap={false}
              //     content={
              //       <ResponsiveTooltipContainer origin="top right" style={{ padding: '0' }}>
              //         <Card padding="12px">
              //           <AdvancedSwapDetails trade={trade} allowedSlippage={allowedSlippage} syncing={syncing} />
              //         </Card>
              //       </ResponsiveTooltipContainer>
              //     }
              //     placement="bottom"
              //     disableHover={showDetails}
              //   >
              //     <M.TextContents size="sm" color="text2">
              //       <InfoIcon size="1em" />
              //     </M.TextContents>
              //   </MouseoverTooltipContent>
              // </HideSmall>
            }

            {trade ? (
              <LoadingOpacityContainer $loading={syncing}>
                <TradePrice
                  price={trade.executionPrice}
                  showInverted={showInverted}
                  setShowInverted={setShowInverted}
                />
              </LoadingOpacityContainer>
            ) : loading || syncing ? (
              <M.Text size="sm">
                <Trans>Fetching best price...</Trans>
              </M.Text>
            ) : null}
          </M.Row>
          <M.Row>
            {!trade?.gasUseEstimateUSD ||
            showDetails ||
            !chainId ||
            !SUPPORTED_GAS_ESTIMATE_CHAIN_IDS.includes(chainId) ? null : (
              <GasEstimateBadge
                trade={trade}
                loading={syncing || loading}
                showRoute={!showDetails}
                disableHover={showDetails}
              />
            )}
            <M.TextContents color="text2">
              <RotatingArrow open={Boolean(trade && showDetails)} size="20px" />
            </M.TextContents>
          </M.Row>
        </StyledHeaderRow>

        <AnimatedDropdown open={showDetails}>
          <M.Column stretch gap="16px" style={{ paddingBottom: 16 }}>
            {trade ? (
              <StyledCard>
                <AdvancedSwapDetails trade={trade} allowedSlippage={allowedSlippage} syncing={syncing} />
              </StyledCard>
            ) : null}
            {trade ? <SwapRoute trade={trade} syncing={syncing} /> : null}
          </M.Column>
        </AnimatedDropdown>
      </M.Column>
    </>
  )
})
