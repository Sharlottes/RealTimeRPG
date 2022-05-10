import Discord, { Client, Intents } from "discord.js";
import { REST } from "@discordjs/rest"

import { firebaseAdmin } from "@뇌절봇/net";
import CM from "@뇌절봇/commands";
import assets from "@뇌절봇/assets"
import config from "@뇌절봇/config.json"

import { CommandManager, init } from './game';
import { onDiscordMessage } from "./kakao";
import Vars from './Vars';

const time = Date.now();
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
export default app;

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
console.log(`asset initialization has been done: ${Date.now()-time}ms`);

//전역 변수 로딩
Vars.init();
console.log(`vars initialization has been done: ${Date.now()-time}ms`);

client.once("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}(${client.application?.id}): ${Date.now()-time}ms`)
    
    // 봇 명령어 초기화
    await CM.refreshCommand("global");
    console.log(`global command initialization has been done: ${Date.now()-time}ms`);
    
    // 서버마다 데이터베이스 체크
    client.guilds.cache.forEach(guildInit);
});

client.on("guildCreate", guildInit);

// 명령어 구현부
client.on("interactionCreate", async interaction => {
    if(interaction.isCommand()) {
        const command = CM.commands.get(interaction.commandName);
        if(!command || !interaction.channel) return;
        await interaction.deferReply().catch(async e=> setTimeout(() => interaction.deferReply(), 1000));
    
        if(interaction.channel.type == "DM" || !command.dmOnly) command.run(interaction);
        else interaction.editReply("This command is available only in the dm channel.");
    }
});

client.on("messageCreate", async message => {
    if(message.author.id != client.user?.id) onDiscordMessage(message);

    if(message.channel.type != "DM" && message.content == "!refresh" && message.guild != null && 
        (message.author.id == message.guild.ownerId || masterIDs.includes(message.author.id))) {
        const time = new Date().getTime();
        const guild = message.guild;

        message.reply(`refresh start! server: ${guild.name}`).catch(e => message.reply((e as object).toString()));
        await CM.reloadCommands().then(CommandManager.init);
        await CM.refreshCommand("guild", guild);
        message.reply(`guild command initialization has been done in ${(Date.now() - time)}ms`);
    }
});


CM.reloadCommands().then(async ()=>{
    console.log(`global command initialization has been done in ${(Date.now() - time)}ms`);
    init();
    console.log(`game initialization has been done in ${(Date.now() - time)}ms`);
    await client.login(config.botToken);
    console.log(`discord bot login has been done in ${(Date.now() - time)}ms`);
});

//Kakao.init();