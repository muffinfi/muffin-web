// eslint-disable-next-line no-restricted-imports
import { t, Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { Currency, CurrencyAmount, Percent } from '@uniswap/sdk-core'
import HoverInlineText from 'components/HoverInlineText'
import { useMemo } from 'react'

import useTheme from '../../hooks/useTheme'
import { warningSeverity } from '../../utils/prices'
import { MouseoverTooltip } from '../Tooltip'

export function FiatValue({
  fiatValue,
  priceImpact,
}: {
  fiatValue: CurrencyAmount<Currency> | null | undefined
  priceImpact?: Percent
}) {
  const theme = useTheme()
  const priceImpactColor = useMemo(() => {
    if (!priceImpact) return undefined
    if (priceImpact.lessThan('0')) return theme.green1
    const severity = warningSeverity(priceImpact)
    if (severity < 1) return theme.text3
    if (severity < 3) return theme.yellow1
    return theme.red1
  }, [priceImpact, theme.green1, theme.red1, theme.text3, theme.yellow1])

  return (
    <M.Text color="text2">
      {fiatValue ? (
        <Trans>
          $
          <HoverInlineText text={fiatValue?.toSignificant(6, { groupSeparator: ',' })} />
        </Trans>
      ) : null}
      {priceImpact ? (
        <M.Text size="xs" style={{ color: priceImpactColor }}>
          &nbsp;&nbsp;
          <MouseoverTooltip text={t`The estimated difference between the USD values of input and output amounts.`}>
            (<Trans>{priceImpact?.multiply(-1).toSignificant(3)}%</Trans>)
          </MouseoverTooltip>
        </M.Text>
      ) : null}
    </M.Text>
  )
}
