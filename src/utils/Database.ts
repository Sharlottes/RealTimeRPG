import fs from 'fs'

export class Database {
    public static writeObject(fileName: string, obj: object) {
      fs.writeFileSync(fileName, JSON.stringify(obj));
    }
    public static readObject<T>(fileName: string): T {
      if(!fs.existsSync(fileName)) {
        this.writeObject(fileName, []);
        return [] as T;
      }
      return JSON.parse(fs.readFileSync(fileName).toString()) as T;
    }
}