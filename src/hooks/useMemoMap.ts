import { useMemo, useRef } from 'react'

const isSameMap = <T extends { [k: string]: any }>(a: T, b: T) => {
  if (a === b) return true
  if (Object.keys(a).length !== Object.keys(b).length) return false
  for (const key in a) if (a[key] !== b[key]) return false
  return true
}

export const useMemoMap = <T extends { [k: string]: any }>(x: T) => {
  const ref = useRef(x)
  return useMemo(() => {
    if (!isSameMap(x, ref.current)) ref.current = x
    return ref.current
  }, [x])
}

const isSameArrayOfMap = <T extends { [k: string]: any }>(xs: T[], ys: T[]) => {
  if (xs.length !== ys.length) return false
  for (let i = 0; i < xs.length; i++) {
    if (!isSameMap(xs[i], ys[i])) return false
  }
  return true
}

export const useMemoArrayOfMap = <T extends { [k: string]: any }>(xs: T[]) => {
  const ref = useRef(xs)
  return useMemo(() => {
    if (!isSameArrayOfMap(xs, ref.current)) ref.current = xs
    return ref.current
  }, [xs])
}
