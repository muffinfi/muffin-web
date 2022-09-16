import { getGPUTier } from 'detect-gpu'
import { atom } from 'jotai'
import { loadable, useAtomValue } from 'jotai/utils'

let isGPUAccelerated: boolean | null = null

const gpuTierAtom = loadable(
  atom(async () => {
    if (isGPUAccelerated == null) {
      const { tier } = await getGPUTier()
      isGPUAccelerated = tier >= 2
    }
    return isGPUAccelerated
  })
)

export const useGPUAccelerated = () => {
  const value = useAtomValue(gpuTierAtom)
  return value.state === 'hasData' ? value.data : true
}
