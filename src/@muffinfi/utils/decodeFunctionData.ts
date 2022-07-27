import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { abi as IManagerABI } from '@muffinfi/muffin-contracts/artifacts/contracts/interfaces/manager/IManager.sol/IManager.json'

/**
 * Decode calldata. Solely for debugging
 */
export const decodeFunctionData = (abiOrInterface: any, calldata: string, value: string | number) => {
  const iface = abiOrInterface instanceof Interface ? abiOrInterface : new Interface(abiOrInterface)

  const parse = (data: string) => {
    const txn = iface.parseTransaction({ data, value })
    return { ...txn, _cleanedArgs: _cleanArgs(txn?.args) }
  }

  const txn = parse(calldata)
  if (txn.name === 'multicall') {
    const innerTxns = txn.args[0].map((data: string) => parse(data))
    return { ...txn, _multicalls: innerTxns }
  }
  return txn
}

const _cleanArgs = (x: any): any => {
  if (Array.isArray(x) && Object.keys(x).some((k) => !/^\d+$/.test(`${k}`))) {
    return Object.fromEntries(
      Object.entries(x)
        .filter(([k, _]) => !/^\d+$/.test(`${k}`))
        .map(([k, v]) => [k, _cleanArgs(v)])
    )
  }
  if (Array.isArray(x)) {
    return x.map((v) => _cleanArgs(v))
  }
  if (BigNumber.isBigNumber(x)) {
    return `${x}`
  }
  return x
}

export const decodeManagerFunctionData = (calldata: string, value: string | number) => {
  return decodeFunctionData(IManagerABI, calldata, value)
}
