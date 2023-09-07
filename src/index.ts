import dotenv from "dotenv";
dotenv.config();

import { GatewayIntentBits } from "discord.js";
import { Client } from "discordx";
import assets from "@/assets";
import Game, { User } from "./game";
import "@/command/commands/GameCommands";
import "@/command/commands/UserCommands";
import Vars from "./Vars";

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  simpleCommand: {
    prefix: "!",
  },
  botGuilds:
    process.env.NODE_ENV === "production"
      ? undefined
      : [process.env.TEST_GUILD_ID],
});

const time = Date.now();

assets.init();
Game.init();
console.log(
  `asset & game initialization has been done in ${Date.now() - time}ms`
);

client.login(process.env.BOT_TOKEN);

client
  .once("ready", async () => {
    console.log(
      `Logged in as ${client.user?.tag}(${client.application?.id}): ${
        Date.now() - time
      }ms`
    );
    await client.clearApplicationCommands(
      ...(process.env.NODE_ENV === "production" ? [] : [process.env.BOT_TOKEN])
    );
    await client.initApplicationCommands();
  })
  .on("messageCreate", (message) => {
    client.executeCommand(message);
  })
  .on("interactionCreate", (interaction) => {
    const user =
      Vars.users.find((u) => u.id == interaction.user.id) ||
      Vars.users[Vars.users.push(new User(interaction.user)) - 1];
    user.updateData(interaction);

    client.executeInteraction(interaction);
  });

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
