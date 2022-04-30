import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus } from 'react-feather'
import styled, { keyframes } from 'styled-components/macro'
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

const FocusedOutlineCard = styled.div<{ active?: boolean; pulsing?: boolean }>`
  padding: 12px;
  border-radius: 16px;
  background: var(--layer2);

  transition: border-color 150ms;
  border: 1px solid transparent;
  border-color: ${({ active }) => (active ? 'var(--borderColor1)' : 'transparent')};
  animation: ${({ pulsing, theme }) => pulsing && pulse(theme.blue1)} 0.8s linear;
`

const StepButton = styled(M.Button).attrs({ color: 'tertiary' })`
  border-radius: 8px;
  padding: 0;
  height: 26px;
  width: 26px;
  border: 0;
  flex-shrink: 0;
`

const StyledInput = styled(NumericalInput)<{ usePercent?: boolean }>`
  background-color: transparent;
  text-align: center;
  width: 100%;
  font-weight: 500;
  padding: 0;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size: 16px;
  `};

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    font-size: 12px;
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
  handleChangeImmediately?: boolean
  disablePulsing?: boolean
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
  handleChangeImmediately,
  disablePulsing,
}: StepCounterProps) => {
  //  for focus state, styled components doesnt let you select input parent container
  const [active, setActive] = useState(false)

  // let user type value and only update parent value on blur
  const [localValue, setLocalValue] = useState('')
  const [useLocalValue, setUseLocalValue] = useState(false)

  // animation if parent value updates local value
  const [pulsing, setPulsing] = useState<boolean>(false)

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
    timestampLastButtonClick.current = Date.now()
    setUseLocalValue(false)
    onUserInput(decrement())
  }, [decrement, onUserInput])

  const handleIncrement = useCallback(() => {
    timestampLastButtonClick.current = Date.now()
    setUseLocalValue(false)
    onUserInput(increment())
  }, [increment, onUserInput])

  const handleInput = useCallback(
    (val: string) => {
      setLocalValue(val)
      handleChangeImmediately && onUserInput(val)
    },
    [handleChangeImmediately, onUserInput]
  )

  const timeoutId = useRef<ReturnType<typeof setTimeout>>()
  const timestampLastButtonClick = useRef<number>(0)

  useEffect(() => {
    if (localValue !== value && !useLocalValue) {
      if (disablePulsing) {
        setLocalValue(value)
      } else {
        // setTimeout(() => {
        setLocalValue(value) // reset local value to match parent

        if (Date.now() - timestampLastButtonClick.current > 200) {
          setPulsing(true) // trigger animation

          if (timeoutId.current) clearTimeout(timeoutId.current)
          timeoutId.current = setTimeout(() => {
            setPulsing(false)
          }, 1800)
        }
        // }, 0)
      }
    }
  }, [disablePulsing, localValue, useLocalValue, value])

  // generate random string for input id
  const inputFieldId = useMemo(() => `${Date.now()}-${Math.random()}`, [])

  return (
    <FocusedOutlineCard
      pulsing={pulsing}
      active={active}
      style={width ? { width } : undefined}
      as="label"
      htmlFor={inputFieldId}
    >
      <M.ColumnCenter stretch gap="8px">
        <M.Text color="text2" size="xs">
          {title}
        </M.Text>

        <M.Row wrap="nowrap" gap="6px">
          {!locked && (
            <StepButton onClick={handleDecrement} disabled={decrementDisabled}>
              <Minus size={16} />
            </StepButton>
          )}

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
            <StepButton onClick={handleIncrement} disabled={incrementDisabled}>
              <Plus size={16} />
            </StepButton>
          )}
        </M.Row>

        <M.Text color="text2" size="xs">
          {tokenA || tokenB ? (
            <Trans>
              {tokenB ?? '-'} per {tokenA ?? '-'}
            </Trans>
          ) : (
            <span>&nbsp;</span>
          )}
        </M.Text>
      </M.ColumnCenter>
    </FocusedOutlineCard>
  )
}

export default StepCounter
