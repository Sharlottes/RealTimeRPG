import fs from "fs";
import Canvass from 'canvas';
import { Formatters } from 'discord.js'

export * from './Canvas'
export * from './KotlinLike'
export * from './Mathf'

export enum ANSIStyle {
  CLEAR = 0,
  BOLD = 1,
  UNDERLINE = 4,
  GRAY = 30,
  RED = 31,
  GREEN = 42,
  YELLOW = 33,
  BLUE = 34,
  PINK = 35,
  CYAN = 36,
  BLACK = 37,
  BACKGROUND_DEEPCYAN = 40,
  BACKGROUND_ORANGE = 41,
  BACKGROUND_GRAY1 = 42,
  BACKGROUND_GRAY2 = 43,
  BACKGROUND_GRAY3 = 44,
  BACKGROUND_GRAY4 = 46,
  BACKGROUND_BLURPLE = 45,
  BACKGROUND_IVORY = 47,
}

export class Strings {
  public static color(string: string, styles: ANSIStyle[], blocklize = true) {
    const colorized = `\x1b[${styles.join(';')}m${string}\x1b[0m`
    return blocklize? Formatters.codeBlock('ansi', colorized) : colorized;
  }

  public static format(string: string, args: string[] | string) {
    // 고쳐야 할 점들
    // assignment to parameter 
    // while -> global replace d아 아 아 이 무슨 내일하면 안될까요 <- 네! 아니면 푸시할테니 pr로...?!???????????????????????????
    if(Array.isArray(args)) args.forEach((a,i) => {
      while (string.includes(`{${i}}`))
        string = string.replace(`{${i}}`, a);
    });
    else string = string.replace("{0}", args);
    return string;
  }

  public static hashCode(string: string): number{
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      const character = string.charCodeAt(i);
      hash = ((hash<<5)-hash)+character;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}

export class Arrays {
  public static division<T>(array: T[], n: number): T[][] {
    const len = array.length;
    const max = Math.floor(len / n) + (Math.floor(len % n) > 0 ? 1 : 0);
    const out = [];

    for(let i = 0; i < max; i++) out.push(array.splice(0, n));
    return out;
  }
}

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

export function isOfType<T extends keyof TypeofOperationResultMap, V, U>(type: T, value: V, unless: (value: Exclude<V, TypeofOperationResultMap[T]>) => U): U | undefined;
export function isOfType<T extends keyof TypeofOperationResultMap, V, U, I>(type: T, value: V, unless: (value: Exclude<V, TypeofOperationResultMap[T]>) => U, _if: (value: Extract<V, TypeofOperationResultMap[T]>) => I): U | I;
export function isOfType<T extends keyof TypeofOperationResultMap, V, U, I>(type: T, value: V, unless: (value: Exclude<V, TypeofOperationResultMap[T]>) => U, _if?: (value: Extract<V, TypeofOperationResultMap[T]>) => I): U | I | undefined {
  return typeof value === type
     ? _if?.(value as Extract<V, TypeofOperationResultMap[T]>)
     : unless(value as Exclude<V, TypeofOperationResultMap[T]>)
}