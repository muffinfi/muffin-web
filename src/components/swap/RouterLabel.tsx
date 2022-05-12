import { Trans } from '@lingui/macro'
import useAutoRouterSupported from 'hooks/useAutoRouterSupported'
import styled from 'styled-components/macro'

import { ReactComponent as StaticRouterIcon } from '../../assets/svg/static_route.svg'
import AutoRouterIcon from './AutoRouterIcon'

const StyledAutoRouterIcon = styled(AutoRouterIcon)`
  height: 14px;
  width: 14px;

  :hover {
    filter: brightness(1.3);
  }
`

const StyledStaticRouterIcon = styled(StaticRouterIcon)`
  height: 14px;
  width: 14px;

  fill: var(--text2);

  :hover {
    filter: brightness(1.3);
  }
`

const StyledAutoRouterLabel = styled.span`
  line-height: 1rem;

  /* fallback color */
  color: var(--green);

  @supports (-webkit-background-clip: text) and (-webkit-text-fill-color: transparent) {
    background-image: linear-gradient(90deg, #2172e5 0%, #54e521 163.16%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`

export function AutoRouterLogo() {
  const autoRouterSupported = useAutoRouterSupported()

  return autoRouterSupported ? <StyledAutoRouterIcon /> : <StyledStaticRouterIcon />
}

export function AutoRouterLabel() {
  const autoRouterSupported = useAutoRouterSupported()

  return autoRouterSupported ? <StyledAutoRouterLabel>Auto Router</StyledAutoRouterLabel> : <Trans>Trade Route</Trans>
}
