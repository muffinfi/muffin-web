import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { Currency } from '@uniswap/sdk-core'
import Badge from 'components/Badge'
import CurrencyLogo from 'components/CurrencyLogo'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import Row, { AutoRow } from 'components/Row'
import { MouseoverTooltip } from 'components/Tooltip'
import { useTokenInfoFromActiveList } from 'hooks/useTokenInfoFromActiveList'
import { RoutingDiagramEntry } from 'lib/components/Swap/RoutingDiagram/utils'
import { Box } from 'rebass'
import styled from 'styled-components/macro'

import { ReactComponent as DotLine } from '../../assets/svg/dot_line.svg'

const Wrapper = styled(Box)`
  align-items: center;
  width: 100%;
`

const RouteContainerRow = styled(Row)`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 4px;
`

const RouteRow = styled(Row)`
  align-items: center;
  display: flex;
  justify-content: center;
  padding: 0.1rem 0.5rem 0.1rem 0.35rem;
  position: relative;
`

// const PoolBadge = styled(Badge)`
//   display: flex;
//   padding: 4px 4px;
// `

const DottedLine = styled.div`
  display: flex;
  align-items: center;
  position: absolute;
  width: calc(100%);
  z-index: 1;
  opacity: 0.5;
`

const DotColor = styled(DotLine)`
  path {
    stroke: ${({ theme }) => theme.bg4};
  }
`

// const OpaqueBadge = styled(Badge)`
//   background-color: ${({ theme }) => theme.bg2};
//   border-radius: 8px;
//   display: grid;
//   font-size: 12px;
//   grid-gap: 4px;
//   grid-auto-flow: column;
//   justify-content: start;
//   padding: 4px;
//   z-index: ${Z_INDEX.sticky};
// `

// const ProtocolBadge = styled(Badge)`
//   background-color: ${({ theme }) => theme.bg3};
//   border-radius: 4px;
//   color: ${({ theme }) => theme.text2};
//   font-size: 10px;
//   padding: 2px 4px;
//   z-index: ${Z_INDEX.sticky + 1};
// `

// const BadgeText = styled(ThemedText.Small)`
//   word-break: normal;
// `

const StyledBadge = styled(Badge)`
  border-radius: 8px;
  padding: 4px;
  z-index: 2;
`

export default function RoutingDiagram({
  currencyIn,
  currencyOut,
  routes,
}: {
  currencyIn: Currency
  currencyOut: Currency
  routes: RoutingDiagramEntry[]
}) {
  const tokenIn = useTokenInfoFromActiveList(currencyIn)
  const tokenOut = useTokenInfoFromActiveList(currencyOut)

  return (
    <Wrapper>
      {routes.map((entry, index) => (
        <RouteContainerRow key={index}>
          <CurrencyLogo currency={tokenIn} size={'20px'} />
          <Route entry={entry} />
          <CurrencyLogo currency={tokenOut} size={'20px'} />
        </RouteContainerRow>
      ))}
    </Wrapper>
  )
}

function Route({ entry: { percent, path, protocol } }: { entry: RoutingDiagramEntry }) {
  return (
    <RouteRow>
      <DottedLine>
        <DotColor />
      </DottedLine>
      <StyledBadge>
        {/* <ProtocolBadge>
          <BadgeText fontSize={12}>{protocol.toUpperCase()}</BadgeText>
        </ProtocolBadge> */}
        <M.Text size="xs">{percent.toSignificant(2)}%</M.Text>
      </StyledBadge>
      <AutoRow gap="1px" width="100%" style={{ justifyContent: 'space-evenly', zIndex: 2 }}>
        {path.map(([currency0, currency1, tierChoices], index) => (
          <Pool key={index} currency0={currency0} currency1={currency1} tierChoices={tierChoices} />
        ))}
      </AutoRow>
    </RouteRow>
  )
}

function Pool({
  currency0,
  currency1,
  tierChoices,
}: {
  currency0: Currency
  currency1: Currency
  tierChoices: number
}) {
  const tokenInfo0 = useTokenInfoFromActiveList(currency0)
  const tokenInfo1 = useTokenInfoFromActiveList(currency1)

  // TODO: specify tier choices?
  // TODO - link pool icon to info.muffin.fi via query params
  return (
    <MouseoverTooltip text={<Trans>{tokenInfo0?.symbol + ' / ' + tokenInfo1?.symbol} pool</Trans>}>
      <StyledBadge>
        <M.Row wrap="nowrap" gap="4px">
          <DoubleCurrencyLogo currency0={tokenInfo1} currency1={tokenInfo0} em={1.538} />
          {/* <M.Text size="xs" color="text1">
            {tokenInfo0?.symbol + ' / ' + tokenInfo1?.symbol}
          </M.Text> */}
        </M.Row>
      </StyledBadge>
    </MouseoverTooltip>
  )
}
