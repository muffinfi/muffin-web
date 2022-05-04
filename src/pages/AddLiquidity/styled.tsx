import * as M from '@muffinfi-ui'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import { LoadingRows as BaseLoadingRows } from 'components/Loader/styled'
import Input from 'components/NumericalInput'
import styled from 'styled-components/macro'

export const LoadingRows = styled(BaseLoadingRows)`
  width: 100%;
  grid-column-gap: 0.5em;
  grid-row-gap: 0.8em;
  grid-template-columns: repeat(1, 1fr);

  & > div:nth-child(3n) {
    width: 50%;
    margin-bottom: 2em;
  }
`

export const ColumnDisableable = styled(M.Column)<{ disabled?: boolean }>`
  opacity: ${({ disabled }) => (disabled ? '0.2' : '1')};
  pointer-events: ${({ disabled }) => (disabled ? 'none' : 'initial')};
`

export const CurrencyDropdown = styled(CurrencyInputPanel)`
  width: 100%;
`

export const StyledInput = styled(Input)`
  background-color: inherit;
  text-align: left;
  font-size: 18px;
  width: 100%;
`
