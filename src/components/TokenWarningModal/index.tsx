import { Token } from '@uniswap/sdk-core'
import { ImportToken } from 'components/SearchModal/ImportToken'
import { memo } from 'react'

import Modal from '../Modal'

export default memo(function TokenWarningModal({
  isOpen,
  tokens,
  onConfirm,
  onDismiss,
}: {
  isOpen: boolean
  tokens: Token[]
  onConfirm: () => void
  onDismiss: () => void
}) {
  return (
    <Modal isOpen={isOpen} onDismiss={onDismiss} maxHeight={100}>
      <ImportToken tokens={tokens} handleCurrencySelect={onConfirm} />
    </Modal>
  )
})
