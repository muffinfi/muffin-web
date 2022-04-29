import { Row } from '@muffinfi-ui'
import styled from 'styled-components/macro'

const HeaderButton = styled(Row)`
  justify-content: center;

  background-color: var(--layer1);
  border: 1px solid var(--borderColor);
  border-radius: 16px;
  height: 40px;
  font-weight: var(--medium);
  white-space: nowrap;
`

export default HeaderButton
