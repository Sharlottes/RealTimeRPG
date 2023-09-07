import dotenv from "dotenv";
dotenv.config();

import { GatewayIntentBits, REST } from "discord.js";
import { Client } from "discordx";
import CM from "@/command/legacy/CommandManager";
import assets from "@/assets";
import Game from "./game";
import "@/command/commands/RefreshCommand";

// App 선언 - 봇의 모든 코드를 관리함
export const app = {
  client: new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    simpleCommand: {
      prefix: "!",
    },
  }),
  rest: new REST({ version: "10" }).setToken(process.env.BOT_TOKEN),
};

const time = Date.now();

// 애셋 파일 로딩
assets.init();
console.log(`asset initialization has been done: ${Date.now() - time}ms`);

//기본 명령어 로딩
CM.commands.clear();
console.log(`command initialization has been done in ${Date.now() - time}ms`);

//게임 콘텐츠 로딩
Game.init();
console.log(`game initialization has been done in ${Date.now() - time}ms`);

app.client
  .once("ready", async () => {
    console.log(
      `Logged in as ${app.client.user?.tag}(${app.client.application?.id}): ${
        Date.now() - time
      }ms`
    );
    app.client.initApplicationCommands();
  })
  .on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = CM.commands.get(interaction.commandName);
      if (!command || !interaction.channel) return;
      await interaction.deferReply();

      if (interaction.channel.isDMBased() || !command.dmOnly)
        command.run(interaction);
      else
        await interaction.editReply(
          "This command is available only in the dm channel."
        );
    }
  })
  .on("messageCreate", (message) => {
    app.client.executeCommand(message);
  });

app.client.login(process.env.BOT_TOKEN);

process
  .on("unhandledRejection", async (err) => {
    console.error(
      `[${new Date().toISOString()}] Unhandled Promise Rejection:\n`,
      err
    );
  })
  .on("uncaughtException", async (err) => {
    console.error(
      `[${new Date().toISOString()}] Uncaught Promise Exception:\n`,
      err
    );
  })
  .on("uncaughtExceptionMonitor", async (err) => {
    console.error(
      `[${new Date().toISOString()}] Uncaught Promise Exception (Monitor):\n`,
      err
    );
  });
