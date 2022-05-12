import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { Web3Provider } from '@ethersproject/providers'
import JSBI from 'jsbi'
import useBlockNumber from 'lib/hooks/useBlockNumber'
import { useEffect, useState } from 'react'

import useActiveWeb3React from './useActiveWeb3React'
import { useContract } from './useContract'
import useENSAddress from './useENSAddress'

const CHAIN_DATA_ABI = [
  {
    inputs: [],
    name: 'latestAnswer',
    outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
]

/**
 * Returns the price of 1 gas in WEI for the currently selected network by takikng the larger value between
 * the chainlink fast gas price oracle and the gas price returned by rpc provider.
 */
export default function useGasPrice(): JSBI | undefined {
  const { address } = useENSAddress('fast-gas-gwei.data.eth')
  const contract = useContract(address ?? undefined, CHAIN_DATA_ABI, false)

  const { library, chainId } = useActiveWeb3React()
  const latestBlock = useBlockNumber()
  const [gasPrice, setGasPrice] = useState<JSBI | undefined>(undefined)

  useEffect(() => {
    getGasPrice(contract, library, chainId, latestBlock).then((gasPrice) => setGasPrice(gasPrice))
  }, [contract, library, chainId, latestBlock])

  return gasPrice
}

/**
 * DW: FIXME: Put this into redux
 */
const getGasPrice = (() => {
  let lastBlockNum: number | undefined
  let lastChainId: number | undefined
  let gasPricePromise: Promise<JSBI | undefined>

  return (chainlinkContract?: Contract | null, library?: Web3Provider, chainId?: number, blockNum?: number) => {
    if (!gasPricePromise || blockNum !== lastBlockNum || chainId !== lastChainId) {
      lastBlockNum = blockNum
      lastChainId = chainId

      const chainlinkPromise: Promise<JSBI | undefined> = chainlinkContract
        ? chainlinkContract
            .latestAnswer()
            .then((gasPrice: BigNumber) => JSBI.BigInt(gasPrice.toString()))
            .catch(() => undefined)
        : Promise.resolve(undefined)

      const rpcPromise = library
        ? library
            .getGasPrice()
            .then((gasPrice: BigNumber) => JSBI.BigInt(gasPrice.toString()))
            .catch(() => undefined)
        : Promise.resolve(undefined)

      gasPricePromise = Promise.all([chainlinkPromise, rpcPromise])
        .then(([chainlinkGasPrice, rpcGasPrice]) => {
          if (chainlinkGasPrice && rpcGasPrice) {
            return JSBI.greaterThan(chainlinkGasPrice, rpcGasPrice) ? chainlinkGasPrice : rpcGasPrice
          }
          return chainlinkGasPrice ?? rpcGasPrice
        })
        .catch(() => undefined)
    }

    return gasPricePromise
  }
})()
