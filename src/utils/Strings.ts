import { codeBlock } from "discord.js";

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
    const colorized = `\x1b[${styles.join(";")}m${string}\x1b[0m`;
    return blocklize ? codeBlock("ansi", colorized) : colorized;
  }

  public static format(string: string, args: string[] | string) {
    (Array.isArray(args) ? args : [args]).forEach((a, i) => {
      string = string.replaceAll(`{${i}}`, a);
    });
    return string;
  }

  public static hashCode(string: string): number {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = (hash << 5) - hash + string.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}
