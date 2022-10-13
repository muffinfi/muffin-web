import { BigNumber } from '@ethersproject/bignumber'
import { useFeeTierOptions } from '@muffinfi/hooks/useFeeTierOptions'
import useMigrate from '@muffinfi/migrator/hooks/useMigrate'
import { useBestMatchMuffinPosition, useUniV3PositionFromDetails } from '@muffinfi/migrator/uniswap'
import * as M from '@muffinfi-ui'
import { Percent } from '@uniswap/sdk-core'
import PageTitle from 'components/PageTitle/PageTitle'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useV3PositionFromTokenId } from 'hooks/useV3Positions'
import { useMemo } from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { useUserSlippageToleranceWithDefault } from 'state/user/hooks'

const DEFAULT_SLIPPAGE_TOLERANCE = new Percent(5, 100)

export function MigrateUniV3({ match: { params }, history }: RouteComponentProps<{ tokenId: string }>) {
  const { account } = useActiveWeb3React()
  const slippageTolerance = useUserSlippageToleranceWithDefault(DEFAULT_SLIPPAGE_TOLERANCE)
  const tokenId = useMemo(() => BigNumber.from(params.tokenId), [params.tokenId])

  const { position: uniV3PositionDetails } = useV3PositionFromTokenId(tokenId)
  const uniV3Position = useUniV3PositionFromDetails(uniV3PositionDetails)

  const { token0, token1 } = uniV3Position?.pool ?? {}
  const [, feeTierOptions] = useFeeTierOptions(token0, token1)

  const {
    position: bestMatchPosition,
    isNewPool,
    isNewTier,
  } = useBestMatchMuffinPosition(uniV3Position, slippageTolerance)

  const { sign, migrate, isLoading, error } = useMigrate({
    tokenId: uniV3PositionDetails?.tokenId,
    nonce: uniV3PositionDetails?.nonce,
    uniV3Position,
    muffinPosition: bestMatchPosition,
    slippageTolerance,
    needCreatePool: isNewPool,
    needAddTier: isNewTier,
  })

  return (
    <>
      <PageTitle title="Migrate Uniswap V3 position to Muffin" />

      <M.Container maxWidth="29rem">
        {migrate ? (
          <M.Button disabled={isLoading} onClick={migrate}>
            Migrate
          </M.Button>
        ) : (
          sign && (
            <M.Button disabled={isLoading} onClick={sign}>
              Sign
            </M.Button>
          )
        )}
      </M.Container>
    </>
  )
}
