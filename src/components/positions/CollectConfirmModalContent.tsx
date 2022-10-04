import type { TransactionResponse } from '@ethersproject/abstract-provider'
import type { BigNumberish } from '@ethersproject/bignumber'
import { Trans } from '@lingui/macro'
import { ADDRESS_ZERO, Position, PositionManager } from '@muffinfi/muffin-sdk'
import { useUserStoreIntoInternalAccount } from '@muffinfi/state/user/hooks'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { formatTokenBalance } from '@muffinfi/utils/formatTokenBalance'
import * as M from '@muffinfi-ui'
import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core'
import CurrencyLogo from 'components/CurrencyLogo'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useManagerAddress } from 'hooks/useContractAddress'
import { useCallback, useMemo } from 'react'
import { calculateGasMargin } from 'utils/calculateGasMargin'

export default function CollectConfirmModalContent({
  tokenId,
  position,
  quoteLiquidityAmount,
  quoteFeeAmount,
  baseLiquidityAmount,
  baseFeeAmount,
  onBeforeCollect,
  onCollectSuccess,
  onCollectError,
}: {
  tokenId?: BigNumberish
  position?: Position
  quoteLiquidityAmount?: CurrencyAmount<Token>
  quoteFeeAmount?: CurrencyAmount<Token>
  baseLiquidityAmount?: CurrencyAmount<Token>
  baseFeeAmount?: CurrencyAmount<Token>
  onBeforeCollect?: () => void
  onCollectSuccess?: (response: TransactionResponse, outputDestination: BalanceSource) => void
  onCollectError?: (error: any) => void
}) {
  const quoteAmount = useMemo(
    () =>
      position?.settled
        ? quoteFeeAmount?.add(quoteLiquidityAmount ?? CurrencyAmount.fromRawAmount(quoteFeeAmount.currency, 0))
        : quoteFeeAmount,
    [quoteFeeAmount, quoteLiquidityAmount, position?.settled]
  )

  const baseAmount = useMemo(
    () =>
      position?.settled
        ? baseFeeAmount?.add(baseLiquidityAmount ?? CurrencyAmount.fromRawAmount(baseFeeAmount.currency, 0))
        : baseFeeAmount,
    [baseFeeAmount, baseLiquidityAmount, position?.settled]
  )

  const isZeroAmounts = useMemo(() => quoteAmount?.equalTo(0) && baseAmount?.equalTo(0), [quoteAmount, baseAmount])

  const token0 = baseAmount?.currency
  const token1 = quoteAmount?.currency

  const { account, chainId, library } = useActiveWeb3React()
  const managerAddress = useManagerAddress()

  const [storeInInternalAccount, toggleStoreInInternalAccount] = useUserStoreIntoInternalAccount()

  const collect = useCallback(() => {
    if (!chainId || !token0 || !token1 || !managerAddress || !account || !tokenId || !library || !position) return

    const { calldata, value } = PositionManager.removeCallParameters(position, {
      tokenId: tokenId.toString(),
      liquidityPercentage: position.settled ? new Percent(1) : new Percent(0),
      slippageTolerance: new Percent(0),
      withdrawalRecipient: storeInInternalAccount ? ADDRESS_ZERO : account,
      collectAllFees: true,
    })

    const txn = {
      to: managerAddress,
      data: calldata,
      value,
    }

    onBeforeCollect?.()

    library
      .getSigner()
      .estimateGas(txn)
      .then((estimate) => {
        const newTxn = { ...txn, gasLimit: calculateGasMargin(estimate) }
        return library.getSigner().sendTransaction(newTxn)
      })
      .then((response) =>
        onCollectSuccess?.(response, storeInInternalAccount ? BalanceSource.INTERNAL_ACCOUNT : BalanceSource.WALLET)
      )
      .catch((error) => onCollectError?.(error))
  }, [
    chainId,
    token0,
    token1,
    managerAddress,
    account,
    tokenId,
    library,
    position,
    storeInInternalAccount,
    onBeforeCollect,
    onCollectSuccess,
    onCollectError,
  ])

  return (
    <M.Column stretch gap="1em" style={{ marginTop: '0' }}>
      <M.Column stretch gap="0.666em">
        <M.RowBetween>
          <M.Row gap="0.5em">
            <CurrencyLogo currency={quoteAmount?.currency} size="1.25em" />
            <M.Text weight="medium">{quoteAmount?.currency.wrapped.symbol}</M.Text>
          </M.Row>
          <M.Text>{quoteAmount ? formatTokenBalance(quoteAmount, 4) : '-'}</M.Text>
        </M.RowBetween>
        <M.RowBetween>
          <M.Row gap="0.5em">
            <CurrencyLogo currency={baseAmount?.currency} size="1.25em" />
            <M.Text weight="medium">{baseAmount?.currency.wrapped.symbol}</M.Text>
          </M.Row>
          <M.Text>{baseAmount ? formatTokenBalance(baseAmount, 4) : '-'}</M.Text>
        </M.RowBetween>
      </M.Column>

      <M.TextContents weight="semibold" size="sm">
        <M.OutputDestinationToggle
          toInternalAccount={storeInInternalAccount}
          questionHelperContent={<Trans>Choose the destination of the collected fee.</Trans>}
          onToggle={toggleStoreInInternalAccount}
        />
      </M.TextContents>

      <M.Text color="text2" size="xs">
        {position?.settled ? (
          <Trans>Collecting this position will also close the position.</Trans>
        ) : (
          <Trans>
            Collecting fees will withdraw currently available fees for you. It does not affect your current position.
          </Trans>
        )}
      </M.Text>

      {isZeroAmounts ? (
        <M.ButtonRowPrimary disabled>
          <Trans>Nothing to collect</Trans>
        </M.ButtonRowPrimary>
      ) : (
        <M.ButtonRowPrimary onClick={collect}>
          <Trans>Collect</Trans>
        </M.ButtonRowPrimary>
      )}
    </M.Column>
  )
}
