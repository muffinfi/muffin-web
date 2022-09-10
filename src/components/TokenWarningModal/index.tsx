import { Token } from '@uniswap/sdk-core'
import { ImportToken } from 'components/SearchModal/ImportToken'
import { useEffect, useState } from 'react'

import Modal from '../Modal'

export default function TokenWarningModal({
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
  const [isLoaded, setIsLoaded] = useState(false)

  // give sometime for the app to fetch and parse the default list before the model is shown
  useEffect(() => {
    let ignore = false
    const timeoutId = setTimeout(() => {
      if (ignore) return
      setIsLoaded(true)
    }, 1000)
    return () => {
      ignore = true
      clearTimeout(timeoutId)
    }
  }, [])

  return (
    <Modal isOpen={isLoaded && isOpen} onDismiss={onDismiss} maxHeight={100}>
      <ImportToken tokens={tokens} handleCurrencySelect={onConfirm} />
    </Modal>
  )
}
