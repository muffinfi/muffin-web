import { BigNumberish } from '@ethersproject/bignumber'
import { splitSignature } from '@ethersproject/bytes'
import { MAX_TIERS_LENGTH } from '@muffinfi/constants/tiers'
import { useFeeTierOptions } from '@muffinfi/hooks/useFeeTierOptions'
import { usePoolDefaultTickSpacing } from '@muffinfi/hooks/usePoolDefaultTickSpacing'
import { PoolState, useMuffinPool } from '@muffinfi/hooks/usePools'
import {
  feeToSqrtGamma,
  MAX_TICK,
  MIN_TICK,
  nearestUsableTick,
  Pool,
  Position,
  priceToClosestTick,
  TickMath,
  Tier,
  ZERO,
} from '@muffinfi/muffin-sdk'
import { CurrencyAmount, Fraction, Percent } from '@uniswap/sdk-core'
import {
  nearestUsableTick as uniV3NearestUsableTick,
  NFTPermitOptions,
  Position as UniV3Position,
  TickMath as UniV3TickMath,
} from '@uniswap/v3-sdk'
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from 'constants/addresses'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useToken } from 'hooks/useCurrency'
import { usePool } from 'hooks/usePools'
import JSBI from 'jsbi'
import { EIP712_DOMAIN_TYPE } from 'lib/utils/erc20Permit'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PositionDetails } from 'types/position'

const UNISWAP_ERC721_DOMAIN = {
  name: 'Uniswap V3 Positions NFT-V1',
  version: '1',
}

const PERMIT_TYPE = [
  { name: 'spender', type: 'address' },
  { name: 'tokenId', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
]

export function useUniV3PositionFromDetails(position?: PositionDetails) {
  const token0 = useToken(position?.token0) ?? undefined
  const token1 = useToken(position?.token1) ?? undefined
  const [, pool] = usePool(token0, token1, position?.fee)

  return useMemo(
    () =>
      pool && position
        ? new UniV3Position({
            pool,
            liquidity: position.liquidity.toString(),
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
          })
        : undefined,
    [pool, position]
  )
}

export function useUniV3PositionPermit(
  tokenId: BigNumberish | undefined,
  nonce: BigNumberish | undefined,
  spender: string | undefined,
  deadline: BigNumberish | undefined
) {
  const { account, library, chainId } = useActiveWeb3React()
  const [permit, setPermit] = useState<NFTPermitOptions | undefined>()
  const [error, setError] = useState<Error | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  const permitObjectToSign = useMemo(
    () =>
      chainId == null || !spender || !deadline || !nonce || !tokenId
        ? undefined
        : {
            types: {
              EIP712Domain: EIP712_DOMAIN_TYPE,
              Permit: PERMIT_TYPE,
            },
            domain: {
              ...UNISWAP_ERC721_DOMAIN,
              verifyingContract: NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId],
              chainId,
            },
            primaryType: 'Permit',
            message: {
              spender,
              tokenId: tokenId.toString(),
              nonce: nonce.toString(),
              deadline: deadline.toString(),
            },
          },
    [chainId, deadline, nonce, tokenId, spender]
  )

  const sign = useMemo(
    () =>
      !permitObjectToSign || !account || !spender || !deadline
        ? undefined
        : () => {
            setIsLoading(true)
            library
              ?.send('eth_signTypedData_v4', [account, JSON.stringify(permitObjectToSign)])
              .then(splitSignature)
              .then(({ v, r, s }) => {
                setPermit({ v, r, s, spender, deadline: deadline.toString() } as NFTPermitOptions)
              })
              .catch((error) => {
                if (error.code === 4001) return
                setError(error)
              })
              .finally(() => setIsLoading(false))
          },
    [account, deadline, library, permitObjectToSign, spender]
  )

  const reset = useCallback(() => {
    setPermit(undefined)
    setError(undefined)
    setIsLoading(false)
  }, [])

  // clear permit if deadline is less than 5 min
  useEffect(() => {
    if (!permit) return
    const deadline = parseInt(permit.deadline as string)
    const timeDiff = deadline * 1000 - Date.now() - 5 * 60 * 1000
    const timeout = setTimeout(() => setPermit(undefined), Math.max(0, timeDiff))
    return () => clearTimeout(timeout)
  }, [permit])

  return { permit, sign, error, isLoading, reset }
}

export function useBestMatchMuffinPosition(position: UniV3Position | undefined, sqrtGammaDesired: number | undefined) {
  const uniV3Pool = position?.pool
  const { token0, token1 } = uniV3Pool ?? {}

  const [owing0, setOwing0] = useState<string | undefined>()
  const [owing1, setOwing1] = useState<string | undefined>()

  // uniswap pool current price to muffin price
  const sqrtPriceX72 = useMemo(
    () => (uniV3Pool?.token0Price ? TickMath.tickToSqrtPriceX72(priceToClosestTick(uniV3Pool.token0Price)) : undefined),
    [uniV3Pool?.token0Price]
  )

  // calculating uniswap position value
  const { amount0: burnAmount0, amount1: burnAmount1 }: { amount0?: JSBI; amount1?: JSBI } = useMemo(
    () => position?.burnAmountsWithSlippage(new Percent(0)) || {},
    [position]
  )

  // matching pool
  const defaultTickSpacing = usePoolDefaultTickSpacing(token0, token1)
  const [poolState, pool] = useMuffinPool(token0, token1)
  const tickSpacing = poolState === PoolState.NOT_EXISTS ? defaultTickSpacing : pool?.tickSpacing

  // matching sqrt gamma
  const [, feeTierOptions] = useFeeTierOptions(token0, token1)
  const allTierOptions = useMemo(
    () =>
      [...(pool?.tiers.map(({ sqrtGamma }) => sqrtGamma) ?? []), ...(feeTierOptions ?? [])]
        .filter((elm, i, arr) => arr.indexOf(elm) === i)
        .sort((a, b) => b - a),
    [feeTierOptions, pool?.tiers]
  )

  const sqrtGamma = useMemo(() => {
    if (!allTierOptions.length || !uniV3Pool?.fee) return undefined
    const _sqrtGamma = sqrtGammaDesired ?? parseInt(feeToSqrtGamma(new Fraction(uniV3Pool.fee, 1_000_000)).toString())
    return allTierOptions.find((option) => option <= _sqrtGamma) ?? allTierOptions[allTierOptions.length - 1]
  }, [uniV3Pool?.fee, sqrtGammaDesired, allTierOptions])

  // matching tier
  const [muffinTierId, muffinTier, isNewTier] = useMemo(() => {
    if (sqrtGamma == null || !sqrtPriceX72 || !token0 || !token1) return [-1, undefined, false]
    if (poolState === PoolState.NOT_EXISTS) {
      // new pool
      return [0, new Tier(token0, token1, 0, sqrtPriceX72, sqrtGamma, MIN_TICK, MAX_TICK), true]
    }
    if (!pool) return [-1, undefined, false]
    const [tierId, tier] = pool.getTierBySqrtGamma(sqrtGamma)
    if (tierId >= 0) {
      // reset owing amounts here to prevent infinite re-render
      if (owing0) setOwing0(undefined)
      if (owing1) setOwing1(undefined)
    } else {
      // choose an existing tier if position has not enough tokens for new tier or max number of tiers reached
      if (((owing0 || owing1) && !sqrtGammaDesired) || pool.tiers.length >= MAX_TIERS_LENGTH) {
        const sortedOptions = pool.tiers.map(({ sqrtGamma }) => sqrtGamma).sort((a, b) => b - a)
        const newSqrtGamma =
          sortedOptions.find((option) => option <= sqrtGamma) ?? sortedOptions[sortedOptions.length - 1]
        return [...pool.getTierBySqrtGamma(newSqrtGamma), false]
      }
      // new tier
      return [
        pool.tiers.length,
        new Tier(token0, token1, 0, pool.tiers[0].sqrtPriceX72, sqrtGamma, MIN_TICK, MAX_TICK),
        true,
      ]
    }
    return [tierId, tier, false]
  }, [sqrtGamma, sqrtPriceX72, token0, token1, poolState, pool, owing0, owing1, sqrtGammaDesired])

  // pool for creating or minting to
  const muffinPool = useMemo(
    () =>
      !isNewTier
        ? pool
        : token0 && token1 && tickSpacing && muffinTier
        ? new Pool(token0, token1, tickSpacing, [...(pool?.tiers ?? []), muffinTier])
        : undefined,
    [isNewTier, muffinTier, pool, tickSpacing, token0, token1]
  )

  // calculating usable amount
  const [mintAmount0, mintAmount1] = useMemo(() => {
    if (!muffinPool || !burnAmount0 || !burnAmount1) return []
    if (!isNewTier) {
      // reset owing amounts when changing tier to prevent infinite re-render
      return [burnAmount0, burnAmount1]
    }
    const amount0 = JSBI.subtract(burnAmount0, muffinPool.token0AmountForCreateTier.quotient)
    const amount1 = JSBI.subtract(burnAmount1, muffinPool.token1AmountForCreateTier.quotient)
    const newOwing0 = JSBI.greaterThanOrEqual(amount0, ZERO)
      ? undefined
      : JSBI.multiply(amount0, JSBI.BigInt(-1)).toString()
    const newOwing1 = JSBI.greaterThanOrEqual(amount1, ZERO)
      ? undefined
      : JSBI.multiply(amount1, JSBI.BigInt(-1)).toString()
    if (owing0 !== newOwing0) setOwing0(newOwing0)
    if (owing1 !== newOwing1) setOwing1(newOwing1)

    return [JSBI.GE(amount0, ZERO) ? amount0 : ZERO, JSBI.GE(amount1, ZERO) ? amount1 : ZERO]
  }, [burnAmount0, burnAmount1, isNewTier, muffinPool, owing0, owing1])

  // matching ticks
  const [tickLower, tickUpper] = useMemo(() => {
    if (tickSpacing == null || position?.tickLower == null || position?.tickUpper == null) return []
    const lowerLimit = nearestUsableTick(MIN_TICK, tickSpacing)
    const upperLimit = nearestUsableTick(MAX_TICK, tickSpacing)
    const isAtLowerLimit =
      position.tickLower === uniV3NearestUsableTick(UniV3TickMath.MIN_TICK, position.pool.tickSpacing)
    const isAtUpperLimit =
      position.tickUpper === uniV3NearestUsableTick(UniV3TickMath.MAX_TICK, position.pool.tickSpacing)
    let lower = isAtLowerLimit ? lowerLimit : nearestUsableTick(Math.max(MIN_TICK, position.tickLower), tickSpacing)
    let upper = isAtUpperLimit ? upperLimit : nearestUsableTick(Math.min(MAX_TICK, position.tickUpper), tickSpacing)
    if (lower === upper) {
      if (lower === lowerLimit) {
        upper = lowerLimit + tickSpacing
      } else if (upper === upperLimit) {
        lower = upperLimit - tickSpacing
      } else {
        lower = upper - tickSpacing
      }
    }
    return [lower, upper]
  }, [tickSpacing, position?.tickLower, position?.tickUpper, position?.pool.tickSpacing])

  return {
    position: useMemo(
      () =>
        muffinPool && tickLower != null && tickUpper != null && mintAmount0 && mintAmount1 && muffinTierId !== -1
          ? Position.fromAmounts({
              pool: muffinPool,
              tierId: muffinTierId,
              tickLower,
              tickUpper,
              amount0: mintAmount0,
              amount1: mintAmount1,
            })
          : undefined,
      [mintAmount0, mintAmount1, muffinPool, muffinTierId, tickLower, tickUpper]
    ),
    pool,
    isNewPool: poolState === PoolState.NOT_EXISTS,
    isNewTier,
    owingToken0ForCreateTier: useMemo(
      () => (token0 && owing0 ? CurrencyAmount.fromRawAmount(token0, owing0) : undefined),
      [token0, owing0]
    ),
    owingToken1ForCreateTier: useMemo(
      () => (token1 && owing1 ? CurrencyAmount.fromRawAmount(token1, owing1) : undefined),
      [token1, owing1]
    ),
  }
}
