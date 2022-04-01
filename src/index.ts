import Discord, { Client, Intents } from "discord.js";
import { REST } from "@discordjs/rest"

import { firebaseAdmin } from "@뇌절봇/net";
import CM from "@뇌절봇/commands";
import assets from "@뇌절봇/assets"
import config from "@뇌절봇/config.json"
import { Server } from '@remote-kakao/core';
import fs from 'fs';

//RTTRPG
import { init } from './game/rpg_';

const masterIDs: string[] = [
    "462167403237867520",
    "473072758629203980"
]

// 파이어베이스 초기화
firebaseAdmin;


const configs = JSON.parse(fs.readFileSync("./secret.json").toString());
const server = new Server({ useKakaoLink: false });

// discord rest api 호출
const rest = new REST({ version: '9' }).setToken(config.botToken);

// 프로그램 초기화
// App 선언 - 봇의 모든 코드를 관리함
const app = {
    client: new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }),
    option: new Map<string, boolean|number|string>(),
    config: config,
    rest: rest
};

const { client, option } = app;

// 프로그램 실행 인자 추출
process.argv.forEach((arg: string, index: number, array: string[]) => {
    if(arg.slice(0, 2) == "--" && array.length > index + 1) {
        const key: string = arg.slice(2);
        const value: string = array[index + 1];
    
        if(value == "true" || value == "false") {
            option.set(key, Boolean(value));
        } else if(Number(value).toString() != "NaN") {
            option.set(key, Number(value));
        } else {
            option.set(key, value);
        }
  }
});

// 애셋 파일 로딩
assets.init(config.debug);

// 길드 초기화
function guildInit(guild: Discord.Guild) {
    firebaseAdmin.firestore.collection(guild.id).doc("config").get().then(snapshot => {
        if(!snapshot.exists) {
            const root = firebaseAdmin.firestore.collection(guild.id);
            root.doc("config").set({
                name: guild.name,
                version: config.version,
                language: guild.preferredLocale
            });
        }
    });
}

client.once("ready", () => {
    console.log(`Logged in as ${client.user?.tag}(${client.application?.id})!`)
    
    // 봇 명령어 초기화
    CM.refreshCommand("global");
    
    // 서버마다 데이터베이스 체크
    client.guilds.cache.forEach(guild => {
        guildInit(guild);
    })
});

client.on("guildCreate", guild => {
    guildInit(guild);
})

// 명령어 구현부
client.on("interactionCreate", async interaction => {
    if(interaction.isCommand()) {
        await interaction.deferReply();
        try {
            if(CM.commands.has(interaction.commandName)) {
                const whiteList = config.whiteList as false | string[];
                const command = CM.commands.get(interaction.commandName);

                const channelName: string =
                    interaction.channel instanceof Discord.TextChannel ||
                    interaction.channel instanceof Discord.NewsChannel
                        ? interaction.channel.name
                        : interaction.user.username;
            
                if((whiteList == false || whiteList.includes(channelName)) && (interaction.channel?.type == "DM" || !command?.dmOnly)) {
                    command?.run(interaction);
                } else {
                    interaction.editReply({
                        content: "This command is available only in the dm channel or the following channels."
                    })
                }
            } else {
                interaction.editReply({
                    content: "Error... Undefined command!"
                });
            }
        } catch(error) {
            interaction.editReply({content: "error: "+error});
            console.log(error);
        }
    }

    return;
});

client.on("messageCreate", async message => {
    if(message.channel.type != "DM" && message.content == "!refresh" && message.guild != null && 
        (message.author.id == message.guild?.ownerId || masterIDs.includes(message.author.id))) {
        try {
            const time = new Date().getTime();
            const guild = message.guild;
            message.reply("refresh start! server: " + guild.name);
            
            (()=>{
                const p = CM.refreshCommand("guild", guild);
                init();
                return p;
            })().then(() => {
                message.reply(`refresh finished in ${(Date.now() - time) / 1000}s`);
            }).catch(e => {
                message.reply(e+"");
            });
        } catch (error) {
            message.reply({content: "error: "+error});
        }
    }
});

server.on('ready', () => console.log(`remote-kakao server is ready!`));
server.on('message', async (message) => {
  console.log(message);
});
server.start();

(()=>{
    const pros = CM.reloadCommands();
    init();
    return pros;
})().then(() => {
    client.login(config.botToken);
});

export default app;