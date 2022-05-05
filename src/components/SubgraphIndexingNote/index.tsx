import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { MouseoverTooltip } from 'components/Tooltip'
import type { ReactNode } from 'react'
import { HelpCircle } from 'react-feather'
import styled from 'styled-components/macro'

const Wrapper = styled(M.TextDiv).attrs({
  size: 'sm',
  color: 'text2',
  paragraphLineHeight: true,
})<{ padding?: string | null }>`
  padding: ${({ padding }) => padding};
`

// const StyledHelpCircle = styled(HelpCircle)`
//   stroke: var(--text2);
// `

const StyledBlockNumber = styled(M.Text).attrs({
  size: 'xs',
  color: 'text2',
})`
  display: inline-block;
  white-space: nowrap;
`

export default function SubgraphIndexingNote({
  children,
  padding,
  blockNumber,
}: {
  children?: ReactNode
  padding?: string | null
  blockNumber?: number
}) {
  return (
    <Wrapper padding={padding}>
      {children}
      {blockNumber && (
        <MouseoverTooltip
          wrapperProps={{ display: 'inline-block', ml: '4px' }}
          text={
            <StyledBlockNumber>
              <Trans>Current indexing block: {blockNumber}</Trans>
            </StyledBlockNumber>
          }
        >
          <HelpCircle size="12px" />
        </MouseoverTooltip>
      )}
    </Wrapper>
  )
}
