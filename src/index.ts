// 참조된 패키지들에서 모듈 가져오기.
// 이렇게 하면 불러온 모듈들이 모두 하나의 변수를 통해 참조?가 되지만 다른 방식으로 할 수도 있음.
// import { Client } from "discord.js";
// 위 같은 방식으로 불러오면 해당 패키지내의 모든 모듈을 불러오지 않고 해당 모듈 하나만 불러옴.
import Discord, { CacheType, Client, Intents } from "discord.js";
import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"

// 직접 쓴 코드도 같은 방식으로 불러올 수 있음.
import { firebaseAdmin } from "@뇌절봇/net";
import CM from "@뇌절봇/commands";
import assets from "@뇌절봇/assets"
import config from "@뇌절봇/config.json"

//RTTRPG
import { Server } from '@remote-kakao/core';
import { onMessage, init } from './commands/guild/rpg_';
import fs from "fs";
import { Utils } from "./util";
// test


//
export type Message = {
    discordobj: Discord.Message | Discord.CommandInteraction<CacheType> | null,
    room: string
    content: string
    sender: {
        name: string
        hash: any
    },
    isGroupChat: boolean,
    replyText: (msg: any, room?:string)=>void
}

export type CommandInfo = {
    id: string;
    application_id: string;
    version: string;
    default_permissions: null;
    type: number;
    name: string;
    description: string;
    guild_id: string;
};


const Strings = Utils.Strings;
const configs = JSON.parse(fs.readFileSync("./secret.json").toString());
const server = new Server({ useKakaoLink: true });

const masterIDs: string[] = [
    "462167403237867520",
    "473072758629203980"
]

// 파이어베이스 초기화
firebaseAdmin;

// discord rest api 호출
const rest = new REST({ version: '9' }).setToken(config.botToken);

// 프로그램 초기화
// App 선언 - 봇의 모든 코드를 관리함
const app = {
    client: new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }),
    option: new Map<string, any>(),
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

// 기타 함수 선언

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


// 속성 뒤에 ?는 해당 값이 널인지 확인하고 널이 아니면 실행
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

                let channelName: string =
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
        } catch(error: any) {
          if(!interaction.replied) {
              interaction.editReply({content: "error: "+error});
          }
        }
    } else return;
});

client.on("messageCreate", async message => {
    if(message.channel.type != "DM" && message.content == "!refresh" && message.guild != null) {
        if (message.author.id == message.guild?.ownerId || masterIDs.includes(message.author.id)) {
            try {
                const time = new Date().getTime();
                const guild = message.guild;
                message.reply("refresh start! server: " + guild.name);
                
                (()=>{
                    init();
                    return CM.refreshCommand("guild", guild);
                })().then(() => {
                    message.reply(`refresh finished in ${(new Date().getTime() - time) / 1000}ms`);
                }).catch(e => {
                    message.reply(e+"");
                });
            } catch (e: any) {
                message.reply(e);
            }
        } else {
        }
    }
    if(message.author.bot) return;
    onMessage({
      discordobj: message,
      room: "",
      content: message.content,
      sender: {
          name: message.author.username,
          hash: message.author.id
      },
      isGroupChat: false,
      replyText: (string: any, room?:string) => { try{message.reply(string);}catch(e){}}
  });
})

server.on('ready', () => console.log(`remote-kakao server is ready!`));
server.on('message', (message) => {
  onMessage({
      discordobj: null,
      room: message.room,
      content: message.content,
      sender: {
          name: message.sender.name,
          hash: Strings.hashCode(message.sender.getProfileImage())
      },
      isGroupChat: message.isGroupChat,
      replyText: (string: any, room?:string) => message.replyText(string, room)
  });
});
server.start(3000, configs);
/* 전 버전 방식 명령어 구현부
const prefix = "!";
client.on("message", (message: Message) => {
  if (message.author.bot) return; //not botself
  if (!message.content.startsWith(prefix)) return; //need command tag

  // 명령어
  const args: string[] = message.content.slice(prefix.length).trim().split(" ");
  const command: string | undefined = args.shift()?.toLowerCase();
  
  if(command != undefined && commands.has(command)) {
    const whiteList: any = config.whiteList;
    let name: string = message.channel instanceof Discord.TextChannel || message.channel instanceof Discord.NewsChannel ?
    message.channel.name : message.author.username;

    if((whiteList == false || whiteList.includes(name)) || message.channel.type == "DM") {
    }
  }
});
*/
CM.reloadCommands().then(() => {
    client.login(config.botToken);
});

export default app;