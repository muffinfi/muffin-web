import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import * as M from '@muffinfi-ui'
import { useToken } from 'hooks/useCurrency'
import { memo, useMemo, useState } from 'react'
import { ChevronDown } from 'react-feather'
import styled from 'styled-components/macro'
import { unwrappedToken } from 'utils/unwrappedToken'

import PositionList from './PositionList'

const Chevron = styled(ChevronDown).withConfig<{ collapse?: boolean }>({
  shouldForwardProp(prop, defaultValidatorFn) {
    return prop !== 'collapse' && defaultValidatorFn(prop)
  },
})`
  transform: ${({ collapse }) => (collapse ? 'rotate(-90deg)' : 'rotate(0deg)')};
  transition: 150ms transform;
`

const PositionListGroup = memo(function PositionListGroup({
  groupKey,
  positionDetails,
}: {
  groupKey: string
  positionDetails: MuffinPositionDetail[]
}) {
  const [token0Address, token1Address] = groupKey.split('-')
  const token0 = useToken(token0Address)
  const token1 = useToken(token1Address)
  const currency0 = token0 ? unwrappedToken(token0) : undefined
  const currency1 = token1 ? unwrappedToken(token1) : undefined
  const [collapse, setCollapse] = useState(false)
  return (
    <div>
      <M.Column style={{ marginBottom: 8 }}>
        <M.Anchor size="sm" color="text2" onClick={() => setCollapse((s) => !s)}>
          <M.Row gap="12px">
            <Chevron width={17} height={17} strokeWidth={2} collapse={collapse} />
            <M.TextDiv weight="semibold">
              {currency0?.symbol}&nbsp;/&nbsp;{currency1?.symbol}
            </M.TextDiv>
            <span>({positionDetails.length})</span>
          </M.Row>
        </M.Anchor>
      </M.Column>
      {collapse ? null : <PositionList positionDetails={positionDetails} />}
    </div>
  )
})

export default function PositionListGroupList({ positionDetails }: { positionDetails: MuffinPositionDetail[] }) {
  const positionsByPair = useMemo(() => {
    return positionDetails.reduce((acc, cur) => {
      const key = `${cur.token0}-${cur.token1}`
      return { ...acc, [key]: [...(acc[key] ?? []), cur] }
    }, {} as { [key: string]: MuffinPositionDetail[] })
  }, [positionDetails])

  return (
    <M.Column gap="32px" stretch>
      {Object.entries(positionsByPair).map(([key, positionDetails]) => (
        <PositionListGroup key={key} groupKey={key} positionDetails={positionDetails} />
      ))}
    </M.Column>
  )
}
