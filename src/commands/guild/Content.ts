import { CommandInteraction, CacheType } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

import { Command } from "@뇌절봇/commands";
import assets from "@뇌절봇/assets";

class Content extends Command {
    public readonly builder: SlashCommandBuilder;

    public constructor() {
        super();
        this.builder = new SlashCommandBuilder()
            .setName("content")
            .setDescription("show contents.\nex) !content, !content block, !content block air, !content block air health...");

        const contentTypes: assets.content.contentType[] = 
            ["block", "bullet", "item", "liquid", "planet", "sector", "status", "unit", "weather"];

        this.builder.addStringOption(option => option
            .setName("type")
            .setDescription("content Type.")
            .setRequired(true)
            .addChoices(contentTypes.map(t => [t, t]))
        );

        this.builder.addStringOption(option => option
            .setName("values")
            .setDescription("the values what you want. ex: dagger.weapons.0.bullet.damage")
            .setRequired(true)
        )
    }


    public checkcont(data: any, args: string[], interaction: CommandInteraction<CacheType>): void {
        const contents: string[] = Object.keys(data);
        const name: string = args.shift() || "";
        if(contents.includes(name)) {
            const result = data[name];
            if(typeof result === "object") {
                if(Array.isArray(result)) {
                    if(!args.slice().shift() || args.slice().shift()?.replace(/\D/g, "").trim()=="") interaction.reply("["+result.join(", ")+"]");
                    else this.checkcont(result, args, interaction);
                }
                else this.checkcont(result, args, interaction);
            }
            else interaction.reply(name+": "+result);
        } // 오류가 나지 않은 상태에서 저장하면 일정 시간후 서버가 재실행되요.
        else {
            interaction.reply({
                content: "content parse successed!", 
                embeds: [{
                    title: name,
                    fields: contents.map(k=> {
                        return {name: k, value: data[k]};
                    })
                }]
            });
        }
    }
    
    public run(interaction: CommandInteraction<CacheType>): void {
        const args = interaction.options.getString('values', true).split(".");
        const jsonData = assets.content.get(interaction.options.getString("type", true) as assets.content.contentType);
        this.checkcont(jsonData, args, interaction);


/*
        interaction.options.data.forEach(val => {
            args[val.name] = val.value;
        })
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
            interaction.reply("**content type is not found!");

            files.forEach((k) => {
                str += `• !content **${k.replace(".json", "")}** <content> <value>\n`;
                if(str.length >= maxLength || files.indexOf(k) == files.length - 2) {
                    interaction.reply({
                        embeds: [
                            new Discord.MessageEmbed()
                            .setAuthor({name: "All Content Types", iconURL: helpImg})
                            .setColor("#186de6")
                            .addField("Commands", str)
                        ]
                    });
                    str = "";
                }
            });
        } else if(args[1] === undefined) {
            interaction.reply(`**${args[0]} content is not found!**`);

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
                    interaction.reply({
                        embeds: [
                            new Discord.MessageEmbed()
                            .setAuthor({name: `All ${args[0]} contents`, iconURL: helpImg})
                            .setColor("#186de6")
                            .addField(`Commands`, sstr)
                        ]
                    });
                }
            }
        } else {
            kvStrs.forEach(kv => {
                str += `${kv}\n`;

                if(str.length >= maxLength || kvStrs.indexOf(kv) == kvStrs.length - 1) {
                    interaction.reply({
                        embeds: [
                            new Discord.MessageEmbed()
                            .setAuthor({name: `All ${args[0]} - ${args[1]} Values`, iconURL: helpImg})
                            .setColor("#186de6")
                            .addField(`Values`, str)
                        ]
                    });

                    str = "";
                }
            })
        }
        interaction.reply("done");
*/
    }
}

export default Content;