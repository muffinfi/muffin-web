import { ReactNode, useCallback, useState } from 'react'
import styled from 'styled-components/macro'

import Tooltip from '../Tooltip'

const QuestionWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px;
  width: 17px;
  height: 17px;
  border: none;
  background: none;
  outline: none;
  cursor: default;
  border-radius: 36px;
  font-size: 12px;
  background-color: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text2};

  :hover,
  :focus {
    opacity: 0.7;
  }
`

const QuestionMark = styled.span`
  font-size: 13px;
`

export default function QuestionHelper({ text }: { text: ReactNode; size?: number }) {
  const [show, setShow] = useState<boolean>(false)

  const open = useCallback(() => setShow(true), [setShow])
  const close = useCallback(() => setShow(false), [setShow])

  return (
    <span style={{ marginLeft: 4, display: 'flex', alignItems: 'center' }}>
      <Tooltip text={text} show={show}>
        <QuestionWrapper onClick={open} onMouseEnter={open} onMouseLeave={close}>
          <QuestionMark>?</QuestionMark>
        </QuestionWrapper>
      </Tooltip>
    </span>
  )
}

const QuestionMarkInline = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.077em;
  width: 1.077em;
  border-radius: 1.077em;
  cursor: default;
  outline: none;
  user-select: none;

  background-color: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text2};

  :hover,
  :focus {
    opacity: 0.7;
  }

  & > span {
    font-size: 0.9em;
    transform: scale(0.9);
  }
`

export function QuestionHelperInline({ text }: { text: ReactNode }) {
  const [show, setShow] = useState<boolean>(false)
  const open = useCallback(() => setShow(true), [setShow])
  const close = useCallback(() => setShow(false), [setShow])

  return (
    <span style={{ marginLeft: 6 }}>
      <Tooltip text={text} show={show}>
        <QuestionMarkInline onClick={open} onMouseEnter={open} onMouseLeave={close}>
          <span>?</span>
        </QuestionMarkInline>
      </Tooltip>
    </span>
  )
}
