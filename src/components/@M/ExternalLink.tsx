import ReactGA from 'react-ga'
import styled from 'styled-components/macro'
import { anonymizeLink } from 'utils/anonymizeLink'
import { Anchor } from './misc'

function handleClickExternalLink(event: React.MouseEvent<HTMLAnchorElement>) {
  const { target, href } = event.currentTarget

  const anonymizedHref = anonymizeLink(href)

  // don't prevent default, don't redirect if it's a new tab
  if (target === '_blank' || event.ctrlKey || event.metaKey) {
    ReactGA.outboundLink({ label: anonymizedHref }, () => {
      console.debug('Fired outbound link event', anonymizedHref)
    })
  } else {
    event.preventDefault()
    // send a ReactGA event and then trigger a location change
    ReactGA.outboundLink({ label: anonymizedHref }, () => {
      window.location.href = anonymizedHref
    })
  }
}

const ExternalLink = styled(Anchor).attrs({
  target: '_blank',
  rel: 'noopener noreferrer',
  onClick: handleClickExternalLink,
})``

export default ExternalLink
