import { TransactionResponse } from '@ethersproject/abstract-provider'
import { useAccountTokens } from '@muffinfi/hooks/account/useAccountTokens'
import { useManagerContract } from '@muffinfi/hooks/useContract'
import { useUserShowZeroBalanceTokens } from '@muffinfi/state/user/hooks'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import AccountHeader from 'components/account/AccountHeader'
import { Wrapper } from 'components/account/styleds'
import TokenRow from 'components/account/TokenRow'
import { LoadingRows } from 'components/Loader/styled'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useApproveCallback } from 'hooks/useApproveCallback'
import AppBody from 'pages/AppBody'
import { MouseEventHandler, useCallback, useMemo, useState } from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { TransactionType } from 'state/transactions/actions'
import { useTransactionAdder } from 'state/transactions/hooks'
import styled from 'styled-components/macro'
import { calculateGasMargin } from 'utils/calculateGasMargin'

const StyledLoadingRows = styled(LoadingRows)`
  row-gap: 8px;

  & > div {
    height: 56px;
  }
`

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
`

const NoTokens = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 10rem;
`

export default function Account(props: RouteComponentProps) {
  const { account } = useActiveWeb3React()
  const { isLoading, tokens, order: tokenOrder } = useAccountTokens(account)

  const [showZeroTokens, setShowZeroTokens] = useUserShowZeroBalanceTokens()

  const [selectedToken, setSelectedToken] = useState<Token | undefined>()
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false)
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false)

  const addTransaction = useTransactionAdder()

  const tokenList = useMemo(() => tokens && tokenOrder && tokenOrder.map((id) => tokens[id]), [tokens, tokenOrder])

  const [amount, setAmount] = useState('10000000000000000000')
  const [isApproved, approve] = useApproveCallback(
    selectedToken && amount ? CurrencyAmount.fromRawAmount(selectedToken, amount) : undefined,
    account ?? undefined
  )

  const managerContract = useManagerContract()
  const deposit = useCallback(() => {
    if (!account || !selectedToken || !managerContract) return
    if (!isApproved) return approve()
    return managerContract.estimateGas.deposit(account, selectedToken.address, amount).then((gas) =>
      managerContract
        .deposit(account, selectedToken.address, amount, { gasLimit: calculateGasMargin(gas) })
        .then((response: TransactionResponse) => {
          addTransaction(response, {
            type: TransactionType.DEPOSIT_INTERNAL_ACCOUNT,
            tokenAddress: selectedToken.address,
            amount,
          })
        })
        .catch((error: Error) => {
          console.debug('Failed to deposit token', error)
          throw error
        })
    )
  }, [account, selectedToken, managerContract, isApproved, approve, amount, addTransaction])

  const withdraw = useCallback(() => {
    if (!account || !selectedToken || !managerContract) return
    return managerContract.estimateGas.withdraw(account, selectedToken.address, amount).then((gas) =>
      managerContract
        .withdraw(account, selectedToken.address, amount, { gasLimit: calculateGasMargin(gas) })
        .then((response: TransactionResponse) => {
          addTransaction(response, {
            type: TransactionType.WITHDRAW_INTERNAL_ACCOUNT,
            tokenAddress: selectedToken.address,
            amount,
          })
        })
        .catch((error: Error) => {
          console.debug('Failed to withdraw token', error)
          throw error
        })
    )
  }, [account, selectedToken, managerContract, amount, addTransaction])

  const showDepositDialog = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (event) => {
      const token = tokens?.[event.currentTarget.dataset.token ?? '']
      if (!token) return
      setSelectedToken(token)
      setIsDepositDialogOpen(true)
    },
    [tokens]
  )

  const showWithdrawDialog = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (event) => {
      const token = tokens?.[event.currentTarget.dataset.token ?? '']
      if (!token) return
      setSelectedToken(token)
      setIsWithdrawDialogOpen(true)
    },
    [tokens]
  )

  return (
    <>
      <AppBody>
        <AccountHeader tokenList={tokenList} setShowZeroTokens={setShowZeroTokens} showZeroTokens={showZeroTokens} />
        <Wrapper>
          {isLoading ? (
            <StyledLoadingRows>
              <div />
              <div />
              <div />
              <div />
              <div />
            </StyledLoadingRows>
          ) : tokenList && tokenList.length > 0 ? (
            <StyledList>
              {tokenList?.map((token) => (
                <TokenRow
                  key={token.address}
                  hideOnZero={!showZeroTokens}
                  token={token}
                  onDeposit={showDepositDialog}
                  onWithdraw={showWithdrawDialog}
                />
              ))}
            </StyledList>
          ) : (
            <NoTokens>No tokens found</NoTokens>
          )}
        </Wrapper>
      </AppBody>
      <SwitchLocaleLink />
    </>
  )
}
