import fs from "fs";
import properties from "properties-reader";

namespace Assets {
    let rootDir: string = "";
    const dictionary: Map<bundle.language, properties.Reader> = new Map();

    export function init(debugMode: boolean = false) {
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

        export function get(name: string = "", lang: language = "ko") {
            if(dictionary.has(lang)) {
                return dictionary.get(lang)?.get(name);
            } else {
                return "";
            }
        }
    }

    export namespace content {
        export type contentType = "block" | "bullet" | "item" | "liquid" | "planet" | "sector" | "status" | "unit" | "weather";
        
        export function get <T> (type: contentType = "block", callBack: (jsonData: any) => T = T => T): T {
            const jsonPath = `${rootDir}contents/${type}.json`;
            let jsonData;

            fs.readFile(jsonPath, "utf-8", (err, data) => {
                if(err) {
                    console.log(err);
                    return;
                }

                jsonData = JSON.parse(data);

            })

            return callBack(jsonData);
        }
    }

    export namespace sprite {
        export function get(name: string = "") {
            const spritePath = rootDir + "sprites/";
            return fs.readFileSync(spritePath + name, "utf-8");
        }
    }
}

export default Assets;