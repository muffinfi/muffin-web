import { memo } from 'react'
import { Minimize, RefreshCcw, ZoomIn, ZoomOut } from 'react-feather'
import styled from 'styled-components/macro'

const Wrapper = styled.div<{ count: number }>`
  display: grid;
  grid-template-columns: repeat(${({ count }) => `${count}`}, max-content);
  grid-gap: 6px;
  justify-content: flex-end;

  position: absolute;
  top: -36px;
  right: 0;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    position: relative;
    top: 0;
    right: 0;
  `};
`

const BaseButton = styled.button`
  appearance: none;
  text-decoration: none;
  outline: none;
  box-shadow: none;
  cursor: pointer;
  margin: 0;
  padding: 0;
  height: auto;
  user-select: none;
  text-align: center;

  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  flex-wrap: nowrap;

  border: 0;
  background: #eee;
`

const Button = styled(BaseButton)`
  width: 32px;
  height: 32px;
  padding: 4px;
  border-radius: 999px;

  background-color: ${({ theme }) => theme.bg1};
  color: ${({ theme }) => theme.text2};
  font-size: 16px;
  font-weight: 500;

  &:hover {
    background-color: ${({ theme }) => theme.bg2};
    color: ${({ theme }) => theme.text1};
  }
`

export const ZoomControl = memo(function ZoomControl({
  zoomIn,
  zoomOut,
  zoomToFitSelectedRange,
  resetRange,
  showResetButton,
}: {
  zoomIn: () => void
  zoomOut: () => void
  zoomToFitSelectedRange: () => void
  resetRange: () => void
  showResetButton: boolean
}) {
  return (
    <Wrapper count={3}>
      {showResetButton ? (
        <Button onClick={() => resetRange()}>
          <RefreshCcw size={16} />
        </Button>
      ) : (
        <Button onClick={() => zoomToFitSelectedRange()}>
          <Minimize size={16} />
        </Button>
      )}
      <Button onClick={zoomIn} disabled={false}>
        <ZoomIn size={16} />
      </Button>
      <Button onClick={zoomOut} disabled={false}>
        <ZoomOut size={16} />
      </Button>
    </Wrapper>
  )
})
