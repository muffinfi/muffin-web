import { defaultAbiCoder } from '@ethersproject/abi'
import { keccak256 } from '@ethersproject/keccak256'
import { toUtf8Bytes } from '@ethersproject/strings'
import { MaxUint256, PermitOptions } from '@muffinfi/muffin-sdk'

import { DAI, UNI, USDC_MAINNET } from '../../constants/tokens'

export enum PermitType {
  AMOUNT = 1,
  ALLOWED = 2,
}

export interface PermitInfo {
  type: PermitType
  name: string
  // version is optional, and if omitted, will not be included in the domain
  version?: string
  // if true, indicate the info is estimated from domain separator
  isEstimated?: boolean
}

interface BaseSignatureData {
  v: number
  r: string
  s: string
  deadline: number
  nonce: number
  owner: string
  spender: string
  chainId: number
  tokenAddress: string
  permitType: PermitType
}

interface StandardSignatureData extends BaseSignatureData {
  amount: string
}

interface AllowedSignatureData extends BaseSignatureData {
  allowed: true
}

export type SignatureData = StandardSignatureData | AllowedSignatureData

export const EIP712_DOMAIN_TYPE = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

export const EIP712_DOMAIN_TYPE_NO_VERSION = [
  { name: 'name', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

export const EIP2612_TYPE = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
]

export const PERMIT_ALLOWED_TYPE = [
  { name: 'holder', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'nonce', type: 'uint256' },
  { name: 'expiry', type: 'uint256' },
  { name: 'allowed', type: 'bool' },
]

// todo: read this information from extensions on token lists or elsewhere (permit registry?)
const PERMITTABLE_TOKENS: {
  [chainId: number]: {
    [checksummedTokenAddress: string]: PermitInfo
  }
} = {
  1: {
    [USDC_MAINNET.address]: { type: PermitType.AMOUNT, name: 'USD Coin', version: '2' },
    [DAI.address]: { type: PermitType.ALLOWED, name: 'Dai Stablecoin', version: '1' },
    [UNI[1].address]: { type: PermitType.AMOUNT, name: 'Uniswap' },
  },
  4: {
    '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735': { type: PermitType.ALLOWED, name: 'Dai Stablecoin', version: '1' },
    [UNI[4].address]: { type: PermitType.AMOUNT, name: 'Uniswap' },
  },
  3: {
    [UNI[3].address]: { type: PermitType.AMOUNT, name: 'Uniswap' },
    '0x07865c6E87B9F70255377e024ace6630C1Eaa37F': { type: PermitType.AMOUNT, name: 'USD Coin', version: '2' },
  },
  5: {
    [UNI[5].address]: { type: PermitType.AMOUNT, name: 'Uniswap' },
  },
  42: {
    [UNI[42].address]: { type: PermitType.AMOUNT, name: 'Uniswap' },
  },
}

export const generateDomainSeparator = (name: string, chainId: number, verifyingContract: string, version?: string) => {
  if (typeof version === 'string') {
    return keccak256(
      defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [
          keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
          keccak256(toUtf8Bytes(name)),
          keccak256(toUtf8Bytes(version)),
          chainId,
          verifyingContract,
        ]
      )
    )
  }
  return keccak256(
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'uint256', 'address'],
      [
        keccak256(toUtf8Bytes('EIP712Domain(string name,uint256 chainId,address verifyingContract)')),
        keccak256(toUtf8Bytes(name)),
        chainId,
        verifyingContract,
      ]
    )
  )
}

export const getPermitInfo = (
  {
    name,
    chainId,
    verifyingContract,
  }: {
    name?: string | undefined
    chainId?: number
    verifyingContract?: string
  } = {},
  domainSeparator?: string
) => {
  if (!chainId || !verifyingContract) return undefined
  if (PERMITTABLE_TOKENS[chainId]?.[verifyingContract]) {
    return PERMITTABLE_TOKENS[chainId][verifyingContract]
  }
  if (!domainSeparator || !name) return undefined

  let computedDomainSeparator = generateDomainSeparator(name, chainId, verifyingContract, '1')
  if (computedDomainSeparator === domainSeparator) {
    return {
      type: PermitType.AMOUNT,
      name,
      version: '1',
      isEstimated: true,
    }
  }

  computedDomainSeparator = generateDomainSeparator(name, chainId, verifyingContract)
  if (computedDomainSeparator === domainSeparator) {
    return {
      type: PermitType.AMOUNT,
      name,
      isEstimated: true,
    }
  }

  return undefined
}

export const generateObjectToSign = (
  permitInfo: PermitInfo,
  chainId: number,
  verifyingContract: string,
  owner: string,
  spender: string,
  nonce: number,
  deadline: number
) => {
  const allowed = permitInfo.type === PermitType.ALLOWED
  const value = MaxUint256.toString() //currencyAmount.quotient.toString()

  const message = allowed
    ? {
        holder: owner,
        spender,
        allowed,
        nonce,
        expiry: deadline,
      }
    : {
        owner,
        spender,
        value,
        nonce,
        deadline,
      }
  const domain = permitInfo.version
    ? {
        name: permitInfo.name,
        version: permitInfo.version,
        verifyingContract,
        chainId,
      }
    : {
        name: permitInfo.name,
        verifyingContract,
        chainId,
      }
  return {
    types: {
      EIP712Domain: permitInfo.version ? EIP712_DOMAIN_TYPE : EIP712_DOMAIN_TYPE_NO_VERSION,
      Permit: allowed ? PERMIT_ALLOWED_TYPE : EIP2612_TYPE,
    },
    domain,
    primaryType: 'Permit',
    message,
  }
}

export const signatureDataToPermitOptions = (signatureData?: SignatureData | null): PermitOptions | undefined =>
  !signatureData
    ? undefined
    : 'allowed' in signatureData
    ? {
        v: signatureData.v as PermitOptions['v'],
        r: signatureData.r,
        s: signatureData.s,
        nonce: signatureData.nonce,
        expiry: signatureData.deadline,
      }
    : {
        v: signatureData.v as PermitOptions['v'],
        r: signatureData.r,
        s: signatureData.s,
        amount: signatureData.amount,
        deadline: signatureData.deadline,
      }
