import fs from "fs";
import Canvass from 'canvas';

export class Mathf {
  public static range(from: number, to: number) {
    return from + Math.random() * (to - from);
  }

  public static static(value: number, min: number, max: number) {
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
    const per = (progress / max) * 100;
    let perN = per;
    const O = "\u2591".repeat(10).split("");
    let R = 0;

    for (let i = 0; i < per; i += 10) {
        R++;
        perN -= 10;
    }

    const Ro = R;
    for (; R >= 1; R--) {
        O[R - 1] = "\u2588";
    }

    if (perN < 0) {
      if (perN <= -10 + 1.25) O[Ro - 1] = "\u258f";
      else {
        if (perN <= -10 + 2.5) O[Ro - 1] = "\u258e";
        else {
          if (perN <= -10 + 3.75) O[Ro - 1] = "\u258d";
          else {
            if (perN <= -10 + 5) O[Ro - 1] = "\u258c";
            else {
              if (perN <= -10 + 6.25) O[Ro - 1] = "\u258b";
              else {
                if (perN <= -10 + 7.5) O[Ro - 1] = "\u258a";
                else {
                  if (perN <= -10 + 8.75) O[Ro - 1] = "\u2589";
                }
              }
            }
          }
        }
      }
    }

    if (per.toFixed(1) == "NaN" || O.length <= 10) 
      return `[${O.join("")}] ${(showPercent?per.toFixed(2) + "%":"")}`;
    else 
      return `[${O.join("").substr(0, 10)}] ${(showPercent?per.toFixed(2) + "%":"")}`;
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