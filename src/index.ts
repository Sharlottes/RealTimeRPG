import { Client, Intents } from "discord.js";
import { REST } from "@discordjs/rest";

import CM from "@RTTRPG/commands";
import assets from "@RTTRPG/assets";
import config from "@RTTRPG/discord.json";

import { init } from './game';
import { CommandManager } from './game/managers';
import Vars from './Vars';

const time = Date.now();
const masterIDs = [
    "462167403237867520",
    "473072758629203980",
    "939349343431954462"
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

// 프로그램 실행 인자 추출
for(let i = 2; i < process.argv.length; i += 2) {
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

(async ()=>{
    // 애셋 파일 로딩
    assets.init();
    console.log(`asset initialization has been done: ${Date.now()-time}ms`);

    //전역 변수 로딩
    Vars.init();
    console.log(`vars initialization has been done: ${Date.now()-time}ms`);

    //기본 명령어 로딩
    CM.commands.clear();
    console.log(`command initialization has been done in ${(Date.now() - time)}ms`);

    //게임 콘텐츠 로딩
    init();
    console.log(`game initialization has been done in ${(Date.now() - time)}ms`);
    
    //디스코드 봇 로그인
    await client.login(config.botToken);
    console.log(`discord bot login has been done in ${(Date.now() - time)}ms`);

    /*
    //카카오톡 봇 로그인
    Kakao.init();
    console.log(`kakao bot initialization has been done: ${Date.now()-time}ms`);
    */
})();

client.once("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}(${client.application?.id}): ${Date.now()-time}ms`)
    
    await CM.refreshCommand("global");
    console.log(`global command push has been done: ${Date.now()-time}ms`);

    /*
    // 서버마다 데이터베이스 체크
    client.guilds.cache.forEach(guild => {
        const doc = firebaseAdmin.firestore.collection(guild.id).doc("config");
        const snapshot = await doc.get();
        if (!snapshot.exists) {
            doc.set({
                name: guild.name,
                version: config.version,
                language: guild.preferredLocale
            });
        }
    });
    */
});

client.on("interactionCreate", async interaction => {
    if(interaction.isCommand()) {
        const command = CM.commands.get(interaction.commandName);
        if(!command || !interaction.channel) return;
        await interaction.deferReply().catch(async e=> setTimeout(() => interaction.deferReply().catch(console.log), 1000));
    
        if(interaction.channel.type == "DM" || !command.dmOnly) command.run(interaction);
        else interaction.editReply("This command is available only in the dm channel.");
    }
});

client.on("messageCreate", async message => {
    //if(message.author.id != client.user?.id) onDiscordMessage(message);

    //only avaliable for server owner or whitelist user
    if(message.channel.type === 'GUILD_TEXT' && message.content == "!refresh" && message.guild != null && (message.author.id == message.guild.ownerId || masterIDs.includes(message.author.id))) {
        const time = new Date().getTime();
        const guild = message.guild;

        message.reply(`refresh start! server: ${guild.name}`).catch(e => message.reply((e as object).toString()));
        CM.commands.clear();
        CommandManager.init();
        await CM.refreshCommand("guild", guild);
        message.reply(`guild command push has been done in ${(Date.now() - time)}ms`);
    }
});