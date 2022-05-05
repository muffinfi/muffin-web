import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import type { ReactNode } from 'react'
import { HelpCircle } from 'react-feather'
import styled from 'styled-components/macro'

const Wrapper = styled(M.Row)<{ padding?: string | null }>`
  align-items: flex-start;
  padding: ${({ padding }) => padding};
`

const StyledHelpCircle = styled(HelpCircle)`
  stroke: var(--text2);
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
    <Wrapper gap="12px" padding={padding}>
      <M.TextDiv paragraphLineHeight>
        <StyledHelpCircle size="12px" />
      </M.TextDiv>
      <M.TextDiv size="sm" color="text2" paragraphLineHeight>
        {children}
        <M.TextDiv align="right" size="xs" color="text2">
          {blockNumber && <Trans>Current indexing block: {blockNumber}</Trans>}
        </M.TextDiv>
      </M.TextDiv>
    </Wrapper>
  )
}
