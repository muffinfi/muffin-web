import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus, RefreshCw } from 'react-feather'
import styled, { css, keyframes } from 'styled-components/macro'

import { Input as NumericalInput } from '../NumericalInput'

const pulse = (color: string) => keyframes`
  0% {
    box-shadow: 0 0 0 0 ${color};
  }

  70% {
    box-shadow: 0 0 0 2px ${color};
  }

  100% {
    box-shadow: 0 0 0 0 ${color};
  }
`

const FocusedOutlineCard = styled.div<{ active?: boolean; pulsing?: boolean; locked?: boolean }>`
  padding: 12px;
  border-radius: 16px;
  background: var(--layer2);

  transition: border-color 150ms;
  border: 1px solid transparent;
  border-color: ${({ active }) => (active ? 'var(--borderColor1)' : 'transparent')};
  animation: ${({ pulsing, theme }) => pulsing && pulse(theme.blue1)} 0.8s linear;

  :focus,
  :hover {
    border-color: var(--borderColor1);
  }

  ${({ locked }) =>
    locked &&
    css`
      && {
        border-color: transparent;
        background-color: transparent;

        :focus,
        :hover {
          border-color: transparent;
        }
      }
    `}
`

const StepButton = styled(M.Button).attrs({ color: 'tertiary' })`
  border-radius: 6px;
  padding: 0;
  height: 20px;
  width: 20px;
  border: 0;
  flex-shrink: 0;
  :disabled {
    opacity: 0.1;
  }
`

const StyledInput = styled(NumericalInput)<{ usePercent?: boolean }>`
  background-color: transparent;
  text-align: left;
  width: 100%;
  font-weight: 500;
  padding: 0;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size: 16px;
  `};
`

interface StepCounterProps {
  value: string
  onUserInput: (value: string) => void
  decrement: () => string
  increment: () => string
  decrementDisabled?: boolean
  incrementDisabled?: boolean
  width?: string
  locked?: boolean // disable input
  title: ReactNode
  tokenA: string | undefined
  tokenB: string | undefined
  toggleRate?: () => void
  onImmediateInput?: (value: string) => void
  onDecrement?: () => void
  onIncrement?: () => void
}

const StepCounter = ({
  value,
  decrement,
  increment,
  decrementDisabled = false,
  incrementDisabled = false,
  width,
  locked,
  onUserInput,
  title,
  tokenA,
  tokenB,
  toggleRate,
  onImmediateInput,
  onDecrement,
  onIncrement,
}: StepCounterProps) => {
  //  for focus state, styled components doesnt let you select input parent container
  const [active, setActive] = useState(false)

  // let user type value and only update parent value on blur
  const [localValue, setLocalValue] = useState('')
  const [useLocalValue, setUseLocalValue] = useState(false)

  // animation if parent value updates local value
  const [pulsing, setPulsing] = useState<boolean>(false)

  // used to record the last clicked at to prevent pulsing triggered by own buttons
  const lastButtonClickedAt = useRef<number>(0)

  const handleOnFocus = useCallback(() => {
    setUseLocalValue(true)
    setActive(true)
  }, [])

  const handleOnBlur = useCallback(() => {
    setUseLocalValue(false)
    setActive(false)
    onUserInput(localValue) // trigger update on parent value
  }, [localValue, onUserInput])

  // for button clicks
  const handleDecrement = useCallback(() => {
    lastButtonClickedAt.current = Date.now()
    setUseLocalValue(false)
    if (onDecrement) {
      onDecrement()
    } else {
      onUserInput(decrement())
    }
  }, [decrement, onDecrement, onUserInput])

  const handleIncrement = useCallback(() => {
    lastButtonClickedAt.current = Date.now()
    setUseLocalValue(false)
    if (onIncrement) {
      onIncrement()
    } else {
      onUserInput(increment())
    }
  }, [increment, onIncrement, onUserInput])

  const handleInput = useCallback(
    (val: string) => {
      setLocalValue(val)
      onImmediateInput?.(val)
    },
    [onImmediateInput]
  )

  useEffect(() => {
    if (localValue === value || useLocalValue) return
    setLocalValue(value) // reset local value to match parent

    // don't trigger animation when disabled or changed from +/- buttons
    if (locked || Date.now() - lastButtonClickedAt.current < 200) return

    // always retrigger animation
    setPulsing(false)
    setTimeout(() => setPulsing(true), 0)
  }, [locked, localValue, useLocalValue, value])

  // generate random string for input id
  const inputFieldId = useMemo(() => `${Date.now()}-${Math.random()}`, [])

  const handleClickUnit = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault() // prevent focusing on input
      lastButtonClickedAt.current = Date.now()
      toggleRate?.()
    },
    [toggleRate]
  )

  const makePriceUnit = () => (
    <M.Row gap="0.5em" style={{ display: 'inline-flex' }}>
      <M.Text nowrap>
        <Trans>
          {tokenB ?? '-'} per {tokenA ?? '-'}
        </Trans>
      </M.Text>
      {toggleRate && (
        <M.TextContents color="primary1">
          <RefreshCw size="1em" />
        </M.TextContents>
      )}
    </M.Row>
  )

  return (
    <FocusedOutlineCard
      pulsing={pulsing}
      active={active}
      locked={locked}
      style={width ? { width } : undefined}
      as="label"
      htmlFor={inputFieldId}
      onAnimationEnd={() => setPulsing(false)}
    >
      <M.Column stretch gap="8px">
        <M.Text color="text2" size="xs">
          {title}
        </M.Text>

        <M.Row wrap="nowrap" gap="8px">
          <StyledInput
            id={inputFieldId}
            className="rate-input-0"
            value={localValue}
            fontSize="20px"
            disabled={locked}
            onUserInput={handleInput}
            onFocus={handleOnFocus}
            onBlur={handleOnBlur}
          />

          {!locked && (
            <StepButton onClick={handleDecrement} disabled={decrementDisabled}>
              <Minus size={16} />
            </StepButton>
          )}

          {!locked && (
            <StepButton onClick={handleIncrement} disabled={incrementDisabled}>
              <Plus size={16} />
            </StepButton>
          )}
        </M.Row>

        {tokenA || tokenB ? (
          <M.TextDiv color="text2" size="xs">
            {toggleRate ? (
              <M.Anchor role="button" hoverColor="text1" onClick={handleClickUnit}>
                {makePriceUnit()}
              </M.Anchor>
            ) : (
              makePriceUnit()
            )}
          </M.TextDiv>
        ) : null}
      </M.Column>
    </FocusedOutlineCard>
  )
}

export default StepCounter
