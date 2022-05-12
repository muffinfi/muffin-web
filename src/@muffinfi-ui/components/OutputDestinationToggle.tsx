import { faBuildingColumns, faWallet } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Trans } from '@lingui/macro'
import QuestionHelper from 'components/QuestionHelper'
import { ReactNode } from 'react'

import { Row, RowBetween, Text, TextContents } from '../core'
import { Toggle, ToggleElement } from './misc'

// TODO: Put to components and replace old code

export default function OutputDestinationToggle({
  toInternalAccount,
  questionHelperContent,
  onToggle,
}: {
  toInternalAccount: boolean
  questionHelperContent?: ReactNode
  onToggle: () => void
}) {
  return (
    <RowBetween>
      <Row gap="0.25em">
        <Text>
          <Trans>Output destination</Trans>
        </Text>
        {questionHelperContent && <QuestionHelper text={questionHelperContent} />}
      </Row>

      <TextContents size="xs" weight="semibold">
        <Toggle $variant="primary" onClick={onToggle}>
          <ToggleElement gap="0.5em" $active={toInternalAccount}>
            <FontAwesomeIcon icon={faBuildingColumns} />
            <Trans>Account</Trans>
          </ToggleElement>
          <ToggleElement gap="0.5em" $active={!toInternalAccount}>
            <FontAwesomeIcon icon={faWallet} />
            <Trans>Wallet</Trans>
          </ToggleElement>
        </Toggle>
      </TextContents>
    </RowBetween>
  )
}
