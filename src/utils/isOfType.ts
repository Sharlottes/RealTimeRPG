interface TypeofOperationResultMap {
    bigint: bigint
    boolean: boolean
    function: (...args: Array<any>) => any
    number: number
    object: object
    string: string
    symbol: symbol
    undefined: undefined
}

export function isOfType<T extends keyof TypeofOperationResultMap, V, U>(type: T, value: V, unless: (value: Exclude<V, TypeofOperationResultMap[T]>) => U): U | undefined;
export function isOfType<T extends keyof TypeofOperationResultMap, V, U, I>(type: T, value: V, unless: (value: Exclude<V, TypeofOperationResultMap[T]>) => U, _if: (value: Extract<V, TypeofOperationResultMap[T]>) => I): U | I;
export function isOfType<T extends keyof TypeofOperationResultMap, V, U, I>(type: T, value: V, unless: (value: Exclude<V, TypeofOperationResultMap[T]>) => U, _if?: (value: Extract<V, TypeofOperationResultMap[T]>) => I): U | I | undefined {
  return typeof value === type
     ? _if?.(value as Extract<V, TypeofOperationResultMap[T]>)
     : unless(value as Exclude<V, TypeofOperationResultMap[T]>)
}