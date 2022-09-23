import Tooltip from 'components/Tooltip'
import { useSwitchWithDelayedClose } from 'hooks/useSwitch'
import { memo, ReactNode } from 'react'

import { Text } from '../core'

export default memo(function AlertHelper({ text }: { text: ReactNode }) {
  const { state: show, open, close } = useSwitchWithDelayedClose()
  return (
    <Tooltip
      show={show}
      text={text}
      onMouseEnter={open}
      onMouseLeave={close}
      placement="bottom" //
    >
      <span onMouseEnter={open} onMouseLeave={close}>
        <Text color="alert">⚠️</Text>
      </span>
    </Tooltip>
  )
})
