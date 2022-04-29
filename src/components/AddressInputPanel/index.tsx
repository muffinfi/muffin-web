// eslint-disable-next-line no-restricted-imports
import { t, Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { ReactNode, useCallback } from 'react'
import styled from 'styled-components/macro'
import useENS from '../../hooks/useENS'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'

const InputPanel = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
`

const ContainerRow = styled.div<{ error: boolean }>`
  padding: 1rem;

  border-radius: 16px;
  border: 1px solid ${({ error }) => (error ? 'var(--error-bg)' : 'var(--layer2)')};
  background-color: var(--layer2);

  /* prettier-ignore */
  transition:
    border-color 300ms ${({ error }) => (error ? 'step-end' : 'step-start')},
    color 500ms ${({ error }) => (error ? 'step-end' : 'step-start')};
`

const Input = styled.input<{ error?: boolean }>`
  font-size: 16px;
  outline: none;
  border: none;
  flex: 1 1 auto;
  width: 0;
  background-color: var(--layer2);
  transition: color 300ms ${({ error }) => (error ? 'step-end' : 'step-start')};
  color: ${({ error }) => (error ? 'var(--error-bg)' : 'var(--text1)')};
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  width: 100%;
  ::placeholder {
    color: var(--placeholder-text);
  }
  padding: 0px;
  -webkit-appearance: textfield;

  ::-webkit-search-decoration {
    -webkit-appearance: none;
  }

  ::-webkit-outer-spin-button,
  ::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }

  ::placeholder {
    color: var(--placeholder-text);
  }
`

export default function AddressInputPanel({
  id,
  className = 'recipient-address-input',
  label,
  placeholder,
  value,
  onChange,
}: {
  id?: string
  className?: string
  label?: ReactNode
  placeholder?: string
  // the typed string value
  value: string
  // triggers whenever the typed value changes
  onChange: (value: string) => void
}) {
  const { chainId } = useActiveWeb3React()

  const { address, loading, name } = useENS(value)

  const handleInput = useCallback(
    (event) => {
      const input = event.target.value
      const withoutSpaces = input.replace(/\s+/g, '')
      onChange(withoutSpaces)
    },
    [onChange]
  )

  const error = Boolean(value.length > 0 && !loading && !address)

  return (
    <InputPanel id={id}>
      <ContainerRow error={error}>
        <M.Column stretch gap="12px">
          <M.RowBetween>
            <M.Text color="text2" size="sm">
              {label ?? <Trans>Recipient</Trans>}
            </M.Text>
            {address && chainId && (
              <M.ExternalLink
                href={getExplorerLink(chainId, name ?? address, ExplorerDataType.ADDRESS)}
                size="xs"
                color="primary0"
              >
                <Trans>View on Explorer</Trans>
              </M.ExternalLink>
            )}
          </M.RowBetween>
          <Input
            className={className}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder={placeholder ?? t`Wallet Address or ENS name`}
            error={error}
            pattern="^(0x[a-fA-F0-9]{40})$"
            onChange={handleInput}
            value={value}
          />
        </M.Column>
      </ContainerRow>
    </InputPanel>
  )
}
