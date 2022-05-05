import fs from "fs";
import properties from "properties-reader";
import { Utils } from "../util";

namespace Assets {
    let rootDir = "";
    const dictionary: Map<string, properties.Reader> = new Map();

    export function init(debugMode = false) {
        rootDir = "./assets/";
        
        const langs: bundle.language[] = ["ko", "en"]
        
        langs.forEach(lang => {
            dictionary.set(
              lang,
              properties(`${rootDir}bundles/bundle_${lang}.properties`)
            );
        })
        //const rootDir: fs.Dir = debugMode ? fs.opendirSync("") : fs.opendirSync("");
    }

    export namespace bundle {
        export type language = "ko" | "en"

        export function find(lang = "en", key: string): string {
            return String(dictionary.get(dictionary.has(lang) ? lang : 'en')?.get(key));
        }
        
        export function format(lang = "en", key: string, ...args: unknown[]) {
            return Utils.Strings.format(find(lang, key), args as string[]);
        }

        export function get(name = "", lang= "en") {
            if(dictionary.has(lang)) {
                return dictionary.get(lang)?.get(name);
            } else {
                return "";
            }
        }
    }

    export namespace content {
        export type contentType = "block" | "bullet" | "item" | "liquid" | "planet" | "sector" | "status" | "unit" | "weather";
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        export function get <T> (type: contentType = "block", callBack: (jsonData: any) => T = T => T): T {
            const jsonPath = `${rootDir}contents/${type}.json`;
            let jsonData;

            fs.readFile(jsonPath, "utf-8", (err, data) => {
                if(err) {
                    console.log(err);
                    return;
                }

                jsonData = JSON.parse(data);
            });

            return callBack(jsonData);
        }
    }

    export namespace sprite {
        export function get(name = "") {
            const spritePath = rootDir + "sprites/";
            return fs.readFileSync(spritePath + name, "utf-8");
        }
    }
}

export default Assets;