import { Trade } from '@muffinfi/muffin-sdk'
import { Currency, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core'
import { L2_CHAIN_IDS } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useGasPrice from 'hooks/useGasPrice'
import useUSDCPrice, { useUSDCValue } from 'hooks/useUSDCPrice'
import JSBI from 'jsbi'
import useNativeCurrency from 'lib/hooks/useNativeCurrency'
import { useMemo } from 'react'
import { useUserSlippageToleranceWithDefault } from 'state/user/hooks'

const SWAP_DEFAULT_SLIPPAGE = new Percent(50, 10_000) // .50%
const ONE_TENTHS_PERCENT = new Percent(10, 10_000) // .10%

/**
 * Return a guess of the gas cost used in computing slippage tolerance for a given trade
 * @param trade the trade for which to _guess_ the amount of gas it would cost to execute
 */
function guesstimateGas(trade: Trade<Currency, Currency, TradeType> | undefined): number | undefined {
  if (!trade) return undefined
  return 100_000 + trade.swaps.reduce((memo, swap) => swap.route.pools.length + memo, 0) * 30_000 // FIXME:
}

const MIN_AUTO_SLIPPAGE_TOLERANCE = new Percent(5, 1000) // 0.5%
const MAX_AUTO_SLIPPAGE_TOLERANCE = new Percent(25, 100) // 25%

export default function useSwapSlippageTolerance(trade: Trade<Currency, Currency, TradeType> | undefined): Percent {
  const { chainId } = useActiveWeb3React()
  const onL2 = chainId && L2_CHAIN_IDS.includes(chainId)
  const outputDollarValue = useUSDCValue(trade?.outputAmount)
  const ethGasPrice = useGasPrice()

  const ether = useNativeCurrency()
  const etherPrice = useUSDCPrice(ether ?? undefined)

  const defaultSlippageTolerance = useMemo(() => {
    if (!trade || onL2) return ONE_TENTHS_PERCENT

    const gasEstimate = guesstimateGas(trade)
    const ethGasCost =
      ethGasPrice && typeof gasEstimate === 'number' ? JSBI.multiply(ethGasPrice, JSBI.BigInt(gasEstimate)) : undefined
    const dollarGasCost =
      ether && ethGasCost && etherPrice ? etherPrice.quote(CurrencyAmount.fromRawAmount(ether, ethGasCost)) : undefined

    if (outputDollarValue && dollarGasCost) {
      // the rationale is that a user will not want their trade to fail for a loss due to slippage that is less than
      // the cost of the gas of the failed transaction
      const fraction = dollarGasCost.asFraction.divide(outputDollarValue.asFraction)
      const result = new Percent(fraction.numerator, fraction.denominator)
      if (result.greaterThan(MAX_AUTO_SLIPPAGE_TOLERANCE)) return MAX_AUTO_SLIPPAGE_TOLERANCE
      if (result.lessThan(MIN_AUTO_SLIPPAGE_TOLERANCE)) return MIN_AUTO_SLIPPAGE_TOLERANCE
      return result
    }

    return SWAP_DEFAULT_SLIPPAGE
  }, [ethGasPrice, ether, etherPrice, onL2, outputDollarValue, trade])

  return useUserSlippageToleranceWithDefault(defaultSlippageTolerance)
}
