import fs from "fs";

namespace Utils {
  export class Mathf {
    public static range(from: number, to: number) {
      return from + Math.random() * (to - from);
    }

    public static randbool(pred: number = 0.5) {
      return Math.random() < pred;
    }

    public static static(value: number, min: number, max: number) {
      if (value > max) return max;
      else if (value < min) return min;
      else return value;
    }

    public static round(target: number, step: number = 0) {
      return Math.round(target * Math.pow(10, step)) / Math.pow(10, step);
    }
  }

  export class Strings {
    public static format(string: string, args: any[] | any) {
      if(Array.isArray(args)) args.forEach((a,i) => {
        while (string.includes("{" + i + "}"))
           string=string.replace("{" + i + "}", a);
      });
      else string=string.replace("{0}", args);
      return string;
    }

    public static hashCode(string: string): number{
      var hash = 0;
      for (var i = 0; i < string.length; i++) {
          var character = string.charCodeAt(i);
          hash = ((hash<<5)-hash)+character;
          hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    }
  }

  export class Database {
      public static writeObject(fileName: string, obj: any) {
        fs.writeFileSync(fileName, JSON.stringify(obj));
      };
      public static readObject<T>(fileName: string): T {
        if(!fs.existsSync(fileName)) {
          this.writeObject(fileName, "{}");
          return new Object() as T;
        }
        return JSON.parse(fs.readFileSync(fileName).toString()) as T;
      };
  }
}
export default Utils;