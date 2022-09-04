import fs from "fs";

export * from './Arrays'
export * from './Strings'
export * from './Canvas'
export * from './KotlinLike'
export * from './Mathf'

export class Database {
    public static writeObject(fileName: string, obj: object) {
      fs.writeFileSync(fileName, JSON.stringify(obj));
    }
    public static readObject<T>(fileName: string): T {
      if(!fs.existsSync(fileName)) {
        this.writeObject(fileName, {});
        return {} as T;
      }
      return JSON.parse(fs.readFileSync(fileName).toString()) as T;
    }
}

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

export const delay = (time: number) => new Promise(res=>setTimeout(res,time));
export function isOfType<T extends keyof TypeofOperationResultMap, V, U>(type: T, value: V, unless: (value: Exclude<V, TypeofOperationResultMap[T]>) => U): U | undefined;
export function isOfType<T extends keyof TypeofOperationResultMap, V, U, I>(type: T, value: V, unless: (value: Exclude<V, TypeofOperationResultMap[T]>) => U, _if: (value: Extract<V, TypeofOperationResultMap[T]>) => I): U | I;
export function isOfType<T extends keyof TypeofOperationResultMap, V, U, I>(type: T, value: V, unless: (value: Exclude<V, TypeofOperationResultMap[T]>) => U, _if?: (value: Extract<V, TypeofOperationResultMap[T]>) => I): U | I | undefined {
  return typeof value === type
     ? _if?.(value as Extract<V, TypeofOperationResultMap[T]>)
     : unless(value as Exclude<V, TypeofOperationResultMap[T]>)
}