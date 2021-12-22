import { json } from "body-parser";
import Discord, { Client, Message } from "discord.js";
import fs, { readFile } from "fs";

import { Command } from ".";

class Content implements Command {
    public readonly name: string;
    public readonly description: string;

    constructor(...args: any[]) {
        this.name = "content";
        this.description =
          "show contents.\nex) !content, !content block, !content block air, !content block air health...";
    }

    public run(client: Client, message: Message, args: string[]): void {
        console.log("content commands is called with" + JSON.stringify(args));

        let stop: boolean = false;
        let jsonFiles: string[] = fs.readdirSync("./json");
        let kvStrs: string[] = [""];
        let keys: string[] = [""];
        let files: string[] = [""];
        let fileIndex: number = 0,
            keyIndex: number = 0,
            kvIndex = 0;
        
        jsonFiles.forEach(f => {
            if(f !== undefined) { files[fileIndex++] = f; }
            if(stop || args[0] === undefined || args[0] != f.split(".")[0]) return;

            let jsonBuffer: Buffer = fs.readFileSync("./json/" + f);
            let jsonData: any = JSON.parse(jsonBuffer.toString());
            keys = Object.keys(jsonData);

            if(jsonData[args[1]] !== undefined) {
                let jsonData2: any = JSON.parse(JSON.stringify(jsonData[1]));
                Object.keys(jsonData2).forEach(k => {
                    if(args[2] !== undefined) {
                        if(k.includes(args[2])) {
                            kvStrs[kvIndex++] = `${k} : ${jsonData2[k]}`;
                        }
                    } else {
                        kvStrs[kvIndex++] = `${k} : ${jsonData2[k]}`;
                    }
                });
                stop = true;
            }
        });

        let helpImg: string =
          "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png";
        let str: string = "";
    }

}

export default Content;