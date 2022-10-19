import { BigNumberish } from '@ethersproject/bignumber'
import { ContractTransaction } from '@ethersproject/contracts'
import { Position } from '@muffinfi/muffin-sdk'
import { Percent } from '@uniswap/sdk-core'
import { Position as UniV3Position } from '@uniswap/v3-sdk'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useManagerAddress } from 'hooks/useContractAddress'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { useCallback, useMemo, useState } from 'react'
import { TransactionType } from 'state/transactions/actions'
import { useTransactionAdder } from 'state/transactions/hooks'
import { calculateGasMargin } from 'utils/calculateGasMargin'

import { useUniV3PositionPermit } from '../uniswap'
import { useMigratorContract } from './useMigratorContract'

export default function useMigrate({
  tokenId,
  nonce,
  uniV3Position,
  muffinPosition,
  slippageTolerance,
  needCreatePool,
  needAddTier,
}: {
  tokenId?: BigNumberish
  nonce?: BigNumberish
  uniV3Position?: UniV3Position
  muffinPosition?: Position
  slippageTolerance: Percent
  needCreatePool?: boolean
  needAddTier?: boolean
}) {
  const { account, chainId } = useActiveWeb3React()
  const managerAddress = useManagerAddress()
  const migratorContract = useMigratorContract()
  const deadline = useTransactionDeadline()

  const [isLoading, setIsLoading] = useState(false)
  const [txn, setTxn] = useState<ContractTransaction | undefined>()
  const [error, setError] = useState<any | undefined>()

  const addTransaction = useTransactionAdder()

  const {
    permit,
    sign,
    isLoading: isSigning,
    error: signingError,
    reset: resetPermit,
  } = useUniV3PositionPermit(tokenId, nonce, migratorContract?.address, deadline?.add(10 * 60))

  const reset = useCallback(() => {
    resetPermit()
    setTxn(undefined)
    setError(undefined)
    setIsLoading(false)
  }, [resetPermit])

  // creating muffin position
  const migrate = useMemo(
    () =>
      !uniV3Position ||
      !chainId ||
      !tokenId ||
      !permit ||
      !muffinPosition ||
      !account ||
      !managerAddress ||
      !deadline ||
      !migratorContract
        ? undefined
        : async () => {
            const permitParams = {
              deadline: permit.deadline.toString(),
              v: permit.v,
              r: permit.r,
              s: permit.s,
            }

            const burnParams = {
              tokenId,
              liquidity: uniV3Position.liquidity.toString(),
              amount0Min: 0,
              amount1Min: 0,
              deadline,
            }

            const { amount0: amount0Desired, amount1: amount1Desired } = muffinPosition.mintAmounts
            const { amount0: amount0Min, amount1: amount1Min } =
              muffinPosition.mintAmountsWithSlippage(slippageTolerance)

            const mintParams = {
              needCreatePool: needCreatePool ?? false,
              needAddTier: needAddTier ?? false,
              sqrtPrice: muffinPosition.pool.tiers[0].sqrtPriceX72.toString(),
              sqrtGamma: muffinPosition.pool.tiers[muffinPosition.tierId].sqrtGamma,
              tierId: muffinPosition.tierId,
              tickLower: muffinPosition.tickLower,
              tickUpper: muffinPosition.tickUpper,
              amount0Desired: amount0Desired.toString(),
              amount1Desired: amount1Desired.toString(),
              amount0Min: amount0Min.toString(),
              amount1Min: amount1Min.toString(),
              recipient: account,
            }

            setIsLoading(true)

            return migratorContract.estimateGas
              .migrateFromUniV3WithPermit(permitParams, burnParams, mintParams, true)
              .then((estimate) =>
                migratorContract.migrateFromUniV3WithPermit(permitParams, burnParams, mintParams, true, {
                  gasLimit: calculateGasMargin(estimate),
                })
              )
              .then((response) => {
                addTransaction(response, {
                  type: TransactionType.MIGRATE_LIQUIDITY_MUFFIN,
                  baseCurrencyId: muffinPosition.pool.token0.address,
                  quoteCurrencyId: muffinPosition.pool.token1.address,
                })
                setTxn(response)
              })
              .catch((error) => {
                if (error.code !== 4001) setError(error)
              })
              .finally(() => setIsLoading(false))
          },
    [
      account,
      addTransaction,
      chainId,
      deadline,
      managerAddress,
      migratorContract,
      muffinPosition,
      needAddTier,
      needCreatePool,
      permit,
      slippageTolerance,
      tokenId,
      uniV3Position,
    ]
  )

  return { txn, error: error || signingError, isLoading, isSigning, sign, migrate, reset }
}
