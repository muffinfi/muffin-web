import { faBuildingColumns, faWallet } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Trans } from '@lingui/macro'
import QuestionHelper from 'components/QuestionHelper'
import { ReactNode } from 'react'

import { Row, RowBetween, Text, TextContents } from '../core'
import { Toggle, ToggleElement } from './misc'

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
          <Trans>Receive tokens to</Trans>
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

export function OutputDestinationWallet() {
  return (
    <Row gap="0.5em" style={{ alignItems: 'baseline' }}>
      <span style={{ fontSize: '0.875em' }}>
        <FontAwesomeIcon icon={faWallet} />
      </span>
      <Trans>Wallet</Trans>
    </Row>
  )
}

export function OutputDestinationAccount() {
  return (
    <Row gap="0.5em" style={{ alignItems: 'baseline' }}>
      <span style={{ fontSize: '0.875em' }}>
        <FontAwesomeIcon icon={faBuildingColumns} />
      </span>
      <Trans>Muffin Account</Trans>
    </Row>
  )
}
