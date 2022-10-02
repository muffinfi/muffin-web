import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import { useAtomValue } from 'jotai'

import PositionList from './PositionList'
import PositionListControlRow, { ListDisplay, listDisplayAtom } from './PositionListControlRow'
import PositionListGroupList from './PositionListGroupList'

export const PositionListSection = ({ positionDetails }: { positionDetails: MuffinPositionDetail[] }) => {
  const listDisplay = useAtomValue(listDisplayAtom)

  return (
    <div>
      <PositionListControlRow />
      {listDisplay === ListDisplay.LIST ? (
        <PositionList positionDetails={positionDetails} />
      ) : listDisplay === ListDisplay.GROUP ? (
        <PositionListGroupList positionDetails={positionDetails} />
      ) : null}
    </div>
  )
}
