import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { createAction } from '@reduxjs/toolkit'
import { TradeType } from '@uniswap/sdk-core'

// import { VoteOption } from '../governance/types'

export interface SerializableTransactionReceipt {
  to: string
  from: string
  contractAddress: string
  transactionIndex: number
  blockHash: string
  transactionHash: string
  blockNumber: number
  status?: number
}

/**
 * Be careful adding to this enum, always assign a unique value (typescript will not prevent duplicate values).
 * These values is persisted in state and if you change the value it will cause errors
 */
export enum TransactionType {
  APPROVAL = 0,
  SWAP = 1,
  DEPOSIT_LIQUIDITY_STAKING = 2,
  WITHDRAW_LIQUIDITY_STAKING = 3,
  CLAIM = 4,
  VOTE = 5,
  DELEGATE = 6,
  WRAP = 7,
  CREATE_V3_POOL = 8,
  ADD_LIQUIDITY_V3_POOL = 9,
  ADD_LIQUIDITY_V2_POOL = 10,
  MIGRATE_LIQUIDITY_V3 = 11,
  COLLECT_FEES = 12,
  REMOVE_LIQUIDITY_V3 = 13,
  SUBMIT_PROPOSAL = 14,
  //
  ADD_LIQUIDITY_MUFFIN = 15,
  REMOVE_LIQUIDITY_MUFFIN = 16,
  DEPOSIT_INTERNAL_ACCOUNT = 17,
  WITHDRAW_INTERNAL_ACCOUNT = 18,
  ADD_LIMIT_RANGE_ORDER = 19,
  COLLECT_SETTLED = 20,
}

export interface BaseTransactionInfo {
  type: TransactionType
}

// export interface VoteTransactionInfo extends BaseTransactionInfo {
//   type: TransactionType.VOTE
//   governorAddress: string
//   proposalId: number
//   decision: VoteOption
//   reason: string
// }

export interface DelegateTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.DELEGATE
  delegatee: string
}

export interface ApproveTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.APPROVAL
  tokenAddress: string
  spender: string
}

interface BaseSwapTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.SWAP
  tradeType: TradeType
  inputCurrencyId: string
  outputCurrencyId: string
}

export interface ExactInputSwapTransactionInfo extends BaseSwapTransactionInfo {
  tradeType: TradeType.EXACT_INPUT
  inputCurrencyAmountRaw: string
  expectedOutputCurrencyAmountRaw: string
  minimumOutputCurrencyAmountRaw: string
}
export interface ExactOutputSwapTransactionInfo extends BaseSwapTransactionInfo {
  tradeType: TradeType.EXACT_OUTPUT
  outputCurrencyAmountRaw: string
  expectedInputCurrencyAmountRaw: string
  maximumInputCurrencyAmountRaw: string
}

export interface DepositLiquidityStakingTransactionInfo {
  type: TransactionType.DEPOSIT_LIQUIDITY_STAKING
  token0Address: string
  token1Address: string
}

export interface WithdrawLiquidityStakingTransactionInfo {
  type: TransactionType.WITHDRAW_LIQUIDITY_STAKING
  token0Address: string
  token1Address: string
}

export interface WrapTransactionInfo {
  type: TransactionType.WRAP
  unwrapped: boolean
  currencyAmountRaw: string
  chainId?: number
}

export interface ClaimTransactionInfo {
  type: TransactionType.CLAIM
  recipient: string
  uniAmountRaw?: string
}

export interface CreateV3PoolTransactionInfo {
  type: TransactionType.CREATE_V3_POOL
  baseCurrencyId: string
  quoteCurrencyId: string
}

export interface AddLiquidityV3PoolTransactionInfo {
  type: TransactionType.ADD_LIQUIDITY_V3_POOL
  createPool: boolean
  baseCurrencyId: string
  quoteCurrencyId: string
  feeAmount: number
  expectedAmountBaseRaw: string
  expectedAmountQuoteRaw: string
}

export interface AddLiquidityV2PoolTransactionInfo {
  type: TransactionType.ADD_LIQUIDITY_V2_POOL
  baseCurrencyId: string
  quoteCurrencyId: string
  expectedAmountBaseRaw: string
  expectedAmountQuoteRaw: string
}

export interface MigrateV2LiquidityToV3TransactionInfo {
  type: TransactionType.MIGRATE_LIQUIDITY_V3
  baseCurrencyId: string
  quoteCurrencyId: string
  isFork: boolean
}

export interface CollectFeesTransactionInfo {
  type: TransactionType.COLLECT_FEES
  currencyId0: string
  currencyId1: string
  tokenDestination: BalanceSource
}

export interface RemoveLiquidityV3TransactionInfo {
  type: TransactionType.REMOVE_LIQUIDITY_V3
  baseCurrencyId: string
  quoteCurrencyId: string
  expectedAmountBaseRaw: string
  expectedAmountQuoteRaw: string
}

export interface SubmitProposalTransactionInfo {
  type: TransactionType.SUBMIT_PROPOSAL
}

////////////////////////////////////////////////////////////

export interface AddLiquidityMuffinTransactionInfo {
  type: TransactionType.ADD_LIQUIDITY_MUFFIN
  createPool: boolean
  baseCurrencyId: string
  quoteCurrencyId: string
  tierId: number
  sqrtGamma: number
  expectedAmountBaseRaw: string
  expectedAmountQuoteRaw: string
}

export interface RemoveLiquidityMuffinTransactionInfo {
  type: TransactionType.REMOVE_LIQUIDITY_MUFFIN
  baseCurrencyId: string
  quoteCurrencyId: string
  sqrtGamma: number
  expectedAmountBaseRaw: string
  expectedAmountQuoteRaw: string
  tokenDestination: BalanceSource
}

export interface AddLimitRangeOrderTransactionInfo {
  type: TransactionType.ADD_LIMIT_RANGE_ORDER
  inputCurrencyId: string
  outputCurrencyId: string
  sqrtGamma: number
  expectedInputAmountRaw: string
  expectedOutputAmountRaw: string
}

export interface CollectSettledTransactionInfo {
  type: TransactionType.COLLECT_SETTLED
  currencyId0: string
  currencyId1: string
  zeroForOne: boolean
  tokenDestination: BalanceSource
}

////////////////////////////////////////////////////////////

export interface DepositInternalAccountTransactionInfo {
  type: TransactionType.DEPOSIT_INTERNAL_ACCOUNT
  tokenAddresses: string[]
  amounts: string[]
}

export interface WithdrawInternalAccountTransactionInfo {
  type: TransactionType.WITHDRAW_INTERNAL_ACCOUNT
  tokenAddresses: string[]
  amounts: string[]
}

////////////////////////////////////////////////////////////

export type TransactionInfo =
  | ApproveTransactionInfo
  | ExactOutputSwapTransactionInfo
  | ExactInputSwapTransactionInfo
  | ClaimTransactionInfo
  // | VoteTransactionInfo
  | DelegateTransactionInfo
  | DepositLiquidityStakingTransactionInfo
  | WithdrawLiquidityStakingTransactionInfo
  | WrapTransactionInfo
  | CreateV3PoolTransactionInfo
  | AddLiquidityV3PoolTransactionInfo
  | AddLiquidityV2PoolTransactionInfo
  | MigrateV2LiquidityToV3TransactionInfo
  | CollectFeesTransactionInfo
  | RemoveLiquidityV3TransactionInfo
  | SubmitProposalTransactionInfo
  | AddLiquidityMuffinTransactionInfo
  | RemoveLiquidityMuffinTransactionInfo
  | DepositInternalAccountTransactionInfo
  | WithdrawInternalAccountTransactionInfo
  | AddLimitRangeOrderTransactionInfo
  | CollectSettledTransactionInfo

export const addTransaction = createAction<{
  chainId: number
  hash: string
  from: string
  info: TransactionInfo
}>('transactions/addTransaction')

export const clearAllTransactions = createAction<{ chainId: number }>('transactions/clearAllTransactions')

export const finalizeTransaction = createAction<{
  chainId: number
  hash: string
  receipt: SerializableTransactionReceipt
}>('transactions/finalizeTransaction')

export const checkedTransaction = createAction<{
  chainId: number
  hash: string
  blockNumber: number
}>('transactions/checkedTransaction')
