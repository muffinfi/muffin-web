import { arrayify } from '@ethersproject/bytes'
import { parseBytes32String } from '@ethersproject/strings'
import { Currency, Token } from '@uniswap/sdk-core'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useBytes32TokenContract, useTokenContract } from 'hooks/useContract'
import { NEVER_RELOAD, useSingleCallResult } from 'lib/hooks/multicall'
import useNativeCurrency from 'lib/hooks/useNativeCurrency'
import { useMemo } from 'react'

import { TOKEN_SHORTHANDS } from '../../constants/tokens'
import { isAddress } from '../../utils'
import { supportedChainId } from '../../utils/supportedChainId'
import type { TokenMap } from './useTokenList'

// parse a name or symbol from a token response
const BYTES32_REGEX = /^0x[a-fA-F0-9]{64}$/

function parseStringOrBytes32(str: string | undefined, bytes32: string | undefined, defaultValue: string): string {
  return str && str.length > 0
    ? str
    : // need to check for proper bytes string and valid terminator
    bytes32 && BYTES32_REGEX.test(bytes32) && arrayify(bytes32)[31] === 0
    ? parseBytes32String(bytes32)
    : defaultValue
}

/**
 * Returns a Token from the tokenAddress.
 * Returns null if token is loading or null was passed.
 * Returns undefined if tokenAddress is invalid or token does not exist.
 */
export function useTokenFromNetwork(tokenAddress: string | null | undefined): Token | null | undefined {
  const { chainId } = useActiveWeb3React()

  const formattedAddress = isAddress(tokenAddress)

  const tokenContract = useTokenContract(formattedAddress ? formattedAddress : undefined, false)
  const tokenContractBytes32 = useBytes32TokenContract(formattedAddress ? formattedAddress : undefined, false)

  const tokenName = useSingleCallResult(tokenContract, 'name', undefined, NEVER_RELOAD)
  const tokenNameBytes32 = useSingleCallResult(tokenContractBytes32, 'name', undefined, NEVER_RELOAD)
  const symbol = useSingleCallResult(tokenContract, 'symbol', undefined, NEVER_RELOAD)
  const symbolBytes32 = useSingleCallResult(tokenContractBytes32, 'symbol', undefined, NEVER_RELOAD)
  const decimals = useSingleCallResult(tokenContract, 'decimals', undefined, NEVER_RELOAD)

  // Pick the result out of memo to prevent putting the whole call state result as dep
  const decimalsString = decimals.result?.[0]
  const symbolString = symbol.result?.[0]
  const symbolBytes32String = symbolBytes32.result?.[0]
  const tokenNameString = tokenName.result?.[0]
  const tokenNameBytes32String = tokenNameBytes32.result?.[0]

  return useMemo(() => {
    if (typeof tokenAddress !== 'string' || !chainId || !formattedAddress) return undefined
    if (decimals.loading || symbol.loading || tokenName.loading) return null
    if (decimalsString) {
      return new Token(
        chainId,
        formattedAddress,
        decimalsString,
        parseStringOrBytes32(symbolString, symbolBytes32String, 'UNKNOWN'),
        parseStringOrBytes32(tokenNameString, tokenNameBytes32String, 'Unknown Token')
      )
    }
    return undefined
  }, [
    tokenAddress,
    chainId,
    formattedAddress,
    decimals.loading,
    decimalsString,
    symbol.loading,
    tokenName.loading,
    symbolString,
    symbolBytes32String,
    tokenNameString,
    tokenNameBytes32String,
  ])
}

/**
 * Returns a Token from the tokenAddress.
 * Returns null if token is loading or null was passed.
 * Returns undefined if tokenAddress is invalid or token does not exist.
 */
export function useTokenFromMapOrNetwork(tokens: TokenMap, tokenAddress?: string | null): Token | null | undefined {
  const address = isAddress(tokenAddress)
  const token: Token | undefined = address ? tokens[address] : undefined

  const tokenFromNetwork = useTokenFromNetwork(token ? undefined : address ? address : undefined)

  return tokenFromNetwork ?? token
}

/**
 * Returns a Currency from the currencyId.
 * Returns null if currency is loading or null was passed.
 * Returns undefined if currencyId is invalid or token does not exist.
 */
export default function useCurrencyFromMap(tokens: TokenMap, currencyId?: string | null): Currency | null | undefined {
  const nativeCurrency = useNativeCurrency()
  const { chainId } = useActiveWeb3React()
  const isNative = Boolean(nativeCurrency && currencyId?.toUpperCase() === 'ETH')
  const shorthandMatchAddress = useMemo(() => {
    const chain = supportedChainId(chainId)
    return chain && currencyId ? TOKEN_SHORTHANDS[currencyId.toUpperCase()]?.[chain] : undefined
  }, [chainId, currencyId])

  // this case so we use our builtin wrapped token instead of wrapped tokens on token lists
  const wrappedNative = nativeCurrency?.wrapped
  const isWrappedNative = Boolean(wrappedNative && wrappedNative.address?.toUpperCase() === currencyId?.toUpperCase())

  const token = useTokenFromMapOrNetwork(
    tokens,
    isNative || isWrappedNative ? undefined : shorthandMatchAddress ?? currencyId
  )

  if (currencyId === null || currencyId === undefined) return currencyId

  return isNative ? nativeCurrency : isWrappedNative ? wrappedNative : token
}
