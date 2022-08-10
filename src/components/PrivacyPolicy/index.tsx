import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { DarkGreyCard } from 'components/Card'
import { AutoRow, RowBetween } from 'components/Row'
import useToggle from 'hooks/useToggle'
import { useEffect, useRef } from 'react'
import { ArrowDown, Info, X } from 'react-feather'
import ReactGA from 'react-ga'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'
import { isMobile } from 'utils/userAgent'

import { useModalOpen, useTogglePrivacyPolicy } from '../../state/application/hooks'
import { ApplicationModal } from '../../state/application/reducer'
import { AutoColumn } from '../Column'
import Modal from '../Modal'

const Wrapper = styled.div`
  max-height: 70vh;
  overflow: auto;
  padding: 0 1rem 1rem;
`

const StyledCard = styled(DarkGreyCard)`
  cursor: pointer;
  color: var(--text1);
  background-color: var(--tertiary0);
  padding: 1rem;
  width: 100%;

  :hover,
  :focus {
    background-color: var(--tertiary1);
  }
  :active {
    background-color: var(--tertiary2);
  }
`

const APICard = styled(DarkGreyCard)`
  color: var(--text1);
  background-color: var(--layer2);
`

const HoverText = styled.div`
  text-decoration: none;
  color: ${({ theme }) => theme.text1};
  display: flex;
  align-items: center;

  :hover {
    cursor: pointer;
  }
`

const StyledLinkOut = styled(ArrowDown)`
  transform: rotate(230deg);
`

const EXTERNAL_APIS = [
  // {
  //   name: 'Auto Router',
  //   description: <Trans>The app fetches the optimal trade route from a Uniswap Labs server.</Trans>,
  // },
  {
    name: 'Infura',
    description: <Trans>The app fetches on-chain data and constructs contract calls with an Infura API.</Trans>,
  },
  {
    name: 'Google Analytics',
    description: <Trans>The app logs anonymized usage statistics in order to improve over time.</Trans>,
  },
  {
    name: 'The Graph',
    description: <Trans>The app fetches blockchain data from The Graph&apos;s hosted service.</Trans>,
  },
]

export function PrivacyPolicyModal() {
  const node = useRef<HTMLDivElement>()
  const open = useModalOpen(ApplicationModal.PRIVACY_POLICY)
  const toggle = useTogglePrivacyPolicy()

  useEffect(() => {
    if (!open) return

    ReactGA.event({
      category: 'Modal',
      action: 'Show Legal',
    })
  }, [open])

  return (
    <Modal isOpen={open} onDismiss={() => toggle()}>
      <AutoColumn gap="12px" ref={node as any}>
        <RowBetween padding="1rem 1rem 0.5rem 1rem">
          <ThemedText.MediumHeader>
            <Trans>Legal &amp; Privacy</Trans>
          </ThemedText.MediumHeader>
          <HoverText onClick={() => toggle()}>
            <X size={24} />
          </HoverText>
        </RowBetween>

        <PrivacyPolicy />
      </AutoColumn>
    </Modal>
  )
}

export function PrivacyPolicy() {
  const [openDisclaimer, toggleDisclaimer] = useToggle(false)

  return (
    <Wrapper
      draggable="true"
      onTouchMove={(e) => {
        // prevent modal gesture handler from dismissing modal when content is scrolling
        if (isMobile) {
          e.stopPropagation()
        }
      }}
    >
      <AutoColumn gap="16px">
        <AutoColumn gap="8px" style={{ width: '100%' }}>
          {/* <StyledCard>
            <ExternalLink href={'https://muffin.fi/terms-of-service'}>
              <RowBetween>
                <AutoRow gap="4px">
                  <Info size={20} />
                  <ThemedText.Main fontSize={14} color={'primaryText1'}>
                    <Trans>Muffin&apos;s Terms of Service</Trans>
                  </ThemedText.Main>
                </AutoRow>
                <StyledLinkOut size={20} />
              </RowBetween>
            </ExternalLink>
          </StyledCard> */}
          <StyledCard onClick={toggleDisclaimer}>
            <RowBetween>
              <AutoRow gap="4px">
                <Info size={18} />
                <M.Text size="sm" weight="medium">
                  <Trans>Protocol Disclaimer</Trans>
                </M.Text>
              </AutoRow>
              <StyledLinkOut size={18} />
            </RowBetween>
          </StyledCard>
        </AutoColumn>
        <ThemedText.Main fontSize={14}>
          <Trans>This app uses the following third-party APIs:</Trans>
        </ThemedText.Main>
        <AutoColumn gap="12px">
          {EXTERNAL_APIS.map(({ name, description }, i) => (
            <APICard key={i}>
              <AutoColumn gap="8px">
                <AutoRow gap="4px">
                  <Info size={18} />
                  <ThemedText.Main fontSize={14} color={'text1'}>
                    {name}
                  </ThemedText.Main>
                </AutoRow>
                <ThemedText.Main fontSize={14}>{description}</ThemedText.Main>
              </AutoColumn>
            </APICard>
          ))}
          {/* <Row justify="center" marginBottom="1rem">
            <ExternalLink href="https://help.uniswap.org/en/articles/5675203-terms-of-service-faq">
              <Trans>Learn more</Trans>
            </ExternalLink>
          </Row> */}
        </AutoColumn>
      </AutoColumn>

      <DisclaimerModal open={openDisclaimer} toggle={toggleDisclaimer} />
    </Wrapper>
  )
}

export const DisclaimerModal = ({ open, toggle }: { open: boolean; toggle: () => void }) => {
  return (
    <Modal isOpen={open} maxWidth={600} onDismiss={toggle}>
      <div style={{ padding: '0.5rem 1rem 1rem', fontSize: '14px', lineHeight: 1.45, fontWeight: 375 }}>
        <h2>Protocol Disclaimer</h2>
        <p>
          Muffin is a decentralized peer-to-peer protocol that people can use to create liquidity and trade ERC-20
          tokens. The Muffin protocol is made up of free, public, open-source or source-available software including a
          set of smart contracts that are deployed on the Ethereum Blockchain. Your use of the Muffin protocol involves
          various risks, including, but not limited to, losses while digital assets are being supplied to the Muffin
          protocol and losses due to the fluctuation of prices of tokens in a trading pair or liquidity pool. Before
          using the Muffin protocol, you should review the relevant documentation to make sure you understand how the
          Muffin protocol works. Additionally, just as you can access email email protocols such as SMTP through
          multiple email clients, you can access the Muffin protocol through dozens of web or mobile interfaces. You are
          responsible for doing your own diligence on those interfaces to understand the fees and risks they present.
        </p>
        <p>
          {/* eslint-disable react/no-unescaped-entities */}
          THE MUFFIN PROTOCOL IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND. It is run by
          smart contracts deployed on the Ethereum blockchain, and can be interacted permissionlessly by anyone who has
          access to the blockchain. No developer or entity involved in creating the Muffin protocol can will be liable
          for any claims or damages whatsoever associated with your use, inability to use, or your interaction with
          other users of, the Muffin protocol, including any direct, indirect, incidental, special, exemplary, punitive
          or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
          {/* eslint-enable react/no-unescaped-entities */}
        </p>
      </div>
    </Modal>
  )
}
