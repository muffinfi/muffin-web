import { Trans } from '@lingui/macro'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { Fraction, TradeType } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { Fragment } from 'react'

import { nativeOnChain } from '../../constants/tokens'
import useCurrency, { useToken } from '../../hooks/useCurrency'
import useENSName from '../../hooks/useENSName'
// import { VoteOption } from '../../state/governance/types'
import {
  AddLimitRangeOrderTransactionInfo,
  AddLiquidityMuffinTransactionInfo,
  AddLiquidityV2PoolTransactionInfo,
  AddLiquidityV3PoolTransactionInfo,
  ApproveTransactionInfo,
  ClaimTransactionInfo,
  CollectFeesTransactionInfo,
  CollectSettledTransactionInfo,
  CreateV3PoolTransactionInfo,
  DelegateTransactionInfo,
  DepositInternalAccountTransactionInfo,
  DepositLiquidityStakingTransactionInfo,
  ExactInputSwapTransactionInfo,
  ExactOutputSwapTransactionInfo,
  MigrateLiquidityToMuffinTransactionInfo,
  MigrateV2LiquidityToV3TransactionInfo,
  RemoveLiquidityMuffinTransactionInfo,
  RemoveLiquidityV3TransactionInfo,
  SubmitProposalTransactionInfo,
  TransactionInfo,
  TransactionType,
  WithdrawInternalAccountTransactionInfo,
  // VoteTransactionInfo,
  WithdrawLiquidityStakingTransactionInfo,
  WrapTransactionInfo,
} from '../../state/transactions/actions'

function formatAmount(amountRaw: string, decimals: number, sigFigs: number): string {
  return new Fraction(amountRaw, JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))).toSignificant(sigFigs)
}

function FormattedCurrencyAmount({
  rawAmount,
  symbol,
  decimals,
  sigFigs,
}: {
  rawAmount: string
  symbol: string
  decimals: number
  sigFigs: number
}) {
  return (
    <>
      {formatAmount(rawAmount, decimals, sigFigs)} {symbol}
    </>
  )
}

function FormattedCurrencyAmountManaged({
  rawAmount,
  currencyId,
  sigFigs = 6,
}: {
  rawAmount: string
  currencyId: string
  sigFigs: number
}) {
  const currency = useCurrency(currencyId)
  return currency ? (
    <FormattedCurrencyAmount
      rawAmount={rawAmount}
      decimals={currency.decimals}
      sigFigs={sigFigs}
      symbol={currency.symbol ?? '???'}
    />
  ) : null
}

function FormattedCurrencyAmountsManaged({
  rawAmounts,
  currencyIds,
  sigFigs = 6,
}: {
  rawAmounts: string[]
  currencyIds: string[]
  sigFigs: number
}) {
  return (
    <>
      {currencyIds.map((currencyId, i) => (
        <Fragment key={currencyId}>
          <FormattedCurrencyAmountManaged rawAmount={rawAmounts[i]} currencyId={currencyId} sigFigs={sigFigs} />
          {i < currencyIds.length - 1 && ', '}
        </Fragment>
      ))}
    </>
  )
}

function FormattedBalanceSource({ source }: { source: BalanceSource }) {
  return <>{source === BalanceSource.INTERNAL_ACCOUNT ? 'internal account' : 'wallet'}</>
}

function ClaimSummary({ info: { recipient, uniAmountRaw } }: { info: ClaimTransactionInfo }) {
  const { ENSName } = useENSName()
  return typeof uniAmountRaw === 'string' ? (
    <Trans>
      Claim <FormattedCurrencyAmount rawAmount={uniAmountRaw} symbol={'UNI'} decimals={18} sigFigs={4} /> for{' '}
      {ENSName ?? recipient}
    </Trans>
  ) : (
    <Trans>Claim UNI reward for {ENSName ?? recipient}</Trans>
  )
}

function SubmitProposalTransactionSummary(_: { info: SubmitProposalTransactionInfo }) {
  return <Trans>Submit new proposal</Trans>
}

function ApprovalSummary({ info }: { info: ApproveTransactionInfo }) {
  const token = useToken(info.tokenAddress)

  return <Trans>Approve {token?.symbol}</Trans>
}

// function VoteSummary({ info }: { info: VoteTransactionInfo }) {
//   const proposalKey = `${info.governorAddress}/${info.proposalId}`
//   if (info.reason && info.reason.trim().length > 0) {
//     switch (info.decision) {
//       case VoteOption.For:
//         return <Trans>Vote for proposal {proposalKey}</Trans>
//       case VoteOption.Abstain:
//         return <Trans>Vote to abstain on proposal {proposalKey}</Trans>
//       case VoteOption.Against:
//         return <Trans>Vote against proposal {proposalKey}</Trans>
//     }
//   } else {
//     switch (info.decision) {
//       case VoteOption.For:
//         return (
//           <Trans>
//             Vote for proposal {proposalKey} with reason &quot;{info.reason}&quot;
//           </Trans>
//         )
//       case VoteOption.Abstain:
//         return (
//           <Trans>
//             Vote to abstain on proposal {proposalKey} with reason &quot;{info.reason}&quot;
//           </Trans>
//         )
//       case VoteOption.Against:
//         return (
//           <Trans>
//             Vote against proposal {proposalKey} with reason &quot;{info.reason}&quot;
//           </Trans>
//         )
//     }
//   }
// }

function DelegateSummary({ info: { delegatee } }: { info: DelegateTransactionInfo }) {
  const { ENSName } = useENSName(delegatee)
  return <Trans>Delegate voting power to {ENSName ?? delegatee}</Trans>
}

function WrapSummary({ info: { chainId, currencyAmountRaw, unwrapped } }: { info: WrapTransactionInfo }) {
  const native = chainId ? nativeOnChain(chainId) : undefined

  if (unwrapped) {
    return (
      <Trans>
        Unwrap{' '}
        <FormattedCurrencyAmount
          rawAmount={currencyAmountRaw}
          symbol={native?.wrapped?.symbol ?? 'WETH'}
          decimals={18}
          sigFigs={6}
        />{' '}
        to {native?.symbol ?? 'ETH'}
      </Trans>
    )
  } else {
    return (
      <Trans>
        Wrap{' '}
        <FormattedCurrencyAmount
          rawAmount={currencyAmountRaw}
          symbol={native?.symbol ?? 'ETH'}
          decimals={18}
          sigFigs={6}
        />{' '}
        to {native?.wrapped?.symbol ?? 'WETH'}
      </Trans>
    )
  }
}

function DepositLiquidityStakingSummary(_: { info: DepositLiquidityStakingTransactionInfo }) {
  // not worth rendering the tokens since you can should no longer deposit liquidity in the staking contracts
  // todo: deprecate and delete the code paths that allow this, show user more information
  return <Trans>Deposit liquidity</Trans>
}

function WithdrawLiquidityStakingSummary(_: { info: WithdrawLiquidityStakingTransactionInfo }) {
  return <Trans>Withdraw deposited liquidity</Trans>
}

function MigrateLiquidityToV3Summary({
  info: { baseCurrencyId, quoteCurrencyId },
}: {
  info: MigrateV2LiquidityToV3TransactionInfo
}) {
  const baseCurrency = useCurrency(baseCurrencyId)
  const quoteCurrency = useCurrency(quoteCurrencyId)

  return (
    <Trans>
      Migrate {baseCurrency?.symbol}/{quoteCurrency?.symbol} liquidity to V3
    </Trans>
  )
}

function MigrateLiquidityToMuffinSummary({
  info: { baseCurrencyId, quoteCurrencyId },
}: {
  info: MigrateLiquidityToMuffinTransactionInfo
}) {
  const baseCurrency = useCurrency(baseCurrencyId)
  const quoteCurrency = useCurrency(quoteCurrencyId)

  return (
    <Trans>
      Migrate {baseCurrency?.symbol}/{quoteCurrency?.symbol} liquidity to Muffin
    </Trans>
  )
}

function CreateV3PoolSummary({ info: { quoteCurrencyId, baseCurrencyId } }: { info: CreateV3PoolTransactionInfo }) {
  const baseCurrency = useCurrency(baseCurrencyId)
  const quoteCurrency = useCurrency(quoteCurrencyId)

  return (
    <Trans>
      Create {baseCurrency?.symbol}/{quoteCurrency?.symbol} V3 pool
    </Trans>
  )
}

function CollectFeesSummary({
  info: { currencyId0, currencyId1, tokenDestination },
}: {
  info: CollectFeesTransactionInfo
}) {
  const currency0 = useCurrency(currencyId0)
  const currency1 = useCurrency(currencyId1)

  return (
    <Trans>
      Collect {currency0?.symbol}/{currency1?.symbol} fees into <FormattedBalanceSource source={tokenDestination} />
    </Trans>
  )
}

function RemoveLiquidityV3Summary({
  info: { baseCurrencyId, quoteCurrencyId, expectedAmountBaseRaw, expectedAmountQuoteRaw },
}: {
  info: RemoveLiquidityV3TransactionInfo
}) {
  return (
    <Trans>
      Remove{' '}
      <FormattedCurrencyAmountManaged rawAmount={expectedAmountBaseRaw} currencyId={baseCurrencyId} sigFigs={3} /> and{' '}
      <FormattedCurrencyAmountManaged rawAmount={expectedAmountQuoteRaw} currencyId={quoteCurrencyId} sigFigs={3} />
    </Trans>
  )
}

function AddLiquidityV3PoolSummary({
  info: { createPool, quoteCurrencyId, baseCurrencyId },
}: {
  info: AddLiquidityV3PoolTransactionInfo
}) {
  const baseCurrency = useCurrency(baseCurrencyId)
  const quoteCurrency = useCurrency(quoteCurrencyId)

  return createPool ? (
    <Trans>
      Create pool and add {baseCurrency?.symbol}/{quoteCurrency?.symbol} V3 liquidity
    </Trans>
  ) : (
    <Trans>
      Add {baseCurrency?.symbol}/{quoteCurrency?.symbol} V3 liquidity
    </Trans>
  )
}

function AddLiquidityV2PoolSummary({
  info: { quoteCurrencyId, expectedAmountBaseRaw, expectedAmountQuoteRaw, baseCurrencyId },
}: {
  info: AddLiquidityV2PoolTransactionInfo
}) {
  return (
    <Trans>
      Add <FormattedCurrencyAmountManaged rawAmount={expectedAmountBaseRaw} currencyId={baseCurrencyId} sigFigs={3} />{' '}
      and <FormattedCurrencyAmountManaged rawAmount={expectedAmountQuoteRaw} currencyId={quoteCurrencyId} sigFigs={3} />{' '}
      to Uniswap V2
    </Trans>
  )
}

function SwapSummary({ info }: { info: ExactInputSwapTransactionInfo | ExactOutputSwapTransactionInfo }) {
  if (info.tradeType === TradeType.EXACT_INPUT) {
    return (
      <Trans>
        Swap exactly{' '}
        <FormattedCurrencyAmountManaged
          rawAmount={info.inputCurrencyAmountRaw}
          currencyId={info.inputCurrencyId}
          sigFigs={6}
        />{' '}
        for{' '}
        <FormattedCurrencyAmountManaged
          rawAmount={info.expectedOutputCurrencyAmountRaw}
          currencyId={info.outputCurrencyId}
          sigFigs={6}
        />
      </Trans>
    )
  } else {
    return (
      <Trans>
        Swap{' '}
        <FormattedCurrencyAmountManaged
          rawAmount={info.expectedInputCurrencyAmountRaw}
          currencyId={info.inputCurrencyId}
          sigFigs={6}
        />{' '}
        for exactly{' '}
        <FormattedCurrencyAmountManaged
          rawAmount={info.outputCurrencyAmountRaw}
          currencyId={info.outputCurrencyId}
          sigFigs={6}
        />
      </Trans>
    )
  }
}

/////////////////////////////////////////////////////////

function AddLiquidityMuffinSummary({
  info: { createPool, quoteCurrencyId, baseCurrencyId },
}: {
  info: AddLiquidityMuffinTransactionInfo
}) {
  const baseCurrency = useCurrency(baseCurrencyId)
  const quoteCurrency = useCurrency(quoteCurrencyId)

  return createPool ? (
    <Trans>
      Create pool and add {baseCurrency?.symbol}/{quoteCurrency?.symbol} liquidity
    </Trans>
  ) : (
    <Trans>
      Add {baseCurrency?.symbol}/{quoteCurrency?.symbol} liquidity
    </Trans>
  )
}

function RemoveLiquidityMuffinSummary({
  info: { baseCurrencyId, quoteCurrencyId, expectedAmountBaseRaw, expectedAmountQuoteRaw, tokenDestination },
}: {
  info: RemoveLiquidityMuffinTransactionInfo
}) {
  return (
    <Trans>
      Remove{' '}
      <FormattedCurrencyAmountManaged rawAmount={expectedAmountBaseRaw} currencyId={baseCurrencyId} sigFigs={3} /> and{' '}
      <FormattedCurrencyAmountManaged rawAmount={expectedAmountQuoteRaw} currencyId={quoteCurrencyId} sigFigs={3} /> to{' '}
      <FormattedBalanceSource source={tokenDestination} />
    </Trans>
  )
}

function AddLimitRangeOrderSummary({
  info: { inputCurrencyId, outputCurrencyId, expectedInputAmountRaw, expectedOutputAmountRaw },
}: {
  info: AddLimitRangeOrderTransactionInfo
}) {
  return (
    <Trans>
      Add limit range order for swapping{' '}
      <FormattedCurrencyAmountManaged rawAmount={expectedInputAmountRaw} currencyId={inputCurrencyId} sigFigs={6} /> to{' '}
      <FormattedCurrencyAmountManaged rawAmount={expectedOutputAmountRaw} currencyId={outputCurrencyId} sigFigs={6} />
    </Trans>
  )
}

function CollectSettledSummary({
  info: { currencyId0, currencyId1, zeroForOne, tokenDestination },
}: {
  info: CollectSettledTransactionInfo
}) {
  const sellingCurrency = useCurrency(zeroForOne ? currencyId0 : currencyId1)
  const buyingCurrency = useCurrency(zeroForOne ? currencyId1 : currencyId0)

  return (
    <Trans>
      Collect {sellingCurrency?.symbol} ⟶ {buyingCurrency?.symbol} order into{' '}
      <FormattedBalanceSource source={tokenDestination} />
    </Trans>
  )
}

/////////////////////////////////////////////////////////

function DepositInternalAccountSummary({
  info: { amounts, tokenAddresses },
}: {
  info: DepositInternalAccountTransactionInfo
}) {
  return (
    <Trans>
      Deposit <FormattedCurrencyAmountsManaged rawAmounts={amounts} currencyIds={tokenAddresses} sigFigs={3} /> into
      account
    </Trans>
  )
}

function WithdrawInternalAccountSummary({
  info: { amounts, tokenAddresses },
}: {
  info: WithdrawInternalAccountTransactionInfo
}) {
  return (
    <Trans>
      Withdraw <FormattedCurrencyAmountsManaged rawAmounts={amounts} currencyIds={tokenAddresses} sigFigs={3} /> from
      account
    </Trans>
  )
}

/////////////////////////////////////////////////////////

export function TransactionSummary({ info }: { info: TransactionInfo }) {
  switch (info.type) {
    case TransactionType.DEPOSIT_INTERNAL_ACCOUNT:
      return <DepositInternalAccountSummary info={info} />

    case TransactionType.WITHDRAW_INTERNAL_ACCOUNT:
      return <WithdrawInternalAccountSummary info={info} />

    case TransactionType.ADD_LIQUIDITY_MUFFIN:
      return <AddLiquidityMuffinSummary info={info} />

    case TransactionType.REMOVE_LIQUIDITY_MUFFIN:
      return <RemoveLiquidityMuffinSummary info={info} />

    case TransactionType.ADD_LIMIT_RANGE_ORDER:
      return <AddLimitRangeOrderSummary info={info} />

    case TransactionType.COLLECT_SETTLED:
      return <CollectSettledSummary info={info} />

    ///////

    case TransactionType.ADD_LIQUIDITY_V3_POOL:
      return <AddLiquidityV3PoolSummary info={info} />

    case TransactionType.ADD_LIQUIDITY_V2_POOL:
      return <AddLiquidityV2PoolSummary info={info} />

    case TransactionType.CLAIM:
      return <ClaimSummary info={info} />

    case TransactionType.DEPOSIT_LIQUIDITY_STAKING:
      return <DepositLiquidityStakingSummary info={info} />

    case TransactionType.WITHDRAW_LIQUIDITY_STAKING:
      return <WithdrawLiquidityStakingSummary info={info} />

    case TransactionType.SWAP:
      return <SwapSummary info={info} />

    case TransactionType.APPROVAL:
      return <ApprovalSummary info={info} />

    // case TransactionType.VOTE:
    //   return <VoteSummary info={info} />

    case TransactionType.DELEGATE:
      return <DelegateSummary info={info} />

    case TransactionType.WRAP:
      return <WrapSummary info={info} />

    case TransactionType.CREATE_V3_POOL:
      return <CreateV3PoolSummary info={info} />

    case TransactionType.MIGRATE_LIQUIDITY_V3:
      return <MigrateLiquidityToV3Summary info={info} />

    case TransactionType.MIGRATE_LIQUIDITY_MUFFIN:
      return <MigrateLiquidityToMuffinSummary info={info} />

    case TransactionType.COLLECT_FEES:
      return <CollectFeesSummary info={info} />

    case TransactionType.REMOVE_LIQUIDITY_V3:
      return <RemoveLiquidityV3Summary info={info} />

    case TransactionType.SUBMIT_PROPOSAL:
      return <SubmitProposalTransactionSummary info={info} />
  }
}
