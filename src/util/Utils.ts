import fs from "fs";
import Canvas from 'canvas';

namespace Utils {
  export class Mathf {
    public static range(from: number, to: number) {
      return from + Math.random() * (to - from);
    }

    public static randbool(pred = 0.5) {
      return Math.random() < pred;
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

  export class Strings {
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
    
    public static donutProgressBar(canvas: Canvas.Canvas, options: {
      progress: {max: number, now: number}, 
      barWidth: number, 
      barStyle?: string | CanvasGradient | CanvasPattern, 
      font?: string, 
      text?: string,
      smolfont?: string,
      fontStyle?: string | CanvasGradient | CanvasPattern
    }) {
      const context = canvas.getContext('2d');
      const centerX = canvas.width / 2, centerY = canvas.height / 2;
      const rad = (Math.min(canvas.width, canvas.height)-options.barWidth)/2;
      const progress = options.progress.now/options.progress.max;
       
      context.clearRect(0, 0, canvas.width, canvas.height);

      context.beginPath();
      context.strokeStyle = "#A5DEF1";
      context.lineWidth = options.barWidth;
      context.arc(centerX, centerY, rad, 0, Math.PI * 2, false);
      context.stroke();
      context.closePath();
      
      context.fillStyle = options.fontStyle||"#F47C7C";
      context.font = options.font||"40px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(`${options.text} ${(progress*100).toFixed()}%`, centerX, centerY);

      context.fillStyle = options.fontStyle||"#F47C7C";
      context.font = options.smolfont||"40px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(`${options.progress.now}/${options.progress.max}`, centerX, centerY+rad/2);

      context.beginPath();
      context.strokeStyle = options.barStyle||"#49f";
      context.lineWidth = options.barWidth;
      context.arc(centerX, centerY, rad, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
      context.stroke();

      return context;
    }
  }
}
export default Utils;