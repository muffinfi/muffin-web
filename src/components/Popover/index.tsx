import { Options, Placement } from '@popperjs/core'
import Portal from '@reach/portal'
import useInterval from 'lib/hooks/useInterval'
import React, { useCallback, useMemo, useState } from 'react'
import { usePopper } from 'react-popper'
import styled from 'styled-components/macro'

const PopoverContainer = styled.div<{ show: boolean }>`
  z-index: 9999;
  visibility: ${(props) => (props.show ? 'visible' : 'hidden')};
  opacity: ${(props) => (props.show ? 1 : 0)};
  transition: visibility 120ms linear, opacity 120ms linear;
  color: var(--text1);

  &[data-popper-placement^='top'] {
    padding-bottom: 8px;
  }
  &[data-popper-placement^='bottom'] {
    padding-top: 8px;
  }
  &[data-popper-placement^='left'] {
    padding-right: 8px;
  }
  &[data-popper-placement^='right'] {
    padding-left: 8px;
  }
`

const ReferenceElement = styled.div`
  display: inline-block;
`

const Arrow = styled.div`
  width: 8px;
  height: 8px;
  z-index: 9998;

  ::before {
    position: absolute;
    width: 8px;
    height: 8px;
    z-index: 9998;

    content: '';
    transform: rotate(45deg);
    background: var(--layer1);
    border: 1px solid var(--borderColor);
  }

  &.arrow-top {
    bottom: 5px;
    ::before {
      border-top: none;
      border-left: none;
    }
  }

  &.arrow-bottom,
  &.arrow-bottom-start {
    top: 4px;
    ::before {
      border-bottom: none;
      border-right: none;
    }
  }

  &.arrow-left {
    right: 4px;
    ::before {
      border-bottom: none;
      border-left: none;
    }
  }

  &.arrow-right {
    left: 4px;
    ::before {
      border-right: none;
      border-top: none;
    }
  }
`

export interface PopoverProps {
  content: React.ReactNode
  show: boolean
  children: React.ReactNode
  placement?: Placement
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export default function Popover({
  content,
  show,
  children,
  placement = 'auto',
  onMouseEnter,
  onMouseLeave,
}: PopoverProps) {
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null)
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null)
  const [arrowElement, setArrowElement] = useState<HTMLDivElement | null>(null)

  const options: Options = useMemo(
    () => ({
      placement,
      strategy: 'absolute', // 'fixed',
      modifiers: [
        { name: 'offset', options: { offset: [placement === 'bottom-start' ? -10 : 0, 0] } },
        { name: 'arrow', options: { element: arrowElement } },
        { name: 'preventOverflow', options: { padding: 8 } },
      ],
    }),
    [arrowElement, placement]
  )

  const { styles, update, attributes } = usePopper(referenceElement, popperElement, options)

  const updateCallback = useCallback(() => {
    update?.()
  }, [update])
  useInterval(updateCallback, show ? 100 : null)

  return (
    <>
      <ReferenceElement ref={setReferenceElement}>{children}</ReferenceElement>
      <Portal>
        <PopoverContainer
          show={show}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          ref={setPopperElement}
          style={styles.popper}
          {...attributes.popper}
        >
          {content}
          <Arrow
            className={`arrow-${attributes.popper?.['data-popper-placement'] ?? ''}`}
            ref={setArrowElement}
            style={styles.arrow}
            {...attributes.arrow}
          />
        </PopoverContainer>
      </Portal>
    </>
  )
}
