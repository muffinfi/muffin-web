import { useSwitch, useSwitchWithDelayedClose } from 'hooks/useSwitch'
import { ReactNode, useCallback } from 'react'
import { Box, BoxProps } from 'rebass'
import styled from 'styled-components/macro'

import Popover, { PopoverProps } from '../Popover'

export const TooltipContainer = styled.div`
  max-width: 300px;
  padding: 0.6rem 0.8rem;
  word-break: break-word;
  font-weight: 400;
  font-size: 13px;
  line-height: 1.33;

  border-radius: 10px;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.1);
  background: var(--layer1);
  border: 1px solid var(--borderColor);
`

interface TooltipProps extends Omit<PopoverProps, 'content'> {
  text: ReactNode
}

interface TooltipContentProps extends Omit<PopoverProps, 'content'> {
  content: ReactNode
  onOpen?: () => void
  wrap?: boolean // whether to wrap the content in a `TooltipContainer`
  disableHover?: boolean // disable the hover and content display
}

export default function Tooltip({ text, ...rest }: TooltipProps) {
  return <Popover content={<TooltipContainer>{text}</TooltipContainer>} {...rest} />
}

function TooltipContent({ content, wrap = false, ...rest }: TooltipContentProps) {
  return <Popover content={wrap ? <TooltipContainer>{content}</TooltipContainer> : content} {...rest} />
}

export function MouseoverTooltip({
  keepOpenWhenHoverTooltip,
  wrapperProps,
  children,
  ...rest
}: Omit<TooltipProps, 'show'> & {
  keepOpenWhenHoverTooltip?: boolean
  wrapperProps?: Omit<BoxProps, 'onMouseEnter' | 'onMouseLeave'>
}) {
  const { state: show, open, close } = useSwitchWithDelayedClose()

  return (
    <Tooltip
      {...rest}
      show={show}
      onMouseEnter={keepOpenWhenHoverTooltip ? open : undefined}
      onMouseLeave={keepOpenWhenHoverTooltip ? close : undefined}
    >
      <Box {...wrapperProps} onMouseEnter={open} onMouseLeave={close}>
        {children}
      </Box>
    </Tooltip>
  )
}

export function MouseoverTooltipContent({
  content,
  children,
  onOpen: openCallback = undefined,
  disableHover,
  ...rest
}: Omit<TooltipContentProps, 'show'>) {
  const { state: show, open: _open, close } = useSwitch()
  const open = useCallback(() => {
    _open()
    openCallback?.()
  }, [_open, openCallback])

  return (
    <TooltipContent {...rest} show={show} content={disableHover ? null : content}>
      <div
        style={{ display: 'inline-block', lineHeight: 0, padding: '0.25rem' }}
        onMouseEnter={open}
        onMouseLeave={close}
      >
        {children}
      </div>
    </TooltipContent>
  )
}
