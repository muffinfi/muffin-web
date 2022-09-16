import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { MouseoverTooltip } from 'components/Tooltip'
import type { ReactNode } from 'react'
import { HelpCircle } from 'react-feather'
import styled from 'styled-components/macro'

const Wrapper = styled(M.TextDiv).attrs((props) => ({
  size: 'sm',
  color: props.color || 'text2',
  paragraphLineHeight: true,
}))<{ padding?: string | null }>`
  padding: ${({ padding }) => padding};
`

export default function SubgraphIndexingNote({
  children,
  padding,
  blockNumber,
  ...rest
}: {
  children?: ReactNode
  padding?: string | null
  blockNumber?: number
} & Parameters<typeof M.TextDiv>[0]) {
  return (
    <Wrapper padding={padding} {...rest}>
      {children}
      {blockNumber && (
        <MouseoverTooltip
          wrapperProps={{ display: 'inline-block', ml: '4px', verticalAlign: 'middle' }}
          text={
            <M.Text size="xs" nowrap>
              <Trans>Last indexed block:&nbsp;&nbsp;{blockNumber}</Trans>
            </M.Text>
          }
          placement="right"
        >
          <HelpCircle size="1em" />
        </MouseoverTooltip>
      )}
    </Wrapper>
  )
}

export function SubgraphIndexingAlertCard({ blockNumber, children }: { blockNumber?: number; children?: ReactNode }) {
  // TODO: if the pull data from logs works, can totally remove this component
  // return (
  //   <YellowCard>
  //     <M.Row gap="12px">
  //       <AlertTriangle stroke="#d39000" size="1rem" style={{ flexShrink: 0 }} />
  //       <SubgraphIndexingNote blockNumber={blockNumber} color="alert-text">
  //         {children}
  //       </SubgraphIndexingNote>
  //     </M.Row>
  //   </YellowCard>
  // )
  return null
}
