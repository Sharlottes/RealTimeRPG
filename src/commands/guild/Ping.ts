import { CommandInteraction, CacheType } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import tcpp from "tcp-ping";
import request from "request";

import app from "@RTTRPG/index"
import { Command } from '@RTTRPG/commands'

class Ping extends Command {
    public readonly builder: SlashCommandBuilder;

    public constructor() {
        super();

        this.builder = new SlashCommandBuilder()
            .setName("ping")
            .setDescription("check bot status");
            
        this.builder
            .addStringOption(option => option
                .setName("version")
                .setDescription("server version")
                .setRequired(true)
                .addChoices([
                    ["v6", "v6"],
                    ["v7", "v7"],
                    ["be", "be"],
                    ["other", "other"]
                ])
            )
            .addStringOption(option => option
                .setName("address")
                .setDescription("v6, v7, be or domain you want")
                .setRequired(false)
            )
            .addIntegerOption(option => option
                .setName("port")
                .setDescription("the port number for domain")
                .setRequired(false));
    }

    public async run(interaction: CommandInteraction<CacheType>) {
        await interaction.deferReply();
        /*
        interaction.options.getString("인수명", true) // 이런식으로 
        // required 가 true면 해당 인수는 반드시 입력되는 인수
        
        클라 호출은 이걸루
        app.client
        */
        await interaction.editReply(`${app.client.ws.ping}ms`);
        const versions: string[] = ["v7", "v6", "be"];
        const ver: string = interaction.options.getString('version', true);
        if(versions.includes(ver)) {
            const url = `https://raw.githubusercontent.com/Anuken/Mindustry/master/servers_${ver}.json`;
            // const helpImg: string = "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png";

            //mindustry server list의 각 서버들에 ping 요청을 하여 나온 시간들을 출력.
            request({url: url, json: true},  (error, respone, body) => {
                if(!error && respone.statusCode === 200) {
                    //요청 후 얻은 json 문자를 파싱하여 각 서버마다 반복문 돌림
                    JSON.parse(body).forEach((v: {
                            name: string,
                            addresses: string[]
                        }) => { // 한 서버당 주소가 여러개이므로 루프 또 돌림 
                        const field: string = v.addresses.map(async (address: string) => {
                            const started = new Date().getTime();
                            const [addressname, stringPort]: string[] = address.split(":");
                            const port: number = parseInt(stringPort || "6567");
                            let out = "";
                            await tcpp.probe(addressname, port, (err, available) => {
                                //콜백함수가 호출되면 addresses에 아래 문자열을 담음.
                                out = `${address} - ${new Date().getTime() - started}ms\n`;
                            });
                            return out;
                        }).join("\n"); //담은것들 개행문자로 구분해서 출력
                        interaction.followUp(`**${name}**\n${field}`);
                    });
                } else console.error(error);
            });
        } else { //만약 서버리스트가 아니라 일반 도메인이라면
            const started: number = new Date().getTime(),
                port: number = interaction.options.getNumber('port', false) || 6567;
            tcpp.probe(ver, port, (err, availalbe) => //똑같이 요청해서 출력
                interaction.followUp(`${ver}, ${new Date().getTime() - started}ms`));
        }
    }
    
}

export default Ping;