import fs from "fs";
import Canvass from 'canvas';

export class Mathf {
  public static range(from: number, to: number) {
    return from + Math.random() * (to - from);
  }

  public static clamp(value: number, min = 0, max = 1) {
    if (value > max) return max;
    else if (value < min) return min;
    else return value;
  }

  public static round(target: number, step = 0) {
    return Math.round(target * Math.pow(10, step)) / Math.pow(10, step);
  }
}

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
    return (blocklize?"```ansi\n":'')+`\x1b[${styles.join(';')}m${string}\x1b[0m`+(blocklize?"\n```":'');
  }

  public static format(string: string, args: string[] | string) {
    if(Array.isArray(args)) args.forEach((a,i) => {
      while (string.includes("{" + i + "}"))
          string=string.replace("{" + i + "}", a);
    });
    else string=string.replace("{0}", args);
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
        return new Object() as T;
      }
      return JSON.parse(fs.readFileSync(fileName).toString()) as T;
    }
}

export class Canvas {
  public static unicodeProgressBar(progress: number, max: number, showPercent = false) {
    const per = Mathf.clamp(progress / max);

    let bar = "";
    for(let i = 0; i < 9; i++) bar += per > i / 10 ? "\u2588" : "\u2591";

    bar += ["\u2591", "\u258f", "\u258e", "\u258d", "\u258c", "\u258b", "\u258a", "\u2589", "\u2588"][Mathf.clamp(Math.floor(per/8), 0, 8)];
    if(showPercent) bar += `  (${(per * 100).toFixed(2)}%`;

    return bar;
  }

  public static donutProgressBar(canvas: Canvass.Canvas, options: {
    progress: {max: number, now: number}, 
    bar: number | {
      width: number,
      style?: string | CanvasGradient | CanvasPattern
    },
    font: string | {
      text: string,
      font?: string,
      style?: string | CanvasGradient | CanvasPattern
    },
    sideFont: string | {
      text: string,
      font?: string,
      style?: string | CanvasGradient | CanvasPattern
    },
  }) {
    const { bar, font, sideFont } = options;
    const barWidth = typeof bar === 'number' ? bar : bar.width;
    const barStyle = typeof bar === 'number' ? "#49f" : bar.style||"#49f";

    const mainText = typeof font === 'string' ? font : font.text;
    const mainStyle = typeof font === 'string' ? "#F47C7C" : font.style||"#F47C7C";
    const mainFont = typeof font === 'string' ? "40px Arial" : font.font||"40px Arial";

    const subText = typeof sideFont === 'string' ? sideFont : sideFont.text;
    const subStyle = typeof sideFont === 'string' ? "#F47C7C" : sideFont.style||"#F47C7C";
    const subFont = typeof sideFont === 'string' ? "40px Arial" : sideFont.font||"40px Arial";

    const context = canvas.getContext('2d');
    const centerX = canvas.width / 2, centerY = canvas.height / 2;
    const rad = (Math.min(canvas.width, canvas.height)-barWidth)/2;
    const progress = options.progress.now/options.progress.max;
      
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.beginPath();
    context.strokeStyle = "#A5DEF1";
    context.lineWidth = barWidth;
    context.arc(centerX, centerY, rad, 0, Math.PI * 2, false);
    context.stroke();
    context.closePath();
    
    context.fillStyle = mainStyle;
    context.font = mainFont;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${mainText} ${(progress*100).toFixed()}%`, centerX, centerY);

    context.fillStyle = subStyle;
    context.font = subFont;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${subText} ${options.progress.now}/${options.progress.max}`, centerX, centerY+rad/2);

    context.beginPath();
    context.strokeStyle = barStyle;
    context.lineWidth = barWidth;
    context.arc(centerX, centerY, rad, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
    context.stroke();

    return context;
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