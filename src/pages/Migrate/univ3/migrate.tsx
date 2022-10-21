import { BigNumber } from '@ethersproject/bignumber'
import { Trans } from '@lingui/macro'
import { useIsTickAtLimit } from '@muffinfi/hooks/useIsTickAtLimit'
import useMigrate from '@muffinfi/migrator/hooks/useMigrate'
import { useBestMatchMuffinPosition, useUniV3PositionFromDetails } from '@muffinfi/migrator/uniswap'
import { formatFeePercent } from '@muffinfi/utils/formatFeePercent'
import { formatTokenBalanceWithSymbol } from '@muffinfi/utils/formatTokenBalance'
import * as M from '@muffinfi-ui'
import { Currency, CurrencyAmount, Percent } from '@uniswap/sdk-core'
import { Position as UniV3Position } from '@uniswap/v3-sdk'
import AnimatedDropdown from 'components/AnimatedDropdown'
import { ErrorCard, OutlineCard, YellowCard } from 'components/Card'
import DowntimeWarning from 'components/DowntimeWarning'
import { CurrencyAmountInScienticNotation } from 'components/FormattedCurrencyAmount'
import PositionRow from 'components/migrate/PositionRow'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import PageTitle from 'components/PageTitle/PageTitle'
import { PositionPreview } from 'components/PositionPreview'
import SettingsTab from 'components/Settings'
import Slider from 'components/Slider'
import { ArrowWrapper, Dots, FieldsWrapper } from 'components/swap/styleds'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import TierSelector from 'components/TierSelector'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useV3NFTPositionManagerContract } from 'hooks/useContract'
import useDebounce from 'hooks/useDebounce'
import { usePricesFromPositionForUI } from 'hooks/usePricesFromPositionForUI'
import useScrollToTopOnMount from 'hooks/useScrollToTopOnMount'
import useTheme from 'hooks/useTheme'
import { useV3PositionFromTokenId } from 'hooks/useV3Positions'
import JSBI from 'jsbi'
import { useSingleCallResult } from 'lib/hooks/multicall'
import { AlertTriangle, ArrowDown } from 'lib/icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { useIsExpertMode, useUserSlippageToleranceWithDefault } from 'state/user/hooks'
import styled from 'styled-components/macro'
import { HideSmall, ThemedText } from 'theme'
import { unwrappedToken } from 'utils/unwrappedToken'

const DEFAULT_SLIPPAGE_TOLERANCE = new Percent(5, 1000)

const InputSection = styled(OutlineCard)`
  padding: 12px 16px;
  border: 1px solid var(--borderColor);
`

const InputSectionContent = styled(M.Column).attrs({ stretch: true })`
  font-size: var(--text-sm);

  & > div {
    padding-top: 24px;
    padding-bottom: 24px;
  }

  & > div:first-child {
    padding-top: 8px;
  }

  & > div:last-child {
    padding-bottom: 8px;
  }

  & > div + div {
    border-top: 1px solid var(--borderColor);
  }
`

const InfoRow = styled(M.RowBetween).attrs({ gap: '0.5rem' })`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    align-items: start;
  `}
`

const CurrencyAmountWithMinimum = ({ amount }: { amount: CurrencyAmount<Currency> | undefined }) => {
  const formattedAmount = useMemo(() => formatTokenBalanceWithSymbol(amount), [amount])
  return <strong>{formattedAmount}</strong>
}

export function MigrateUniV3({ match: { params }, history }: RouteComponentProps<{ tokenId: string }>) {
  const { account } = useActiveWeb3React()
  const isExpert = useIsExpertMode()
  const uniV3NFTPositionManagerContract = useV3NFTPositionManagerContract()
  const slippageTolerance = useUserSlippageToleranceWithDefault(DEFAULT_SLIPPAGE_TOLERANCE)
  const tokenId = useMemo(() => BigNumber.from(params.tokenId), [params.tokenId])

  // owner
  const { result: [owner] = [] } = useSingleCallResult(uniV3NFTPositionManagerContract, 'ownerOf', [tokenId])
  const isOwner = !!account && owner === account

  // uniswap position object
  const { position: uniV3PositionDetails } = useV3PositionFromTokenId(tokenId)
  const uniV3Position = useUniV3PositionFromDetails(uniV3PositionDetails)
  const { token0, token1 } = uniV3Position?.pool ?? {}
  const currency0 = useMemo(() => (token0 ? unwrappedToken(token0) : undefined), [token0])
  const currency1 = useMemo(() => (token1 ? unwrappedToken(token1) : undefined), [token1])

  // price ui
  const { base } = usePricesFromPositionForUI(uniV3Position)
  const invertPrice = base && token1 && base.equals(token1)
  const currencyQuote = invertPrice ? currency0 : currency1
  const currencyBase = invertPrice ? currency1 : currency0

  // ui input
  const [sqrtGamma, setSqrtGamma] = useState<number | undefined>()
  const [percent, setPercent] = useState(100)
  const debouncedPercent = useDebounce(percent, 100)

  // partial uniswap position
  const partialUniV3Position = useMemo(
    () =>
      uniV3Position
        ? new UniV3Position({
            pool: uniV3Position.pool,
            liquidity: new Percent(debouncedPercent, 100).multiply(uniV3Position.liquidity).quotient,
            tickLower: uniV3Position.tickLower,
            tickUpper: uniV3Position.tickUpper,
          })
        : undefined,
    [debouncedPercent, uniV3Position]
  )

  // burn amounts
  const burnAmounts = useMemo(
    () => partialUniV3Position?.burnAmountsWithSlippage(new Percent(0)),
    [partialUniV3Position]
  )

  // current muffin pool
  const { position, pool, isNewPool, isNewTier, owingToken0ForCreateTier, owingToken1ForCreateTier } =
    useBestMatchMuffinPosition(partialUniV3Position, sqrtGamma)

  useEffect(() => {
    if (sqrtGamma != null || !position) return
    setSqrtGamma(position.poolTier.sqrtGamma)
  }, [position, sqrtGamma])

  // mint amounts
  const mintAmounts = useMemo(() => position?.mintAmounts, [position])

  // refund amounts
  const refundAmounts = useMemo(
    () =>
      !burnAmounts || !position?.amount0 || !position?.amount1 || !currency0 || !currency1
        ? undefined
        : {
            amount0: CurrencyAmount.fromRawAmount(
              currency0,
              JSBI.subtract(burnAmounts.amount0, position.amount0.quotient)
            ),
            amount1: CurrencyAmount.fromRawAmount(
              currency1,
              JSBI.subtract(burnAmounts.amount1, position.amount1.quotient)
            ),
          },
    [burnAmounts, position?.amount0, position?.amount1, currency0, currency1]
  )

  // price
  const uniswapPrice = useMemo(
    () => (invertPrice ? uniV3Position?.pool.token1Price : uniV3Position?.pool.token0Price),
    [invertPrice, uniV3Position?.pool]
  )

  const muffinPrice = useMemo(
    () => (invertPrice ? position?.poolTier.token1Price : position?.poolTier.token0Price),
    [invertPrice, position?.poolTier]
  )

  const priceDifference = useMemo(() => {
    if (uniswapPrice == null || muffinPrice == null) return undefined
    const diff = uniswapPrice.subtract(muffinPrice)
    return diff.multiply(diff.greaterThan(0) ? 100 : -100).divide(uniswapPrice)
  }, [muffinPrice, uniswapPrice])

  const priceDiffTooMuch = useMemo(() => priceDifference?.greaterThan(2), [priceDifference])

  // muffin position at limit?
  const areTicksAtLimit = useIsTickAtLimit(position?.pool.tickSpacing, position?.tickLower, position?.tickUpper)

  // muffin position out of range?
  const isOutOfRange = useMemo(
    () =>
      position?.poolTier.tickCurrent != null && position?.tickLower != null && position?.tickUpper != null
        ? position.poolTier.tickCurrent < position.tickLower || position.poolTier.tickCurrent > position.tickUpper
        : undefined,

    [position?.poolTier.tickCurrent, position?.tickLower, position?.tickUpper]
  )

  // position permit handler and migration handler
  const { txn, sign, migrate, isLoading, isSigning, error, reset } = useMigrate({
    tokenId: uniV3PositionDetails?.tokenId,
    nonce: uniV3PositionDetails?.nonce,
    uniV3Position: partialUniV3Position,
    muffinPosition: position,
    slippageTolerance,
    needCreatePool: isNewPool,
    needAddTier: isNewTier,
  })

  /*=====================================================================
   *                             UI STATES
   *====================================================================*/

  const [showTxModalConfirm, setShowTxModalConfirm] = useState(false)
  const [isAttemptingTxn, setIsAttemptingTxn] = useState(false) // i.e. clicked confirm

  const [isEditTierDropdownOpened, setEditTierDropdownOpened] = useState(false)
  const handleOpenEditTierDropdown = useCallback(
    () => setEditTierDropdownOpened(!isEditTierDropdownOpened),
    [isEditTierDropdownOpened]
  )

  const onMigrate = useCallback(async () => {
    if (!migrate) return
    setIsAttemptingTxn(true)
    await migrate()
    setIsAttemptingTxn(false)
  }, [migrate])

  useScrollToTopOnMount()

  /*=====================================================================
   *                         UI ACTION HANDLER
   *====================================================================*/

  const handleDismissConfirmation = useCallback(() => {
    setShowTxModalConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txn) {
      reset()
      history.push('/positions') // jump to position listing page after creating
    }
  }, [history, reset, txn])

  /*=====================================================================
   *                          REACT COMPONENTS
   *====================================================================*/

  const theme = useTheme()

  const makeTransactionModal = () => (
    <TransactionConfirmationModal
      isOpen={showTxModalConfirm}
      onDismiss={handleDismissConfirmation}
      attemptingTxn={isAttemptingTxn}
      hash={txn?.hash}
      content={() => (
        <ConfirmationModalContent
          title={<Trans>Migrate to Muffin</Trans>}
          onDismiss={handleDismissConfirmation}
          topContent={() =>
            position ? (
              <PositionPreview
                position={position}
                title={<Trans>Migrating Range</Trans>}
                inRange={!isOutOfRange}
                ticksAtLimit={areTicksAtLimit}
                baseCurrencyDefault={currencyBase}
              />
            ) : null
          }
          bottomContent={() => (
            <M.ButtonRowPrimary style={{ marginTop: '1rem' }} onClick={onMigrate}>
              <Trans>Migrate</Trans>
            </M.ButtonRowPrimary>
          )}
        />
      )}
      pendingText="Migrating from Uniswap V3"
    />
  )

  const makePositionSection = () => (
    <FieldsWrapper>
      <PositionRow position={partialUniV3Position} amounts={burnAmounts} />
      <ArrowWrapper clickable={false}>
        <ArrowDown size="16" />
      </ArrowWrapper>
      <PositionRow position={position} amounts={mintAmounts} />
    </FieldsWrapper>
  )

  const makeInputSection = () => (
    <InputSection>
      <InputSectionContent>
        <M.Column stretch gap="1em">
          <InfoRow style={{ alignItems: 'baseline' }}>
            <M.Text weight="semibold">
              <Trans>% of liquidity to migrate</Trans>
            </M.Text>
            <M.Column stretch gap="0.25rem">
              <M.Row wrap="wrap" gap="4px" style={{ justifyContent: 'flex-end' }}>
                <M.ButtonSecondary size="xs" onClick={() => setPercent(25)}>
                  <Trans>25%</Trans>
                </M.ButtonSecondary>
                <M.ButtonSecondary size="xs" onClick={() => setPercent(50)}>
                  <Trans>50%</Trans>
                </M.ButtonSecondary>
                <M.ButtonSecondary size="xs" onClick={() => setPercent(75)}>
                  <Trans>75%</Trans>
                </M.ButtonSecondary>
                <M.ButtonSecondary size="xs" onClick={() => setPercent(100)}>
                  <Trans>Max</Trans>
                </M.ButtonSecondary>
              </M.Row>
              <M.Row gap="0.25rem">
                <M.Text style={{ paddingLeft: '0.25rem' }}>{percent}%</M.Text>
                <Slider value={percent} onChange={setPercent} min={1} max={100} size={12} />
              </M.Row>
            </M.Column>
          </InfoRow>
          <InfoRow>
            <M.Text weight="semibold">
              <Trans>Migrate to fee tier</Trans>
            </M.Text>
            <M.Row gap="0.25rem">
              {position ? formatFeePercent(position.poolTier.feePercent) : '---'}%
              <M.Anchor role="button" color="primary0" hoverColor="primary1" onClick={handleOpenEditTierDropdown}>
                {isEditTierDropdownOpened ? <Trans>Close</Trans> : <Trans>Edit</Trans>}
              </M.Anchor>
            </M.Row>
          </InfoRow>
          <div style={{ marginTop: '-1rem' }}>
            <AnimatedDropdown open={isEditTierDropdownOpened}>
              <M.Column stretch gap="8px" style={{ padding: '12px 1px 1px' }}>
                <TierSelector
                  showNotCreated
                  disabled={false}
                  pool={pool ?? undefined}
                  currencyA={token0}
                  currencyB={token1}
                  sqrtGammaSelected={sqrtGamma}
                  handleTierSelect={setSqrtGamma}
                  activeColor="var(--primary0)"
                />
              </M.Column>
            </AnimatedDropdown>
          </div>
          {(owingToken0ForCreateTier || owingToken1ForCreateTier) && (
            <YellowCard>
              <M.RowBetween gap="12px">
                <AlertTriangle stroke="#d39000" size="16px" style={{ flexShrink: 0 }} />
                <M.TextDiv color="alert-text" style={{ fontSize: 13 }}>
                  <Trans>
                    Migrating to new fee tier require both tokens but the position does not have{' '}
                    {owingToken0ForCreateTier ? (
                      <CurrencyAmountInScienticNotation amount={owingToken0ForCreateTier} />
                    ) : (
                      ''
                    )}
                    {owingToken0ForCreateTier && owingToken1ForCreateTier ? ' and ' : ''}
                    {owingToken1ForCreateTier ? (
                      <CurrencyAmountInScienticNotation amount={owingToken1ForCreateTier} />
                    ) : (
                      ''
                    )}{' '}
                    to proceed
                  </Trans>
                </M.TextDiv>
              </M.RowBetween>
            </YellowCard>
          )}
        </M.Column>
        <M.Column stretch gap="1em">
          <InfoRow>
            <M.Text>
              <Trans>Uniswap V3 Current Price:</Trans>
            </M.Text>
            {uniswapPrice && (
              <M.Row gap="0.25rem">
                {uniswapPrice?.toSignificant(5)}
                <M.Text color="text2">
                  {currencyQuote?.symbol} per {currencyBase?.symbol}
                </M.Text>
              </M.Row>
            )}
          </InfoRow>
          <InfoRow>
            <M.Text>
              <Trans>Muffin Current Price:</Trans>
            </M.Text>
            {muffinPrice && (
              <M.Row gap="0.25rem">
                {muffinPrice?.toSignificant(5)}
                <M.Text color="text2">
                  {currencyQuote?.symbol} per {currencyBase?.symbol}
                </M.Text>
              </M.Row>
            )}
          </InfoRow>
          <InfoRow>
            <M.Text>
              <Trans>Price Difference:</Trans>
            </M.Text>
            {priceDifference && (
              <M.Text color={priceDiffTooMuch ? 'alert' : 'success'}>
                {priceDifference?.toFixed(2)}% {priceDiffTooMuch ? '⚠️' : '✅'}
              </M.Text>
            )}
          </InfoRow>
          {priceDiffTooMuch && (
            <YellowCard padding="12px" $borderRadius="12px">
              <M.RowBetween gap="12px">
                <AlertTriangle stroke="#d39000" size="16px" style={{ flexShrink: 0 }} />
                <M.Text color="alert-text" style={{ fontSize: 13 }}>
                  <Trans>
                    You should only deposit liquidity into Muffin at a price you believe is correct. <br />
                    <br />
                    If the price seems incorrect, you can either make a swap to move the price or wait for someone else
                    to do so.
                  </Trans>
                </M.Text>
              </M.RowBetween>
            </YellowCard>
          )}
        </M.Column>
      </InputSectionContent>
    </InputSection>
  )

  const makeRefundText = () =>
    !refundAmounts ? null : (
      <M.TextDiv paragraphLineHeight style={{ fontSize: 13, padding: '0 0.5rem' }}>
        <Trans>
          At least <CurrencyAmountWithMinimum amount={refundAmounts.amount0} /> and{' '}
          <CurrencyAmountWithMinimum amount={refundAmounts.amount1} /> will be refunded to your wallet due to difference
          in current prices and difference in price ranges.
        </Trans>
      </M.TextDiv>
    )

  const makeButtonSection = () =>
    !isOwner ? null : (
      <M.Column stretch gap="0.5rem">
        <M.ButtonRowPrimary onClick={sign} disabled={!!migrate || isSigning}>
          {isSigning ? (
            <Dots>
              <Trans>Approving</Trans>
            </Dots>
          ) : migrate ? (
            <Trans>Allowed</Trans>
          ) : (
            <Trans>Allow Migrator to use Uniswap V3 position</Trans>
          )}
        </M.ButtonRowPrimary>
        {error && (
          <ErrorCard mt={12}>
            <M.Row gap="12px">
              <AlertTriangle stroke={theme.red3} size="16px" style={{ flexShrink: 0 }} />
              <ThemedText.Main color="red3" fontSize="12px">
                {error.reason || error.message || error}
              </ThemedText.Main>
            </M.Row>
          </ErrorCard>
        )}
        <M.ButtonRowPrimary
          onClick={() => (isExpert ? onMigrate() : setShowTxModalConfirm(true))}
          disabled={!migrate || isLoading || !!owingToken0ForCreateTier || !!owingToken1ForCreateTier}
        >
          {isLoading ? (
            <Dots>
              <Trans>Migrating</Trans>
            </Dots>
          ) : (
            <Trans>Migrate</Trans>
          )}
        </M.ButtonRowPrimary>
      </M.Column>
    )

  return (
    <>
      <PageTitle title="Migrate Uniswap V3 position to Muffin" />

      {makeTransactionModal()}

      <M.Container maxWidth="34rem">
        <M.Column stretch gap="32px">
          <M.Link color="text2" to="/migrate/univ3" onClick={reset}>
            <Trans>← Back</Trans>
          </M.Link>

          <M.RowBetween>
            <M.Text size="xl" weight="bold">
              <Trans>Migrate Liquidity</Trans>
            </M.Text>
            <SettingsTab placeholderSlippage={DEFAULT_SLIPPAGE_TOLERANCE} noUseInternalAccount />
          </M.RowBetween>

          <M.SectionCard>
            <M.Column stretch gap="1.5rem">
              {makePositionSection()}
              {makeInputSection()}
              {makeRefundText()}
              {makeButtonSection()}
            </M.Column>
          </M.SectionCard>
        </M.Column>
      </M.Container>

      <HideSmall>
        <NetworkAlert />
        <DowntimeWarning />
      </HideSmall>
      <SwitchLocaleLink />
    </>
  )
}
