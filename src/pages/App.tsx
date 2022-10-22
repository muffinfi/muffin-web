import Loader from 'components/Loader'
import PageTitle from 'components/PageTitle/PageTitle'
import ApeModeQueryParamReader from 'hooks/useApeModeQueryParamReader'
// import { lazy, Suspense } from 'react'
import { Suspense } from 'react'
import { Route, Switch } from 'react-router-dom'
// import { Redirect, Route, Switch } from 'react-router-dom'
import styled from 'styled-components/macro'

import GoogleAnalyticsReporter from '../components/analytics/GoogleAnalyticsReporter'
// import AddressClaimModal from '../components/claim/AddressClaimModal'
import ErrorBoundary from '../components/ErrorBoundary'
import Header from '../components/Header'
import Polling from '../components/Header/Polling'
import Popups from '../components/Popups'
import Web3ReactManager from '../components/Web3ReactManager'
// import { useModalOpen, useToggleModal } from '../state/application/hooks'
// import { ApplicationModal } from '../state/application/reducer'
import DarkModeQueryParamReader from '../theme/DarkModeQueryParamReader'
import Account from './Account'
import Deposit from './Account/Deposit'
import Withdraw from './Account/Withdraw'
import AddLiquidity from './AddLiquidity'
import { RedirectDuplicateTokenIds } from './AddLiquidity/redirects'
import LimitRange from './LimitRange'
import { RedirectToMigrateUniV3 } from './Migrate/redirects'
import { UniV3List } from './Migrate/univ3'
import { MigrateUniV3 } from './Migrate/univ3/migrate'
// import { RedirectDuplicateTokenIdsV2 } from './AddLiquidityV2/redirects'
// import Earn from './Earn'
// import Manage from './Earn/Manage'
// import MigrateV2 from './MigrateV2'
// import MigrateV2Pair from './MigrateV2/MigrateV2Pair'
import Pool from './Pool'
import { PositionPage } from './Pool/PositionPage'
// import PoolV2 from './Pool/v2'
// import PoolFinder from './PoolFinder'
// import RemoveLiquidity from './RemoveLiquidity'
import RemoveLiquidityV3 from './RemoveLiquidity/V3'
import Swap from './Swap'
// import { OpenClaimAddressModalAndRedirectToSwap, RedirectPathToSwapOnly, RedirectToSwap } from './Swap/redirects'
import { RedirectPathToSwapOnly, RedirectToSwap } from './Swap/redirects'

// const Vote = lazy(() => import('./Vote'))

const BodyWrapper = styled.div`
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;

  padding: 120px 16px 0px 16px;
  margin-bottom: 40px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    padding: 4rem 12px 16px 12px;
  `};
`

const HeaderWrapper = styled.div`
  position: fixed;
  top: 0;
  z-index: 2;
  width: 100%;
`

// function TopLevelModals() {
//   const open = useModalOpen(ApplicationModal.ADDRESS_CLAIM)
//   const toggle = useToggleModal(ApplicationModal.ADDRESS_CLAIM)
//   return <AddressClaimModal isOpen={open} onDismiss={toggle} />
// }

export default function App() {
  return (
    <ErrorBoundary>
      <PageTitle />
      <Route component={GoogleAnalyticsReporter} />
      <Route component={DarkModeQueryParamReader} />
      <Route component={ApeModeQueryParamReader} />
      <Web3ReactManager>
        <>
          <HeaderWrapper>
            <Header />
          </HeaderWrapper>
          <BodyWrapper>
            <Popups />
            <Polling />
            {/* <TopLevelModals /> */}
            <Suspense fallback={<Loader />}>
              <Switch>
                {/* <Route strict path="/vote" component={Vote} /> */}
                {/* <Route exact strict path="/create-proposal">
                  <Redirect to="/vote/create-proposal" />
                </Route> */}
                {/* <Route exact strict path="/claim" component={OpenClaimAddressModalAndRedirectToSwap} /> */}
                {/* <Route exact strict path="/uni" component={Earn} /> */}
                {/* <Route exact strict path="/uni/:currencyIdA/:currencyIdB" component={Manage} /> */}

                <Route exact strict path="/send" component={RedirectPathToSwapOnly} />
                <Route exact strict path="/swap/:outputCurrency" component={RedirectToSwap} />
                <Route exact strict path="/swap" component={Swap} />

                <Route exact strict path="/limit-range" component={LimitRange} />

                {/* <Route exact strict path="/pool/v2/find" component={PoolFinder} /> */}
                {/* <Route exact strict path="/pool/v2" component={PoolV2} /> */}
                <Route exact strict path="/positions" component={Pool} />
                <Route exact strict path="/positions/:tokenId" component={PositionPage} />

                {/* <Route exact strict path="/add/v2/:currencyIdA?/:currencyIdB?" component={RedirectDuplicateTokenIdsV2} /> */}
                {/* prettier-ignore */}
                <Route exact strict path="/add/:currencyIdA?/:currencyIdB?/:sqrtGamma?" component={RedirectDuplicateTokenIds} />
                {/* prettier-ignore */}
                <Route exact strict path="/increase/:currencyIdA?/:currencyIdB?/:sqrtGamma?/:tokenId?" component={AddLiquidity} />

                {/* <Route exact strict path="/remove/v2/:currencyIdA/:currencyIdB" component={RemoveLiquidity} /> */}
                <Route exact strict path="/remove/:tokenId" component={RemoveLiquidityV3} />

                <Route exact strict path="/migrate" component={RedirectToMigrateUniV3} />
                <Route exact strict path="/migrate/univ3" component={UniV3List} />
                <Route exact strict path="/migrate/univ3/:tokenId" component={MigrateUniV3} />
                {/* <Route exact strict path="/migrate/v2" component={MigrateV2} />
                <Route exact strict path="/migrate/v2/:address" component={MigrateV2Pair} /> */}

                <Route exact strict path="/account" component={Account} />
                <Route exact strict path="/account/deposit" component={Deposit} />
                <Route exact strict path="/account/withdraw" component={Withdraw} />

                <Route component={RedirectPathToSwapOnly} />
              </Switch>
            </Suspense>
          </BodyWrapper>
        </>
      </Web3ReactManager>
    </ErrorBoundary>
  )
}
