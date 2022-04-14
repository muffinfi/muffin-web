import Swap from 'pages/Swap'
import { RouteComponentProps } from 'react-router-dom'
import styled from 'styled-components/macro'

const AlertWrapper = styled.div`
  max-width: 460px;
  width: 100%;
`

export default function LimitRange(props: RouteComponentProps) {
  return <Swap {...props} />
}
