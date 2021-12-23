import { Client, Message } from 'discord.js';
import tcpp from "tcp-ping";
import request from "request";

import { Command } from '.'

class Ping implements Command {
    public readonly name: string;
    public readonly description: string;

    public constructor() {
        this.name = "ping";
        this.description = "check bot status";
    }

    public run(client: Client, message: Message, args: string[]) {
        message.reply(`${client.ws.ping}ms`);
        if(args[0] !== undefined) {
            const versions: string[] = ["v7", "v6", "be"];
            if(versions.includes(args[0])) {
                const url: string = `https://raw.githubusercontent.com/Anuken/Mindustry/master/servers_${args[0]}.json`;
                // const helpImg: string = "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png";

                request({url: url, json: true}, (error, respone, body) => {
                    if(!error && respone.statusCode === 200) {
                        const parsed: any = JSON.parse(JSON.stringify(body));

                        parsed.forEach((v: any) => {
                            const parsedParsed = JSON.parse(JSON.stringify(v));
                            const name = parsedParsed["name"];
                            const address = (parsedParsed["address"] + "")
                                    .replace("[", "")
                                    .replace("]", "");
                            const arr = (address + '').split(",");
                            let field = "";

                            arr.forEach((str: string) => {
                                const started = new Date().getTime();
                                let splitStr: string[]= (str + '').split(":"),
                                    port: number = splitStr[1] === undefined || Number(splitStr) === NaN ? 6567 : Number(splitStr[1]);
                                tcpp.probe(splitStr[0], port, (err, available) => {
                                    field += `${str} - ${new Date().getTime() - started}ms\n`;
                                    if(arr.indexOf(str) == arr.length - 1) {
                                        message.channel.send(`**${name}**\n${field}`);
                                    }
                                });
                            })
                        });
                    } else console.error(error);
                });
            } else {
                const started = new Date().getTime(),
                    port = args[1] === undefined ? 6567 : Number(args[1]);
                tcpp.probe(args[0], port, (err, availalbe) => 
                    message.channel.send(`${args[0]}, ${new Date().getTime() - started}ms`));
            }
        }
    }
    
}

export default Ping;