import { Trans } from '@lingui/macro'
import { ButtonOutlined } from 'components/Button'
import { RowBetween } from 'components/Row'
import { memo, MouseEventHandler, useCallback } from 'react'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'

const Wrapper = styled(RowBetween)`
  column-gap: 16px;
  row-gap: 4px;
  flex-wrap: wrap;
`

const ButtonsWrapper = styled.div`
  display: inline-flex;
  flex-grow: 1;
  gap: 8px;
`

const ResponsiveMain = styled(ThemedText.Main)`
  line-height: 12px;
  font-size: 12px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size: 10px;
    line-height: 10px;
  `};
`

const ResponsiveText = styled(ThemedText.Label)`
  line-height: 12px;
  font-size: 12px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size: 10px;
    line-height: 10px;
  `};
`

const Button = styled(ButtonOutlined)<{ active?: boolean; borderColor?: string }>`
  border: 1px solid ${({ active, borderColor, theme }) => (active ? borderColor ?? theme.primary1 : theme.bg2)};
`

export const VisiblilitySelector = memo(function VisiblilitySelector({
  displayTexts,
  colors,
  isHidden,
  onToggleVisibility,
}: {
  displayTexts: string[]
  colors: string[]
  isHidden: Record<number, boolean>
  onToggleVisibility: (i: number) => void
}) {
  const onClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      const index = Number(e.currentTarget.dataset.index)
      onToggleVisibility(index)
    },
    [onToggleVisibility]
  )
  return (
    <Wrapper>
      <ResponsiveMain>
        <Trans>Show Liquidity</Trans>:
      </ResponsiveMain>
      <ButtonsWrapper>
        {displayTexts.map((text, index) => (
          <Button
            key={text}
            active={!isHidden[index]}
            borderColor={colors[index % colors.length]}
            onClick={onClick}
            data-index={index}
            padding="8px 6px"
            $borderRadius="8px"
          >
            <ResponsiveText>
              <Trans>{text}</Trans>
            </ResponsiveText>
          </Button>
        ))}
      </ButtonsWrapper>
    </Wrapper>
  )
})
