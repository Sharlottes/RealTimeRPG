import Discord, { Client, Intents } from "discord.js";
import { REST } from "@discordjs/rest"

import { firebaseAdmin } from "@뇌절봇/net";
import CM from "@뇌절봇/commands";
import assets from "@뇌절봇/assets"
import config from "@뇌절봇/config.json"

import { init } from './game/rpg_';
import { onDiscordMessage } from "./kakao";

const masterIDs = [
    "462167403237867520",
    "473072758629203980"
];

// App 선언 - 봇의 모든 코드를 관리함
const app = {
    client: new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }),
    option: new Map<string, boolean|number|string>(),
    config: config,
    rest: new REST({ version: '9' }).setToken(config.botToken)
};

const { client, option } = app;

// 길드 초기화
function guildInit(guild: Discord.Guild) {
    const doc = firebaseAdmin.firestore.collection(guild.id).doc("config");
    return doc.get().then(snapshot => {
        if(!snapshot.exists) doc.set({
            name: guild.name,
            version: config.version,
            language: guild.preferredLocale
        });
    });
}

// 프로그램 실행 인자 추출
for(let i = 0; i < process.argv.length; i += 2) {
    const arg = process.argv[i];
    const value = (()=>{
        const value = process.argv[i + 1];
        if(value == 'true') return true;
        if(value == 'false') return false;
        if(isNaN(Number(value))) return Number(value);
        return value;
    })();
    
    if(arg.startsWith('--') && value) option.set(arg.slice(2), value);
}

// 애셋 파일 로딩
assets.init(config.debug);
console.log('asset initialization has been done')

client.once("ready", () => {
    console.log(`Logged in as ${client.user?.tag}(${client.application?.id})!`)
    
    // 봇 명령어 초기화
    CM.refreshCommand("global").then(()=>console.log('global commend refreshing has done'));
    
    // 서버마다 데이터베이스 체크
    client.guilds.cache.forEach(guild => {
        guildInit(guild).then(()=>console.log(`${guild.name} database checking has done`));
    })
});

client.on("guildCreate", guild => {
    guildInit(guild);
})

// 명령어 구현부
client.on("interactionCreate", async interaction => {
    if(interaction.isCommand()) {
        const command = CM.commands.get(interaction.commandName);
        if(!command || !interaction.channel) return;
        await interaction.deferReply();
    
        if(interaction.channel.type == "DM" || !command.dmOnly) {
            try {
                command.run(interaction);
            } catch(e) {
                interaction.editReply((e as object).toString());
                console.log(e);
            }
        }
        else interaction.editReply("This command is available only in the dm channel.");
    }
});

client.on("messageCreate", async message => {
    if(message.author.id != client.user?.id) onDiscordMessage(message);

    if(message.channel.type != "DM" && message.content == "!refresh" && message.guild != null && 
        (message.author.id == message.guild.ownerId || masterIDs.includes(message.author.id))) {
        const time = new Date().getTime();
        const guild = message.guild;

        message.reply(`refresh start! server: ${guild.name}`);
        CM.refreshCommand("guild", guild).then(init)
        .then(() => message.reply(`refresh finished in ${(Date.now() - time) / 1000}s`))
        .catch(e => message.reply((e as object).toString())); 
    }
});

CM.reloadCommands().then(init).then(()=>client.login(config.botToken));

//Kakao.init();

export default app;