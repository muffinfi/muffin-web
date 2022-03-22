import { defaultAbiCoder } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { keccak256 } from '@ethersproject/keccak256'

export const getAccountHash = (managerAddress?: string, account?: string) =>
  account && managerAddress
    ? keccak256(defaultAbiCoder.encode(['address', 'uint256'], [managerAddress, BigNumber.from(account)]))
    : undefined
