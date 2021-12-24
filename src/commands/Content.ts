import Discord, { Client, Message } from "discord.js";
import fs from "fs";

import { Command } from ".";

class Content implements Command {
    public readonly name: string;
    public readonly description: string;

    public constructor(...args: any[]) {
        this.name = "content";
        this.description =
          "show contents.\nex) !content, !content block, !content block air, !content block air health...";
    }

    public run(client: Client, message: Message, args: string[]): void {
        console.log("content commands is called with" + JSON.stringify(args));

        const jsonFiles: string[] = fs.readdirSync("./assets/contents");
        const kvStrs: string[] = [""];
        const files: string[] = [""];
        let stop: boolean = false;
        let keys: string[] = [""];
        let fileIndex: number = 0,
            keyIndex: number = 0,
            kvIndex = 0;
        
        jsonFiles.forEach(f => {
            if(f !== undefined) { files[fileIndex++] = f; }
            if(stop || args[0] === undefined || args[0] != f.split(".")[0]) return;

            const jsonBuffer: Buffer = fs.readFileSync("./assets/contents/" + f);
            const jsonData: any = JSON.parse(jsonBuffer.toString());
            keys = Object.keys(jsonData);

            if(jsonData[args[1]] !== undefined) {
                const jsonData2: any = JSON.parse(JSON.stringify(jsonData[1]));
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

        const helpImg: string =
          "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png";
        const maxLength: number = 1000;
        let str: string = "";

        if(!stop || args[0] === undefined) {
            message.channel.send("**content type is not found!");

            files.forEach((k) => {
                str += `• !content **${k.replace(".json", "")}** <content> <value>\n`;
                if(str.length >= maxLength || files.indexOf(k) == files.length - 2) {
                    message.channel.send(
                        new Discord.MessageEmbed()
                            .setAuthor("All Content Types", helpImg)
                            .setColor("#186de6")
                            .addField("Commands", str)
                    )
                    str = "";
                }
            });
        } else if(args[1] === undefined) {
            message.channel.send(`**${args[0]} content is not found!**`);

            keys.forEach((k) => {
                if(k !== "immunities" && k !== "") {
                    str += `• !content ${args[0]} **${k}** <value>\n`;
                }
            })

            for (let i = 0; i < str.length % maxLength; i++) {
                const sstr: string = str.slice(
                    i * maxLength,
                    Math.min(str.length, (i + 1) * maxLength)
                );

                if(sstr !== "") {
                    message.channel.send(
                        new Discord.MessageEmbed()
                            .setAuthor(`All ${args[0]} contents`, helpImg)
                            .setColor("#186de6")
                            .addField(`Commands`, sstr)
                    );
                }
            }
        } else {
            kvStrs.forEach(kv => {
                str += `${kv}\n`;

                if(str.length >= maxLength || kvStrs.indexOf(kv) == kvStrs.length - 1) {
                    message.channel.send(
                        new Discord.MessageEmbed()
                            .setAuthor(`All ${args[0]} - ${args[1]} Values`, helpImg)
                            .setColor("#186de6")
                            .addField(`Values`, str)
                    );

                    str = "";
                }
            })
        }
        message.reply("done");
    }

}

export default Content;