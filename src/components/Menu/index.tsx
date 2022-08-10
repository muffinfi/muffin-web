// eslint-disable-next-line no-restricted-imports
import { t, Trans } from '@lingui/macro'
import { getMuffinAnalyticsURL } from '@muffinfi/utils/getMuffinAnalyticsURL'
import HeaderButton from 'components/Header/HeaderButton'
import { PrivacyPolicyModal } from 'components/PrivacyPolicy'
import { LOCALE_LABEL, SUPPORTED_LOCALES, SupportedLocale } from 'constants/locales'
import { useActiveLocale } from 'hooks/useActiveLocale'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useLocationLinkProps } from 'hooks/useLocationLinkProps'
import React, { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronLeft,
  // Coffee,
  FileText,
  // Globe,
  // HelpCircle,
  Info,
  MessageCircle,
  Moon,
  Sun,
} from 'react-feather'
import { Link } from 'react-router-dom'
import { useDarkModeManager } from 'state/user/hooks'
import styled from 'styled-components/macro'

import { ReactComponent as RawMenuIcon } from '../../assets/images/menu.svg'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { useModalOpen, useToggleModal } from '../../state/application/hooks'
import { ApplicationModal } from '../../state/application/reducer'
import { ExternalLink } from '../../theme'

export enum FlyoutAlignment {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

///// Button on Header /////

const MenuWrapper = styled.div`
  position: relative;
`

const MenuButton = styled(HeaderButton).attrs({ role: 'button' })`
  width: 42px;
  cursor: pointer;
  :hover {
    border: 1px solid var(--tertiary2);
  }
`

const MenuIcon = styled(RawMenuIcon)`
  margin-top: 2px;

  path {
    stroke: var(--text1);
  }
`

///// Dropdown menu /////

const MenuFlyout = styled.div<{ flyoutAlignment?: FlyoutAlignment }>`
  position: absolute;
  z-index: 100;
  transform: translateY(10px);

  ${({ flyoutAlignment = FlyoutAlignment.RIGHT }) =>
    flyoutAlignment === FlyoutAlignment.RIGHT ? `right: 0rem;` : `left: 0rem;`};

  ${({ theme }) => theme.mediaWidth.upToMedium`
    bottom: unset;
    right: 0;
    left: unset;
  `};

  display: block;
  min-width: 196px;
  max-height: 350px;
  overflow: auto;
  padding: 0.5rem;

  border-radius: 16px;
  background-color: var(--layer1);
  /* prettier-ignore */
  box-shadow:
    0px 0px 1px rgba(0, 0, 0, 0.01),
    0px 4px 8px rgba(0, 0, 0, 0.04),
    0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
`

const MenuItem = styled.a.attrs({ role: 'button' })`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  padding: 0.5rem;
  font-weight: 500;
  color: var(--text2);
  :hover {
    color: var(--text1);
  }

  cursor: pointer;
  text-decoration: none;

  :hover,
  :focus,
  :active {
    outline: none;
    text-decoration: none;
  }
`

const MenuItemExternalLink = styled(MenuItem).attrs({ as: ExternalLink })``

const MenuItemInternalLink = styled(MenuItem).attrs({ as: Link })<{ to: any }>``

const MenuSeperator = styled.div`
  margin: 0.5rem;
  border-bottom: 1px solid var(--borderColor);
`

const NavMenuItemList = styled.div`
  display: none;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    display: block;
  `};
`

//////////

function LanguageMenuItem({ locale, active, key }: { locale: SupportedLocale; active: boolean; key: string }) {
  const { to, onClick } = useLocationLinkProps(locale)
  if (!to) return null

  return (
    <MenuItemInternalLink onClick={onClick} key={key} to={to}>
      <div>{LOCALE_LABEL[locale]}</div>
      {active && <Check opacity={0.6} size={16} />}
    </MenuItemInternalLink>
  )
}

function LanguageMenu({ close }: { close: () => void }) {
  const activeLocale = useActiveLocale()

  return (
    <MenuFlyout>
      <MenuItem onClick={close}>
        <ChevronLeft size={16} />
      </MenuItem>
      {SUPPORTED_LOCALES.map((locale) => (
        <LanguageMenuItem locale={locale} active={activeLocale === locale} key={locale} />
      ))}
    </MenuFlyout>
  )
}

export default function Menu() {
  const node = useRef<HTMLDivElement>(null)
  const open = useModalOpen(ApplicationModal.MENU)
  const toggleMenu = useToggleModal(ApplicationModal.MENU)
  useOnClickOutside(node, open ? toggleMenu : undefined)

  // terms modal
  const togglePrivacyPolicy = useToggleModal(ApplicationModal.PRIVACY_POLICY)

  // dark mode
  const [darkMode, toggleDarkMode] = useDarkModeManager()

  // locale
  const [menu, setMenu] = useState<'main' | 'lang'>('main')

  useEffect(() => {
    setMenu('main')
  }, [open])

  const { chainId } = useActiveWeb3React()

  return (
    <>
      <MenuWrapper ref={node}>
        <MenuButton onClick={toggleMenu} aria-label={t`Menu`}>
          <MenuIcon />
        </MenuButton>

        {open &&
          (() => {
            switch (menu) {
              case 'lang':
                return <LanguageMenu close={() => setMenu('main')} />
              case 'main':
              default:
                return (
                  <MenuFlyout>
                    <NavMenuItemList>
                      <MenuItemInternalLink to="/swap" onClick={toggleMenu}>
                        <Trans>Swap</Trans>
                      </MenuItemInternalLink>
                      <MenuItemInternalLink to="/positions" onClick={toggleMenu}>
                        <Trans>Positions</Trans>
                      </MenuItemInternalLink>
                      <MenuItemInternalLink to="/account" onClick={toggleMenu}>
                        <Trans>Account</Trans>
                      </MenuItemInternalLink>
                      <MenuItemExternalLink href={getMuffinAnalyticsURL(chainId)}>
                        <div>
                          <Trans>Analytics</Trans> ↗
                        </div>
                      </MenuItemExternalLink>
                      <MenuSeperator />
                    </NavMenuItemList>

                    <MenuItem onClick={() => toggleDarkMode()}>
                      <div>{darkMode ? <Trans>Light Theme</Trans> : <Trans>Dark Theme</Trans>}</div>
                      {darkMode ? <Moon opacity={0.6} size={16} /> : <Sun opacity={0.6} size={16} />}
                    </MenuItem>

                    <MenuSeperator />

                    <MenuItemExternalLink href="/">
                      <div>
                        <Trans>About</Trans>
                      </div>
                      <Info opacity={0.6} size={16} />
                    </MenuItemExternalLink>
                    {/* <MenuItemExternalLink href="/">
                      <div>
                        <Trans>Help Center</Trans>
                      </div>
                      <HelpCircle opacity={0.6} size={16} />
                    </MenuItemExternalLink> */}
                    {/* <MenuItemExternalLink href="/">
                      <div>
                        <Trans>Request Features</Trans>
                      </div>
                      <Coffee opacity={0.6} size={16} />
                    </MenuItemExternalLink> */}
                    <MenuItemExternalLink href="https://discord.gg/TMaF2BFJhj">
                      <div>
                        <Trans>Discord</Trans>
                      </div>
                      <MessageCircle opacity={0.6} size={16} />
                    </MenuItemExternalLink>
                    {/* <MenuItem onClick={() => setMenu('lang')}>
                      <div>
                        <Trans>Language</Trans>
                      </div>
                      <Globe opacity={0.6} size={16} />
                    </MenuItem> */}
                    <MenuItemExternalLink href="https://docs.muffin.fi/">
                      <div>
                        <Trans>Docs</Trans>
                      </div>
                      <BookOpen opacity={0.6} size={16} />
                    </MenuItemExternalLink>
                    <MenuItem onClick={() => togglePrivacyPolicy()}>
                      <div>
                        <Trans>Legal &amp; Privacy</Trans>
                      </div>
                      <FileText opacity={0.6} size={16} />
                    </MenuItem>
                  </MenuFlyout>
                )
            }
          })()}
      </MenuWrapper>
      <PrivacyPolicyModal />
    </>
  )
}

// interface NewMenuProps {
//   flyoutAlignment?: FlyoutAlignment
//   ToggleUI?: React.FunctionComponent
//   menuItems: {
//     content: any
//     link: string
//     external: boolean
//   }[]
// }

// export const NewMenu = ({ flyoutAlignment = FlyoutAlignment.RIGHT, ToggleUI, menuItems, ...rest }: NewMenuProps) => {
//   const node = useRef<HTMLDivElement>(null)
//   const open = useModalOpen(ApplicationModal.POOL_OVERVIEW_OPTIONS)
//   const toggle = useToggleModal(ApplicationModal.POOL_OVERVIEW_OPTIONS)

//   useOnClickOutside(node, open ? toggle : undefined)
//   const ToggleElement = ToggleUI || MenuIcon

//   return (
//     <MenuWrapper ref={node} {...rest}>
//       <ToggleElement onClick={toggle} />
//       {open && (
//         <MenuFlyout flyoutAlignment={flyoutAlignment}>
//           {menuItems.map(({ content, link, external }, i) =>
//             external ? (
//               <MenuItemExternalLink href={link} key={i}>
//                 {content}
//               </MenuItemExternalLink>
//             ) : (
//               <MenuItemInternalLink to={link} key={i}>
//                 {content}
//               </MenuItemInternalLink>
//             )
//           )}
//         </MenuFlyout>
//       )}
//     </MenuWrapper>
//   )
// }
