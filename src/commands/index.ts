export { default as Command } from "./Command"; // 명령어 인터페이스

export { default as Content } from "./Content";
export { default as Test } from "./Test";
export { default as Ping } from "./Ping";
export { default as Login } from "./Login";
export { default as Refresh } from "./Refresh";

// 위까지는 다른 모듈들 정의
// 아래서부턴 명령어 목록 선언

import { Collection } from "discord.js";
import fs from "fs";

import { Command } from ".";
import config from "../config.json";

const CommandList: Collection<string, Command> = new Collection();
const ignores: string[] = [
    "index.ts", "Command.ts"
];

export function refreshCommand(): Promise<Collection<string, Command>> {
    return new Promise(async (resolve, reject) => {
        const time = new Date().getTime();
        try {
            console.log("[Command] Refresh start!")
        
            console.log("[Command] Clear command cach...");
            CommandList.clear();
        
            const dirPath = config.debug ? "./src/commands/" : "./commands/";
            const dir = fs.readdirSync(dirPath, {withFileTypes: true, encoding: "utf-8"})
        
            for(let i = 0, n = dir.length; i < n; i++) {
                const file = dir[i];
        
                if(file.isFile() && !ignores.includes(file.name)) {
                    const code = await import("./" + file.name);
                    if(code.name != Command.name && typeof code.default == "function") {
                        const command = new code.default();
                        if(command instanceof Command) {
                            console.log(`[Command] register [ /${command.builder.name} ] command.`);
                            CommandList.set(command.builder.name, command);
                        }
                    }
                }
            }
            resolve(CommandList);
        } catch (error) {
            reject(error);
        } finally {
            console.log(`[Command] Refresh is finished in ${(new Date().getTime() - time) / 1000}s`);
        }
    })
}

// 타입스크립트나 모듈 타입으로 코딩할 때 사용하는 내보내기 선언.
// require 방식으로 하고 싶으면 이렇게 index 파일 만들지 말고 해당 모듈내에서 export default 혹은 export 해주면 댐.
// 자세한 정보는 help.ts 참고
export default CommandList;
