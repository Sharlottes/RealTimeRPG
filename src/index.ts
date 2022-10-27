import { Client, GatewayIntentBits } from "discord.js";

import CM from "commands";
import assets from "assets";

import { init } from './game';
import CommandManager from './game/managers/CommandManager';

import Vars from './Vars';

require('dotenv').config()

const masterIDs = [
    "462167403237867520",
    "473072758629203980"
];

// App 선언 - 봇의 모든 코드를 관리함
export const app = {
    client: new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages
        ]
    })
};

let time = Date.now();

// 애셋 파일 로딩
assets.init();
console.log(`asset initialization has been done: ${Date.now() - time}ms`);

//기본 명령어 로딩
CM.commands.clear();
console.log(`command initialization has been done in ${Date.now() - time}ms`);

//게임 콘텐츠 로딩
init();
console.log(`game initialization has been done in ${Date.now() - time}ms`);

//전역 변수 로딩
Vars.init();
console.log(`vars initialization has been done: ${Date.now() - time}ms`);

//디스코드 봇 로그인
app.client.login(process.env.DISCORD_TOKEN).then(() =>
    console.log(`discord bot login has been done in ${Date.now() - time}ms`)
);

app.client
    .once("ready", async () => {
        console.log(`Logged in as ${app.client.user?.tag}(${app.client.application?.id}): ${Date.now() - time}ms`)
    })
    .on("interactionCreate", async interaction => {
        if (interaction.isCommand()) {
            const command = CM.commands.get(interaction.commandName);
            if (!command || !interaction.channel) return;
            await interaction.deferReply();

            if (interaction.channel.isDMBased() || !command.dmOnly) command.run(interaction);
            else await interaction.editReply("This command is available only in the dm channel.");
        }
    })
    .on("messageCreate", async message => {
        if (message.channel.isTextBased() && message.guild != null && (message.author.id == message.guild.ownerId || masterIDs.includes(message.author.id))) {
            const time = new Date().getTime();

            if (message.content == "!refresh") {
                message.reply(`guild command refresh start! server: ${message.guild.name}`);

                CM.commands.clear();
                CommandManager.init();
                await CM.refreshCommand("guild", message.guild);

                message.reply(`guild command refresh has been done in ${(Date.now() - time)}ms`);
            }
            else if (message.content == "!refresh global") {
                message.reply(`global command refresh start!`);

                CM.commands.clear();
                CommandManager.init();
                await CM.refreshCommand("global");

                message.reply(`global command refresh has been done in ${(Date.now() - time)}ms`);
            }
        }
    });

process
    .on("unhandledRejection", async (err) => {
        console.error(`[${new Date().toISOString()}] Unhandled Promise Rejection:\n`, err);
    })
    .on("uncaughtException", async (err) => {
        console.error(`[${new Date().toISOString()}] Uncaught Promise Exception:\n`, err);
    })
    .on("uncaughtExceptionMonitor", async (err) => {
        console.error(`[${new Date().toISOString()}] Uncaught Promise Exception (Monitor):\n`, err);
    })
    .on("multipleResolves", async (type, promise, reason) => {
        //console.error("Multiple Resolves:\n", type, promise, reason);
    });