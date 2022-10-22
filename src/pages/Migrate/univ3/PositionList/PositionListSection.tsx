import { useAtomValue } from 'jotai'
import { PositionDetails } from 'types/position'

import PositionList from './PositionList'
import PositionListControlRow, { ListDisplay, listDisplayAtom } from './PositionListControlRow'
import PositionListGroupList from './PositionListGroupList'

export const PositionListSection = ({ positionDetails }: { positionDetails: PositionDetails[] }) => {
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
