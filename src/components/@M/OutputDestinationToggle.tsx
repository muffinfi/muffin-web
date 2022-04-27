import { faBuildingColumns, faWallet } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Trans } from '@lingui/macro'
import { ReactNode } from 'react'
import { Toggle, ToggleElement } from './components'
import { RowBetween, Text, Row, TextContents } from './misc'
import QuestionHelper from 'components/QuestionHelper'

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
          <Trans>Output Destination</Trans>
        </Text>
        {questionHelperContent && <QuestionHelper text={questionHelperContent} />}
      </Row>

      <TextContents size="xs" weight="semibold">
        <Toggle onClick={onToggle}>
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
