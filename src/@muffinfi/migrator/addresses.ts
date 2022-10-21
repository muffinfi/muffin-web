import { SupportedChainId } from '@muffinfi/muffin-sdk'

export const MUFFIN_MIGRATOR_ADDRESSES: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: '0xA74Cc5c431531Bf2601250C52825dc7B3DCEe785',
  [SupportedChainId.RINKEBY]: '',
  [SupportedChainId.GOERLI]: '0xbdace4d9b9ba1e43caddff455d4d91fe48d17785',
}
