import { BigNumberish } from '@ethersproject/bignumber'
import { ContractTransaction } from '@ethersproject/contracts'
import { Position } from '@muffinfi/muffin-sdk'
import { Percent } from '@uniswap/sdk-core'
import { Position as UniV3Position } from '@uniswap/v3-sdk'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useManagerAddress } from 'hooks/useContractAddress'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { useMemo, useState } from 'react'
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

  const {
    permit,
    sign,
    isLoading: isSigning,
    error: signingError,
  } = useUniV3PositionPermit(tokenId, nonce, migratorContract?.address, deadline)

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
        : () => {
            const permitParams = {
              deadline: permit.deadline.toString(),
              v: permit.v,
              r: permit.r,
              s: permit.s,
            }

            const { amount0: burnAmount0, amount1: burnAmount1 } =
              uniV3Position.burnAmountsWithSlippage(slippageTolerance)

            const burnParams = {
              tokenId,
              liquidity: uniV3Position.liquidity.toString(),
              amount0Min: burnAmount0.toString(),
              amount1Min: burnAmount1.toString(),
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

            migratorContract.estimateGas
              .migrateFromUniV3WithPermit(permitParams, burnParams, mintParams)
              .then((estimate) =>
                migratorContract.migrateFromUniV3WithPermit(permitParams, burnParams, mintParams, {
                  gasLimit: calculateGasMargin(estimate),
                })
              )
              .then((response) => {
                setTxn(response)
              })
              .catch((error) => {
                setError(error)
              })
              .finally(() => setIsLoading(false))
          },
    [
      account,
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

  return { txn, error: error || signingError, isLoading: isLoading || isSigning, sign, migrate }
}
