export const predicateOf = <U>() =>
  <T>(f: (x: T) => boolean) =>
    f as (x: T) => x is T & U