import { faBuildingColumns, faWallet } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useInternalAccountModeManager } from '@muffinfi/state/user/hooks'
import { memo } from 'react'
import styled from 'styled-components/macro'

import { Button } from '../buttons'
import { Row } from '../core'

const StyledButton = styled(Button)<{ active: boolean }>`
  --btn-bg: var(--layer2);
  --btn-bgHover: var(--layer3);
  --btn-bgActive: var(--layer3);
  --btn-text: var(--text1);

  font-size: 0.6875rem;
  font-weight: var(--regular);

  padding: 6px 8px;
  margin: -6px 0;
  border-radius: 8px;
  gap: 0.5em;

  & > *:not(:last-child) {
    opacity: ${({ active }) => (active ? 1 : 0.25)};
  }
`

export default memo(function AccountWalletButton() {
  const [internalAccountMode, toggleInternalAccountMode] = useInternalAccountModeManager()
  return (
    <Row gap="0.5em">
      {/* <Text size="xs" color="text2">
        <Trans>Pay with</Trans>
      </Text> */}
      <StyledButton active={internalAccountMode} onClick={toggleInternalAccountMode}>
        <FontAwesomeIcon icon={faBuildingColumns} />
        <span>+</span>
        <FontAwesomeIcon icon={faWallet} />
      </StyledButton>
    </Row>
  )
})
