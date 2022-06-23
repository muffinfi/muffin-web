import { BigNumber } from '@ethersproject/bignumber'
import { useEffect, useRef } from 'react'

/**
 * Solely for debugging
 */
export default function useIsChanging(value: any, name: string, clean?: boolean) {
  const ref = useRef<any>()

  useEffect(() => {
    const fn = clean ? _clean : <T>(x: T) => x
    console.log(`[${name}] changed:`, fn(ref.current), fn(value))
    ref.current = value
  }, [value, name, clean])
}

const _clean = (x: any): any => {
  if (Array.isArray(x) && Object.keys(x).some((k) => !/^\d+$/.test(`${k}`))) {
    return Object.fromEntries(
      Object.entries(x)
        .filter(([k, _]) => !/^\d+$/.test(`${k}`))
        .map(([k, v]) => [k, _clean(v)])
    )
  }
  if (Array.isArray(x)) {
    return x.map((v) => _clean(v))
  }
  if (BigNumber.isBigNumber(x)) {
    return `${x}`
  }
  return x
}
