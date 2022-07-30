import { parseUnits } from '@ethersproject/units'
import { Trans } from '@lingui/macro'
import { useBestMuffinTrade } from '@muffinfi/hooks/swap/useBestTrade'
import { InterfaceTrade } from '@muffinfi/state/routing/types'
import { Currency, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core'
import { BAD_RECIPIENT_ADDRESSES } from 'constants/addresses'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useAutoSlippageTolerance from 'hooks/useAutoSlippageTolerance'
import useCurrency from 'hooks/useCurrency'
import useENS from 'hooks/useENS'
import JSBI from 'jsbi'
import { useCurrencyBalances } from 'lib/hooks/useCurrencyBalance'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { ParsedQs } from 'qs'
import { ReactNode, useCallback, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from 'state/hooks'
import { TradeState } from 'state/routing/types'
import { useUserSlippageToleranceWithDefault } from 'state/user/hooks'

import { getDefaultCurrencyId, TOKEN_SHORTHANDS } from '../../constants/tokens'
import useParsedQueryString from '../../hooks/useParsedQueryString'
import { isAddress } from '../../utils'
import { AppState } from '../index'
import { Field, replaceSwapState, selectCurrency, setRecipient, switchCurrencies, typeInput } from './actions'
import { SwapState } from './reducer'

export function useSwapState(): AppState['swap'] {
  return useAppSelector((state) => state.swap)
}

export function useSwapActionHandlers(): {
  onCurrencySelection: (field: Field, currency: Currency) => void
  onSwitchTokens: () => void
  onUserInput: (field: Field, typedValue: string) => void
  onChangeRecipient: (recipient: string | null) => void
  reset: () => void
} {
  const dispatch = useAppDispatch()
  const onCurrencySelection = useCallback(
    (field: Field, currency: Currency) => {
      dispatch(
        selectCurrency({
          field,
          currencyId: currency.isToken ? currency.address : currency.isNative ? 'ETH' : '',
        })
      )
    },
    [dispatch]
  )

  const onSwitchTokens = useCallback(() => {
    dispatch(switchCurrencies())
  }, [dispatch])

  const onUserInput = useCallback(
    (field: Field, typedValue: string) => {
      dispatch(typeInput({ field, typedValue }))
    },
    [dispatch]
  )

  const onChangeRecipient = useCallback(
    (recipient: string | null) => {
      dispatch(setRecipient({ recipient }))
    },
    [dispatch]
  )

  const { chainId } = useActiveWeb3React()
  const reset = useCallback(() => {
    dispatch(
      replaceSwapState({
        typedValue: '',
        field: Field.INPUT,
        inputCurrencyId: getDefaultCurrencyId(chainId),
        recipient: null,
      })
    )
  }, [dispatch, chainId])

  return {
    onSwitchTokens,
    onCurrencySelection,
    onUserInput,
    onChangeRecipient,
    reset,
  }
}

// try to parse a user entered amount for a given token
export function tryParseAmount<T extends Currency>(value?: string, currency?: T): CurrencyAmount<T> | undefined {
  if (!value || !currency) {
    return undefined
  }
  try {
    const typedValueParsed = parseUnits(value, currency.decimals).toString()
    if (typedValueParsed !== '0') {
      return CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(typedValueParsed))
    }
  } catch (error) {
    // should fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
    console.debug(`Failed to parse input amount: "${value}"`, error)
  }
  // necessary for all paths to return a value
  return undefined
}

// from the input swap inputs, compute the best trade and return it.
export function useDerivedSwapInfo(swapState: SwapState): {
  currencies: { [field in Field]?: Currency | null }
  currencyBalances: { [field in Field]?: CurrencyAmount<Currency> }
  parsedAmount: CurrencyAmount<Currency> | undefined
  inputError?: ReactNode
  trade: {
    trade: InterfaceTrade<Currency, Currency, TradeType> | undefined
    state: TradeState
  }
  allowedSlippage: Percent
} {
  const {
    independentField,
    typedValue,
    [Field.INPUT]: { currencyId: inputCurrencyId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
    recipient,
  } = swapState

  const { account, chainId } = useActiveWeb3React()

  const inputCurrency = useCurrency(inputCurrencyId)
  const outputCurrency = useCurrency(outputCurrencyId)
  const recipientLookup = useENS(recipient ?? undefined)
  const to: string | null = (recipient === null ? account : recipientLookup.address) ?? null

  const relevantTokenBalances = useCurrencyBalances(
    account ?? undefined,
    useMemo(() => [inputCurrency ?? undefined, outputCurrency ?? undefined], [inputCurrency, outputCurrency])
  )

  const isExactIn: boolean = independentField === Field.INPUT
  const parsedAmount = useMemo(
    () => tryParseCurrencyAmount(typedValue, (isExactIn ? inputCurrency : outputCurrency) ?? undefined),
    [inputCurrency, isExactIn, outputCurrency, typedValue]
  )

  const trade = useBestMuffinTrade(
    isExactIn ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT,
    parsedAmount,
    (isExactIn ? outputCurrency : inputCurrency) ?? undefined
  )

  const currencyBalances = useMemo(
    () => ({
      [Field.INPUT]: relevantTokenBalances[0],
      [Field.OUTPUT]: relevantTokenBalances[1],
    }),
    [relevantTokenBalances]
  )

  const currencies: { [field in Field]?: Currency | null } = useMemo(
    () => ({
      [Field.INPUT]: inputCurrency,
      [Field.OUTPUT]: outputCurrency,
    }),
    [inputCurrency, outputCurrency]
  )

  // allowed slippage is either auto slippage, or custom user defined slippage if auto slippage disabled
  const autoSlippageTolerance = useAutoSlippageTolerance(trade.trade)
  const allowedSlippage = useUserSlippageToleranceWithDefault(autoSlippageTolerance)

  const inputError = useMemo(() => {
    let inputError: ReactNode | undefined

    if (!account) {
      inputError = <Trans>Connect Wallet</Trans>
    }

    if (!currencies[Field.INPUT] || !currencies[Field.OUTPUT]) {
      inputError = inputError ?? <Trans>Select a token</Trans>
    }

    if (!parsedAmount) {
      inputError = inputError ?? <Trans>Enter an amount</Trans>
    }

    const formattedTo = isAddress(to)
    if (!to || !formattedTo) {
      inputError = inputError ?? <Trans>Enter a recipient</Trans>
    } else {
      if (chainId && BAD_RECIPIENT_ADDRESSES[chainId]?.[formattedTo]) {
        inputError = inputError ?? <Trans>Invalid recipient</Trans>
      }
    }

    // compare input balance to max input based on version
    const [balanceIn, amountIn] = [currencyBalances[Field.INPUT], trade.trade?.maximumAmountIn(allowedSlippage)]

    if (balanceIn && amountIn && balanceIn.lessThan(amountIn)) {
      inputError = <Trans>Insufficient {amountIn.currency.symbol} balance</Trans>
    }

    return inputError
  }, [account, allowedSlippage, chainId, currencies, currencyBalances, parsedAmount, to, trade.trade])

  return useMemo(
    () => ({
      currencies,
      currencyBalances,
      parsedAmount,
      inputError,
      trade,
      allowedSlippage,
    }),
    [allowedSlippage, currencies, currencyBalances, inputError, parsedAmount, trade]
  )
}

function parseCurrencyFromURLParameter(urlParam: ParsedQs[string]): string {
  if (typeof urlParam === 'string') {
    const valid = isAddress(urlParam)
    if (valid) return valid
    const upper = urlParam.toUpperCase()
    if (upper === 'ETH') return 'ETH'
    if (upper in TOKEN_SHORTHANDS) return upper
  }
  return ''
}

function parseTokenAmountURLParameter(urlParam: any): string {
  return typeof urlParam === 'string' && !isNaN(parseFloat(urlParam)) ? urlParam : ''
}

function parseIndependentFieldURLParameter(urlParam: any): Field {
  return typeof urlParam === 'string' && urlParam.toLowerCase() === 'output' ? Field.OUTPUT : Field.INPUT
}

const ENS_NAME_REGEX = /^[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)?$/
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
function validatedRecipient(recipient: any): string | null {
  if (typeof recipient !== 'string') return null
  const address = isAddress(recipient)
  if (address) return address
  if (ENS_NAME_REGEX.test(recipient)) return recipient
  if (ADDRESS_REGEX.test(recipient)) return recipient
  return null
}

export function queryParametersToSwapState(parsedQs: ParsedQs, chainId?: number): SwapState {
  let inputCurrency = parseCurrencyFromURLParameter(parsedQs.inputCurrency)
  let outputCurrency = parseCurrencyFromURLParameter(parsedQs.outputCurrency)
  const typedValue = parseTokenAmountURLParameter(parsedQs.exactAmount)
  const independentField = parseIndependentFieldURLParameter(parsedQs.exactField)

  if (inputCurrency === '' && outputCurrency === '' && typedValue === '' && independentField === Field.INPUT) {
    // Defaults to having the native currency selected
    inputCurrency = getDefaultCurrencyId(chainId)
  } else if (inputCurrency === outputCurrency) {
    // clear output if identical
    outputCurrency = ''
  }

  const recipient = validatedRecipient(parsedQs.recipient)

  return {
    [Field.INPUT]: {
      currencyId: inputCurrency === '' ? null : inputCurrency ?? null,
    },
    [Field.OUTPUT]: {
      currencyId: outputCurrency === '' ? null : outputCurrency ?? null,
    },
    typedValue,
    independentField,
    recipient,
  }
}

export function swapStateToQueryParameters(swapState: SwapState) {
  const params = new URLSearchParams()
  if (swapState[Field.INPUT].currencyId) {
    params.set('inputCurrency', swapState[Field.INPUT].currencyId as string)
  }
  if (swapState[Field.OUTPUT].currencyId) {
    params.set('outputCurrency', swapState[Field.OUTPUT].currencyId as string)
  }
  if (swapState.typedValue) {
    params.set('exactAmount', swapState.typedValue)
  }
  if (swapState.independentField) {
    params.set('exactField', swapState.independentField)
  }
  if (swapState.recipient) {
    params.set('recipient', swapState.recipient)
  }
  return params
}

// updates the swap state to use the defaults for a given network
export function useDefaultsFromURLSearch(): SwapState {
  const { chainId } = useActiveWeb3React()
  const dispatch = useAppDispatch()
  const parsedQs = useParsedQueryString()

  const parsedSwapState = useMemo(() => {
    return queryParametersToSwapState(parsedQs, chainId)
  }, [parsedQs, chainId])

  useEffect(() => {
    if (!chainId) return
    const inputCurrencyId = parsedSwapState[Field.INPUT].currencyId ?? undefined
    const outputCurrencyId = parsedSwapState[Field.OUTPUT].currencyId ?? undefined

    dispatch(
      replaceSwapState({
        typedValue: parsedSwapState.typedValue,
        field: parsedSwapState.independentField,
        inputCurrencyId,
        outputCurrencyId,
        recipient: parsedSwapState.recipient,
      })
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, chainId])

  return parsedSwapState
}
