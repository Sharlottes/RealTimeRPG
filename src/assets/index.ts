import fs from "fs";

namespace Assets {
    export function init(debugMode: boolean = false) {
        const test = fs.readdirSync("./")
        //const rootDir: fs.Dir = debugMode ? fs.opendirSync("") : fs.opendirSync("");
    }

    export const bundles = {

    }

    export const contents = {

    }

    export const sprites = {
        
    }
}

export default Assets;