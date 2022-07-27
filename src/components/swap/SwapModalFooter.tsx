import { Trans } from '@lingui/macro'
import { Trade } from '@muffinfi/muffin-sdk'
import * as M from '@muffinfi-ui'
import { Currency, TradeType } from '@uniswap/sdk-core'
import { ReactNode } from 'react'

import { SwapCallbackError } from './styleds'

export default function SwapModalFooter({
  onConfirm,
  swapErrorMessage,
  disabledConfirm,
}: {
  trade: Trade<Currency, Currency, TradeType>
  onConfirm: () => void
  swapErrorMessage: ReactNode | undefined
  disabledConfirm: boolean
}) {
  return (
    <M.Column stretch gap="8px" style={{ margin: '24px 0 0 0' }}>
      <M.ButtonRowPrimary onClick={onConfirm} disabled={disabledConfirm} id="confirm-swap-or-send">
        <M.Text size="lg">
          <Trans>Confirm Swap</Trans>
        </M.Text>
      </M.ButtonRowPrimary>

      {swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
    </M.Column>
  )
}
