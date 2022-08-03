import { BigNumber } from '@ethersproject/bignumber'
import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { Token } from '@uniswap/sdk-core'
import JSBI from 'jsbi'

/**
 * NOTE:
 * This wallet state is mainly used in sorting tokens by token balances.
 * We use a redux state for it because we want to bypass using redux-multicall which has too much overhead
 * and performance issue for a very long list of tokens (e.g. >1000 tokens).
 */

type WalletState = {
  [chainId: number]: {
    [account: string]: {
      [source in 'wallet' | 'internal']: {
        lastUpdated: number
        balancesByAddress: { [tokenAddress: string]: number | undefined }
        blockNumbers: { [tokenAddress: string]: number | undefined }
      }
    }
  }
}

const initialState = {} as WalletState

const prepareState: CaseReducer<WalletState, PayloadAction<{ chainId: number; account: string }>> = (
  state,
  { payload: { chainId, account } }
) => {
  if (!state[chainId]) {
    state[chainId] = {}
  }
  if (!state[chainId][account]) {
    state[chainId][account] = {
      wallet: { lastUpdated: 0, balancesByAddress: {}, blockNumbers: {} },
      internal: { lastUpdated: 0, balancesByAddress: {}, blockNumbers: {} },
    }
  }
}

const makeBalanceReducer = (source: 'wallet' | 'internal') => {
  const reducer: CaseReducer<
    WalletState,
    PayloadAction<{
      chainId: number
      account: string
      blockNumber: BigNumber
      tokens: Token[]
      results: { success: boolean; returnData: string; gasUsed: BigNumber }[]
    }>
  > = (state, action) => {
    prepareState(state, action)

    const {
      payload: { chainId, account, blockNumber, tokens, results },
    } = action

    const innerState = state[chainId][account][source]
    innerState.lastUpdated = Date.now()

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const result = results[i]
      if (!result.success || result.returnData.length !== 66) continue

      const blockNum = Number(blockNumber)
      const prevBlockNum = innerState.blockNumbers[token.address]
      if (prevBlockNum && prevBlockNum > blockNum) continue

      innerState.blockNumbers[token.address] = blockNum
      innerState.balancesByAddress[token.address] = Number(JSBI.BigInt(result.returnData)) / 10 ** token.decimals
    }
  }
  return reducer
}

const makeLastUpdatedReducer = (source: 'wallet' | 'internal') => {
  const reducer: CaseReducer<WalletState, PayloadAction<{ chainId: number; account: string }>> = (state, action) => {
    prepareState(state, action)
    state[action.payload.chainId][action.payload.account][source].lastUpdated = Date.now()
  }
  return reducer
}

const WalletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    updateWalletBalances: makeBalanceReducer('wallet'),
    updateInternalBalances: makeBalanceReducer('internal'),
    updateWalletBalancesLastUpdated: makeLastUpdatedReducer('wallet'),
    updateInternalBalancesLastUpdated: makeLastUpdatedReducer('internal'),
  },
})

export const {
  updateWalletBalances,
  updateInternalBalances,
  updateWalletBalancesLastUpdated,
  updateInternalBalancesLastUpdated,
} = WalletSlice.actions

export default WalletSlice.reducer
